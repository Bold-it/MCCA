import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, LayoutAnimation } from 'react-native';
import { Camera, useCameraDevices } from 'react-native-vision-camera';
import ReactNativeBiometrics from 'react-native-biometrics';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  FadeIn
} from 'react-native-reanimated';
import { Svg, Ellipse, Defs, Mask, Rect, Circle, Path } from 'react-native-svg';
import { useAuthStore } from '../../store/authStore';
import { useAlertStore } from '../../store/alertStore';
import { authApi } from '../../api/authApi';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../theme';

const FingerprintIcon = ({ color = '#3B82F6', size = 48 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 10a2 2 0 0 0-2 2" />
    <Path d="M14 14a4 4 0 0 0-4-4" />
    <Path d="M8 12a4 4 0 0 1 8 0" />
    <Path d="M12 2a10 10 0 0 0-10 10" />
    <Path d="M12 6a6 6 0 0 0-6 6" />
    <Path d="M20 12a8 8 0 0 0-8-8" />
    <Path d="M12 18a6 6 0 0 0 6-6" />
    <Path d="M12 22a10 10 0 0 0 10-10" />
  </Svg>
);

const LockIcon = ({ color = '#EF4444', size = 48, style }: { color?: string; size?: number; style?: any }) => (
  <View style={style}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </Svg>
  </View>
);

const { width, height } = Dimensions.get('window');

type LoginMode = 'FACE' | 'FINGERPRINT' | 'PIN';

export const LoginScreen = () => {
  const [mode, setMode] = useState<LoginMode>('FACE');
  const [pin, setPin] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimeRemaining, setLockTimeRemaining] = useState(0);
  
  const login = useAuthStore((state) => state.login);
  const addAlert = useAlertStore((state) => state.addAlert);

  const devices = useCameraDevices();
  const device = devices.find((d) => d.position === 'front') || devices[0];

  // Animations
  const pulseValue = useSharedValue(1);

  useEffect(() => {
    if (mode === 'FINGERPRINT' && !isLocked) {
      handleFingerprintAuth();
    }
  }, [mode]);

  useEffect(() => {
    if (isLocked) {
      const timer = setInterval(() => {
        setLockTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsLocked(false);
            setFailedAttempts(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isLocked]);

  useEffect(() => {
    pulseValue.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      true
    );
  }, []);

  const handleFingerprintAuth = async () => {
    try {
      const rnBiometrics = new ReactNativeBiometrics();
      const { success } = await rnBiometrics.simplePrompt({ promptMessage: 'Authenticate to access MMCA' });
      if (success) {
        onSuccess();
      } else {
        onFailure('Biometric authentication failed');
      }
    } catch (e) {
      onFailure('Biometrics not available');
    }
  };

  const onSuccess = async () => {
    // Call API and update store
    const response: any = await authApi.login({ 
      method: mode, 
      identifier: 'user-email', // In real app, get from store/local
      credentials: mode === 'PIN' ? pin : 'biometric-token'
    });
    
    if (response.data.success) {
      login(response.data.user, response.data.token, 'expiry-date');
    }
  };

  const onFailure = (reason: string) => {
    const newFailures = failedAttempts + 1;
    setFailedAttempts(newFailures);
    
    addAlert({
      id: Math.random().toString(),
      type: 'SECURITY_ALERT',
      message: `Failed login attempt via ${mode}: ${reason}`,
      severity: 'WARNING',
      timestamp: new Date().toISOString(),
      read: false
    });

    if (newFailures >= 5) {
      setIsLocked(true);
      setLockTimeRemaining(900); // 15 minutes
    }
  };

  const handlePinPress = (val: string) => {
    if (isLocked) return;
    if (pin.length < 6) {
      const newPin = pin + val;
      setPin(newPin);
      if (newPin.length === 6) {
        if (newPin === '123456') { // Mock PIN
          onSuccess();
        } else {
          onFailure('Incorrect PIN');
          setPin('');
        }
      }
    }
  };

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseValue.value }],
    opacity: pulseValue.value - 0.2,
  }));

  if (isLocked) {
    const minutes = Math.floor(lockTimeRemaining / 60);
    const seconds = lockTimeRemaining % 60;
    return (
      <View style={[styles.container, styles.center]}>
        <LockIcon color={COLORS.danger} size={54} style={{ marginBottom: 20 }} />
        <Text style={styles.title}>System Locked</Text>
        <Text style={styles.errorText}>Too many failed attempts.</Text>
        <Text style={styles.timerText}>{minutes}:{seconds < 10 ? `0${seconds}` : seconds}</Text>
        <Text style={styles.instruction}>Please wait before trying again.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>MMCA</Text>
        <View style={styles.tabBar}>
          <TabButton label="Face" active={mode === 'FACE'} onPress={() => setMode('FACE')} />
          <TabButton label="Fingerprint" active={mode === 'FINGERPRINT'} onPress={() => setMode('FINGERPRINT')} />
          <TabButton label="PIN" active={mode === 'PIN'} onPress={() => setMode('PIN')} />
        </View>
      </View>

      <View style={styles.content}>
        {mode === 'FACE' && (
          <View style={styles.modeContainer}>
            <View style={styles.cameraContainer}>
              {device && (
                <Camera style={StyleSheet.absoluteFill} device={device} isActive={true} />
              )}
              <FaceGuideOverlay />
            </View>
            <Text style={styles.scanningText}>Looking for your face...</Text>
            {failedAttempts > 2 && (
              <Text style={styles.warningText}>{5 - failedAttempts} attempts remaining</Text>
            )}
            {/* Simulation Trigger */}
            <Pressable style={styles.simBtn} onPress={onSuccess}>
              <Text style={styles.simBtnText}>Simulate Recognition</Text>
            </Pressable>
          </View>
        )}

        {mode === 'FINGERPRINT' && (
          <View style={styles.modeContainer}>
            <Animated.View style={[styles.pulseCircle, animatedPulseStyle]} />
            <View style={styles.iconCircle}>
              <FingerprintIcon color={COLORS.primary} size={48} />
            </View>
            <Text style={styles.instruction}>Touch the sensor to authenticate</Text>
            {failedAttempts > 2 && (
              <Text style={styles.warningText}>{5 - failedAttempts} attempts remaining</Text>
            )}
            <Pressable style={styles.simBtn} onPress={handleFingerprintAuth}>
              <Text style={styles.simBtnText}>Retry Sensor</Text>
            </Pressable>
          </View>
        )}

        {mode === 'PIN' && (
          <View style={styles.modeContainer}>
            <View style={styles.pinDisplay}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <View 
                  key={i} 
                  style={[styles.pinDot, pin.length >= i && styles.pinDotFilled]} 
                />
              ))}
            </View>
            <View style={styles.keypad}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((key, i) => (
                <Pressable 
                  key={i} 
                  style={styles.key}
                  onPress={() => {
                    if (key === '⌫') setPin(pin.slice(0, -1));
                    else if (key !== '') handlePinPress(key);
                  }}
                >
                  <Text style={styles.keyText}>{key}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.forgotLink}>
              <Text style={styles.forgotText}>Forgot PIN?</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.supportText}>Having trouble? Contact support</Text>
      </View>
    </View>
  );
};

