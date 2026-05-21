import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { TrustScoreService } from '../services/TrustScoreService';
import { AuditLogService } from '../services/AuditLogService';
import { AnomalyDetectionService } from '../services/AnomalyDetectionService';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

// Validation Schemas
const EnrolSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  pin: z.string().length(6),
  faceTemplate: z.string(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  pin: z.string().length(6),
});

/**
 * POST /api/auth/enrol
 */
router.post('/enrol', async (req, res, next) => {
  try {
    const { name, email, pin, faceTemplate } = EnrolSchema.parse(req.body);
    
    const pinHash = await bcrypt.hash(pin, 12);
    
    const user = await prisma.user.create({
      data: {
        name,
        email,
        pinHash,
        enrolledMethods: ['PIN', 'FACE'],
        biometricTemplates: {
          create: {
            method: 'FACE',
            templateHash: faceTemplate // In real app, hash this
          }
        }
      }
    });

    res.status(201).json({ success: true, userId: user.id });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, pin } = LoginSchema.parse(req.body);
    
    const user = await prisma.user.findUnique({ 
      where: { email },
      include: { sessions: { where: { terminatedAt: null } } }
    });

    if (!user || !(await bcrypt.compare(pin, user.pinHash))) {
      await AuditLogService.logAuthEvent({
        userId: email, // Email used for attempt
        method: 'PIN',
        outcome: 'FAILURE',
        confidence: 0,
        ipAddress: req.ip
      });
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
        trustScore: 100
      }
    });

    await AuditLogService.logAuthEvent({
      userId: user.id,
      sessionId: session.id,
      method: 'PIN',
      outcome: 'SUCCESS',
      confidence: 1.0,
      ipAddress: req.ip
    });

    res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, enrolledMethods: user.enrolledMethods } });
  } catch (error) {
    next(error);
  }
});

export let simulationOverride: {
  forceScore?: number;
  faceConfidence?: number;
  locationAnomaly?: boolean;
  unusualTime?: boolean;
  iotContext?: number;
} | null = null;

/**
 * POST /api/auth/continuous-check
 */
router.post('/continuous-check', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { faceConfidence, signals } = req.body;
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const session = await prisma.session.findFirst({
      where: { userId, terminatedAt: null },
      orderBy: { startedAt: 'desc' }
    });
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });

    const ip = req.ip || '';
    let locationAnomaly = await AnomalyDetectionService.isNewLocation(session.userId, ip);
    let unusualTime = await AnomalyDetectionService.isUnusualTime(session.userId, new Date());

    let finalFaceConfidence = faceConfidence;
    let finalFingerprintBound = signals?.fingerprintBound || false;
    let finalBehaviouralMatch = signals?.behaviouralMatch || 0.9;
    let finalIotContext = signals?.iotContext || 1.0;

    if (simulationOverride) {
      if (simulationOverride.faceConfidence !== undefined) finalFaceConfidence = simulationOverride.faceConfidence;
      if (simulationOverride.iotContext !== undefined) finalIotContext = simulationOverride.iotContext;
      if (simulationOverride.locationAnomaly !== undefined) locationAnomaly = simulationOverride.locationAnomaly;
      if (simulationOverride.unusualTime !== undefined) unusualTime = simulationOverride.unusualTime;
    }

    let newScore = TrustScoreService.computeScore(
      { 
        faceConfidence: finalFaceConfidence, 
        fingerprintBound: finalFingerprintBound,
        behaviouralMatch: finalBehaviouralMatch,
        iotContext: finalIotContext 
      },
      {
        locationAnomaly,
        unusualTime,
        newDevice: false,
      },
      session.trustScore,
      session.startedAt
    );

    if (simulationOverride && simulationOverride.forceScore !== undefined) {
      newScore = simulationOverride.forceScore;
    }

    await prisma.session.update({
      where: { id: session.id },
      data: { trustScore: newScore }
    });

    await AuditLogService.logAuthEvent({
      userId: session.userId,
      sessionId: session.id,
      method: 'CONTINUOUS_CHECK',
      outcome: newScore < 50 ? 'LOW_TRUST' : 'SUCCESS',
      confidence: finalFaceConfidence,
      ipAddress: req.ip
    });

    res.json({ success: true, newTrustScore: newScore });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/simulation-preset
 */
