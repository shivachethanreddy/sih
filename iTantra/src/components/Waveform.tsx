import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { COLORS } from '../theme';

interface Props {
  bars?: number;
  height?: number;
  color?: string;
  animated?: boolean;
}

function seed(i: number) {
  return 0.2 + ((i * 47) % 75) / 100;
}

export default function Waveform({
  bars = 24,
  height = 34,
  color = COLORS.accent,
  animated = true,
}: Props) {
  const anims = useRef(
    Array.from({ length: bars }, (_, i) => new Animated.Value(seed(i))),
  ).current;

  useEffect(() => {
    if (!animated) return;
    const loops = anims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 0.25 + ((i * 37) % 70) / 100,
            duration: 260 + ((i * 53) % 240),
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: 0.15 + ((i * 61) % 40) / 100,
            duration: 240 + ((i * 29) % 220),
            useNativeDriver: false,
          }),
        ]),
      ),
    );
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [animated, anims]);

  return (
    <View style={[styles.row, { height }]}>
      {anims.map((anim, i) => (
        <Animated.View
          key={i}
          style={{
            width: 3,
            borderRadius: 2,
            backgroundColor: color,
            height: animated
              ? anim.interpolate({ inputRange: [0, 1], outputRange: [3, height] })
              : seed(i) * height,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 3 },
});
