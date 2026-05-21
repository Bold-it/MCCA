import { BiometricService } from '../../services/BiometricService';
import ReactNativeBiometrics from 'react-native-biometrics';
import axios from 'axios';

jest.mock('react-native-biometrics');
jest.mock('axios');
jest.mock('../../services/CryptoService', () => ({
  CryptoService: {
    getStoredKey: jest.fn().mockResolvedValue('test-key'),
    encryptPayload: jest.fn().mockReturnValue('encrypted-data'),
  }
}));

describe('BiometricService', () => {
  const mockRNBiometrics = ReactNativeBiometrics as jest.MockedClass<typeof ReactNativeBiometrics>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should check biometric support correctly', async () => {
    mockRNBiometrics.prototype.isSensorAvailable.mockResolvedValue({
      available: true,
      biometryType: 'FaceID' as any,
      error: ''
    });

    const caps = await BiometricService.checkBiometricSupport();
    expect(caps.hasFaceID).toBe(true);
    expect(caps.canUseNativeBiometrics).toBe(true);
  });

  it('should handle fingerprint enrolment success', async () => {
    mockRNBiometrics.prototype.createKeys.mockResolvedValue({
      publicKey: 'mock-public-key'
    });

    const result = await BiometricService.enrolFingerprint();
    expect(result.success).toBe(true);
    expect(result.publicKey).toBe('mock-public-key');
  });

  it('should handle fingerprint enrolment failure', async () => {
    mockRNBiometrics.prototype.createKeys.mockRejectedValue(new Error('Hardware not available'));

    const result = await BiometricService.enrolFingerprint();
    expect(result.success).toBe(false);
    expect(result.error).toBe('Hardware not available');
  });

  it('should verify face via ML service', async () => {
    const mockAxios = axios as jest.Mocked<typeof axios>;
    mockAxios.post.mockResolvedValueOnce({
      data: {
        confidence: 0.9,
        spoofDetected: false,
      }
    });

    const result = await BiometricService.verifyFace('test-base64');
    expect(result.success).toBe(true);
    expect(result.confidence).toBe(0.9);
    expect(result.spoofDetected).toBe(false);
  });
});
