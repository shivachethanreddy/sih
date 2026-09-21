import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, TYPOGRAPHY } from '../theme';

// ─── Toggle ────────────────────────────────────────────────────────────────
export function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [value, anim]);

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [2, 22] });
  const trackColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.track, COLORS.primary],
  });

  return (
    <Pressable
      onPress={() => onChange(!value)}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
    >
      <Animated.View style={[styles.track, { backgroundColor: trackColor }]}>
        <Animated.View
          style={[
            styles.thumb,
            { transform: [{ translateX }] },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

// ─── SettingRow ────────────────────────────────────────────────────────────
interface RowProps {
  label: string;
  value?: boolean;
  onToggle?: (v: boolean) => void;
  rightText?: string;
  onPress?: () => void;
  chevron?: boolean;
  danger?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  last?: boolean;
  description?: string;
}

export function SettingRow({
  label,
  value,
  onToggle,
  rightText,
  onPress,
  chevron,
  danger,
  icon,
  last = false,
  description,
}: RowProps) {
  const labelColor = danger ? COLORS.sos : COLORS.textPrimary;
  const iconColor = danger ? COLORS.sos : COLORS.primary;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        !last && styles.rowBorder,
        pressed && onPress ? styles.rowPressed : null,
      ]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'none'}
    >
      {/* Left — icon + label stack */}
      <View style={styles.leftGroup}>
        {icon ? (
          <View style={[styles.iconWrap, danger ? styles.iconWrapDanger : null]}>
            <Ionicons name={icon} size={16} color={iconColor} />
          </View>
        ) : null}
        <View style={styles.labelStack}>
          <Text style={[styles.rowLabel, { color: labelColor }]}>{label}</Text>
          {description ? (
            <Text style={styles.description}>{description}</Text>
          ) : null}
        </View>
      </View>

      {/* Right — value / toggle / chevron */}
      <View style={styles.rowRight}>
        {rightText ? (
          <Text style={[styles.rowValue, danger ? { color: COLORS.sos } : null]}>
            {rightText}
          </Text>
        ) : null}
        {onToggle !== undefined ? (
          <Toggle value={!!value} onChange={onToggle} />
        ) : null}
        {chevron ? (
          <Ionicons name="chevron-forward" size={15} color={COLORS.textMuted} />
        ) : null}
      </View>
    </Pressable>
  );
}

// ─── SectionLabel ─────────────────────────────────────────────────────────
export function SectionLabel({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionText}>{title.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Toggle
  track: {
    width: 46,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  thumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },

  // SettingRow
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.card,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
  },
  rowPressed: {
    backgroundColor: COLORS.cardInner,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapDanger: {
    backgroundColor: COLORS.sosSoft,
  },
  labelStack: {
    flex: 1,
  },
  rowLabel: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
  },
  description: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  rowValue: {
    ...TYPOGRAPHY.label,
    color: COLORS.textMuted,
  },

  // SectionLabel
  sectionHeader: {
    marginTop: 24,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  sectionText: {
    ...TYPOGRAPHY.captionMedium,
    color: COLORS.textMuted,
    letterSpacing: 1.0,
  },
});