router.post('/simulation-preset', async (req, res, next) => {
  try {
    const { preset } = req.body;
    
    // Find the latest active session
    const session = await prisma.session.findFirst({
      where: { terminatedAt: null },
      orderBy: { startedAt: 'desc' }
    });

    if (preset === 'safe-home') {
      simulationOverride = { forceScore: 98, faceConfidence: 1.0, locationAnomaly: false, unusualTime: false, iotContext: 1.0 };
      if (session) {
        await prisma.session.update({
          where: { id: session.id },
          data: { trustScore: 98 }
        });
        await prisma.alert.create({
          data: {
            userId: session.userId,
            type: 'IOT_ALERT',
            severity: 'INFO',
            message: 'Simulation: Safe Home Context Activated. High trust verified.',
          }
        });
      }
    } else if (preset === 'device-theft') {
      simulationOverride = { forceScore: 45, faceConfidence: 0.3, locationAnomaly: true, unusualTime: true, iotContext: 0.2 };
      if (session) {
        await prisma.session.update({
          where: { id: session.id },
          data: { trustScore: 45 }
        });
        await prisma.alert.create({
          data: {
            userId: session.userId,
            type: 'SECURITY_ALERT',
            severity: 'WARNING',
            message: 'Simulation: Device Theft Scenario. High movement anomaly & unknown location detected. Score: 45.',
          }
        });
      }
    } else if (preset === 'intruder-lockdown') {
      simulationOverride = { forceScore: 15, faceConfidence: 0.0, locationAnomaly: true, unusualTime: true, iotContext: 0.0 };
      if (session) {
        await prisma.session.update({
          where: { id: session.id },
          data: { trustScore: 15 }
        });
        await prisma.alert.create({
          data: {
            userId: session.userId,
            type: 'SECURITY_ALERT',
            severity: 'CRITICAL',
            message: 'Simulation: Intruder Lockdown Scenario. Unrecognized face detected. Score: 15.',
          }
        });
      }
    } else if (preset === 'custom') {
      const forceScore = req.body.forceScore !== undefined ? Number(req.body.forceScore) : 75;
      const faceConfidence = req.body.faceConfidence !== undefined ? Number(req.body.faceConfidence) : 0.7;
      const locationAnomaly = req.body.locationAnomaly !== undefined ? !!req.body.locationAnomaly : false;
      const unusualTime = req.body.unusualTime !== undefined ? !!req.body.unusualTime : false;
      const iotContext = req.body.iotContext !== undefined ? Number(req.body.iotContext) : 0.8;

      simulationOverride = { forceScore, faceConfidence, locationAnomaly, unusualTime, iotContext };
      if (session) {
        await prisma.session.update({
          where: { id: session.id },
          data: { trustScore: forceScore }
        });
        await prisma.alert.create({
          data: {
            userId: session.userId,
            type: 'SECURITY_ALERT',
            severity: forceScore < 40 ? 'CRITICAL' : forceScore < 80 ? 'WARNING' : 'INFO',
            message: `Simulation: Custom trust override applied. Score forced to: ${forceScore}.`,
          }
        });
      }
    } else {
      simulationOverride = null;
      if (session) {
        await prisma.session.update({
          where: { id: session.id },
          data: { trustScore: 100 }
        });
        await prisma.alert.create({
          data: {
            userId: session.userId,
            type: 'INFO',
            severity: 'INFO',
            message: 'Simulation: Overrides cleared. Normal authentication running.',
          }
        });
      }
    }

    res.json({ success: true, preset, simulationOverride });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/simulation-status
 */
router.get('/simulation-status', async (req, res, next) => {
  try {
    const user = await prisma.user.findFirst();
    if (!user) {
      return res.json({ success: false, error: 'No user seeded yet' });
    }

    const session = await prisma.session.findFirst({
      where: { terminatedAt: null },
      orderBy: { startedAt: 'desc' }
    });

    const alerts = await prisma.alert.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8
    });

    const devices = await prisma.iotDevice.findMany();

    res.json({
      success: true,
      user: { name: user.name, email: user.email },
      session: session ? {
        id: session.id,
        trustScore: session.trustScore,
        startedAt: session.startedAt,
        token: session.token
      } : null,
      alerts,
      devices,
      currentPreset: simulationOverride ? 
        (simulationOverride.forceScore === 98 ? 'safe-home' : 
         simulationOverride.forceScore === 45 ? 'device-theft' : 
         simulationOverride.forceScore === 15 ? 'intruder-lockdown' : 'custom') 
        : 'none'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
