export type TrustLevel = 'TRUSTED' | 'CAUTION' | 'RISK';

export interface TrustScore {
  score: number; // 0-100
  level: TrustLevel;
  lastUpdated: string | null;
}

export interface IdentitySignal {
  type: 'FACE' | 'FINGERPRINT' | 'VOICE' | 'BEHAVIORAL' | 'IOT';
  confidence: number; // 0-1
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface User {
  id: string;
  name: string;
  email: string;
  enrolledMethods: string[];
}

export interface MMCAAlert {
  id: string;
  type: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  timestamp: string;
  read: boolean;
}

export interface IoTDevice {
  id: string;
  name: string;
  type: string;
  platform: 'GOOGLE' | 'SAMSUNG' | 'APPLE' | 'OTHER';
  status: 'ONLINE' | 'OFFLINE' | 'UNAUTHORIZED';
  lastSeen: string;
}

export interface BiometricCapabilities {
  hasFaceID: boolean;
  hasFingerprint: boolean;
  hasVoice: boolean;
  canUseNativeBiometrics: boolean;
}

export interface EnrolResult {
  success: boolean;
  publicKey?: string;
  templateId?: string;
  error?: string;
}

export interface AuthResult {
  success: boolean;
  signature?: string;
  error?: string;
}

export interface VerifyResult {
  success: boolean;
  confidence: number;
  spoofDetected: boolean;
  error?: string;
}
