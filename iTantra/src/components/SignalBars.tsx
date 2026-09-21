import React from 'react';
import { StyleSheet, View } from 'react-native';
import { COLORS } from '../theme';

interface Props {
  strength: number; // 0..4
  size?: number;
  color?: string;
}

export default function SignalBars({
  strength,
  size = 16,
  color = COLORS.primary,
}: Props) {
  const barW = Math.max(3, Math.round(size / 5));
  return (
    <View style={[styles.row, { height: size }]}>
      {[1, 2, 3, 4].map(i => (
        <View
          key={i}
          style={{
            width: barW,
            height: (size * i) / 4,
            borderRadius: 2,
            backgroundColor: i <= strength ? color : COLORS.track,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
});
