import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  Dimensions,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../../theme';
import { useApp } from '../../context/AppContext';
import { EngineErrorCard } from '../../components/EngineStatus';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'> & {
  hasOnboarded: boolean;
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_SMALL_SCREEN = SCREEN_HEIGHT < 700;

export default function SplashScreen({ navigation, hasOnboarded }: Props) {
  const { initializeEngine, initState, initError } = useApp();
  const progress = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.94)).current;
  const brandOpacity = useRef(new Animated.Value(0)).current;
  const brandTranslate = useRef(new Animated.Value(16)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const badgesOpacity = useRef([0, 0, 0].map(() => new Animated.Value(0))).current;
  const progressOpacity = useRef(new Animated.Value(0)).current;
  const bgGlowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Background subtle glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(bgGlowAnim, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(bgGlowAnim, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Logo fade + scale
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        speed: 12,
        bounciness: 6,
        useNativeDriver: true,
      }),
    ]).start();

    // Brand name slide up
    Animated.parallel([
      Animated.timing(brandOpacity, {
        toValue: 1,
        duration: 600,
        delay: 300,
        useNativeDriver: true,
      }),
      Animated.spring(brandTranslate, {
        toValue: 0,
        speed: 12,
        bounciness: 6,
        useNativeDriver: true,
      }),
    ]).start();

    // Tagline fade
    Animated.timing(taglineOpacity, {
      toValue: 1,
      duration: 500,
      delay: 500,
      useNativeDriver: true,
    }).start();

    // Staggered badges
    badgesOpacity.forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        delay: 700 + i * 150,
        useNativeDriver: true,
      }).start();
    });

    // Progress bar area fade in
    Animated.timing(progressOpacity, {
      toValue: 1,
      duration: 500,
      delay: 1000,
      useNativeDriver: true,
    }).start();

    // Progress bar animation
    Animated.timing(progress, {
      toValue: 1,
      duration: 2200,
      useNativeDriver: false,
    }).start();

    initializeEngine();

    const t = setTimeout(() => {}, 2600);
    return () => clearTimeout(t);
  }, [
    navigation,
    hasOnboarded,
    progress,
    logoOpacity,
    logoScale,
    brandOpacity,
    brandTranslate,
    taglineOpacity,
    progressOpacity,
    bgGlowAnim,
    initializeEngine,
  ]);

  useEffect(() => {
    if (initState !== 'ready') return;
    const t = setTimeout(() => {
      navigation.replace(hasOnboarded ? 'ModeSelect' : 'Onboarding');
    }, 400);
    return () => clearTimeout(t);
  }, [initState, hasOnboarded, navigation]);

  return (
    <SafeAreaView style={styles.root}>
      {/* Subtle animated background glow */}
      <Animated.View
        style={[
          styles.bgGlow,
          {
            opacity: bgGlowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.15, 0.35],
            }),
          },
        ]}
      />

      {/* Top-left decorative text */}
      <View style={styles.topLeftDecor}>
        <Text style={styles.decorTextLeft}>People</Text>
        <Text style={styles.decorTextLeft}>Safer</Text>
        <Text style={styles.decorTextLeft}>Together</Text>
      </View>

      {/* Top-right decorative text */}
      <View style={styles.topRightDecor}>
        <Text style={styles.decorTextRight}>COMMUNICATE</Text>
        <Text style={styles.decorTextRight}>WITHOUT</Text>
        <Text style={styles.decorTextRight}>LIMITS</Text>
      </View>

      {/* Main content - centered with responsive spacing */}
      <View style={styles.contentContainer}>
        {/* Logo section */}
        <Animated.View
          style={[
            styles.logoWrap,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <View style={styles.iconContainer}>
            <View style={styles.iconGlow} />
            <View style={styles.iconSurface}>
              <MaterialCommunityIcons
                name="radio-handheld"
                size={52}
                color={COLORS.primary}
              />
            </View>
          </View>

          <Animated.Text
            style={[
              styles.wordmark,
              {
                opacity: brandOpacity,
                transform: [{ translateY: brandTranslate }],
              },
            ]}
          >
            iTANTRA
          </Animated.Text>

          <Animated.Text
            style={[
              styles.tagline,
              {
                opacity: taglineOpacity,
              },
            ]}
          >
            Talk. Transmit. Together.
          </Animated.Text>

          {/* Feature badges */}
          <View style={styles.pillRow}>
            {['Offline', 'Multilingual', 'AI-Powered'].map((label, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.pill,
                  {
                    opacity: badgesOpacity[i],
                    transform: [{ translateY: badgesOpacity[i].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
                  },
                ]}
              >
                <View style={styles.pillContent}>
                  {i === 0 && <MaterialCommunityIcons name="wifi-off" size={12} color={COLORS.primary} style={styles.pillIcon} />}
                  {i === 1 && <MaterialCommunityIcons name="translate" size={12} color={COLORS.primary} style={styles.pillIcon} />}
                  {i === 2 && <Ionicons name="sparkles" size={12} color={COLORS.primary} style={styles.pillIcon} />}
                  <Text style={styles.pillText}>{label}</Text>
                </View>
              </Animated.View>
            ))}
          </View>
        </Animated.View>
      </View>

      {/* Bottom loading section */}
      <Animated.View
        style={[
          styles.bottom,
          {
            opacity: progressOpacity,
          },
        ]}
      >
        <View style={styles.trackBar}>
          <Animated.View
            style={[
              styles.fillBar,
              {
                width: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['2%', '100%'],
                }),
              },
            ]}
          />
        </View>
        <Text style={styles.loadingText}>
          {initState === 'failed'
            ? 'Engine failed'
            : initState === 'ready'
            ? 'Engine ready'
            : 'Initializing mesh engine...'}
        </Text>
      </Animated.View>

      {initState === 'failed' ? (
        <View style={styles.failWrap}>
          <EngineErrorCard
            message={initError ?? 'Communication engine unavailable'}
            onRetry={() => initializeEngine()}
            onDiagnostics={() => navigation.navigate('Diagnostics')}
          />
        </View>
      ) : null}

      {/* Bottom-left decorative text */}
      <View style={styles.bottomLeftDecor}>
        <Text style={styles.decorTextBottomLeft}>CONNECTING</Text>
        <Text style={styles.decorTextBottomLeft}>COMMUNITIES</Text>
        <Text style={styles.decorTextBottomLeft}>ANYWHERE</Text>
      </View>

      {/* Bottom-right decorative text */}
      <View style={styles.bottomRightDecor}>
        <Text style={styles.decorTextBottomRight}>Built for</Text>
        <Text style={styles.decorTextBottomRight}>a Safer Tomorrow</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  // Subtle background glow
  bgGlow: {
    position: 'absolute',
    top: -SCREEN_HEIGHT * 0.3,
    left: -SCREEN_WIDTH * 0.2,
    width: SCREEN_WIDTH * 1.4,
    height: SCREEN_HEIGHT * 1.4,
    borderRadius: SCREEN_WIDTH * 0.7,
    backgroundColor: COLORS.primarySoft,
    zIndex: -1,
  },
  // Top decorative texts
  topLeftDecor: {
    position: 'absolute',
    top: IS_SMALL_SCREEN ? 24 : 48,
    left: IS_SMALL_SCREEN ? 20 : 32,
    zIndex: 1,
  },
  topRightDecor: {
    position: 'absolute',
    top: IS_SMALL_SCREEN ? 24 : 48,
    right: IS_SMALL_SCREEN ? 20 : 32,
    alignItems: 'flex-end',
    zIndex: 1,
  },
  decorTextLeft: {
    fontSize: IS_SMALL_SCREEN ? 9 : 11,
    fontWeight: '300',
    color: COLORS.textMuted,
    letterSpacing: 2.5,
    lineHeight: IS_SMALL_SCREEN ? 14 : 16,
    fontStyle: 'italic',
    textAlign: 'left',
    opacity: 0.5,
  },
  decorTextRight: {
    fontSize: IS_SMALL_SCREEN ? 8 : 9,
    fontWeight: '400',
    color: COLORS.textMuted,
    letterSpacing: 3,
    lineHeight: IS_SMALL_SCREEN ? 13 : 15,
    textAlign: 'right',
    opacity: 0.4,
  },
  // Main content area - responsive
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: IS_SMALL_SCREEN ? SPACING.xl : SPACING.xxl,
    paddingBottom: IS_SMALL_SCREEN ? SPACING.lg : SPACING.xl,
  },
  logoWrap: {
    alignItems: 'center',
  },
  // Icon with glow and surface
  iconContainer: {
    position: 'relative',
    marginBottom: IS_SMALL_SCREEN ? SPACING.md : SPACING.lg,
  },
  iconGlow: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: RADIUS.xxl + 4,
    backgroundColor: COLORS.primarySoft,
    opacity: 0.6,
    zIndex: -1,
  },
  iconSurface: {
    width: IS_SMALL_SCREEN ? 88 : 100,
    height: IS_SMALL_SCREEN ? 88 : 100,
    borderRadius: RADIUS.xxl,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.blue,
  },
  wordmark: {
    ...TYPOGRAPHY.display,
    color: COLORS.textPrimary,
    letterSpacing: IS_SMALL_SCREEN ? 4 : 6,
    fontWeight: '800',
    fontSize: IS_SMALL_SCREEN ? 28 : 34,
    lineHeight: IS_SMALL_SCREEN ? 36 : 42,
  },
  tagline: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: IS_SMALL_SCREEN ? SPACING.xs : SPACING.sm,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  // Feature badges
  pillRow: {
    flexDirection: 'row',
    gap: IS_SMALL_SCREEN ? 6 : 8,
    marginTop: IS_SMALL_SCREEN ? SPACING.md : SPACING.lg,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  pill: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: IS_SMALL_SCREEN ? 10 : 14,
    paddingVertical: IS_SMALL_SCREEN ? 4 : 6,
    borderRadius: RADIUS.pill,
    ...SHADOW.xs,
  },
  pillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pillIcon: {
    marginRight: 2,
  },
  pillText: {
    ...TYPOGRAPHY.captionMedium,
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: IS_SMALL_SCREEN ? 10 : 11,
    letterSpacing: 0.3,
  },
  // Bottom loading section
  bottom: {
    position: 'absolute',
    bottom: IS_SMALL_SCREEN ? 60 : 80,
    left: SPACING.xl,
    right: SPACING.xl,
    alignItems: 'center',
    zIndex: 2,
  },
  trackBar: {
    width: '100%',
    height: IS_SMALL_SCREEN ? 3 : 4,
    borderRadius: IS_SMALL_SCREEN ? 2 : 3,
    backgroundColor: COLORS.border,
    overflow: 'hidden',
  },
  fillBar: {
    height: '100%',
    borderRadius: IS_SMALL_SCREEN ? 2 : 3,
    backgroundColor: COLORS.primary,
    ...SHADOW.lcd,
  },
  loadingText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: IS_SMALL_SCREEN ? 8 : 10,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  failWrap: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: IS_SMALL_SCREEN ? 90 : 110,
    zIndex: 5,
  },
  // Bottom decorative texts
  bottomLeftDecor: {
    position: 'absolute',
    bottom: IS_SMALL_SCREEN ? 16 : 28,
    left: IS_SMALL_SCREEN ? 20 : 32,
    zIndex: 1,
  },
  bottomRightDecor: {
    position: 'absolute',
    bottom: IS_SMALL_SCREEN ? 16 : 28,
    right: IS_SMALL_SCREEN ? 20 : 32,
    alignItems: 'flex-end',
    zIndex: 1,
  },
  decorTextBottomLeft: {
    fontSize: IS_SMALL_SCREEN ? 8 : 9,
    fontWeight: '400',
    color: COLORS.textMuted,
    letterSpacing: 2,
    lineHeight: IS_SMALL_SCREEN ? 12 : 14,
    textAlign: 'left',
    opacity: 0.35,
  },
  decorTextBottomRight: {
    fontSize: IS_SMALL_SCREEN ? 8 : 9,
    fontWeight: '300',
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    lineHeight: IS_SMALL_SCREEN ? 12 : 14,
    fontStyle: 'italic',
    textAlign: 'right',
    opacity: 0.35,
  },
});