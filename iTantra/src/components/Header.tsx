import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, TYPOGRAPHY } from '../theme';

interface Props {
  title: string;
  titleColor?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  subtitle?: string;
}

export default function Header({ title, titleColor, onBack, right, subtitle }: Props) {
  return (
    <View style={styles.row}>
      {/* Left — spacer */}
      <View style={styles.side}></View>

      {/* Center — title + optional subtitle */}
      <View style={styles.titleContainer}>
        <Text
          style={[styles.title, titleColor ? { color: titleColor } : null]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      {/* Right — action slot */}
      <View style={[styles.side, styles.right]}>{right ?? null}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    marginBottom: 8,
  },
  side: {
    width: 44,
    justifyContent: 'center',
  },
  right: {
    alignItems: 'flex-end',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPressed: {
    backgroundColor: COLORS.cardInner,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  title: {
    ...TYPOGRAPHY.titleSmall,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...TYPOGRAPHY.captionMedium,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 1,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
