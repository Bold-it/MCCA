import { useEffect, useRef } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { activeScreenName } from '../navigation/RootNavigator';
import { useAuthStore } from '../store/authStore';
import { useTrustStore } from '../store/trustStore';
import axios from 'axios';
import { BACKEND_URL, ML_SERVICE_URL } from '../config';

export const useTouchInterception = () => {
  const user = useAuthStore((state) => state.user);
  const sessionToken = useAuthStore((state) => state.sessionToken);
  const updateTrustScore = useTrustStore((state) => state.updateTrustScore);
  
  const gestureBuffer = useRef<any[]>([]);

  useEffect(() => {
    if (!user || !sessionToken) return;

    const subscription = DeviceEventEmitter.addListener('onNativeTouchEvent', async (event) => {
      // Append the screen context (Activity Prior)
      const gesture = {
        ...event,
        screen: activeScreenName,
      };

      gestureBuffer.current.push(gesture);

      // Once we accumulate a batch of 5 gestures, send them for Touch-ABNet evaluation
      if (gestureBuffer.current.length >= 5) {
        const batch = [...gestureBuffer.current];
        gestureBuffer.current = [];

        try {
          // 1. Verify touch sequence directly with FastAPI ML Service
          const mlResponse = await axios.post(`${ML_SERVICE_URL}/ml/behaviour/verify`, {
            userId: user.id,
            gestures: batch
          }, {
            headers: {
              'x-ml-service-key': 'development-key-secret-12345'
            }
          });

          const { confidence, status, gesture: gestureType } = mlResponse.data;

          // 2. Forward result and touch metrics to Express Backend continuous-check route
          const response = await axios.post(`${BACKEND_URL}/api/auth/continuous-check`, {
            faceConfidence: 1.0, // Face ID remains nominal during passive touch interaction
            signals: {
              behaviouralMatch: confidence,
              touchMetrics: {
                gesture: gestureType || 'Tap',
                calibration: status || 'calibrated',
                similarity: confidence
              },
              iotVerified: true
            }
          }, {
            headers: {
              'Authorization': `Bearer ${sessionToken}`
            }
          });

          if (response.data.success) {
            const { newTrustScore } = response.data;
            updateTrustScore(newTrustScore);
          }
        } catch (error) {
          console.error('[TouchInterception] Failed to verify touch sequence:', error);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [user, sessionToken]);
};
