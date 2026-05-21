import { TrustScoreColors, getTrustColor } from './TrustScoreColors';

export const COLORS = {
  // Backgrounds
  background: '#0A0E1A',
  surface: '#111827',
  elevated: '#1C2333',

  // Accents
  primary: '#3B82F6',
  secondary: '#06B6D4',

  // States
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',

  // Text
  textPrimary: '#F9FAFB',
  textSecondary: '#9CA3AF',
  textMuted: '#4B5563',

  // UI Elements
  border: '#1F2937',
  
  // Trust Score Specific
  ...TrustScoreColors,
};

export const TYPOGRAPHY = {
  families: {
    heading: 'SpaceGrotesk-Bold',
    body: 'Inter-Regular',
    medium: 'Inter-Medium',
    semibold: 'Inter-SemiBold',
  },
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 30,
    '3xl': 36,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

export const SPACING = {
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  32: 32,
  40: 40,
  48: 48,
  64: 64,
};

export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const SHADOWS = {
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  strong: {
    shadowColor: '#3B82F6', // Glow effect for strong elements
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
};

export { getTrustColor };

export type Theme = {
  colors: typeof COLORS;
  typography: typeof TYPOGRAPHY;
  spacing: typeof SPACING;
  radius: typeof RADIUS;
  shadows: typeof SHADOWS;
};
