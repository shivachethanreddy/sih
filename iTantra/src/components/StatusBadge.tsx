import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { COLORS, RADIUS, TYPOGRAPHY } from '../theme';

type Severity = 'normal' | 'high' | 'urgent' | 'success' | 'info';

interface Props {
  label: string;
  severity?: Severity;
  style?: ViewStyle;
  dot?: boolean;
}

const BG: Record<Severity, string> = {
  normal: COLORS.cardInner,
  high: COLORS.warningSoft,
  urgent: COLORS.sosSoft,
  success: COLORS.successSoft,
  info: COLORS.primarySoft,
};

const FG: Record<Severity, string> = {
  normal: COLORS.textSecondary,
  high: COLORS.warning,
  urgent: COLORS.sos,
  success: COLORS.success,
  info: COLORS.primary,
};

export default function StatusBadge({
  label,
  severity = 'normal',
  style,
  dot = false,
}: Props) {
  return (
    <View style={[styles.badge, { backgroundColor: BG[severity] }, style]}>
      {dot ? (
        <View style={[styles.dot, { backgroundColor: FG[severity] }]} />
      ) : null}
      <Text style={[styles.text, { color: FG[severity] }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  text: {
    ...TYPOGRAPHY.captionMedium,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
