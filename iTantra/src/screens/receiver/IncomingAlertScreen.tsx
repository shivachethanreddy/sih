import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import Screen from '../../components/Screen';
import Header from '../../components/Header';
import PulsingRings from '../../components/PulsingRings';
import Waveform from '../../components/Waveform';
import SignalBars from '../../components/SignalBars';
import PrimaryButton from '../../components/PrimaryButton';
import StatusBadge from '../../components/StatusBadge';
import { useApp } from '../../context/AppContext';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'IncomingAlert'>;

export default function IncomingAlertScreen({ navigation }: Props) {
  const { incoming, clearIncoming } = useApp();
  const msg = incoming;

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => {
      navigation.replace('MessageReceived', { messageId: msg.id });
    }, 3000);
    return () => clearTimeout(t);
  }, [msg, navigation]);

  const handleCancel = () => {
    clearIncoming();
    navigation.goBack();
  };

  return (
    <Screen padded>
      <Header
        title="Incoming Message"
        titleColor={COLORS.accent}
        onBack={handleCancel}
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
          <Text style={styles.senderName}>{msg?.from ?? 'Rescue_01'}</Text>
          <Text style={styles.senderMeta}>Device ID: R01-A7  ·  1.2 m away</Text>
        </View>
        <StatusBadge label="Live" severity="info" dot />
      </View>

      {/* Animated receiving indicator */}
      <View style={styles.center}>
        <PulsingRings size={130} color={COLORS.accent} active>
          <View style={[styles.waveCircle, SHADOW.orange]}>
            <Waveform bars={14} height={38} color={COLORS.accent} animated />
          </View>
        </PulsingRings>
        <Text style={styles.receivingLabel}>Receiving voice message...</Text>
        <Text style={styles.receivingHint}>Will open automatically in a moment</Text>
      </View>

      {/* Metadata card */}
      <View style={styles.metaCard}>
        {[
          { label: 'Priority', right: <StatusBadge label="HIGH" severity="high" /> },
          { label: 'Channel', value: msg?.channel ?? 'CH 3/10' },
          { label: 'Language', value: msg?.language ?? 'Telugu' },
          { label: 'Signal', right: <SignalBars strength={4} size={16} color={COLORS.primary} /> },
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

      <PrimaryButton
        label="Cancel"
        icon="close"
        variant="ghost"
        onPress={handleCancel}
        style={styles.cancelBtn}
      />
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
  receivingLabel: {
    ...TYPOGRAPHY.titleSmall,
    color: COLORS.accent,
    marginTop: SPACING.lg,
  },
  receivingHint: {
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
  cancelBtn: {
    marginBottom: SPACING.md,
  },
});