const TabButton = ({ label, active, onPress }: any) => (
  <Pressable style={styles.tab} onPress={onPress}>
    <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    {active && <View style={styles.activeLine} />}
  </Pressable>
);

const FaceGuideOverlay = () => (
  <Svg height={300} width={250} style={styles.svgOverlay}>
    <Defs>
      <Mask id="mask">
        <Rect height="100%" width="100%" fill="white" />
        <Ellipse cx="125" cy="150" rx="80" ry="110" fill="black" />
      </Mask>
    </Defs>
    <Rect height="100%" width="100%" fill="rgba(10, 14, 26, 0.8)" mask="url(#mask)" />
    <Ellipse cx="125" cy="150" rx="80" ry="110" fill="none" stroke={COLORS.primary} strokeWidth="2" strokeDasharray="10 5" />
  </Svg>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center', padding: SPACING[24] },
  header: { paddingTop: SPACING[64], paddingHorizontal: SPACING[24], alignItems: 'center' },
  logo: { fontFamily: TYPOGRAPHY.families.heading, fontSize: TYPOGRAPHY.sizes.xl, color: COLORS.primary, marginBottom: SPACING[24] },
  tabBar: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { paddingVertical: SPACING[12], alignItems: 'center', minWidth: 80 },
  tabText: { color: COLORS.textSecondary, fontSize: TYPOGRAPHY.sizes.base, fontWeight: '500' },
  tabTextActive: { color: COLORS.primary },
  activeLine: { position: 'absolute', bottom: -1, width: '100%', height: 2, backgroundColor: COLORS.primary },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: SPACING[24] },
  modeContainer: { alignItems: 'center' },
  cameraContainer: { width: 250, height: 300, borderRadius: RADIUS.lg, overflow: 'hidden', backgroundColor: '#000' },
  svgOverlay: { position: 'absolute' },
  scanningText: { color: COLORS.textPrimary, marginTop: SPACING[24], fontSize: TYPOGRAPHY.sizes.md, fontFamily: TYPOGRAPHY.families.medium },
  warningText: { color: COLORS.warning, marginTop: 10, fontSize: TYPOGRAPHY.sizes.sm },
  errorText: { color: COLORS.danger, fontSize: TYPOGRAPHY.sizes.base, marginBottom: 10 },
  timerText: { fontSize: 48, fontWeight: 'bold', color: COLORS.textPrimary, marginVertical: 20 },
  pulseCircle: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: COLORS.primary },
  iconCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.primary },
  instruction: { color: COLORS.textSecondary, marginTop: SPACING[24], textAlign: 'center' },
  pinDisplay: { flexDirection: 'row', gap: SPACING[16], marginBottom: SPACING[48] },
  pinDot: { width: 15, height: 15, borderRadius: 7.5, borderWidth: 2, borderColor: COLORS.border },
  pinDotFilled: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  keypad: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: SPACING[16] },
  key: { width: (width - SPACING[48] - SPACING[32]) / 3, height: 60, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center', ...SHADOWS.subtle },
  keyText: { color: COLORS.textPrimary, fontSize: TYPOGRAPHY.sizes.xl, fontWeight: '600' },
  forgotLink: { marginTop: SPACING[24] },
  forgotText: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.sizes.sm },
  footer: { paddingBottom: SPACING[48], alignItems: 'center' },
  supportText: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.sizes.xs },
  simBtn: { marginTop: 40, padding: 10 },
  simBtnText: { color: COLORS.primary, fontSize: 12 },
  title: { color: COLORS.textPrimary, fontSize: TYPOGRAPHY.sizes.xl, fontWeight: 'bold', marginBottom: 10 }
});
