import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import Screen from '../../components/Screen';
import PrimaryButton from '../../components/PrimaryButton';
import { useApp } from '../../context/AppContext';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'BroadcastSuccess'>;

export default function BroadcastSuccessScreen({ navigation, route }: Props) {
  const { channel, messages } = useApp();
  const msg = messages.find(m => m.id === route.params.messageId);
  const isDirect = Boolean(msg?.to);
  const delivered = msg?.status === 'DELIVERED';

  const scale = useRef(new Animated.Value(0.3)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scale, opacity]);

  return (
    <Screen padded>
      <Animated.View style={[styles.center, { opacity }]}>
        {/* Success mark */}
        <Animated.View style={[styles.outerRing, { transform: [{ scale }] }]}>
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={52} color={COLORS.white} />
          </View>
        </Animated.View>

        <Text style={styles.title}>
          {delivered ? (isDirect ? 'Message delivered' : 'Broadcast delivered') : 'Delivery pending'}
        </Text>
        <Text style={styles.subtitle}>
          {delivered
            ? isDirect
              ? `ACK received${msg?.to ? ` from ${msg.to}` : ''}`
              : `ACK received on ${channel.label}`
            : 'The engine has not confirmed delivery yet.'}
        </Text>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{msg?.status ?? 'SENDING'}</Text>
            <Text style={styles.statLabel}>Status</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{msg?.priority ?? 'Normal'}</Text>
            <Text style={styles.statLabel}>Priority</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{msg?.language ?? 'English'}</Text>
            <Text style={styles.statLabel}>Language</Text>
          </View>
        </View>
      </Animated.View>

      {/* Actions */}
      <View style={styles.actions}>
        <PrimaryButton
          label="Broadcast Again"
          icon="refresh"
          variant="outline"
          onPress={() =>
            msg
              ? navigation.replace('Broadcasting', { messageId: msg.id })
              : navigation.goBack()
          }
          style={styles.actionBtn}
        />
        <PrimaryButton
          label="Back to Home"
          icon="home"
          onPress={() => navigation.popToTop()}
          style={styles.actionBtn}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
  },
  outerRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.success + '30',
  },
  checkCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.blue,
  },
  title: {
    ...TYPOGRAPHY.headline,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  channelName: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    ...SHADOW.xs,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    minWidth: 0,
  },
  statValue: {
    ...TYPOGRAPHY.titleSmall,
    color: COLORS.textPrimary,
    fontWeight: '700',
    textAlign: 'center',
    maxWidth: '100%',
  },
  statLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textAlign: 'center',
    maxWidth: '100%',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.border,
  },
  actions: {
    gap: 10,
    paddingBottom: SPACING.lg,
  },
  actionBtn: {},
});
