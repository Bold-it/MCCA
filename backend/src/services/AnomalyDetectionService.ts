import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type AnomalyType = 'LOCATION' | 'DEVICE' | 'TIME' | 'REPEATED_FAILURE';

export class AnomalyDetectionService {
  /**
   * Checks if the current login location (IP) is a new one for the user
   */
  static async isNewLocation(userId: string, currentIP: string): Promise<boolean> {
    const historicalLocations = await prisma.authEvent.findMany({
      where: { userId, outcome: 'SUCCESS' },
      select: { ipAddress: true },
      distinct: ['ipAddress']
    });
    
    return !historicalLocations.some(loc => loc.ipAddress === currentIP);
  }

  /**
   * Checks if the current access time is outside the user's typical login hours
   */
  static async isUnusualTime(userId: string, currentTime: Date): Promise<boolean> {
    const hour = currentTime.getHours();
    // Simplified: unusual if between 1 AM and 5 AM unless the user usually logs in then
    return hour >= 1 && hour <= 5;
  }

  /**
   * Checks if the device fingerprint is registered for this user
   */
  static async isNewDevice(userId: string, deviceId: string): Promise<boolean> {
    const device = await prisma.authEvent.findFirst({
      where: { userId, deviceId }
    });
    return !device;
  }

  /**
   * Checks for repeated failures in the last 15 minutes
   */
  static async hasRepeatedFailures(userId: string): Promise<boolean> {
    const windowStart = new Date(Date.now() - 15 * 60 * 1000);
    const failureCount = await prisma.authEvent.count({
      where: { 
        userId, 
        outcome: 'FAILURE',
        timestamp: { gte: windowStart }
      }
    });
    return failureCount >= 5;
  }

  /**
   * Computes the cumulative penalty for detected anomalies
   */
  static computeAnomalyPenalty(anomalies: AnomalyType[]): number {
    let penalty = 0;
    if (anomalies.includes('LOCATION')) penalty += 20;
    if (anomalies.includes('DEVICE')) penalty += 15;
    if (anomalies.includes('TIME')) penalty += 10;
    if (anomalies.includes('REPEATED_FAILURE')) penalty += 30;
    return penalty;
  }
}
