import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import Screen from '../../components/Screen';
import Header from '../../components/Header';
import { useApp } from '../../context/AppContext';
import itantraService from '../../services/ITantraService';
import { DiagnosticsSnapshot, formatClock } from '../../types';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Diagnostics'>;

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.border]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export default function DiagnosticsScreen({ navigation }: Props) {
  const { network, demoMode } = useApp();
  const [diag, setDiag] = useState<DiagnosticsSnapshot | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setDiag(await itantraService.getDiagnostics());
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const d = diag;
  return (
    <Screen padded>
      <Header title="Diagnostics" onBack={() => navigation.goBack()} />
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.kicker}>ENGINE</Text>
        <View style={styles.card}>
          <Row label="Node ID" value={d?.nodeId ?? network.nodeId} />
          <Row label="Mode" value={demoMode || d?.demoMode ? 'DEMO MODE' : 'NATIVE'} />
          <Row label="Transport" value={d?.transport ?? network.transport} />
          <Row label="Initialized" value={d?.initialized ? 'Yes' : 'No'} last />
        </View>

        <Text style={styles.kicker}>MESH</Text>
        <View style={styles.card}>
          <Row label="Connected peers" value={String(d?.connectedPeers ?? network.peers)} />
          <Row label="Discovered" value={String(d?.discoveredPeers ?? network.discovered)} />
          <Row label="Pending queue" value={String(d?.pending ?? network.pending)} last />
        </View>

        <Text style={styles.kicker}>PACKETS</Text>
        <View style={styles.card}>
          <Row label="Sent" value={String(d?.packetsSent ?? 0)} />
          <Row label="Received" value={String(d?.packetsReceived ?? 0)} />
          <Row label="Relayed" value={String(d?.packetsRelayed ?? 0)} />
          <Row label="Dropped" value={String(d?.packetsDropped ?? 0)} />
          <Row label="ACKs" value={String(d?.acks ?? 0)} />
          <Row label="Retries" value={String(d?.retries ?? 0)} last />
        </View>

        <Text style={styles.kicker}>TIMING</Text>
        <View style={styles.card}>
          <Row label="Last transmission" value={formatClock(d?.lastTransmission || network.lastTransmission)} />
          <Row label="Last received" value={formatClock(d?.lastReceived || network.lastReceived)} last />
        </View>

        <Text style={styles.kicker}>SUBSYSTEMS</Text>
        <View style={styles.card}>
          <Row label="AI" value={d?.aiStatus ?? 'MOCK'} />
          <Row label="Database" value={d?.databaseStatus ?? 'NOT_AVAILABLE'} last />
        </View>
        <Pressable onPress={load} style={styles.refresh}>
          <Text style={styles.refreshText}>Refresh</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: {
    ...TYPOGRAPHY.captionMedium,
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginTop: SPACING.lg,
    marginBottom: 6,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    ...SHADOW.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  border: { borderBottomWidth: 1, borderBottomColor: COLORS.borderSoft },
  label: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary },
  value: { ...TYPOGRAPHY.bodySmall, color: COLORS.textPrimary, fontWeight: '700' },
  refresh: { alignSelf: 'center', marginVertical: 24 },
  refreshText: { ...TYPOGRAPHY.label, color: COLORS.primary, fontWeight: '700' },
});
