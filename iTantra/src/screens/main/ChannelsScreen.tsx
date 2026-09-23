import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import Screen from '../../components/Screen';
import SignalBars from '../../components/SignalBars';
import StatusBadge from '../../components/StatusBadge';
import { useApp } from '../../context/AppContext';
import { Channel } from '../../data/mockData';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../../theme';

export default function ChannelsScreen() {
  const navigation = useNavigation<any>();
  const { channels, channel, setChannel } = useApp();

  const renderItem = ({ item, index }: { item: Channel; index: number }) => {
    const active = item.id === channel.id;
    const defaultFreq = `433.${(100 + index * 125).toString().padStart(3, '0')} MHz`;
    const freq = item.frequency ?? defaultFreq;

    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          active && styles.cardActive,
          pressed && !active && styles.cardPressed,
        ]}
        onPress={() => {
          setChannel(item);
          navigation.navigate('ChannelMonitor');
        }}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={`${item.label} — ${item.name}${active ? ', active' : ''}`}
      >
        {/* Left accent line */}
        {active ? <View style={styles.accentBar} /> : null}

        <View style={styles.cardBody}>
          {/* Top row */}
          <View style={styles.labelRow}>
            <Text style={[styles.chLabel, active && styles.chLabelActive]}>
              {item.label}
            </Text>
            {active ? (
              <StatusBadge label="Connected" severity="success" dot />
            ) : null}
          </View>

          {/* Channel name */}
          <Text style={styles.chName}>{item.name}</Text>
          <Text style={styles.freqText}>{freq}</Text>

          {/* Footer */}
          <View style={styles.cardFooter}>
            <View style={styles.peerRow}>
              <Ionicons name="people-outline" size={13} color={COLORS.textMuted} />
            <Text style={styles.peerText}>Logical channel</Text>
            </View>
            <SignalBars
              strength={item.signal}
              size={14}
              color={active ? COLORS.primary : COLORS.textMuted}
            />
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <Screen padded hideBack>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Channels</Text>
          <Text style={styles.subtitle}>Tap to join a channel</Text>
        </View>
        <Pressable
          hitSlop={10}
          style={styles.scanBtn}
          onPress={() => navigation.navigate('Devices')}
          accessibilityLabel="Scan for devices"
        >
          <Ionicons name="scan-outline" size={19} color={COLORS.textPrimary} />
        </Pressable>
      </View>

      <FlatList
        data={channels}
        keyExtractor={c => c.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  title: {
    ...TYPOGRAPHY.headline,
    color: COLORS.textPrimary,
  },
  subtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  scanBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 28,
    paddingTop: 4,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    ...SHADOW.xs,
  },
  cardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.background,
    ...SHADOW.blue,
  },
  cardPressed: {
    backgroundColor: COLORS.cardInner,
  },
  accentBar: {
    width: 3,
    backgroundColor: COLORS.primary,
  },
  cardBody: {
    flex: 1,
    padding: 16,
    gap: 3,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  chLabel: {
    ...TYPOGRAPHY.titleSmall,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  chLabelActive: {
    color: COLORS.primary,
  },
  chName: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textSecondary,
  },
  freqText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSoft,
  },
  peerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  peerText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
});
