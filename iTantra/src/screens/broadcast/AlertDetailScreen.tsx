import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import Screen from '../../components/Screen';
import Header from '../../components/Header';
import AlertIcon from '../../components/AlertIcon';
import PrimaryButton from '../../components/PrimaryButton';
import StatusBadge from '../../components/StatusBadge';
import { useApp } from '../../context/AppContext';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AlertDetail'>;

export default function AlertDetailScreen({ navigation, route }: Props) {
  const { alerts, channel, broadcastAlert, mode } = useApp();
  const alert = alerts.find(a => a.id === route.params.alertId);

  if (!alert) return null;

  const prioritySeverity =
    alert.priority === 'SOS' ? 'urgent' : alert.priority === 'High' ? 'high' : 'normal';

  const broadcast = () => {
    const msg = broadcastAlert(alert);
    navigation.navigate('Broadcasting', { messageId: msg.id });
  };

  return (
    <Screen padded scroll>
      <Header title="Alert Details" onBack={() => navigation.goBack()} />

      {/* Hero */}
      <View style={styles.hero}>
        <AlertIcon kind={alert.kind} size={80} iconSize={38} />
        <View style={styles.heroText}>
          <View style={styles.heroTitleRow}>
            <Text style={styles.heroTitle}>{alert.title}</Text>
            <StatusBadge label={alert.priority} severity={prioritySeverity} />
          </View>
          <Text style={styles.heroBody}>{alert.message}</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

{/* Broadcast settings */}
      <Text style={styles.sectionLabel}>Broadcast settings</Text>
      <View style={styles.card}>
        {mode !== 'private' && (
          <>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Channel</Text>
              <Text style={styles.metaValue}>{channel.label}</Text>
            </View>
            <View style={styles.metaDivider} />
          </>
        )}
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Priority</Text>
          <StatusBadge
            label={alert.priority}
            severity={prioritySeverity}
          />
        </View>
        <View style={styles.metaDivider} />
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Language</Text>
          <Text style={styles.metaValue}>{alert.language}</Text>
        </View>
      </View>

      <View style={{ flex: 1, minHeight: SPACING.xl }} />

      <PrimaryButton
        label="Broadcast Now"
        icon="paper-plane"
        onPress={broadcast}
        style={styles.cta}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    paddingVertical: SPACING.md,
  },
  heroText: {
    flex: 1,
    gap: 6,
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  heroTitle: {
    ...TYPOGRAPHY.title,
    color: COLORS.textPrimary,
  },
  heroBody: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  sectionLabel: {
    ...TYPOGRAPHY.captionMedium,
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    ...SHADOW.xs,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  metaDivider: {
    height: 1,
    backgroundColor: COLORS.borderSoft,
    marginHorizontal: 16,
  },
  metaLabel: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textSecondary,
  },
  metaValue: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  cta: {
    marginBottom: SPACING.lg,
  },
});
