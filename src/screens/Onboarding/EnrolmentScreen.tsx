import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Dimensions } from 'react-native';
import { Svg, Ellipse, Defs, Mask, Rect, Path, Circle, Polyline } from 'react-native-svg';
import { Camera, useCameraDevices } from 'react-native-vision-camera';
import ReactNativeBiometrics from 'react-native-biometrics';
import Animated, { FadeIn, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
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

const CheckIcon = ({ color = '#10B981', size = 20 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <Polyline points="20 6 9 17 4 12" />
  </Svg>
);

const { width, height } = Dimensions.get('window');

type EnrolmentScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Enrolment'>;

export const EnrolmentScreen = () => {
  const navigation = useNavigation<EnrolmentScreenNavigationProp>();
  const login = useAuthStore((state) => state.login);

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    pin: '',
    confirmPin: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Face Enrolment State
  const [faceSamples, setFaceSamples] = useState(0);
  const [livenessInstruction, setLivenessInstruction] = useState('Position your face in the oval');
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);

  // Biometrics State
  const [fingerprintEnrolled, setFingerprintEnrolled] = useState(false);

  const devices = useCameraDevices();
  const device = devices.find((d) => d.position === 'front') || devices[0];

  useEffect(() => {
    (async () => {
      const status = await (Camera as any).requestCameraPermission();
      setCameraPermission(status === 'authorized');
    })();
  }, []);

  const handleNextStep = () => {
    if (step === 1) {
      const newErrors: Record<string, string> = {};
      if (!formData.name) newErrors.name = 'Name is required';
      if (!formData.email) newErrors.email = 'Email is required';
      if (formData.pin.length !== 6) newErrors.pin = 'PIN must be 6 digits';
      if (formData.pin !== formData.confirmPin) newErrors.confirmPin = 'PINs do not match';
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      setErrors({});
    }
    setStep(step + 1);
  };

  const handleCompleteEnrolment = () => {
    const user = {
      id: Math.random().toString(36).substr(2, 9),
      name: formData.name,
      email: formData.email,
      enrolledMethods: ['PIN', 'FACE', ...(fingerprintEnrolled ? ['FINGERPRINT'] : [])],
    };
    login(user, 'mock-token', new Date(Date.now() + 3600000).toISOString());
    // Navigation to AppStack happens automatically via RootNavigator
  };

  return (
    <View style={styles.container}>
      {/* Progress Indicator */}
      <View style={styles.header}>
        <View style={styles.progressContainer}>
          {[1, 2, 3, 4].map((i) => (
            <View 
              key={i} 
              style={[
                styles.progressDot, 
                step >= i && styles.progressDotActive,
                step === i && styles.progressDotCurrent
              ]} 
            />
          ))}
        </View>
        <Text style={styles.stepTitle}>
          {step === 1 && 'Personal Info'}
          {step === 2 && 'Face Enrolment'}
          {step === 3 && 'Biometrics'}
          {step === 4 && 'Complete'}
        </Text>
      </View>

      <View style={styles.stepContent}>
        {step === 1 && (
          <Animated.View entering={SlideInRight} exiting={SlideOutLeft} style={styles.form}>
            <InputField 
              label="Full Name" 
              value={formData.name} 
              onChangeText={(t: string) => setFormData({ ...formData, name: t })}
              error={errors.name}
            />
            <InputField 
              label="Email Address" 
              value={formData.email} 
              onChangeText={(t: string) => setFormData({ ...formData, email: t })}
              keyboardType="email-address"
              error={errors.email}
            />
            <InputField 
              label="6-Digit PIN" 
              value={formData.pin} 
              onChangeText={(t: string) => setFormData({ ...formData, pin: t })}
              keyboardType="numeric"
              maxLength={6}
              secureTextEntry
              error={errors.pin}
            />
            <InputField 
              label="Confirm PIN" 
              value={formData.confirmPin} 
              onChangeText={(t: string) => setFormData({ ...formData, confirmPin: t })}
              keyboardType="numeric"
              maxLength={6}
              secureTextEntry
              error={errors.confirmPin}
            />
            <PrimaryButton label="Continue" onPress={handleNextStep} />
          </Animated.View>
        )}

        {step === 2 && (
          <Animated.View entering={SlideInRight} style={styles.cameraStep}>
            {cameraPermission && device ? (
              <View style={styles.cameraContainer}>
                <Camera
                  style={StyleSheet.absoluteFill}
                  device={device}
                  isActive={true}
                />
                <FaceGuideOverlay />
                <View style={styles.cameraOverlay}>
                  <Text style={styles.cameraInstruction}>{livenessInstruction}</Text>
                  <View style={styles.sampleCounter}>
                    <Text style={styles.sampleText}>{faceSamples}/5 Samples</Text>
                  </View>
                </View>
                {/* Simulated Capture Trigger */}
                {faceSamples < 5 && (
                  <Pressable 
                    style={styles.captureSimBtn} 
                    onPress={() => {
                      setFaceSamples(prev => prev + 1);
                      if (faceSamples === 1) setLivenessInstruction('Turn head Left');
                      if (faceSamples === 2) setLivenessInstruction('Turn head Right');
                      if (faceSamples === 3) setLivenessInstruction('Blink Now');
                      if (faceSamples === 4) setLivenessInstruction('Face Enrolled ✓');
                    }}
                  >
                    <Text style={styles.captureSimText}>Simulate Capture</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <Text style={styles.errorText}>Camera permission required</Text>
            )}
            <PrimaryButton 
              label="Continue" 
              onPress={handleNextStep} 
              disabled={faceSamples < 5} 
              style={{ marginTop: SPACING[24] }}
            />
          </Animated.View>
        )}

        {step === 3 && (
          <Animated.View entering={SlideInRight} style={styles.biometricStep}>
            <View style={styles.iconCircle}>
              <FingerprintIcon color={COLORS.primary} size={48} />
            </View>
            <Text style={styles.instructionLarge}>Enable Fingerprint</Text>
            <Text style={styles.instructionSmall}>Secure your account with native biometric authentication.</Text>
            
            {fingerprintEnrolled ? (
              <View style={styles.successBadge}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <CheckIcon color={COLORS.success} size={18} />
                  <Text style={styles.successText}>Fingerprint Enrolled</Text>
                </View>
              </View>
            ) : (
              <PrimaryButton 
                label="Enrol Fingerprint" 
                onPress={async () => {
                  const rnBiometrics = new ReactNativeBiometrics();
                  const { success } = await rnBiometrics.simplePrompt({ promptMessage: 'Confirm fingerprint' });
                  if (success) setFingerprintEnrolled(true);
                }} 
              />
            )}
            
            <Pressable style={styles.skipBtn} onPress={handleNextStep}>
              <Text style={styles.skipBtnText}>Skip for now</Text>
            </Pressable>
            {fingerprintEnrolled && <PrimaryButton label="Continue" onPress={handleNextStep} />}
          </Animated.View>
        )}

        {step === 4 && (
          <Animated.View entering={SlideInRight} style={styles.summaryStep}>
            <Text style={styles.instructionLarge}>Enrolment Complete</Text>
            <View style={styles.summaryCard}>
              <SummaryItem label="Personal Info" status="✓" />
              <SummaryItem label="Face Enrolment" status="✓" />
              <SummaryItem label="Fingerprint" status={fingerprintEnrolled ? '✓' : 'Optional'} />
            </View>
            <Text style={styles.summaryInfo}>
              Your identity is now protected. We will continuously verify your presence using these signals to keep your account safe.
            </Text>
            <PrimaryButton label="Start Protecting My Account" onPress={handleCompleteEnrolment} />
          </Animated.View>
        )}
      </View>
    </View>
  );
};

const InputField = ({ label, error, ...props }: any) => (
  <View style={styles.inputContainer}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TextInput 
      style={[styles.input, error && styles.inputError]} 
      placeholderTextColor={COLORS.textMuted}
      {...props} 
    />
    {error && <Text style={styles.fieldError}>{error}</Text>}
  </View>
);

const SummaryItem = ({ label, status }: { label: string, status: any }) => (
  <View style={styles.summaryItem}>
    <Text style={styles.summaryLabel}>{label}</Text>
    {status === 'Optional' ? (
      <Text style={styles.summaryStatusText}>{status}</Text>
    ) : (
      <CheckIcon color={COLORS.success} size={18} />
    )}
  </View>
);

const PrimaryButton = ({ label, onPress, disabled, style }: any) => (
  <Pressable 
    style={[styles.btn, disabled && styles.btnDisabled, style]} 
    onPress={onPress}
    disabled={disabled}
  >
    <Text style={styles.btnText}>{label}</Text>
  </Pressable>
);

const FaceGuideOverlay = () => (
  <Svg height={height * 0.6} width={width - SPACING[48]} style={styles.svgOverlay}>
    <Defs>
      <Mask id="mask">
        <Rect height="100%" width="100%" fill="white" />
        <Ellipse cx={(width - SPACING[48]) / 2} cy={(height * 0.6) / 2} rx="100" ry="140" fill="black" />
      </Mask>
    </Defs>
    <Rect height="100%" width="100%" fill="rgba(10, 14, 26, 0.8)" mask="url(#mask)" />
    <Ellipse 
      cx={(width - SPACING[48]) / 2} 
      cy={(height * 0.6) / 2} 
      rx="100" 
      ry="140" 
      fill="none" 
      stroke={COLORS.primary} 
      strokeWidth="2" 
      strokeDasharray="10 5"
    />
  </Svg>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: SPACING[24] },
  header: { paddingTop: SPACING[64], marginBottom: SPACING[32] },
  progressContainer: { flexDirection: 'row', gap: SPACING[8], marginBottom: SPACING[16] },
  progressDot: { flex: 1, height: 4, backgroundColor: COLORS.border, borderRadius: 2 },
  progressDotActive: { backgroundColor: COLORS.primary },
  progressDotCurrent: { backgroundColor: COLORS.secondary },
  stepTitle: { fontFamily: TYPOGRAPHY.families.heading, fontSize: TYPOGRAPHY.sizes.xl, color: COLORS.textPrimary },
  stepContent: { flex: 1 },
  form: { gap: SPACING[16] },
  inputContainer: { gap: SPACING[8] },
  inputLabel: { color: COLORS.textSecondary, fontSize: TYPOGRAPHY.sizes.sm },
  input: { height: 50, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, paddingHorizontal: SPACING[16], color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border },
  inputError: { borderColor: COLORS.danger },
  fieldError: { color: COLORS.danger, fontSize: TYPOGRAPHY.sizes.xs },
  btn: { height: 56, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center', ...SHADOWS.medium },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: COLORS.textPrimary, fontWeight: '600', fontSize: TYPOGRAPHY.sizes.md },
  cameraStep: { flex: 1 },
  cameraContainer: { height: height * 0.6, borderRadius: RADIUS.lg, overflow: 'hidden', backgroundColor: '#000' },
  cameraOverlay: { position: 'absolute', bottom: 20, width: '100%', alignItems: 'center' },
  cameraInstruction: { color: '#fff', fontSize: TYPOGRAPHY.sizes.md, textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 20 },
  sampleCounter: { marginTop: 10, backgroundColor: COLORS.secondary, paddingHorizontal: 15, paddingVertical: 5, borderRadius: 15 },
  sampleText: { color: '#fff', fontSize: TYPOGRAPHY.sizes.xs, fontWeight: 'bold' },
  svgOverlay: { position: 'absolute' },
  captureSimBtn: { position: 'absolute', top: 20, right: 20, backgroundColor: COLORS.elevated, padding: 10, borderRadius: 10 },
  captureSimText: { color: COLORS.primary, fontSize: 10 },
  biometricStep: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING[24] },
  iconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.primary },
  instructionLarge: { color: COLORS.textPrimary, fontSize: TYPOGRAPHY.sizes.xl, fontWeight: 'bold' },
  instructionSmall: { color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: 40 },
  successBadge: { backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: 15, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.success },
  successText: { color: COLORS.success, fontWeight: 'bold' },
  skipBtn: { padding: 10 },
  skipBtnText: { color: COLORS.textMuted },
  summaryStep: { flex: 1, gap: SPACING[24] },
  summaryCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING[20], gap: SPACING[16], borderWidth: 1, borderColor: COLORS.border },
  summaryItem: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { color: COLORS.textSecondary },
  summaryStatus: { color: COLORS.success, fontWeight: 'bold' },
  summaryStatusText: { color: COLORS.textMuted, fontWeight: 'bold', fontSize: TYPOGRAPHY.sizes.sm },
  summaryInfo: { color: COLORS.textSecondary, textAlign: 'center', fontSize: TYPOGRAPHY.sizes.sm, lineHeight: 20 },
  errorText: { color: COLORS.danger, textAlign: 'center', marginTop: 100 }
});
