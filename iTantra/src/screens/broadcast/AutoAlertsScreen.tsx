import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import Screen from '../../components/Screen';
import Header from '../../components/Header';
import AlertIcon from '../../components/AlertIcon';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import { useApp } from '../../context/AppContext';
import { AutoAlert } from '../../data/mockData';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AutoAlerts'>;

const TABS = ['Predefined', 'My Messages'] as const;

export default function AutoAlertsScreen({ navigation }: Props) {
  const { alerts, synthesizeSpeech } = useApp();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Predefined');

  const data = useMemo(
    () => alerts.filter(a => (tab === 'Predefined' ? !a.custom : a.custom)),
    [alerts, tab],
  );

  const priorityBadge = (p: AutoAlert['priority']) => {
    if (p === 'SOS') return <StatusBadge label="SOS" severity="urgent" />;
    if (p === 'High') return <StatusBadge label="High" severity="high" />;
    return null;
  };

  const renderItem = ({ item }: { item: AutoAlert }) => (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => navigation.navigate('AlertDetail', { alertId: item.id })}
      accessibilityRole="button"
    >
      <AlertIcon kind={item.kind} size={46} iconSize={22} />

      <View style={styles.rowContent}>
        <View style={styles.rowTitleRow}>
          <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
          {priorityBadge(item.priority)}
        </View>
        <Text style={styles.rowBody} numberOfLines={2}>{item.message}</Text>
        <Text style={styles.rowLang}>{item.language}</Text>
      </View>

      <Pressable
        hitSlop={10}
        onPress={() => synthesizeSpeech(item.message)}
        style={styles.playBtn}
        accessibilityLabel={`Preview ${item.title}`}
      >
        <Ionicons name="play" size={14} color={COLORS.primary} />
      </Pressable>
    </Pressable>
  );

  return (
    <Screen padded>
      <Header title="Auto Alerts" onBack={() => navigation.goBack()} />

      {/* Tab switcher */}
      <View style={styles.tabBar}>
        {TABS.map(t => {
          const active = tab === t;
          return (
            <Pressable
              key={t}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setTab(t)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* List */}
      <FlatList
        data={data}
        keyExtractor={a => a.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <EmptyState
            icon="notifications-off-outline"
            title={tab === 'Predefined' ? 'No predefined alerts' : 'No custom messages'}
            body={
              tab === 'My Messages'
                ? 'Create a custom alert message using the button below.'
                : undefined
            }
          />
        }
      />

      {/* Add button */}
      <Pressable
        style={styles.addBtn}
        onPress={() => navigation.navigate('CustomMessage')}
        accessibilityRole="button"
        accessibilityLabel="Add custom message"
      >
        <View style={styles.addIcon}>
          <Ionicons name="add" size={18} color={COLORS.primary} />
        </View>
        <Text style={styles.addText}>Add Custom Message</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardInner,
    borderRadius: RADIUS.pill,
    padding: 3,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.card,
    ...SHADOW.xs,
  },
  tabText: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  tabTextActive: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 90,
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
  rowBody: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  rowLang: {
    ...TYPOGRAPHY.captionMedium,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  addBtn: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.pill,
    paddingVertical: 15,
    ...SHADOW.card,
  },
  addIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: {
    ...TYPOGRAPHY.button,
    color: COLORS.textPrimary,
  },
});
