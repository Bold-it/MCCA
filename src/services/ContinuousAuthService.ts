import BackgroundFetch from 'react-native-background-fetch';
import { accelerometer, SensorTypes, setUpdateIntervalForType } from 'react-native-sensors';
import { BiometricService } from './BiometricService';
import { useTrustStore } from '../store/trustStore';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/authApi';
import axios from 'axios';
import { BACKEND_URL } from '../config';

// Weighting Documentation (Logic handled by backend)
/**
 * 1. Face Match: 50%
 * 2. Fingerprint Session: 20%
 * 3. Behavioural Patterns: 20%
 * 4. IoT Context: 10%
 */

let checkInterval: NodeJS.Timeout | null = null;
let movementSubscription: any = null;

export const ContinuousAuthService = {
  /**
   * Starts the continuous authentication engine
   */
  start: async (userId: string) => {
    console.log('[ContinuousAuth] Starting service for user:', userId);
    
    // 1. Initialize Background Fetch
    await BackgroundFetch.configure({
      minimumFetchInterval: 15, // Minimum allowed by iOS/Android
      stopOnTerminate: false,
      enableHeadless: true,
      startOnBoot: true,
      requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
    }, async (taskId) => {
      console.log('[BackgroundFetch] Task received:', taskId);
      await ContinuousAuthService.runCheck();
      BackgroundFetch.finish(taskId);
    }, (error) => {
      console.error('[BackgroundFetch] Failed to configure:', error);
    });

    // 2. Start Foreground Monitoring (Interval from Settings)
    ContinuousAuthService.adjustInterval(5); // Default 5 mins

    // 3. Start Accelerometer Monitoring for anomaly detection
    setUpdateIntervalForType(SensorTypes.accelerometer, 1000);
    movementSubscription = accelerometer.subscribe(({ x, y, z }) => {
      const totalForce = Math.sqrt(x*x + y*y + z*z);
      if (totalForce > 20) { // High movement threshold
        // Lower trust score slightly if unusual movement is detected
        const currentScore = useTrustStore.getState().trustScore;
        useTrustStore.getState().updateTrustScore(Math.max(40, currentScore - 2));
      }
    });
  },

  /**
   * Stops all monitoring loops
   */
  stop: () => {
    if (checkInterval) clearInterval(checkInterval);
    if (movementSubscription) movementSubscription.unsubscribe();
    BackgroundFetch.stop();
  },

  /**
   * Adjusts the foreground check frequency
   */
  adjustInterval: (minutes: number) => {
    if (checkInterval) clearInterval(checkInterval);
    checkInterval = setInterval(() => {
      ContinuousAuthService.runCheck();
    }, minutes * 60 * 1000);
  },

  /**
   * Performs a single full-spectrum identity check
   */
  runCheck: async () => {
    console.log('[ContinuousAuth] Running identity check...');
    const trustStore = useTrustStore.getState();
    const authStore = useAuthStore.getState();
    trustStore.setVerifying(true);

    try {
      // 1. Silent Face Capture (Mocked as image string)
      const faceResult = await BiometricService.verifyFace('base64-frame-data');
      
      // 2. Collect IoT context from local devices
      // const iotSignals = await IoTService.getCurrentContext();

      // 3. Send all signals to backend for weighted trust score calculation
      const response = await axios.post(`${BACKEND_URL}/api/auth/continuous-check`, {
        faceConfidence: faceResult.confidence,
        signals: {
          movementAnomaly: false, // Could be derived from accelerometer data
          iotVerified: true
        }
      }, {
        headers: {
          'Authorization': `Bearer ${authStore.sessionToken}`
        }
      });

      const { newTrustScore } = response.data;
      
      // 4. Update Global State
      trustStore.updateTrustScore(newTrustScore);

      // 5. Trigger Step-Up if below threshold (e.g. 60)
      if (newTrustScore < 60) {
        // Navigation trigger would happen here or via a listener in the UI
        console.warn('[ContinuousAuth] TRUST SCORE CRITICAL: Triggering Step-Up');
      }

      return { success: true, newTrustScore };
    } catch (error) {
      console.error('[ContinuousAuth] Check failed:', error);
      return { success: false, error };
    } finally {
      trustStore.setVerifying(false);
    }
  }
};
