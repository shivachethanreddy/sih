import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import Screen from '../../components/Screen';
import Header from '../../components/Header';
import AlertIcon from '../../components/AlertIcon';
import EmptyState from '../../components/EmptyState';
import { Toggle } from '../../components/Toggle';
import { useApp } from '../../context/AppContext';
import { AutoAlert } from '../../data/mockData';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ManageAlerts'>;

const TABS = ['Predefined', 'Custom'] as const;

export default function ManageAlertsScreen({ navigation }: Props) {
  const { alerts, toggleAlert, deleteCustomAlert } = useApp();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Predefined');
  const [editing, setEditing] = useState(false);

  const data = useMemo(
    () => alerts.filter(a => (tab === 'Predefined' ? !a.custom : a.custom)),
    [alerts, tab],
  );

  const renderItem = ({ item }: { item: AutoAlert }) => (
    <View style={styles.row}>
      <AlertIcon kind={item.kind} size={40} iconSize={20} />
      <Text style={styles.rowTitle}>{item.title}</Text>
      {editing && item.custom ? (
        <Pressable
          hitSlop={10}
          onPress={() => deleteCustomAlert(item.id)}
          accessibilityLabel={`Delete ${item.title}`}
        >
          <Ionicons name="trash-outline" size={20} color={COLORS.sos} />
        </Pressable>
      ) : (
        <Toggle value={item.enabled} onChange={() => toggleAlert(item.id)} />
      )}
    </View>
  );

  return (
    <Screen padded>
      <Header
        title="Manage Alerts"
        onBack={() => navigation.goBack()}
        right={
          <View style={styles.headerRight}>
            <Pressable
              onPress={() => navigation.navigate('AddCustomAlert')}
              hitSlop={10}
              accessibilityLabel="Add alert"
            >
              <Ionicons name="add" size={22} color={COLORS.primary} />
            </Pressable>
            <Pressable onPress={() => setEditing(e => !e)} hitSlop={10}>
              <Text style={styles.editBtn}>{editing ? 'Done' : 'Edit'}</Text>
            </Pressable>
          </View>
        }
      />

      {/* Tab bar */}
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
            title="No custom alerts"
            body="Add a custom alert from the Auto Alerts screen."
          />
        }
      />

      {/* Info banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} />
        <Text style={styles.infoText}>
          Toggle alerts to enable or disable them during broadcasts.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  editBtn: {
    ...TYPOGRAPHY.label,
    color: COLORS.primary,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    gap: 0,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginRight: SPACING.lg,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  tabTextActive: {
    color: COLORS.primary,
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
  rowTitle: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  infoBanner: {
    position: 'absolute',
    bottom: 18,
    left: 20,
    right: 20,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    backgroundColor: COLORS.primarySoft,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
    padding: 14,
    ...SHADOW.xs,
  },
  infoText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
});
