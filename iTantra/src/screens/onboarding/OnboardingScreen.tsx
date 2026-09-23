import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import Screen from '../../components/Screen';
import PrimaryButton from '../../components/PrimaryButton';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'> & {
  onDone: () => void;
};

const SLIDES = [
  {
    key: 'speak',
    icon: 'mic-outline' as const,
    iconLib: 'ionicons',
    accent: COLORS.primary,
    title: 'Speak',
    body: 'Speak naturally. iTantra records on-device — no internet required.',
  },
  {
    key: 'compress',
    icon: 'document-text-outline' as const,
    iconLib: 'ionicons',
    accent: COLORS.accent,
    title: 'Compress',
    body: 'Your voice becomes compact text packets before it leaves the device.',
  },
  {
    key: 'connect',
    icon: 'access-point-network' as const,
    iconLib: 'mci',
    accent: COLORS.success,
    title: 'Connect',
    body: 'Packets hop to nearby iTantra devices over Wi-Fi Direct or Bluetooth. Range is limited to peers in reach.',
  },
];

function SlideIllustration({ slide }: { slide: typeof SLIDES[number] }) {
  return (
    <View style={[styles.illustWrap, { borderColor: slide.accent + '20' }]}>
      <View style={[styles.illustInner, { backgroundColor: slide.accent + '0F' }]}>
        {slide.iconLib === 'mci' ? (
          <MaterialCommunityIcons name={slide.icon as any} size={64} color={slide.accent} />
        ) : (
          <Ionicons name={slide.icon as any} size={64} color={slide.accent} />
        )}
      </View>
    </View>
  );
}

export default function OnboardingScreen({ navigation, onDone }: Props) {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  const next = () => {
    if (isLast) {
      onDone();
      navigation.replace('ModeSelect');
    } else {
      setIndex(i => i + 1);
    }
  };

  const skip = () => {
    onDone();
    navigation.replace('ModeSelect');
  };

  return (
    <Screen padded>
      {/* Skip */}
      <View style={styles.topRow}>
        <View style={{ width: 48 }} />
        <View style={styles.dotsRow}>
          {SLIDES.map((s, i) => (
            <View
              key={s.key}
              style={[
                styles.dot,
                i === index
                  ? [styles.dotActive, { backgroundColor: slide.accent }]
                  : styles.dotInactive,
              ]}
            />
          ))}
        </View>
        <Pressable onPress={skip} hitSlop={12} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      {/* Content */}
      <View style={styles.center}>
        <SlideIllustration slide={slide} />

        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.body}>{slide.body}</Text>
      </View>

      {/* CTA */}
      <PrimaryButton
        label={isLast ? 'Get Started' : 'Continue'}
        icon={isLast ? 'checkmark' : 'arrow-forward'}
        onPress={next}
        style={styles.cta}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 52,
    marginBottom: SPACING.md,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 20,
  },
  dotInactive: {
    width: 6,
    backgroundColor: COLORS.border,
  },
  skipBtn: {
    paddingHorizontal: 4,
    paddingVertical: 6,
    minWidth: 48,
    alignItems: 'flex-end',
  },
  skipText: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
  },
  illustWrap: {
    width: 200,
    height: 200,
    borderRadius: RADIUS.xxl + 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  illustInner: {
    width: 160,
    height: 160,
    borderRadius: RADIUS.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...TYPOGRAPHY.headline,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  body: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.md,
    lineHeight: 24,
    maxWidth: 300,
  },
  cta: {
    marginBottom: SPACING.xl,
  },
});
