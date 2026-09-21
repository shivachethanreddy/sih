import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import Screen from '../../components/Screen';
import { useApp } from '../../context/AppContext';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ModeSelect'>;

const MODES = [
  {
    id: 'public' as const,
    title: 'Public Network',
    subtitle: 'Broadcast to all nearby devices',
    description:
      'Your messages reach every device in range. Ideal for emergency alerts and group broadcasts.',
    icon: 'access-point' as const,
    iconLib: 'mci',
    peerCount: 3,
    accentColor: COLORS.primary,
  },
  {
    id: 'private' as const,
    title: 'Private Mesh',
    subtitle: 'Connect to a specific device',
    description:
      'Encrypted point-to-point communication. Best for confidential coordination.',
    icon: 'lock-closed-outline' as const,
    iconLib: 'ionicons',
    peerCount: 2,
    accentColor: COLORS.accent,
  },
];

export default function ModeSelectScreen({ navigation }: Props) {
  const { setMode } = useApp();

  const choose = (mode: 'public' | 'private') => {
    setMode(mode);
    navigation.replace('Main');
  };

  return (
    <Screen padded scroll>
      <View style={styles.header}>
        <Text style={styles.headline}>Choose your mode</Text>
        <Text style={styles.subtext}>
          How would you like to connect to other devices?
        </Text>
      </View>

      <View style={styles.cards}>
        {MODES.map(m => (
          <Pressable
            key={m.id}
            style={({ pressed }) => [
              styles.card,
              pressed && styles.cardPressed,
            ]}
            onPress={() => choose(m.id)}
            accessibilityRole="button"
            accessibilityLabel={`Select ${m.title}`}
          >
            {/* Icon */}
            <View style={[styles.iconWrap, { backgroundColor: m.accentColor + '12' }]}>
              {m.iconLib === 'mci' ? (
                <MaterialCommunityIcons name={m.icon as any} size={28} color={m.accentColor} />
              ) : (
                <Ionicons name={m.icon as any} size={26} color={m.accentColor} />
              )}
            </View>

            {/* Text */}
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{m.title}</Text>
              <Text style={styles.cardSubtitle}>{m.subtitle}</Text>
              <Text style={styles.cardDesc}>{m.description}</Text>
            </View>

            {/* Footer row */}
            <View style={styles.cardFooter}>
              {/* Avatar group */}
              <View style={styles.avatarRow}>
                {Array.from({ length: m.peerCount }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.avatar,
                      { marginLeft: i === 0 ? 0 : -8, borderColor: COLORS.background },
                    ]}
                  >
                    <Ionicons name="person" size={11} color={COLORS.textSecondary} />
                  </View>
                ))}
                <Text style={styles.peerLabel}>  {m.peerCount} peers nearby</Text>
              </View>

              {/* Arrow */}
              <View style={[styles.arrowBtn, { backgroundColor: m.accentColor }]}>
                <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
              </View>
            </View>
          </Pressable>
        ))}
      </View>

      <Text style={styles.hint}>
        You can switch modes at any time from the home screen.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  headline: {
    ...TYPOGRAPHY.headline,
    color: COLORS.textPrimary,
  },
  subtext: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  cards: {
    gap: 14,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md + 2,
    ...SHADOW.xs,
  },
  cardPressed: {
    backgroundColor: COLORS.cardInner,
  },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  cardText: {
    gap: 4,
    marginBottom: SPACING.md,
  },
  cardTitle: {
    ...TYPOGRAPHY.title,
    color: COLORS.textPrimary,
  },
  cardSubtitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  cardDesc: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textMuted,
    lineHeight: 19,
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSoft,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.cardInner,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  peerLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginLeft: 8,
  },
  arrowBtn: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
    lineHeight: 18,
  },
});
