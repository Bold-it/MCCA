import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AuditLogService {
  /**
   * Logs an authentication event (Login, Continuous Check, Step-Up)
   */
  static async logAuthEvent(data: {
    userId: string;
    sessionId?: string;
    method: string;
    outcome: string;
    confidence: number;
    ipAddress?: string;
    deviceId?: string;
  }) {
    await prisma.authEvent.create({
      data: {
        userId: data.userId,
        sessionId: data.sessionId,
        method: data.method,
        outcome: data.outcome,
        confidence: data.confidence,
        ipAddress: data.ipAddress,
        deviceId: data.deviceId,
      }
    });
  }

  /**
   * Logs a detected anomaly
   */
  static async logAnomalyDetected(userId: string, type: string, message: string, metadata: any = {}) {
    await prisma.alert.create({
      data: {
        userId,
        type,
        severity: 'WARNING',
        message,
        metadata
      }
    });
  }

  /**
   * Fetches the audit log for a specific user with filters
   */
  static async getAuditLog(userId: string, filters: { method?: string; outcome?: string } = {}) {
    return prisma.authEvent.findMany({
      where: { userId, ...filters },
      orderBy: { timestamp: 'desc' },
      take: 50
    });
  }

  /**
   * Exports the user's activity log to a CSV string
   */
  static async exportToCSV(userId: string): Promise<string> {
    const events = await prisma.authEvent.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' }
    });

    const header = 'Timestamp,Method,Outcome,Confidence,IP Address\n';
    const rows = events.map(e => 
      `${e.timestamp.toISOString()},${e.method},${e.outcome},${e.confidence},${e.ipAddress || ''}`
    ).join('\n');

    return header + rows;
  }
}
