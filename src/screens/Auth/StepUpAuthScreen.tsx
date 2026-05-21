import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, BackHandler, Dimensions } from 'react-native';
import { Camera, useCameraDevices } from 'react-native-vision-camera';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Svg, Ellipse, Defs, Mask, Rect, Path, Circle } from 'react-native-svg';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTrustStore } from '../../store/trustStore';
import { useAuthStore } from '../../store/authStore';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../theme';

const WarningShieldIcon = ({ color = '#F59E0B', size = 48, style }: { color?: string; size?: number; style?: any }) => (
  <View style={style}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <Path d="M12 8v4" />
      <Path d="M12 16h.01" />
    </Svg>
  </View>
);

const { width, height } = Dimensions.get('window');

export const StepUpAuthScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { reason = 'Unusual activity detected' } = route.params || {};
  
  const trustScore = useTrustStore((state) => state.trustScore);
  const updateTrustScore = useTrustStore((state) => state.updateTrustScore);
  const logout = useAuthStore((state) => state.logout);

  const [mode, setMode] = useState<'FACE' | 'PIN'>('FACE');
  const [pin, setPin] = useState('');
  const [failures, setFailures] = useState(0);

  const devices = useCameraDevices();
  const device = devices.find((d) => d.position === 'front') || devices[0];

  // Disable hardware back button on Android
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => backHandler.remove();
  }, []);

  const onSuccess = () => {
    updateTrustScore(100);
    navigation.goBack();
  };

  const onFailure = () => {
    const newFailures = failures + 1;
    setFailures(newFailures);
    if (newFailures >= 3) {
      logout();
      // Navigation to Login will happen via RootNavigator automatically
    }
  };

  const handlePinPress = (val: string) => {
    if (pin.length < 6) {
      const newPin = pin + val;
      setPin(newPin);
      if (newPin.length === 6) {
        if (newPin === '123456') { // Mock PIN validation
          onSuccess();
        } else {
          onFailure();
          setPin('');
        }
      }
    }
  };

  return (
    <View style={styles.overlay}>
      <Animated.View entering={FadeInUp} style={styles.modal}>
        {/* Warning Header */}
        <View style={styles.header}>
          <WarningShieldIcon color={COLORS.warning} size={48} style={{ marginBottom: 12 }} />
          <Text style={styles.title}>Security Verification</Text>
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreText}>Trust Score: {trustScore}/100</Text>
          </View>
          <Text style={styles.reasonText}>{reason}</Text>
          <Text style={styles.promptText}>Please verify it's still you</Text>
        </View>

        {/* Content Area */}
        <View style={styles.content}>
          {mode === 'FACE' ? (
            <View style={styles.cameraSection}>
              <View style={styles.cameraWrapper}>
                {device && (
                  <Camera style={StyleSheet.absoluteFill} device={device} isActive={true} />
                )}
                <FaceGuide />
              </View>
              <Text style={styles.scanningText}>Scanning face...</Text>
              <Pressable style={styles.simBtn} onPress={onSuccess}>
                <Text style={styles.simBtnText}>Simulate Success</Text>
              </Pressable>
              <Pressable style={styles.switchBtn} onPress={() => setMode('PIN')}>
                <Text style={styles.switchText}>Use PIN instead</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.pinSection}>
              <View style={styles.pinDisplay}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <View key={i} style={[styles.pinDot, pin.length >= i && styles.pinDotFilled]} />
                ))}
              </View>
              <View style={styles.keypad}>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((key, i) => (
                  <Pressable 
                    key={i} 
                    style={styles.key}
                    onPress={() => key === '⌫' ? setPin(pin.slice(0, -1)) : key !== '' && handlePinPress(key)}
                  >
                    <Text style={styles.keyText}>{key}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable style={styles.switchBtn} onPress={() => setMode('FACE')}>
                <Text style={styles.switchText}>Use Face Recognition</Text>
              </Pressable>
            </View>
          )}
        </View>

        {failures > 0 && (
          <Text style={styles.failureText}>
            Verification failed. {3 - failures} attempts remaining before logout.
          </Text>
        )}
      </Animated.View>
    </View>
  );
};

const FaceGuide = () => (
  <Svg height={200} width={160} style={styles.svgOverlay}>
    <Defs>
      <Mask id="mask">
        <Rect height="100%" width="100%" fill="white" />
        <Ellipse cx="80" cy="100" rx="60" ry="80" fill="black" />
      </Mask>
    </Defs>
    <Rect height="100%" width="100%" fill="rgba(17, 24, 39, 0.8)" mask="url(#mask)" />
    <Ellipse cx="80" cy="100" rx="60" ry="80" fill="none" stroke={COLORS.warning} strokeWidth="2" />
  </Svg>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    padding: SPACING[24],
  },
  modal: {
    backgroundColor: COLORS.elevated,
    borderRadius: RADIUS.lg,
    padding: SPACING[24],
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    ...SHADOWS.strong,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING[24],
  },
  warningIcon: {
    fontSize: 40,
    marginBottom: SPACING[12],
  },
  title: {
    fontFamily: TYPOGRAPHY.families.heading,
    fontSize: TYPOGRAPHY.sizes.lg,
    color: COLORS.textPrimary,
    marginBottom: SPACING[8],
  },
  scoreBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING[12],
  },
  scoreText: {
    color: COLORS.danger,
    fontWeight: 'bold',
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  reasonText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.base,
    marginBottom: SPACING[4],
  },
  promptText: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  content: {
    alignItems: 'center',
  },
  cameraSection: {
    alignItems: 'center',
    width: '100%',
  },
  cameraWrapper: {
    width: 160,
    height: 200,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  svgOverlay: { position: 'absolute' },
  scanningText: {
    color: COLORS.textPrimary,
    marginTop: SPACING[16],
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  pinSection: {
    alignItems: 'center',
    width: '100%',
  },
  pinDisplay: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: SPACING[24],
  },
  pinDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pinDotFilled: {
    backgroundColor: COLORS.primary,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: SPACING[24],
  },
  key: {
    width: 60,
    height: 50,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyText: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: 'bold',
  },
  switchBtn: {
    marginTop: SPACING[12],
    padding: 10,
  },
  switchText: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '500',
  },
  simBtn: {
    marginTop: 10,
  },
  simBtnText: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  failureText: {
    color: COLORS.danger,
    textAlign: 'center',
    marginTop: SPACING[20],
    fontSize: TYPOGRAPHY.sizes.xs,
  }
});
