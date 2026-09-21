import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import Screen from '../../components/Screen';
import Header from '../../components/Header';
import PulsingRings from '../../components/PulsingRings';
import SignalBars from '../../components/SignalBars';
import PrimaryButton from '../../components/PrimaryButton';
import EmptyState from '../../components/EmptyState';
import { useApp } from '../../context/AppContext';
import { Device } from '../../data/mockData';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Devices'>;

export default function DevicesScreen({ navigation }: Props) {
  const { devices } = useApp();
  const [scanning, setScanning] = useState(true);

  const renderItem = ({ item }: { item: Device }) => (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Ionicons name="phone-portrait-outline" size={18} color={COLORS.primary} />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.deviceName}>{item.name}</Text>
        <Text style={styles.deviceMeta}>{item.distance} away · Mesh Node</Text>
      </View>
      <View style={styles.rowRight}>
        <SignalBars strength={item.signal} size={16} color={COLORS.primary} />
        <Text style={styles.rssi}>−{54 + (4 - item.signal) * 10} dBm</Text>
      </View>
    </View>
  );

  return (
    <Screen padded>
      <Header title="Nearby Devices" onBack={() => navigation.goBack()} />

      {/* Scanning animation */}
      <View style={styles.radarWrap}>
        <PulsingRings size={88} color={COLORS.primary} active={scanning}>
          <View style={styles.radarCenter}>
            <MaterialCommunityIcons
              name="radio-handheld"
              size={32}
              color={COLORS.primary}
            />
          </View>
        </PulsingRings>
        <View style={styles.scanRow}>
          <View style={[styles.scanDot, scanning && styles.scanDotActive]} />
          <Text style={styles.scanLabel}>
            {scanning ? `Scanning  ·  ${devices.length} found` : 'Scan paused'}
          </Text>
        </View>
      </View>

      {/* Device list */}
      <FlatList
        data={devices}
        keyExtractor={d => d.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <EmptyState
            icon="wifi-outline"
            title="No devices found"
            body="Make sure other devices have iTantra open and are within range."
          />
        }
      />

      {/* CTA */}
      <PrimaryButton
        label={scanning ? 'Stop Scanning' : 'Start Scanning'}
        icon={scanning ? 'stop-circle-outline' : 'radio-outline'}
        variant={scanning ? 'ghost' : 'primary'}
        onPress={() => setScanning(s => !s)}
        style={styles.cta}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  radarWrap: {
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
    gap: 16,
  },
  radarCenter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  scanDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.textMuted,
  },
  scanDotActive: {
    backgroundColor: COLORS.success,
  },
  scanLabel: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 90,
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: {
    flex: 1,
  },
  deviceName: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  deviceMeta: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  rssi: {
    ...TYPOGRAPHY.captionMedium,
    color: COLORS.textMuted,
  },
  cta: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
});
