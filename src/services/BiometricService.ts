import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import axios from 'axios';
import { CryptoService } from './CryptoService';
import { 
  BiometricCapabilities, 
  EnrolResult, 
  AuthResult, 
  VerifyResult 
} from '../types';

import { ML_SERVICE_URL } from '../config';

export const BiometricService = {
  /**
   * Checks device for biometric support (Face, Fingerprint, etc.)
   */
  checkBiometricSupport: async (): Promise<BiometricCapabilities> => {
    const rnBiometrics = new ReactNativeBiometrics();
    const { available, biometryType } = await rnBiometrics.isSensorAvailable();

    return {
      hasFaceID: biometryType === BiometryTypes.FaceID,
      hasFingerprint: biometryType === BiometryTypes.TouchID || biometryType === BiometryTypes.Biometrics,
      hasVoice: false, // Phase 2
      canUseNativeBiometrics: available,
    };
  },

  /**
   * Enrols fingerprint by creating a hardware-backed key pair
   */
  enrolFingerprint: async (): Promise<EnrolResult> => {
    try {
      const rnBiometrics = new ReactNativeBiometrics();
      const { publicKey } = await rnBiometrics.createKeys();
      
      return { success: true, publicKey };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Authenticates user via native fingerprint prompt
   */
  authenticateFingerprint: async (promptMessage: string): Promise<AuthResult> => {
    try {
      const rnBiometrics = new ReactNativeBiometrics();
      const { success, signature } = await rnBiometrics.createSignature({
        promptMessage,
        payload: 'mmca-auth-payload',
      });

      return { success, signature };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Sends encrypted face samples to ML service for enrolment
   */
  enrolFace: async (imageSamples: string[]): Promise<EnrolResult> => {
    try {
      const key = await CryptoService.getStoredKey() || await CryptoService.generateSessionKey();
      
      // Encrypt each sample before transmission
      const encryptedSamples = imageSamples.map(sample => CryptoService.encryptPayload(sample, key));

      const response = await axios.post(`${ML_SERVICE_URL}/ml/face/enrol`, {
        samples: encryptedSamples,
        timestamp: new Date().toISOString(),
      });

      return { success: true, templateId: response.data.templateId };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Verifies a face frame against the ML service
   */
  verifyFace: async (imageBase64: string): Promise<VerifyResult> => {
    try {
      const key = await CryptoService.getStoredKey() || await CryptoService.generateSessionKey();
      const encryptedFrame = CryptoService.encryptPayload(imageBase64, key);

      const response = await axios.post(`${ML_SERVICE_URL}/ml/face/verify`, {
        frame: encryptedFrame,
      });

      const { confidence, spoofDetected } = response.data;

      if (spoofDetected) {
        // Log to security service
        console.warn('SPOOF ATTACK DETECTED');
      }

      return { 
        success: confidence > 0.8 && !spoofDetected, 
        confidence, 
        spoofDetected 
      };
    } catch (error: any) {
      return { success: false, confidence: 0, spoofDetected: false, error: error.message };
    }
  },

  /**
   * Collects behavioural events and updates ML profile
   */
  buildBehaviouralProfile: async (userId: string, events: any[]): Promise<void> => {
    try {
      await axios.post(`${ML_SERVICE_URL}/ml/behaviour/update`, {
        userId,
        events,
      }, {
        headers: {
          'x-ml-service-key': 'development-key-secret-12345'
        }
      });
    } catch (error) {
      console.error('Behavioural profile update failed', error);
    }
  }
};
