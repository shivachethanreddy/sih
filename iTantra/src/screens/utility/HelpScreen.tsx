import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import Screen from '../../components/Screen';
import Header from '../../components/Header';
import { HELP_TOPICS } from '../../data/mockData';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Help'>;

export default function HelpScreen({ navigation }: Props) {
  return (
    <Screen padded scroll>
      <Header title="Help & Guide" onBack={() => navigation.goBack()} />

      {/* Topics */}
      <Text style={styles.sectionLabel}>Topics</Text>
      <View style={styles.card}>
        {HELP_TOPICS.map((t, i) => (
          <Pressable
            key={t.id}
            style={({ pressed }) => [
              styles.topicRow,
              i < HELP_TOPICS.length - 1 && styles.topicBorder,
              pressed && styles.topicPressed,
            ]}
            accessibilityRole="button"
          >
            <Text style={styles.topicText}>{t.title}</Text>
            <Ionicons name="chevron-forward" size={15} color={COLORS.textMuted} />
          </Pressable>
        ))}
      </View>

      {/* Support card */}
      <View style={styles.supportCard}>
        <View style={styles.supportIcon}>
          <Ionicons name="headset-outline" size={22} color={COLORS.primary} />
        </View>
        <View style={styles.supportText}>
          <Text style={styles.supportTitle}>Need more help?</Text>
          <Text style={styles.supportBody}>Contact our support team</Text>
        </View>
        <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
      </View>

      <View style={{ height: SPACING.xl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    ...TYPOGRAPHY.captionMedium,
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
    ...SHADOW.xs,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 15,
    minHeight: 52,
  },
  topicBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
  },
  topicPressed: {
    backgroundColor: COLORS.cardInner,
  },
  topicText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.primarySoft,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
    padding: 16,
  },
  supportIcon: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  supportText: { flex: 1 },
  supportTitle: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  supportBody: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    marginTop: 2,
    fontWeight: '500',
  },
});
