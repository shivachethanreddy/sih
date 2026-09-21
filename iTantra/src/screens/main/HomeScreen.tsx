import React, { useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import Screen from '../../components/Screen';
import MessageCard from '../../components/MessageCard';
import PulsingRings from '../../components/PulsingRings';
import LcdDisplay from '../../components/LcdDisplay';
import SignalBars from '../../components/SignalBars';
import { useApp } from '../../context/AppContext';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const {
    mode,
    channel,
    devices,
    messages,
    myName,
    simulateIncoming,
    transcribeAudio,
    sendCustomMessage,
  } = useApp();

  const [recording, setRecording] = useState(false);
  const pressStart = useRef(0);
  const busy = useRef(false);
  const pttScale = useRef(new Animated.Value(1)).current;

  const latest = messages[0];
  const online = devices.length;

  const startTalk = () => {
    pressStart.current = Date.now();
    setRecording(true);
    Animated.spring(pttScale, {
      toValue: 0.92,
      useNativeDriver: true,
      speed: 40,
      bounciness: 3,
    }).start();
  };

  const stopTalk = async () => {
    Animated.spring(pttScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 28,
      bounciness: 6,
    }).start();

    setRecording(false);
    const held = Date.now() - pressStart.current;
    if (held < 350 || busy.current) return;
    busy.current = true;
    const text = await transcribeAudio();
    const msg = sendCustomMessage(text, 'Telugu');
    busy.current = false;
    navigation.navigate('Broadcasting', { messageId: msg.id });
  };

  return (
    <Screen padded scroll hideBack>
      {/* ── Header row ──────────────────────────────────────── */}
      <View style={styles.topRow}>
        <View style={styles.greetingBlock}>
          <Text style={styles.greeting}>{greeting()}</Text>
          <Text style={styles.username}>{myName}</Text>
        </View>

        <View style={styles.topRight}>
          {/* Notifications */}
          <Pressable
            hitSlop={10}
            style={styles.iconBtn}
            onPress={() => {
              simulateIncoming();
              navigation.navigate('IncomingAlert');
            }}
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={20} color={COLORS.textPrimary} />
          </Pressable>

          {/* Network mode pill */}
          <Pressable
            style={styles.modePill}
            onPress={() => navigation.navigate('ModeSelect')}
          >
            <View
              style={[
                styles.modeDot,
                { backgroundColor: mode === 'public' ? COLORS.primary : COLORS.accent },
              ]}
            />
            <Text style={styles.modeText}>
              {mode === 'public' ? 'Public' : 'Private'}
            </Text>
            <Ionicons name="chevron-down" size={12} color={COLORS.textMuted} />
          </Pressable>
        </View>
      </View>

      {/* ── Status HUD ──────────────────────────────────────── */}
      <LcdDisplay
        channelLabel={channel.label}
        frequency={channel.frequency ?? '433.920 MHz'}
        nodesOnline={online}
        statusText={recording ? 'Broadcasting...' : 'Ready to Talk'}
        isTransmitting={recording}
      />

      {/* ── PTT Section ─────────────────────────────────────── */}
      <View style={styles.pttSection}>
        {/* Side action: Radar */}
        <View style={styles.sideAction}>
          <Pressable
            style={styles.sideBtn}
            onPress={() => navigation.navigate('ChannelMonitor')}
            accessibilityLabel="Channel monitor"
          >
            <MaterialCommunityIcons name="radar" size={22} color={COLORS.textSecondary} />
          </Pressable>
          <Text style={styles.sideLabel}>Monitor</Text>
        </View>

        {/* PTT button */}
        <View style={styles.pttWrap}>
          <PulsingRings
            size={118}
            color={recording ? COLORS.accent : COLORS.primary}
            active={recording}
          >
            <Animated.View style={{ transform: [{ scale: pttScale }] }}>
              <Pressable
                onPressIn={startTalk}
                onPressOut={stopTalk}
                style={[
                  styles.pttBtn,
                  recording ? styles.pttBtnActive : null,
                  recording ? SHADOW.orange : SHADOW.blue,
                ]}
                accessibilityRole="button"
                accessibilityLabel={recording ? 'Release to send' : 'Hold to speak'}
              >
                <Ionicons
                  name={recording ? 'mic' : 'mic-outline'}
                  size={40}
                  color={COLORS.white}
                />
              </Pressable>
            </Animated.View>
          </PulsingRings>
          <Text style={[styles.pttLabel, recording && { color: COLORS.accent }]}>
            {recording ? 'Recording...' : 'Hold to Speak'}
          </Text>
        </View>

        {/* Side action: Alerts */}
        <View style={styles.sideAction}>
          <Pressable
            style={styles.sideBtn}
            onPress={() => navigation.navigate('AutoAlerts')}
            accessibilityLabel="Alerts"
          >
            <Ionicons name="warning-outline" size={22} color={COLORS.textSecondary} />
          </Pressable>
          <Text style={styles.sideLabel}>Alerts</Text>
        </View>
      </View>

      {/* ── Recent Transmission ─────────────────────────────── */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Recent Transmission</Text>
        <Pressable
          onPress={() => navigation.navigate('Main' as any)}
          hitSlop={8}
        >
          <Text style={styles.seeAll}>See all</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() =>
          latest && navigation.navigate('MessageReceived', { messageId: latest.id })
        }
        disabled={!latest}
      >
        <MessageCard
          channel={channel.label}
          tag={latest?.tag ?? '#FloodAlert'}
          from={latest?.from ?? 'Rescue_01'}
          time={latest?.time ?? '10:15 AM'}
          durationSec={latest?.durationSec ?? 25}
          priority={latest?.priority}
        />
      </Pressable>

      {/* ── Peers online indicator ──────────────────────────── */}
      <Pressable
        style={styles.peersCard}
        onPress={() => navigation.navigate('Devices')}
      >
        <View style={styles.peersLeft}>
          <View style={styles.peersIconWrap}>
            <Ionicons name="people-outline" size={18} color={COLORS.primary} />
          </View>
          <View>
            <Text style={styles.peersTitle}>{online} peers in range</Text>
            <Text style={styles.peersBody}>Tap to view connected devices</Text>
          </View>
        </View>
        <SignalBars strength={4} size={16} color={COLORS.primary} />
      </Pressable>

      {/* ── Emergency SOS ───────────────────────────────────── */}
      <Pressable
        style={styles.sosBtn}
        onPress={() => navigation.navigate('Emergency')}
        accessibilityRole="button"
        accessibilityLabel="Emergency SOS"
      >
        <Ionicons name="alert-circle-outline" size={16} color={COLORS.sos} />
        <Text style={styles.sosText}>Emergency SOS</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Header
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    marginBottom: 4,
  },
  greetingBlock: {
    gap: 1,
  },
  greeting: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  username: {
    ...TYPOGRAPHY.titleSmall,
    color: COLORS.textPrimary,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  modeText: {
    ...TYPOGRAPHY.captionMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },

  // PTT
  pttSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.lg + 4,
    marginBottom: SPACING.md,
    paddingHorizontal: 8,
  },
  sideAction: {
    alignItems: 'center',
    gap: 6,
    width: 64,
  },
  sideBtn: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.xs,
  },
  sideLabel: {
    ...TYPOGRAPHY.captionMedium,
    color: COLORS.textMuted,
  },
  pttWrap: {
    alignItems: 'center',
    gap: 12,
  },
  pttBtn: {
    width: 118,
    height: 118,
    borderRadius: 59,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(37, 99, 235, 0.15)',
  },
  pttBtnActive: {
    backgroundColor: COLORS.accent,
    borderColor: 'rgba(8, 145, 178, 0.2)',
  },
  pttLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },

  // Recent
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.lg,
    marginBottom: 10,
  },
  sectionTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  seeAll: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Peers card
  peersCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginTop: 12,
    ...SHADOW.xs,
  },
  peersLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  peersIconWrap: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  peersTitle: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  peersBody: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 1,
  },

  // SOS
  sosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 14,
    marginBottom: 28,
    paddingVertical: 13,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.sos + '30',
    backgroundColor: COLORS.sosSoft,
  },
  sosText: {
    ...TYPOGRAPHY.label,
    color: COLORS.sos,
    fontWeight: '600',
  },
});
