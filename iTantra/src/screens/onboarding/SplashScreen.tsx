import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'> & {
  hasOnboarded: boolean;
};

export default function SplashScreen({ navigation, hasOnboarded }: Props) {
  const progress = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoTranslate = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    // Fade + slide logo in
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(logoTranslate, {
        toValue: 0,
        speed: 12,
        bounciness: 4,
        useNativeDriver: true,
      }),
    ]).start();

    // Progress bar
    Animated.timing(progress, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: false,
    }).start();

    const t = setTimeout(() => {
      navigation.replace(hasOnboarded ? 'ModeSelect' : 'Onboarding');
    }, 2400);
    return () => clearTimeout(t);
  }, [navigation, hasOnboarded, progress, logoOpacity, logoTranslate]);

  return (
    <View style={styles.root}>
      {/* Logo mark */}
      <Animated.View
        style={[
          styles.logoWrap,
          {
            opacity: logoOpacity,
            transform: [{ translateY: logoTranslate }],
          },
        ]}
      >
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons
            name="radio-handheld"
            size={52}
            color={COLORS.primary}
          />
        </View>

        <Text style={styles.wordmark}>iTANTRA</Text>
        <Text style={styles.tagline}>Talk. Transmit. Together.</Text>

        <View style={styles.pillRow}>
          {['Offline', 'Multilingual', 'AI-Powered'].map((label, i) => (
            <View key={i} style={styles.pill}>
              <Text style={styles.pillText}>{label}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* Bottom loading bar */}
      <View style={styles.bottom}>
        <View style={styles.trackBar}>
          <Animated.View
            style={[
              styles.fillBar,
              {
                width: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['4%', '100%'],
                }),
              },
            ]}
          />
        </View>
        <Text style={styles.loadingText}>Initializing mesh engine...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  logoWrap: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: RADIUS.xxl,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    ...SHADOW.blue,
  },
  wordmark: {
    ...TYPOGRAPHY.display,
    color: COLORS.textPrimary,
    letterSpacing: 5,
    fontWeight: '800',
  },
  tagline: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    fontWeight: '500',
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: SPACING.lg,
  },
  pill: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
  },
  pillText: {
    ...TYPOGRAPHY.captionMedium,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  bottom: {
    position: 'absolute',
    bottom: 52,
    left: SPACING.xl,
    right: SPACING.xl,
    alignItems: 'center',
  },
  trackBar: {
    width: '100%',
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    overflow: 'hidden',
  },
  fillBar: {
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },
  loadingText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 10,
    fontWeight: '500',
  },
});
