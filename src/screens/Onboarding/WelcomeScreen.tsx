import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withRepeat, 
  withDelay, 
  withSequence,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../navigation/types';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../theme';

type WelcomeScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Welcome'>;

export const WelcomeScreen = () => {
  const navigation = useNavigation<WelcomeScreenNavigationProp>();

  // Animation values
  const shieldScale = useSharedValue(0);
  const shieldOpacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0.3);
  const textOpacity = useSharedValue(0);
  const pillsTranslateY = useSharedValue(50);
  const buttonsOpacity = useSharedValue(0);

  useEffect(() => {
    // 1. Shield Entrance
    shieldScale.value = withTiming(1, { duration: 600 });
    shieldOpacity.value = withTiming(1, { duration: 600 });

    // 2. Continuous Shield Glow Pulse
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1500 }),
        withTiming(0.3, { duration: 1500 })
      ),
      -1,
      true
    );

    // 3. Text Staggered Entrance
    textOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));

    // 4. Pills Slide Up
    pillsTranslateY.value = withDelay(800, withTiming(0, { duration: 800 }));

    // 5. Buttons Appearance
    buttonsOpacity.value = withDelay(1200, withTiming(1, { duration: 600 }));
  }, []);

  const animatedShieldStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shieldScale.value }],
    opacity: shieldOpacity.value,
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: interpolate(glowOpacity.value, [0.3, 0.8], [1, 1.2], Extrapolate.CLAMP) }],
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: interpolate(textOpacity.value, [0, 1], [10, 0]) }],
  }));

  const animatedPillsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pillsTranslateY.value, [50, 0], [0, 1]),
    transform: [{ translateY: pillsTranslateY.value }],
  }));

  const animatedButtonsStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Background Live System Effect (Subtle Glows) */}
      <View style={styles.bgGlow} />

      <View style={styles.content}>
        {/* Shield Icon Area */}
        <View style={styles.shieldWrapper}>
          <Animated.View style={[styles.glowCircle, animatedGlowStyle]} />
          <Animated.View style={[styles.shieldIcon, animatedShieldStyle]}>
            <View style={styles.shieldCore} />
            <View style={styles.shieldRim} />
          </Animated.View>
        </View>

        {/* Branding */}
        <Animated.View style={[styles.brandContainer, animatedTextStyle]}>
          <Text style={styles.title}>MMCA</Text>
          <Text style={styles.tagline}>Continuous identity protection</Text>
        </Animated.View>

        {/* Feature Pills */}
        <Animated.View style={[styles.pillsContainer, animatedPillsStyle]}>
          <Pill label="Multi-Biometric" />
          <Pill label="Always Verifying" />
          <Pill label="IoT Aware" />
        </Animated.View>
      </View>

      {/* Buttons Section */}
      <Animated.View style={[styles.footer, animatedButtonsStyle]}>
        <Pressable 
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Enrolment', { step: 1 })}
        >
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </Pressable>

        <Pressable 
          style={styles.ghostButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.ghostButtonText}>I already have an account</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
};

const Pill = ({ label }: { label: string }) => (
  <View style={styles.pill}>
    <Text style={styles.pillText}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING[24],
  },
  bgGlow: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: COLORS.primary,
    opacity: 0.05,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shieldWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING[40],
  },
  glowCircle: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary,
    opacity: 0.4,
  },
  shieldIcon: {
    width: 80,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shieldCore: {
    width: 50,
    height: 60,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    ...SHADOWS.strong,
  },
  shieldRim: {
    position: 'absolute',
    width: 80,
    height: 90,
    borderWidth: 2,
    borderColor: COLORS.secondary,
    borderRadius: RADIUS.md,
    opacity: 0.6,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: SPACING[48],
  },
  title: {
    fontFamily: TYPOGRAPHY.families.heading,
    fontSize: TYPOGRAPHY.sizes['3xl'],
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.textPrimary,
    letterSpacing: 2,
    marginBottom: SPACING[8],
  },
  tagline: {
    fontFamily: TYPOGRAPHY.families.body,
    fontSize: TYPOGRAPHY.sizes.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING[12],
  },
  pill: {
    paddingHorizontal: SPACING[12],
    paddingVertical: SPACING[6],
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
  },
  pillText: {
    fontFamily: TYPOGRAPHY.families.medium,
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footer: {
    paddingBottom: SPACING[48],
    gap: SPACING[16],
  },
  primaryButton: {
    height: 56,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  primaryButtonText: {
    fontFamily: TYPOGRAPHY.families.semibold,
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.textPrimary,
  },
  ghostButton: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ghostButtonText: {
    fontFamily: TYPOGRAPHY.families.medium,
    fontSize: TYPOGRAPHY.sizes.base,
    color: COLORS.textSecondary,
  },
});
