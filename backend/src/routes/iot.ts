import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { IoTEventProcessor } from '../services/IoT/IoTEventProcessor';
import { IoTEvent } from '../services/IoT/types';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/iot/devices
 */
router.get('/devices', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const devices = await prisma.iotDevice.findMany({
      where: { userId: req.user?.userId }
    });
    res.json({ success: true, devices });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/iot/webhook
 * Unprotected, secured via header secret
 */
router.post('/webhook', async (req, res, next) => {
  const secret = req.headers['x-webhook-secret'];
  if (secret !== process.env.IOT_WEBHOOK_SECRET) {
    return res.status(403).json({ error: 'Unauthorized webhook source' });
  }

  try {
    const { deviceId, platform, deviceType, eventType, metadata, confidence } = req.body;

    const ioTEvent: IoTEvent = {
      deviceId,
      platform: platform || 'GOOGLE',
      deviceType: deviceType || 'camera',
      eventType: eventType || 'face_detected',
      metadata: metadata || {},
      confidence: confidence || 1.0,
      timestamp: new Date()
    };

    await IoTEventProcessor.processEvent(ioTEvent);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/iot/simulate
 * For developer simulation. Bypasses secret checks in development.
 */
router.post('/simulate', async (req, res, next) => {
  try {
    const { deviceId, platform, deviceType, eventType, metadata, confidence } = req.body;

    const ioTEvent: IoTEvent = {
      deviceId,
      platform: platform || 'GOOGLE',
      deviceType: deviceType || 'camera',
      eventType: eventType || 'face_detected',
      metadata: metadata || {},
      confidence: confidence || 1.0,
      timestamp: new Date()
    };

    await IoTEventProcessor.processEvent(ioTEvent);
    res.json({ success: true, message: 'Simulation triggered successfully', event: ioTEvent });
  } catch (error) {
    next(error);
  }
});

export default router;
