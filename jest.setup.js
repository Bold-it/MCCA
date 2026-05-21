// Jest mock setup file for native modules

import 'react-native-gesture-handler/jestSetup';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  return {
    default: {
      call: jest.fn(),
      createAnimatedComponent: jest.fn((component) => component),
    },
    useSharedValue: jest.fn((val) => ({ value: val })),
    useAnimatedStyle: jest.fn((fn) => fn()),
    withTiming: jest.fn((val) => val),
    withSpring: jest.fn((val) => val),
    withSequence: jest.fn((...args) => args[0]),
    withDelay: jest.fn((delay, anim) => anim),
    runOnJS: jest.fn((fn) => fn),
    cancelAnimation: jest.fn(),
    interpolate: jest.fn((x, input, output) => output[0]),
    Extrapolation: { CLAMP: 'clamp' },
    createAnimatedComponent: jest.fn((component) => component),
  };
});

// Mock @react-native-async-storage/async-storage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn().mockResolvedValue(null),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(null),
  clear: jest.fn().mockResolvedValue(null),
}));

// Mock react-native-keychain
jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn().mockResolvedValue(true),
  getGenericPassword: jest.fn().mockResolvedValue({ username: 'mock-user', password: 'mock-password' }),
  resetGenericPassword: jest.fn().mockResolvedValue(true),
}));

// Mock react-native-background-fetch
jest.mock('react-native-background-fetch', () => ({
  configure: jest.fn().mockImplementation((config, callback) => callback('test-task')),
  scheduleTask: jest.fn().mockResolvedValue(true),
  stop: jest.fn().mockResolvedValue(true),
}));

// Mock react-native-biometrics
jest.mock('react-native-biometrics', () => {
  const MockBiometrics = jest.fn().mockImplementation(() => {
    return {
      isSensorAvailable: MockBiometrics.prototype.isSensorAvailable,
      createKeys: MockBiometrics.prototype.createKeys,
      createSignature: MockBiometrics.prototype.createSignature,
    };
  });
  MockBiometrics.prototype.isSensorAvailable = jest.fn().mockResolvedValue({ available: true, biometryType: 'FaceID', error: '' });
  MockBiometrics.prototype.createKeys = jest.fn().mockResolvedValue({ publicKey: 'mock-public-key' });
  MockBiometrics.prototype.createSignature = jest.fn().mockResolvedValue({ success: true, signature: 'mock-signature' });
  
  return {
    __esModule: true,
    default: MockBiometrics,
    BiometryTypes: {
      FaceID: 'FaceID',
      TouchID: 'TouchID',
      Biometrics: 'Biometrics',
    }
  };
});

// Mock react-native-sensors
jest.mock('react-native-sensors', () => ({
  accelerometer: {
    subscribe: jest.fn().mockReturnValue({
      unsubscribe: jest.fn(),
    }),
  },
  SensorTypes: {
    accelerometer: 'accelerometer',
  },
}));

// Mock react-native-vision-camera
jest.mock('react-native-vision-camera', () => ({
  Camera: {
    getAvailableCameraDevices: jest.fn().mockReturnValue([]),
  },
  useCameraDevices: jest.fn().mockReturnValue({ back: {} }),
  useCameraPermission: jest.fn().mockReturnValue({ hasPermission: true, requestPermission: jest.fn() }),
}));

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/Feather', () => 'Icon');
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

// Mock react-native-screens
jest.mock('react-native-screens', () => ({
  enableScreens: jest.fn(),
  ScreenContainer: 'ScreenContainer',
  Screen: 'Screen',
}));
