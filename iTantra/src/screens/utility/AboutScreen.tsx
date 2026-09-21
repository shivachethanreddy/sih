import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import Screen from '../../components/Screen';
import Header from '../../components/Header';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'About'>;

const TECH_FEATURES = [
  { icon: 'hardware-chip-outline' as const, lib: 'ion', label: 'On-Device AI' },
  { icon: 'mic-outline' as const, lib: 'ion', label: 'Speech-to-Text' },
  { icon: 'volume-high-outline' as const, lib: 'ion', label: 'Text-to-Speech' },
  { icon: 'access-point-network' as const, lib: 'mci', label: 'Offline Mesh' },
] as const;

export default function AboutScreen({ navigation }: Props) {
  return (
    <Screen padded scroll>
      <Header title="About iTantra" onBack={() => navigation.goBack()} />

      {/* Logo block */}
      <View style={styles.hero}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons
            name="radio-handheld"
            size={48}
            color={COLORS.primary}
          />
        </View>
        <Text style={styles.wordmark}>iTANTRA</Text>
        <Text style={styles.version}>Version 1.0.0</Text>
      </View>

      {/* Description */}
      <View style={styles.descCard}>
        <Text style={styles.desc}>
          An AI-powered, offline-first communication platform that connects people
          when it matters most — no internet required.
        </Text>
      </View>

      {/* Tech features grid */}
      <Text style={styles.sectionLabel}>Powered by</Text>
      <View style={styles.techGrid}>
        {TECH_FEATURES.map(f => (
          <View key={f.label} style={styles.techItem}>
            <View style={styles.techIcon}>
              {f.lib === 'mci' ? (
                <MaterialCommunityIcons
                  name={f.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                  size={22}
                  color={COLORS.primary}
                />
              ) : (
                <Ionicons
                  name={f.icon as keyof typeof Ionicons.glyphMap}
                  size={22}
                  color={COLORS.primary}
                />
              )}
            </View>
            <Text style={styles.techLabel}>{f.label}</Text>
          </View>
        ))}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Built with{' '}
          <Ionicons name="heart" size={12} color={COLORS.sos} />
          {' '}for humanity
        </Text>
        <Text style={styles.copyright}>© 2025 iTantra Team</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: RADIUS.xxl,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
    ...SHADOW.blue,
  },
  wordmark: {
    ...TYPOGRAPHY.headline,
    color: COLORS.textPrimary,
    letterSpacing: 4,
    fontWeight: '800',
  },
  version: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 4,
    fontWeight: '500',
  },
  descCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: SPACING.lg,
    ...SHADOW.xs,
  },
  desc: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    lineHeight: 24,
    textAlign: 'center',
  },
  sectionLabel: {
    ...TYPOGRAPHY.captionMedium,
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  techGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: SPACING.xl,
  },
  techItem: {
    flex: 1,
    minWidth: '44%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    ...SHADOW.xs,
  },
  techIcon: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  techLabel: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  footer: {
    alignItems: 'center',
    gap: 4,
    marginBottom: SPACING.xl,
  },
  footerText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  copyright: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
});
