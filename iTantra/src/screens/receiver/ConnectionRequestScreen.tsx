import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import Screen from '../../components/Screen';
import Header from '../../components/Header';
import PulsingRings from '../../components/PulsingRings';
import SignalBars from '../../components/SignalBars';
import PrimaryButton from '../../components/PrimaryButton';
import { useApp } from '../../context/AppContext';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ConnectionRequest'>;

export default function ConnectionRequestScreen({ navigation, route }: Props) {
  const { connectionRequest, acceptConnection, rejectConnection } = useApp();
  const { fromName, deviceId } = route.params;

  useEffect(() => {
    if (!connectionRequest) {
      navigation.goBack();
    }
  }, [connectionRequest, navigation]);

  const handleAccept = () => {
    acceptConnection();
    navigation.replace('Main');
  };

  const handleReject = () => {
    rejectConnection();
    navigation.goBack();
  };

  return (
    <Screen padded>
      <Header
        title="Connection Request"
        titleColor={COLORS.accent}
        onBack={handleReject}
        right={
          <MaterialCommunityIcons
            name="access-point"
            size={22}
            color={COLORS.accent}
          />
        }
      />

      {/* Sender info card */}
      <View style={styles.senderCard}>
        <View style={styles.senderAvatar}>
          <Ionicons name="person" size={22} color={COLORS.primary} />
        </View>
        <View style={styles.senderInfo}>
          <Text style={styles.senderName}>{fromName ?? 'Unknown Device'}</Text>
          <Text style={styles.senderMeta}>Wants to connect via Private Network</Text>
        </View>
        <SignalBars strength={4} size={18} color={COLORS.primary} />
      </View>

      {/* Animated connecting indicator */}
      <View style={styles.center}>
        <PulsingRings size={130} color={COLORS.accent} active>
          <View style={[styles.waveCircle, SHADOW.orange]}>
            <MaterialCommunityIcons name="handshake-outline" size={40} color={COLORS.accent} />
          </View>
        </PulsingRings>
        <Text style={styles.connectingLabel}>Incoming connection request</Text>
        <Text style={styles.connectingHint}>Accept to start private communication</Text>
      </View>

      {/* Device info card */}
      <View style={styles.metaCard}>
        {[
          { label: 'Device ID', value: deviceId },
          { label: 'Distance', value: '~1.2 m' },
          { label: 'Signal', right: <SignalBars strength={4} size={16} color={COLORS.primary} /> },
          { label: 'Type', value: 'Encrypted P2P' },
        ].map((row, i, arr) => (
          <View
            key={i}
            style={[styles.metaRow, i < arr.length - 1 && styles.metaRowBorder]}
          >
            <Text style={styles.metaLabel}>{row.label}</Text>
            {row.right ?? <Text style={styles.metaValue}>{row.value}</Text>}
          </View>
        ))}
      </View>

      {/* Action buttons */}
      <View style={styles.buttonRow}>
        <PrimaryButton
          label="Reject"
          icon="close"
          variant="ghost"
          onPress={handleReject}
          style={styles.rejectBtn}
        />
        <PrimaryButton
          label="Accept"
          icon="checkmark"
          onPress={handleAccept}
          style={styles.acceptBtn}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  senderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginTop: 4,
    marginBottom: SPACING.lg,
    ...SHADOW.xs,
  },
  senderAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  senderInfo: {
    flex: 1,
  },
  senderName: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  senderMeta: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  center: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  waveCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectingLabel: {
    ...TYPOGRAPHY.titleSmall,
    color: COLORS.accent,
    marginTop: SPACING.lg,
  },
  connectingHint: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  metaCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    marginBottom: SPACING.md,
    ...SHADOW.xs,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
  },
  metaRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
  },
  metaLabel: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  metaValue: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: SPACING.lg,
  },
  rejectBtn: {
    flex: 1,
  },
  acceptBtn: {
    flex: 1,
  },
});