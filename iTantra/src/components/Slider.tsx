import React, { useRef } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { COLORS } from '../theme';

interface Props {
  value: number; // 0..100
  onChange: (v: number) => void;
  color?: string;
}

// Minimal dependency-free slider (track tap + drag).
export default function Slider({ value, onChange, color = COLORS.primary }: Props) {
  const widthRef = useRef(1);
  const valueRef = useRef(value);
  valueRef.current = value;

  const setFromX = (x: number) => {
    const pct = Math.max(0, Math.min(100, Math.round((x / widthRef.current) * 100)));
    if (pct !== valueRef.current) onChange(pct);
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: e => setFromX(e.nativeEvent.locationX),
      onPanResponderMove: e => setFromX(e.nativeEvent.locationX),
    }),
  ).current;

  return (
    <View
      style={styles.wrap}
      onLayout={e => {
        widthRef.current = e.nativeEvent.layout.width || 1;
      }}
      {...pan.panHandlers}
    >
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${value}%`, backgroundColor: color }]} />
      </View>
      <View style={[styles.knob, { left: `${value}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 28, justifyContent: 'center' },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.track,
    overflow: 'hidden',
  },
  fill: { height: 4, borderRadius: 2 },
  knob: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    marginLeft: -9,
    borderWidth: 2,
    borderColor: COLORS.background,
  },
});
