import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { COLORS } from '../theme';

interface Props {
  size?: number;
  ringCount?: number;
  color?: string;
  children?: React.ReactNode;
  active?: boolean;
}

/**
 * Concentric radar-style rings that expand and fade.
 * Used for PTT, incoming alert, and broadcasting states.
 */
export default function PulsingRings({
  size = 150,
  ringCount = 3,
  color = COLORS.primary,
  children,
  active = true,
}: Props) {
  const anims = useRef(
    Array.from({ length: ringCount }, () => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    if (!active) {
      anims.forEach(a => a.setValue(0));
      return;
    }
    const loops = anims.map((anim, i) =>
      Animated.loop(
        Animated.timing(anim, {
          toValue: 1,
          duration: 2400,
          delay: i * (2400 / ringCount),
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ),
    );
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [active, anims, ringCount]);

  const maxScale = 1.85;

  return (
    <View style={[styles.wrap, { width: size * maxScale, height: size * maxScale }]}>
      {anims.map((anim, i) => {
        const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, maxScale] });
        const opacity = anim.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.5, 0.25, 0] });
        return (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={[
              styles.ring,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                borderColor: color,
                transform: [{ scale }],
                opacity,
              },
            ]}
          />
        );
      })}
      <View style={[styles.center, { width: size, height: size, borderRadius: size / 2 }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderWidth: 1.5 },
  center: { alignItems: 'center', justifyContent: 'center' },
});
