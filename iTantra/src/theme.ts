// iTantra Design System — Modern Neutral Light Theme
// Inspired by Linear, Notion, and Apple Human Interface Guidelines.
// Clean, professional, minimal, and trustworthy.

// ─────────────────────────────────────────────────────────────────────────────
// LIGHT MODE PALETTE
// ─────────────────────────────────────────────────────────────────────────────
export const COLORS = {
  // Backgrounds
  background: '#F7F7F5',    // Warm off-white canvas
  surface: '#FFFFFF',       // Elevated surface (cards, sheets)
  card: '#FFFFFF',          // Card background
  cardRaised: '#F0F0EE',    // Hover / slightly elevated
  cardInner: '#F4F4F2',     // Nested inputs / inner containers
  sheet: '#FFFFFF',

  // Primary Accent — Indigo Blue (restrained, intentional)
  primary: '#2563EB',
  primaryBright: '#3B82F6',
  primaryDim: '#1D4ED8',
  primarySoft: 'rgba(37, 99, 235, 0.08)',
  primaryText: '#FFFFFF',

  // Secondary Accent — Teal (used for incoming/live states)
  accent: '#0891B2',
  accentBright: '#06B6D4',
  accentSoft: 'rgba(8, 145, 178, 0.08)',

  // Emergency / SOS
  sos: '#DC2626',
  sosBright: '#EF4444',
  sosDark: '#B91C1C',
  sosSoft: 'rgba(220, 38, 38, 0.07)',

  // Status Colors
  success: '#16A34A',
  successSoft: 'rgba(22, 163, 74, 0.08)',
  danger: '#DC2626',
  warning: '#D97706',
  warningSoft: 'rgba(217, 119, 6, 0.08)',
  info: '#0891B2',
  infoSoft: 'rgba(8, 145, 178, 0.08)',
  link: '#2563EB',
  translateBlue: '#EFF6FF',

  // Typography
  textPrimary: '#111111',   // High-contrast primary text
  textSecondary: '#6B6B6B', // Secondary / supporting text
  textMuted: '#9CA3AF',     // Timestamps, captions, labels
  textOnPrimary: '#FFFFFF', // Text on colored buttons

  // Borders
  border: '#E7E7E7',
  borderSoft: '#F0F0EE',
  borderStrong: '#D1D5DB',
  borderHighlight: 'rgba(37, 99, 235, 0.25)',

  // HUD / Telemetry (light)
  hudBg: '#F8FAFF',
  hudBorder: '#E0E7FF',
  hudText: '#2563EB',
  hudDim: '#9CA3AF',
  hudGlow: 'rgba(37, 99, 235, 0.06)',

  // Utilities
  black: '#000000',
  white: '#FFFFFF',
  overlay: 'rgba(17, 17, 17, 0.5)',
  track: '#E5E7EB',
};

// ─────────────────────────────────────────────────────────────────────────────
// DARK MODE PALETTE (not an inversion — intentional dark palette)
// ─────────────────────────────────────────────────────────────────────────────
export const DARK_COLORS = {
  background: '#0F1117',
  surface: '#171B26',
  card: '#1C2132',
  cardRaised: '#222A3C',
  cardInner: '#252D42',
  sheet: '#181C2A',

  primary: '#3B82F6',
  primaryBright: '#60A5FA',
  primaryDim: '#2563EB',
  primarySoft: 'rgba(59, 130, 246, 0.12)',
  primaryText: '#FFFFFF',

  accent: '#06B6D4',
  accentBright: '#22D3EE',
  accentSoft: 'rgba(6, 182, 212, 0.12)',

  sos: '#F43F5E',
  sosBright: '#FB7185',
  sosDark: '#E11D48',
  sosSoft: 'rgba(244, 63, 94, 0.12)',

  success: '#10B981',
  successSoft: 'rgba(16, 185, 129, 0.12)',
  danger: '#F43F5E',
  warning: '#F59E0B',
  warningSoft: 'rgba(245, 158, 11, 0.12)',
  info: '#06B6D4',
  infoSoft: 'rgba(6, 182, 212, 0.12)',
  link: '#60A5FA',
  translateBlue: '#1E2A3C',

  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textOnPrimary: '#FFFFFF',

  border: '#1E2A3C',
  borderSoft: '#18213A',
  borderStrong: '#2D3A50',
  borderHighlight: 'rgba(59, 130, 246, 0.3)',

  hudBg: '#111827',
  hudBorder: '#1E2A3C',
  hudText: '#60A5FA',
  hudDim: '#64748B',
  hudGlow: 'rgba(59, 130, 246, 0.1)',

  black: '#000000',
  white: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.7)',
  track: '#1E2A3C',
};

// ─────────────────────────────────────────────────────────────────────────────
// RADIUS — consistent corner radius scale
// ─────────────────────────────────────────────────────────────────────────────
export const RADIUS = {
  xs: 6,
  sm: 10,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999,
  circle: 9999,
};

// ─────────────────────────────────────────────────────────────────────────────
// SPACING — 4pt grid
// ─────────────────────────────────────────────────────────────────────────────
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// ─────────────────────────────────────────────────────────────────────────────
// TYPOGRAPHY — scale with intentional weights
// Use Inter (loaded via expo-font or system fallback)
// ─────────────────────────────────────────────────────────────────────────────
export const TYPOGRAPHY = {
  display: { fontSize: 32, fontWeight: '700' as const, lineHeight: 40, letterSpacing: -0.5 },
  headline: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32, letterSpacing: -0.3 },
  title: { fontSize: 18, fontWeight: '600' as const, lineHeight: 26, letterSpacing: -0.2 },
  titleSmall: { fontSize: 15, fontWeight: '600' as const, lineHeight: 22, letterSpacing: -0.1 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 24, letterSpacing: 0 },
  bodyMedium: { fontSize: 14, fontWeight: '500' as const, lineHeight: 22, letterSpacing: 0 },
  bodySmall: { fontSize: 13, fontWeight: '400' as const, lineHeight: 20, letterSpacing: 0 },
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 18, letterSpacing: 0.1 },
  captionMedium: { fontSize: 11, fontWeight: '500' as const, lineHeight: 16, letterSpacing: 0.2 },
  label: { fontSize: 13, fontWeight: '500' as const, lineHeight: 18, letterSpacing: 0.1 },
  button: { fontSize: 15, fontWeight: '600' as const, lineHeight: 22, letterSpacing: 0.1 },
  buttonSmall: { fontSize: 13, fontWeight: '600' as const, lineHeight: 18, letterSpacing: 0.1 },
  mono: { fontSize: 12, fontWeight: '500' as const, lineHeight: 18, letterSpacing: 0.3 },
};

// ─────────────────────────────────────────────────────────────────────────────
// SHADOWS — soft, light-appropriate
// ─────────────────────────────────────────────────────────────────────────────
export const SHADOW = {
  none: {},
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 5,
  },
  blue: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 6,
  },
  orange: {
    shadowColor: '#0891B2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 6,
  },
  sos: {
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 7,
  },
  // Kept for backward compat
  lime: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  lcd: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ALERT COLORS — clean semantic accents
// ─────────────────────────────────────────────────────────────────────────────
export const ALERT_COLORS: Record<string, string> = {
  flood: '#0891B2',   // Teal
  evac: '#D97706',    // Amber
  medical: '#DC2626', // Red
  fire: '#EA580C',    // Orange
  quake: '#7C3AED',   // Purple
  warn: '#CA8A04',    // Yellow
  custom: '#2563EB',  // Primary blue
};
