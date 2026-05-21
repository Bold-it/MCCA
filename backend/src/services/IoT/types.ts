export interface IoTEvent {
  platform: 'google_home' | 'smartthings' | 'homekit';
  deviceId: string;
  deviceType: 'camera' | 'lock' | 'motion' | 'sensor';
  eventType: string;
  confidence: number;
  timestamp: Date;
  metadata: Record<string, any>;
}

export interface IoTDeviceData {
  id: string;
  name: string;
  type: string;
  platform: string;
  status: string;
}
