import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList, MainTabParamList } from '../../navigation/types';
import Screen from '../../components/Screen';
import Header from '../../components/Header';
import PulsingRings from '../../components/PulsingRings';
import SignalBars from '../../components/SignalBars';
import PrimaryButton from '../../components/PrimaryButton';
import EmptyState from '../../components/EmptyState';
import { useApp } from '../../context/AppContext';
import { Device } from '../../data/mockData';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../../theme';
import { DemoBanner } from '../../components/EngineStatus';

type Props = Partial<NativeStackScreenProps<RootStackParamList, 'Devices'> & BottomTabScreenProps<MainTabParamList, 'ChannelsTab'>>;

export default function DevicesScreen(_props: Props) {
  const navigation = useNavigation();
  const { devices, mode, myName, selectedDevice, setSelectedDevice, requestConnection, connectedDevice, connectionStatus, startScan, stopScan, demoMode, network } = useApp();
  const [scanning, setScanning] = useState(network.status === 'DISCOVERING');
  const connectableDevices = devices.filter(d => d.name !== myName);

const renderItem = ({ item }: { item: Device }) => {
    const selected = selectedDevice.id === item.id;
    const isConnected = connectedDevice?.id === item.id;
    const isConnecting = connectionStatus === 'connecting' && selectedDevice.id === item.id;

    const handlePress = () => {
      if (isConnected) return;
      if (mode === 'private') {
        if (!isConnecting) {
          requestConnection(item);
        }
        setSelectedDevice(item);
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      } else {
        setSelectedDevice(item);
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      }
    };

    return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        selected && styles.rowSelected,
        isConnected && styles.rowConnected,
        pressed && styles.rowPressed,
      ]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityState={{ selected: isConnected || selected }}
      accessibilityLabel={isConnected ? `Connected to ${item.name}` : `Select ${item.name} for private talk`}
    >
      <View style={styles.avatar}>
        {isConnected ? (
          <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
        ) : isConnecting ? (
          <MaterialCommunityIcons name="loading" size={18} color={COLORS.accent} />
        ) : (
          <Ionicons name={selected ? 'checkmark-circle' : 'phone-portrait-outline'} size={18} color={selected ? COLORS.accent : COLORS.primary} />
        )}
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.deviceName}>{item.name}</Text>
        <Text style={[styles.deviceMeta, isConnected && styles.connectedText]}>
          {item.transport ?? 'UNKNOWN'} · {item.connectionState ?? (isConnected ? 'CONNECTED' : isConnecting ? 'CONNECTING' : 'AVAILABLE')}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <SignalBars strength={item.signal} size={16} color={COLORS.primary} />
        <Text style={[styles.rssi, selected && styles.selectedText, isConnected && styles.connectedText]}>
          {item.nodeId ? `ID ${item.nodeId}` : item.id}
        </Text>
      </View>
    </Pressable>
    );
  };

  return (
    <Screen padded>
      <Header title="Nearby Devices" onBack={() => navigation.goBack()} />
      <DemoBanner visible={demoMode} />

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
            {scanning ? (mode === 'private' ? 'Scanning for target...' : `Scanning  ·  ${connectableDevices.length} found`) : `${connectableDevices.length} device${connectableDevices.length !== 1 ? 's' : ''}`}
          </Text>
        </View>
      </View>

      {/* Device list */}
      <FlatList
        data={connectableDevices}
        keyExtractor={d => d.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <EmptyState
            icon="wifi-outline"
            title="No devices found"
            body="Move closer to another iTantra device or start discovery again."
          />
        }
      />

      {/* CTA */}
      <PrimaryButton
        label={scanning ? 'Stop Scanning' : 'Start Scanning'}
        icon={scanning ? 'stop-circle-outline' : 'radio-outline'}
        variant={scanning ? 'ghost' : 'primary'}
        onPress={async () => {
          if (scanning) {
            await stopScan();
            setScanning(false);
          } else {
            setScanning(true);
            await startScan();
          }
        }}
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
  rowSelected: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentSoft,
  },
  rowConnected: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.success + '15',
  },
  rowPressed: {
    backgroundColor: COLORS.cardInner,
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
  connectedText: {
    color: COLORS.success,
    fontWeight: '600',
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  rssi: {
    ...TYPOGRAPHY.captionMedium,
    color: COLORS.textMuted,
  },
  selectedText: {
    color: COLORS.accent,
    fontWeight: '700',
  },
  cta: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
});
