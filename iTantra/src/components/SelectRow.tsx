import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../theme';

interface Props {
  label?: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}

// Dependency-free dropdown substitute: tap to cycle through options.
export default function SelectRow({ label, value, options, onChange }: Props) {
  const cycle = () => {
    const i = options.indexOf(value);
    onChange(options[(i + 1) % options.length]);
  };

  const control = (
    <Pressable style={styles.select} onPress={cycle}>
      <Text style={styles.selectText}>{value}</Text>
      <Ionicons name="chevron-down" size={15} color={COLORS.textMuted} />
    </Pressable>
  );

  if (!label) return control;

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      {control}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 46,
  },
  label: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.cardInner,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 110,
    justifyContent: 'space-between',
  },
  selectText: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700' },
});
