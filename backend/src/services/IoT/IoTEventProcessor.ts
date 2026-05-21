import { IoTEvent } from './types';
import { TrustScoreService } from '../TrustScoreService';
import { NotificationService } from '../NotificationService';
import { AuditLogService } from '../AuditLogService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class IoTEventProcessor {
  /**
   * Processes an incoming IoT event and applies trust score impacts
   */
  static async processEvent(event: IoTEvent): Promise<void> {
    console.log(`[IoTProcessor] Processing ${event.platform} event: ${event.eventType}`);

    // 1. Find user associated with device
    const device = await prisma.iotDevice.findFirst({
      where: { externalId: event.deviceId, platform: event.platform.toUpperCase() }
    });

    if (!device) {
      console.warn(`[IoTProcessor] Device ${event.deviceId} not registered in MMCA`);
      return;
    }

    const userId = device.userId;
    let scoreImpact = 0;
    let alertMessage = '';
    let severity: 'INFO' | 'WARNING' | 'CRITICAL' = 'INFO';

    // 2. Map Event Types to Trust Impacts
    if (event.deviceType === 'camera') {
      if (event.metadata.recognizedFace === 'USER') {
        scoreImpact = 5;
        alertMessage = 'Smart camera recognized known face: +5 Trust';
      } else if (event.metadata.unknownFace) {
        scoreImpact = -20;
        alertMessage = 'Unrecognized face detected near device';
        severity = 'CRITICAL';
      }
    } else if (event.deviceType === 'lock') {
      if (event.eventType === 'unlocked' && event.metadata.method === 'registered_key') {
        scoreImpact = 3;
        alertMessage = 'Smart lock opened with registered key';
      }
    } else if (event.deviceType === 'motion') {
      // If motion detected while user is supposedly idle or away
      scoreImpact = -10;
      alertMessage = 'Unexpected motion detected in secure zone';
      severity = 'WARNING';
    }

    // 3. Apply Trust Score Update
    if (scoreImpact !== 0) {
      const session = await prisma.session.findFirst({
        where: { userId, terminatedAt: null },
        orderBy: { startedAt: 'desc' }
      });

      if (session) {
        const newScore = Math.max(0, Math.min(100, session.trustScore + scoreImpact));
        await prisma.session.update({
          where: { id: session.id },
          data: { trustScore: newScore }
        });
        
        // Trigger notification if score is critical
        if (newScore < 60) {
          await NotificationService.notifyTrustDrop(userId, newScore);
        }
      }
    }

    // 4. Log Alert & Audit
    await prisma.alert.create({
      data: {
        userId,
        type: 'IOT_ALERT',
        severity,
        message: alertMessage,
        metadata: event.metadata as any
      }
    });

    await AuditLogService.logAuthEvent({
      userId,
      method: 'IOT',
      outcome: scoreImpact >= 0 ? 'SUCCESS' : 'ANOMALY',
      confidence: event.confidence,
      deviceId: event.deviceId
    });
  }
}
