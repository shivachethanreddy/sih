import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { useApp } from '../context/AppContext';
import { COLORS, TYPOGRAPHY } from '../theme';

/**
 * Opens IncomingAlert only when the engine reports a real received packet.
 */
export default function IncomingBridge() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { incoming } = useApp();
  const [seen, setSeen] = useState<string | null>(null);

  useEffect(() => {
    if (!incoming?.id || incoming.id === seen) return;
    setSeen(incoming.id);
    navigation.navigate('IncomingAlert');
  }, [incoming, seen, navigation]);

  return null;
}

export function DemoBanner({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>DEMO MODE — Mock transport / mock AI</Text>
    </View>
  );
}

export function EngineErrorCard({
  message,
  onRetry,
  onDiagnostics,
}: {
  message: string;
  onRetry?: () => void;
  onDiagnostics?: () => void;
}) {
  return (
    <View style={styles.errorCard}>
      <Text style={styles.errorTitle}>Communication engine unavailable</Text>
      <Text style={styles.errorBody}>{message}</Text>
      <View style={styles.errorActions}>
        {onRetry ? (
          <Pressable onPress={onRetry} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        ) : null}
        {onDiagnostics ? (
          <Pressable onPress={onDiagnostics} style={styles.diagBtn}>
            <Text style={styles.diagText}>Diagnostics</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function EngineBusy({ label }: { label: string }) {
  return (
    <View style={styles.busy}>
      <ActivityIndicator color={COLORS.primary} />
      <Text style={styles.busyLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignSelf: 'center',
    backgroundColor: COLORS.warningSoft,
    borderColor: COLORS.warning + '40',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 8,
  },
  text: {
    ...TYPOGRAPHY.captionMedium,
    color: COLORS.warning,
    fontWeight: '700',
  },
  errorCard: {
    backgroundColor: COLORS.sosSoft,
    borderWidth: 1,
    borderColor: COLORS.sos + '30',
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  errorTitle: {
    ...TYPOGRAPHY.titleSmall,
    color: COLORS.sos,
  },
  errorBody: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  errorActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  retryBtn: {
    backgroundColor: COLORS.sos,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryText: { color: COLORS.white, fontWeight: '700' },
  diagBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.card,
  },
  diagText: { color: COLORS.textPrimary, fontWeight: '600' },
  busy: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  busyLabel: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, fontWeight: '600' },
});
