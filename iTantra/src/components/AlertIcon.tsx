import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AlertKind } from '../data/mockData';
import { ALERT_COLORS, RADIUS } from '../theme';

const ICONS: Record<AlertKind, keyof typeof Ionicons.glyphMap> = {
  flood: 'water',
  evac: 'walk',
  medical: 'medkit',
  fire: 'flame',
  quake: 'pulse',
  warn: 'warning',
  custom: 'chatbox-ellipses',
};

export function alertColor(kind: AlertKind): string {
  return ALERT_COLORS[kind] ?? '#2563EB';
}

export default function AlertIcon({
  kind,
  size = 44,
  iconSize = 22,
}: {
  kind: AlertKind;
  size?: number;
  iconSize?: number;
}) {
  const color = alertColor(kind);
  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: RADIUS.md,
          backgroundColor: color + '18',
          borderWidth: 1,
          borderColor: color + '30',
        },
      ]}
    >
      <Ionicons name={ICONS[kind]} size={iconSize} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center' },
});
