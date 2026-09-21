import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOW, TYPOGRAPHY } from '../theme';

interface Props {
  channel: string;
  tag: string;
  from: string;
  time: string;
  durationSec?: number;
  priority?: 'Normal' | 'High' | 'SOS';
}

export default function MessageCard({
  channel,
  tag,
  from,
  time,
  durationSec = 25,
  priority = 'Normal',
}: Props) {
  const isSos = priority === 'SOS';
  const isHigh = priority === 'High';
  const accentColor = isSos ? COLORS.sos : isHigh ? COLORS.warning : COLORS.primary;

  // Waveform bar heights (static, decorative)
  const BARS = [8, 14, 20, 12, 18, 24, 16, 22, 18, 12, 20, 15, 10, 6];

  return (
    <View style={[styles.card, { borderLeftColor: accentColor }]}>
      {/* Header row */}
      <View style={styles.topRow}>
        <View style={styles.channelBadge}>
          <MaterialCommunityIcons name="radio-tower" size={12} color={COLORS.textMuted} />
          <Text style={styles.channelText}>{channel}</Text>
        </View>

        <View style={[styles.priorityBadge, isSos ? styles.sosBadge : isHigh ? styles.highBadge : styles.normalBadge]}>
          <Text style={[styles.priorityText, { color: accentColor }]}>
            {isSos ? 'Emergency' : isHigh ? 'High Priority' : 'Broadcast'}
          </Text>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.tagText}>{tag.replace('#', '')}</Text>

      {/* Meta */}
      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>
          From <Text style={styles.metaValue}>{from}</Text>
        </Text>
        <View style={styles.dot} />
        <Text style={styles.metaTime}>{time}</Text>
      </View>

      {/* Audio strip */}
      <View style={styles.audioStrip}>
        <View style={styles.durBadge}>
          <Ionicons name="volume-medium-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.durText}>{durationSec}s voice message</Text>
        </View>

        <View style={styles.waveform}>
          {BARS.map((h, i) => (
            <View
              key={i}
              style={[
                styles.bar,
                { height: h * 0.6, backgroundColor: accentColor + '80' },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 3,
    ...SHADOW.xs,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  channelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  channelText: {
    ...TYPOGRAPHY.captionMedium,
    color: COLORS.textMuted,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
  },
  normalBadge: {
    backgroundColor: COLORS.primarySoft,
  },
  highBadge: {
    backgroundColor: COLORS.warningSoft,
  },
  sosBadge: {
    backgroundColor: COLORS.sosSoft,
  },
  priorityText: {
    ...TYPOGRAPHY.captionMedium,
    fontWeight: '600',
  },
  tagText: {
    ...TYPOGRAPHY.title,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  metaLabel: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  metaValue: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.border,
  },
  metaTime: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  audioStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.cardInner,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  durBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  durText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  bar: {
    width: 3,
    borderRadius: 1.5,
  },
});
