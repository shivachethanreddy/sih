import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import Screen from '../../components/Screen';
import MessageCard from '../../components/MessageCard';
import PrimaryButton from '../../components/PrimaryButton';
import StatusBadge from '../../components/StatusBadge';
import { useApp } from '../../context/AppContext';
import { DEMO_INCOMING } from '../../data/mockData';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'MessageReceived'>;

function MetaRow({
  label,
  value,
  valueColor,
  last,
}: {
  label: string;
  value: string;
  valueColor?: string;
  last?: boolean;
}) {
  return (
    <View style={[metaStyles.row, !last && metaStyles.bordered]}>
      <Text style={metaStyles.label}>{label}</Text>
      <Text style={[metaStyles.value, valueColor ? { color: valueColor } : null]}>
        {value}
      </Text>
    </View>
  );
}

const metaStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    gap: 12,
  },
  bordered: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
  },
  label: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, flex: 1 },
  value: { ...TYPOGRAPHY.bodySmall, color: COLORS.textPrimary, fontWeight: '600', flexShrink: 0, textAlign: 'right' },
});

export default function MessageReceivedScreen({ navigation, route }: Props) {
  const { messages, clearIncoming } = useApp();
  const msg = messages.find(m => m.id === route.params.messageId) ?? DEMO_INCOMING;

  const prioritySeverity =
    msg.priority === 'SOS' ? 'urgent' : msg.priority === 'High' ? 'high' : 'success';

  return (
    <Screen padded scroll>
      {/* Top badge */}
      <View style={styles.topBadgeRow}>
        <View style={styles.checkWrap}>
          <Ionicons name="checkmark" size={20} color={COLORS.success} />
        </View>
        <Text style={styles.receivedLabel}>Message Received</Text>
        <StatusBadge label={msg.priority} severity={prioritySeverity} />
      </View>

      {/* Message card */}
      <View style={styles.cardWrap}>
        <MessageCard
          channel={msg.channel}
          tag={msg.tag}
          from={msg.from}
          time={msg.time}
          durationSec={msg.durationSec}
          priority={msg.priority}
        />
      </View>

      {/* Playback action section */}
      <View style={styles.actionRow}>
        <Pressable
          style={styles.playAction}
          onPress={() => navigation.navigate('NowPlaying', { messageId: msg.id })}
          accessibilityLabel="Play message"
        >
          <Ionicons name="play" size={28} color={COLORS.white} />
          <Text style={styles.playActionLabel}>Play</Text>
        </Pressable>


      </View>

{/* Metadata */}
      <View style={styles.metaCard}>
        <MetaRow label="Priority" value={msg.priority} valueColor={msg.priority !== 'Normal' ? COLORS.warning : undefined} />
        <MetaRow label="Language" value={msg.language} />
        <MetaRow label="Time Received" value={msg.time} last />
      </View>

      {/* Acknowledge */}
      <PrimaryButton
        label="Acknowledge & Respond"
        icon="checkmark-circle"
        onPress={() => {
          clearIncoming();
          navigation.navigate('QuickResponse', { to: msg.from });
        }}
        style={styles.cta}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  checkWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receivedLabel: {
    ...TYPOGRAPHY.titleSmall,
    color: COLORS.textPrimary,
    flex: 1,
  },
  cardWrap: {
    marginBottom: SPACING.lg,
  },
  actionRow: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },

  playAction: {
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    ...SHADOW.blue,
  },
  playActionLabel: {
    ...TYPOGRAPHY.captionMedium,
    color: COLORS.white,
    fontWeight: '600',
    marginTop: -2,
  },
  metaCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    marginBottom: SPACING.lg,
    ...SHADOW.xs,
  },
  cta: {
    marginBottom: SPACING.lg,
  },
});
