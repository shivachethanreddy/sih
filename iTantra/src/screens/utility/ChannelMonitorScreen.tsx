import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import Screen from '../../components/Screen';
import Header from '../../components/Header';
import SignalBars from '../../components/SignalBars';
import PrimaryButton from '../../components/PrimaryButton';
import { useApp } from '../../context/AppContext';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ChannelMonitor'>;

export default function ChannelMonitorScreen({ navigation }: Props) {
  const { channels, channel, setChannel, devices } = useApp();
  const [index, setIndex] = useState(
    Math.max(0, channels.findIndex(c => c.id === channel.id)),
  );
  const current = channels[index];
  const sweepAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const sweep = Animated.loop(
      Animated.timing(sweepAnim, {
        toValue: 1,
        duration: 3600,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    sweep.start();
    return () => sweep.stop();
  }, [sweepAnim]);

  const rotate = sweepAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const step = (d: number) =>
    setIndex(i => (i + d + channels.length) % channels.length);

  return (
    <Screen padded scroll>
      <Header title="Channel Monitor" onBack={() => navigation.goBack()} />

      {/* Channel switcher */}
      <View style={styles.channelSwitcher}>
        <Pressable
          onPress={() => step(-1)}
          hitSlop={14}
          style={styles.stepBtn}
          accessibilityLabel="Previous channel"
        >
          <Ionicons name="chevron-back" size={19} color={COLORS.textPrimary} />
        </Pressable>

        <View style={styles.channelCenter}>
          <Text style={styles.channelLabel}>{current.label}</Text>
          <Text style={styles.channelName}>{current.name}</Text>
          <Text style={styles.channelFreq}>{current.frequency ?? '433.920 MHz'}</Text>
        </View>

        <Pressable
          onPress={() => step(1)}
          hitSlop={14}
          style={styles.stepBtn}
          accessibilityLabel="Next channel"
        >
          <Ionicons name="chevron-forward" size={19} color={COLORS.textPrimary} />
        </Pressable>
      </View>

      {/* Radar — topology is not provided by the engine */}
      <View style={styles.radarCard}>
        <View style={styles.radarHeader}>
          <Text style={styles.radarTitle}>Mesh topology</Text>
          <Text style={styles.radarRange}>Unavailable</Text>
        </View>
        <Text style={styles.topoHint}>
          The engine does not report node positions. Showing discovered peers as a list instead of a fabricated map.
        </Text>
      </View>

      {/* Detected nodes */}
      <View style={styles.nodesHeader}>
        <Text style={styles.nodesTitle}>Detected nodes</Text>
        <Text style={styles.nodesCount}>{devices.length} discovered</Text>
      </View>

      <View style={styles.nodesList}>
        {devices.length === 0 ? (
          <Text style={styles.topoHint}>No devices reported by the engine.</Text>
        ) : devices.map((d, i) => (
          <View
            key={d.id}
            style={[styles.nodeRow, i < devices.length - 1 && styles.nodeRowBorder]}
          >
            <View style={styles.nodeAvatar}>
              <MaterialCommunityIcons
                name="cellphone-wireless"
                size={17}
                color={COLORS.primary}
              />
            </View>
            <View style={styles.nodeInfo}>
              <Text style={styles.nodeName}>{d.name}</Text>
              <Text style={styles.nodeDist}>{d.transport ?? 'UNKNOWN'} · {d.connectionState ?? '—'}</Text>
            </View>
            <View style={styles.nodeRight}>
              <SignalBars strength={d.signal} size={14} color={COLORS.primary} />
              <Text style={styles.nodeRssi}>{d.nodeId ? `ID ${d.nodeId}` : d.id}</Text>
            </View>
          </View>
        ))}
      </View>

      <PrimaryButton
        label="Lock onto this channel"
        icon="radio-outline"
        onPress={() => {
          setChannel(current);
          navigation.goBack();
        }}
        style={styles.cta}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  channelSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 4,
    marginBottom: SPACING.md,
    ...SHADOW.xs,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.cardInner,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelCenter: { alignItems: 'center', gap: 2 },
  channelLabel: {
    ...TYPOGRAPHY.title,
    color: COLORS.primary,
    fontWeight: '700',
  },
  channelName: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  channelFreq: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  radarCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOW.xs,
  },
  radarHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  radarTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  radarRange: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  radar: {
    width: 230,
    height: 230,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  crossH: {
    position: 'absolute',
    width: 220,
    height: 1,
    backgroundColor: COLORS.borderSoft,
  },
  crossV: {
    position: 'absolute',
    width: 1,
    height: 220,
    backgroundColor: COLORS.borderSoft,
  },
  sweepWrap: {
    position: 'absolute',
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  sweepLine: {
    width: 2,
    height: 110,
    backgroundColor: COLORS.primary,
    opacity: 0.7,
  },
  blip: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blipGlow: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primarySoft,
  },
  radarCenter: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.blue,
  },
  nodesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nodesTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  nodesCount: {
    ...TYPOGRAPHY.captionMedium,
    color: COLORS.primary,
    fontWeight: '700',
  },
  nodesList: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    ...SHADOW.xs,
  },
  nodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  nodeRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
  },
  nodeAvatar: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeInfo: { flex: 1 },
  nodeName: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  nodeDist: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  nodeRight: { alignItems: 'flex-end', gap: 3 },
  nodeRssi: {
    ...TYPOGRAPHY.captionMedium,
    color: COLORS.textMuted,
  },
  cta: {
    marginBottom: SPACING.lg,
  },
});
