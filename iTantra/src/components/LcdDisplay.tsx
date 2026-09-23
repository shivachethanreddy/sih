import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOW, TYPOGRAPHY } from '../theme';

interface Props {
  channelLabel: string;
  frequency?: string;
  nodesOnline?: number;
  statusText?: string;
  isTransmitting?: boolean;
  isPrivate?: boolean;
}

export default function LcdDisplay({
  channelLabel,
  frequency = '433.920 MHz',
  nodesOnline = 8,
  statusText = 'Mesh Connected',
  isTransmitting = false,
  isPrivate = false,
}: Props) {
  const statusColor = isTransmitting ? COLORS.accent : COLORS.success;
  const statusLabel = isTransmitting ? 'Transmitting' : statusText;

  return (
    <View style={styles.card}>
      {/* Top row: status pill */}
      <View style={styles.topRow}>
        <View style={[styles.statusPill, isTransmitting ? styles.pillTx : styles.pillActive]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      {/* Main row: channel label + mesh badge */}
      <View style={styles.mainRow}>
        <View>
          <Text style={styles.channelLabel}>{channelLabel}</Text>
          <Text style={styles.freqText}>
            {frequency}
            {!isPrivate && ' · Direct Mesh'}
          </Text>
        </View>

        {!isPrivate && (
          <View style={styles.meshBadge}>
            <MaterialCommunityIcons
              name="access-point-network"
              size={14}
              color={COLORS.primary}
            />
            <Text style={styles.meshText}>{nodesOnline} Peers</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginVertical: 10,
    ...SHADOW.xs,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  pillActive: {
    backgroundColor: COLORS.successSoft,
  },
  pillTx: {
    backgroundColor: COLORS.accentSoft,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    ...TYPOGRAPHY.captionMedium,
    fontWeight: '600',
  },
  mainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  channelLabel: {
    ...TYPOGRAPHY.title,
    color: COLORS.textPrimary,
  },
  freqText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  meshBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
  },
  meshText: {
    ...TYPOGRAPHY.captionMedium,
    color: COLORS.primary,
    fontWeight: '700',
  },
});
