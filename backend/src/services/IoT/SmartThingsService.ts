import axios from 'axios';
import { IoTEvent } from './types';

export class SmartThingsService {
  private static API_BASE = 'https://api.smartthings.com/v1';

  static async getDevices(accessToken: string) {
    const response = await axios.get(`${this.API_BASE}/devices`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return response.data.items;
  }

  static async subscribeWebhook(deviceId: string, accessToken: string) {
    await axios.post(`${this.API_BASE}/devices/${deviceId}/subscriptions`, {
      sourceType: 'DEVICE',
      device: { deviceId, componentId: 'main', capability: '*', attribute: '*', stateChangeOnly: true }
    }, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  }

  static parseEvent(rawEvent: any): IoTEvent {
    const event = rawEvent.eventData.events[0];
    return {
      platform: 'smartthings',
      deviceId: event.deviceId,
      deviceType: event.capability.includes('lock') ? 'lock' : 'sensor',
      eventType: event.attribute,
      confidence: 1.0,
      timestamp: new Date(),
      metadata: event
    };
  }
}
