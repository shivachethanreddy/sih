import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import Screen from '../../components/Screen';
import PulsingRings from '../../components/PulsingRings';
import PrimaryButton from '../../components/PrimaryButton';
import { useApp } from '../../context/AppContext';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Broadcasting'>;

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[rowStyles.row, !last && rowStyles.bordered]}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={rowStyles.value}>{value}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
  },
  bordered: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
  },
  label: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  value: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
});

export default function BroadcastingScreen({ navigation, route }: Props) {
  const { messages, channel, lastSendError } = useApp();
  const msg = messages.find(m => m.id === route.params.messageId);
  const isDirect = Boolean(msg?.to);
  const status = msg?.status ?? 'SENDING';

  useEffect(() => {
    if (status === 'DELIVERED') {
      const t = setTimeout(() => {
        navigation.replace('BroadcastSuccess', { messageId: route.params.messageId });
      }, 400);
      return () => clearTimeout(t);
    }
  }, [status, navigation, route.params.messageId]);

  return (
    <Screen padded>
      <View style={styles.center}>
        {/* Status label */}
        <View style={styles.statusPill}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>
            {status === 'FAILED'
              ? 'Delivery failed'
              : status === 'DELIVERED'
              ? 'Delivered'
              : status === 'RETRYING'
              ? 'Retrying...'
              : isDirect
              ? 'Sending privately'
              : 'Transmitting'}
          </Text>
        </View>

        {/* Pulsing icon */}
        <View style={styles.iconWrap}>
          <PulsingRings size={140} color={COLORS.primary} active>
            <View style={[styles.iconCircle, SHADOW.blue]}>
              <MaterialCommunityIcons
                name="radio-handheld"
                size={52}
                color={COLORS.white}
              />
            </View>
          </PulsingRings>
        </View>

        {/* Sending info */}
        <Text style={styles.sendingLabel}>
          {status === 'FAILED'
            ? lastSendError ?? 'No connected peers'
            : isDirect
            ? `Sending to ${msg?.to}`
            : 'Sending to connected peers'}
        </Text>
        <Text style={styles.sendingHint}>
          {status === 'FAILED'
            ? 'The packet was not acknowledged.'
            : 'Keep this screen open until the engine reports delivery.'}
        </Text>

        {/* Info card */}
        <View style={styles.card}>
          <InfoRow label={isDirect ? 'Recipient' : 'Channel'} value={isDirect ? msg?.to ?? 'Selected device' : channel.label} />
          <InfoRow label="Message" value={msg?.tag.replace('#', '') ?? 'Voice Message'} />
          <InfoRow label="Language" value={msg?.language ?? 'English'} />
          <InfoRow label="Status" value={status} last />
        </View>
      </View>

      <PrimaryButton
        label={isDirect ? 'Cancel Send' : 'Cancel Broadcast'}
        icon="close"
        variant="ghost"
        onPress={() => navigation.goBack()}
        style={styles.cancelBtn}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    paddingTop: SPACING.xl,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
    marginBottom: SPACING.xl,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  statusText: {
    ...TYPOGRAPHY.label,
    color: COLORS.primary,
    fontWeight: '700',
  },
  iconWrap: {
    marginBottom: SPACING.lg,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendingLabel: {
    ...TYPOGRAPHY.titleSmall,
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  sendingHint: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  card: {
    alignSelf: 'stretch',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    ...SHADOW.xs,
  },
  cancelBtn: {
    marginBottom: SPACING.lg,
  },
});
