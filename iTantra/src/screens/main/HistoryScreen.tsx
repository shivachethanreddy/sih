import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import Screen from '../../components/Screen';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import { useApp } from '../../context/AppContext';
import { MeshMessage } from '../../data/mockData';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const FILTERS = ['All', 'Received', 'Sent', 'Alerts'] as const;

export default function HistoryScreen() {
  const navigation = useNavigation<Nav>();
  const { messages, synthesizeSpeech } = useApp();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');

  const data = useMemo(() => {
    if (filter === 'All') return messages;
    if (filter === 'Alerts') return messages.filter(m => m.type === 'alert');
    return messages.filter(m => m.type === filter.toLowerCase());
  }, [messages, filter]);

  const count = (f: (typeof FILTERS)[number]) => {
    if (f === 'All') return messages.length;
    if (f === 'Alerts') return messages.filter(m => m.type === 'alert').length;
    return messages.filter(m => m.type === f.toLowerCase()).length;
  };

  const renderItem = ({ item }: { item: MeshMessage }) => {
    const isSos = item.priority === 'SOS';
    const isHigh = item.priority === 'High';
    const accentColor = isSos ? COLORS.sos : isHigh ? COLORS.warning : COLORS.primary;
    const isSent = item.type === 'sent';

    return (
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={() => navigation.navigate('MessageReceived', { messageId: item.id })}
      >
        {/* Icon */}
        <View
          style={[
            styles.iconTile,
            { backgroundColor: accentColor + '12', borderColor: accentColor + '25' },
          ]}
        >
          <Ionicons
            name={
              item.type === 'alert'
                ? 'warning-outline'
                : isSent
                ? 'arrow-up-outline'
                : 'arrow-down-outline'
            }
            size={17}
            color={accentColor}
          />
        </View>

        {/* Content */}
        <View style={styles.rowContent}>
          <View style={styles.rowTitleRow}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {item.tag.replace('#', '')}
            </Text>
            {isSos ? (
              <StatusBadge label="SOS" severity="urgent" />
            ) : isHigh ? (
              <StatusBadge label="High" severity="high" />
            ) : null}
          </View>

          <Text style={styles.rowMeta} numberOfLines={1}>
            {isSent ? `To: ${item.to ?? 'All Peers'}` : `From: ${item.from}`}
            {item.language ? `  ·  ${item.language}` : ''}
            {item.translatedTo ? ` → ${item.translatedTo}` : ''}
          </Text>
        </View>

        {/* Right */}
        <View style={styles.rowRight}>
          <Text style={styles.rowTime}>{item.time}</Text>
          <Pressable
            hitSlop={8}
            style={styles.playBtn}
            onPress={() => synthesizeSpeech(item.originalText, item.language)}
            accessibilityLabel="Play message"
          >
            <Ionicons name="play" size={13} color={COLORS.white} />
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <Screen padded hideBack>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <Text style={styles.subtitle}>{messages.length} voice messages stored</Text>
      </View>

      {/* Filter chips */}
      <View style={styles.chips}>
        {FILTERS.map(f => {
          const active = filter === f;
          const n = count(f);
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.chip, active && styles.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {f}
              </Text>
              <View style={[styles.chipCount, active && styles.chipCountActive]}>
                <Text style={[styles.chipCountText, active && styles.chipCountTextActive]}>
                  {n}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* List */}
      <FlatList
        data={data}
        keyExtractor={m => m.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <EmptyState
            icon="chatbubbles-outline"
            title="No messages yet"
            body="Hold the mic on the Home screen to send your first voice message."
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: SPACING.sm,
    marginBottom: 14,
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

  // Chips
  chips: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    ...TYPOGRAPHY.captionMedium,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: COLORS.white,
  },
  chipCount: {
    backgroundColor: COLORS.cardInner,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  chipCountActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  chipCountText: {
    ...TYPOGRAPHY.captionMedium,
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  chipCountTextActive: {
    color: COLORS.white,
  },

  // List
  listContent: {
    paddingBottom: 28,
    paddingTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 12,
    ...SHADOW.xs,
  },
  rowPressed: {
    backgroundColor: COLORS.cardInner,
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },
  rowContent: {
    flex: 1,
    gap: 3,
  },
  rowTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexWrap: 'wrap',
  },
  rowTitle: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  rowMeta: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 6,
    flexShrink: 0,
  },
  rowTime: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  playBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
