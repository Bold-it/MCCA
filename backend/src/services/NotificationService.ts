import * as admin from 'firebase-admin';

const hasFirebaseCredentials = 
  process.env.FIREBASE_PROJECT_ID && 
  process.env.FIREBASE_CLIENT_EMAIL && 
  process.env.FIREBASE_PRIVATE_KEY;

if (hasFirebaseCredentials) {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      databaseURL: process.env.FIREBASE_DB_URL,
    });
  }
} else {
  console.log('Firebase credentials not provided. Push notifications will be mocked.');
}

export class NotificationService {
  /**
   * Sends a generic push notification to a user's registered tokens
   */
  static async sendPushNotification(userId: string, title: string, body: string, data: any = {}) {
    console.log(`[Push Notification] To user_${userId}: ${title} - ${body}`, data);
    
    if (!hasFirebaseCredentials || !admin.apps.length) {
      return;
    }

    const message = {
      notification: { title, body },
      data,
      topic: `user_${userId}`,
    };

    try {
      await admin.messaging().send(message);
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  static async notifyTrustDrop(userId: string, newScore: number) {
    await this.sendPushNotification(
      userId,
      'Security Alert',
      `Your identity trust score has dropped to ${newScore}. Additional verification may be required.`,
      { type: 'TRUST_DROP', score: newScore.toString() }
    );
  }

  static async notifySuspiciousActivity(userId: string, anomalyType: string) {
    await this.sendPushNotification(
      userId,
      'Suspicious Activity Detected',
      `An anomaly of type ${anomalyType} was detected in your session.`,
      { type: 'ANOMALY', anomalyType }
    );
  }

  static async notifyNewDevice(userId: string, deviceInfo: string) {
    await this.sendPushNotification(
      userId,
      'New Device Linked',
      `A new device (${deviceInfo}) has been authenticated for your account.`,
      { type: 'NEW_DEVICE' }
    );
  }
}
