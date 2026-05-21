import axios from 'axios';
import { IoTEvent } from './types';

export class GoogleHomeService {
  /**
   * Initiates the OAuth 2.0 flow for Google Home
   */
  static async initiateOAuth(userId: string): Promise<string> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = encodeURIComponent(`${process.env.APP_URL}/api/iot/google/callback`);
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=https://www.googleapis.com/auth/sdm.service&state=${userId}`;
  }

  static async handleCallback(code: string, state: string) {
    // Exchange code for access_token and refresh_token
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${process.env.APP_URL}/api/iot/google/callback`,
      grant_type: 'authorization_code',
    });
    return response.data;
  }

  static async getDevices(accessToken: string) {
    const response = await axios.get('https://smartdevicemanagement.googleapis.com/v1/enterprises/my-enterprise/devices', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return response.data.devices;
  }

  /**
   * Normalizes a raw Google Home SDM event to standard IoTEvent format
   */
  static parseEvent(rawEvent: any): IoTEvent {
    return {
      platform: 'google_home',
      deviceId: rawEvent.resourceGroup.split('/').pop(),
      deviceType: rawEvent.eventThreadState ? 'camera' : 'sensor',
      eventType: rawEvent.events['sdm.devices.events.CameraMotion.Motion'] ? 'motion' : 'trigger',
      confidence: 1.0,
      timestamp: new Date(),
      metadata: rawEvent.events
    };
  }
}
