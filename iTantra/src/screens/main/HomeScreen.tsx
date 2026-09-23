import React, { useRef, useState, useEffect } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import Screen from '../../components/Screen';
import MessageCard from '../../components/MessageCard';
import PulsingRings from '../../components/PulsingRings';
import SignalBars from '../../components/SignalBars';
import { useApp } from '../../context/AppContext';
import { LANGUAGES } from '../../data/mockData';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../../theme';
import { DemoBanner } from '../../components/EngineStatus';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_SMALL_SCREEN = SCREEN_WIDTH < 360;
const PTT_SIZE = IS_SMALL_SCREEN ? 108 : 124;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const {
    mode,
    channel,
    devices,
    messages,
    myName,
    incoming,
    selectedDevice,
    speakLanguage,
    setSpeakLanguage,
    connectedDevice,
    connectionStatus,
    disconnect,
    demoMode,
    network,
    communicationState,
    startTalk,
    stopTalkAndSend,
    startScan,
  } = useApp();

  const [recording, setRecording] = useState(false);
  const pressStart = useRef(0);
  const busy = useRef(false);
  const pttScale = useRef(new Animated.Value(1)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(
    [
      new Animated.Value(0),
      new Animated.Value(0),
      new Animated.Value(0),
      new Animated.Value(0),
    ]
  ).current;

  const latest = messages[0];
  const isPrivate = mode === 'private';
  const connectedDevices = devices.filter(d => d.connectionState === 'CONNECTED' || d.name !== myName);
  const online = network.peers;
  const isConnected = network.status === 'CONNECTED' || (isPrivate && connectedDevice && connectionStatus === 'connected');
  const isConnecting = network.status === 'CONNECTING' || (isPrivate && connectionStatus === 'connecting');

  useEffect(() => {
    startScan().catch(() => {});
  }, [startScan]);

  // Entry animations
  useEffect(() => {
    Animated.timing(contentFade, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    cardAnim.forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        delay: 150 + i * 80,
        useNativeDriver: true,
      }).start();
    });
  }, [contentFade]);

  const startTalkPress = () => {
    pressStart.current = Date.now();
    setRecording(true);
    Animated.spring(pttScale, {
      toValue: 0.92,
      useNativeDriver: true,
      speed: 40,
      bounciness: 3,
    }).start();
    startTalk().catch(() => {});
  };

  const stopTalkPress = async () => {
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
    const msg = await stopTalkAndSend();
    busy.current = false;
    if (msg) navigation.navigate('Broadcasting', { messageId: msg.id });
  };

  // Connection status text and color
  const getStatusConfig = () => {
    if (recording || communicationState === 'RECORDING') {
      return {
        text: 'Recording — release to send',
        dotColor: COLORS.accent,
        bgColor: COLORS.accentSoft,
        icon: 'mic',
        iconColor: COLORS.accent,
      };
    }
    if (communicationState === 'TRANSCRIBING' || communicationState === 'PROCESSING') {
      return {
        text: 'Transcribing (mock AI)',
        dotColor: COLORS.warning,
        bgColor: COLORS.warningSoft,
        icon: 'sync',
        iconColor: COLORS.warning,
      };
    }
    if (communicationState === 'SENDING' || communicationState === 'PACKETIZING') {
      return {
        text: 'Transmitting packet...',
        dotColor: COLORS.primary,
        bgColor: COLORS.primarySoft,
        icon: 'radio',
        iconColor: COLORS.primary,
      };
    }
    if (network.status === 'OFFLINE') {
      return {
        text: 'Offline — no local peers',
        dotColor: COLORS.textMuted,
        bgColor: COLORS.cardInner,
        icon: 'radio-button-off',
        iconColor: COLORS.textMuted,
      };
    }
    if (network.status === 'DISCOVERING') {
      return {
        text: `Searching nearby devices · ${network.discovered} found`,
        dotColor: COLORS.warning,
        bgColor: COLORS.warningSoft,
        icon: 'sync',
        iconColor: COLORS.warning,
      };
    }
    if (isConnected) {
      return {
        text: isPrivate && connectedDevice
          ? `Connected to ${connectedDevice.name}`
          : `Connected · ${online} peer${online !== 1 ? 's' : ''}`,
        dotColor: COLORS.success,
        bgColor: COLORS.successSoft,
        icon: 'checkmark-circle',
        iconColor: COLORS.success,
      };
    }
    return {
      text: 'Ready to speak',
      dotColor: COLORS.success,
      bgColor: COLORS.successSoft,
      icon: 'checkmark-circle',
      iconColor: COLORS.success,
    };
  };

  const statusConfig = getStatusConfig();
  const isPublicMode = mode === 'public';

  // PTT button shadow based on state
  const pttShadow = recording
    ? SHADOW.orange
    : isConnected
    ? SHADOW.green
    : SHADOW.blue;

  // Format channel display
  const channelDisplay = isConnected
    ? `${connectedDevice?.name} (Connected)`
    : isPrivate
    ? selectedDevice.name
    : channel.label;

  const freqDisplay = isConnected
    ? `${network.transport}${demoMode ? ' · DEMO' : ''}`
    : isPrivate
    ? 'Private link'
    : channel.frequency ?? 'Logical channel';

  return (
    <Screen padded scroll hideBack>
      <Animated.View
        style={{
          opacity: contentFade,
          transform: [{ translateY: contentFade.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        }}
      >
        {/* ── Top App Bar ──────────────────────────────────────── */}
        <View style={styles.topBar}>
          <Pressable
            hitSlop={10}
            style={styles.iconBtn}
            onPress={() => {
              if (incoming) navigation.navigate('IncomingAlert');
              else navigation.navigate('HistoryTab' as any);
            }}
            accessibilityLabel="Inbox"
          >
            <Ionicons name="notifications-outline" size={22} color={COLORS.textPrimary} />
          </Pressable>

          {/* Network mode pill */}
          <Pressable
            style={styles.modePill}
            onPress={() => navigation.navigate('ModeSelect')}
            accessibilityLabel="Network mode"
          >
            <View
              style={[
                styles.modeDot,
                { backgroundColor: mode === 'public' ? COLORS.primary : COLORS.accent },
              ]}
            />
            <Text style={styles.modeText}>
              {mode === 'public' ? 'Public Mesh' : isConnected ? 'Private Network ✓' : 'Private Network'}
            </Text>
            <Ionicons name="chevron-down" size={12} color={COLORS.textMuted} />
          </Pressable>
        </View>

        <DemoBanner visible={demoMode} />

        {/* ── Connection Status Card ───────────────────────────── */}
        <Animated.View
          style={[
            styles.statusCard,
            {
              opacity: cardAnim[0],
              transform: [{ translateY: cardAnim[0].interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
            },
          ]}
        >
          {/* Status row */}
          <View style={styles.statusRow}>
            <View style={[styles.statusPill, { backgroundColor: statusConfig.bgColor }]}>
              <View style={[styles.statusDot, { backgroundColor: statusConfig.dotColor }]} />
              <Text style={[styles.statusText, { color: statusConfig.dotColor }]}>
                {statusConfig.text}
              </Text>
            </View>
          </View>

          {/* Channel info */}
          <View style={styles.channelRow}>
            <View style={styles.channelInfo}>
              <Text style={styles.channelLabel}>{channelDisplay}</Text>
              <Text style={styles.freqText}>
                {freqDisplay}
                {!isPrivate && !isConnected && ' · Direct Mesh'}
              </Text>
            </View>

            {isPrivate ? (
              <Text style={styles.meshText}>
                {connectedDevice ? 'Private' : 'No peer'}
              </Text>
            ) : (
              <View style={styles.meshBadge}>
                <MaterialCommunityIcons
                  name="access-point-network"
                  size={14}
                  color={COLORS.primary}
                />
                <Text style={styles.meshText}>{online} Peer{online !== 1 ? 's' : ''}</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* ── PTT Section ─────────────────────────────────────── */}
        <Animated.View
          style={[
            styles.pttSection,
            {
              opacity: cardAnim[1],
              transform: [{ translateY: cardAnim[1].interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
            },
          ]}
        >
          {/* Monitor / Device / Disconnect */}
          <View style={styles.sideAction}>
            <Pressable
              style={[
                styles.sideBtn,
                isConnected && styles.disconnectBtn,
                isPrivate && !isConnected && styles.secondaryBtn,
              ]}
              onPress={isConnected ? disconnect : () => navigation.navigate(isPrivate ? 'Devices' : 'ChannelMonitor')}
              accessibilityLabel={isConnected ? 'Disconnect' : isPrivate ? 'Select device' : 'Open monitor'}
            >
              {isConnected ? (
                <Ionicons name="close-circle" size={22} color={COLORS.sos} />
              ) : (
                <MaterialCommunityIcons
                  name={isPrivate ? 'cellphone-link' : 'radar'}
                  size={22}
                  color={COLORS.textSecondary}
                />
              )}
            </Pressable>
            <Text style={styles.sideLabel}>
              {isConnected ? 'Disconnect' : isPrivate ? 'Device' : 'Monitor'}
            </Text>
          </View>

          {/* PTT button */}
          <View style={styles.pttWrap}>
            <Animated.View
              style={{
                transform: [{ scale: pttScale }],
              }}
            >
              <PulsingRings
                size={PTT_SIZE}
                color={recording ? COLORS.accent : isConnected ? COLORS.success : COLORS.primary}
                active={recording}
              >
                <Pressable
                  onPressIn={isPrivate && !isConnected ? undefined : startTalkPress}
                  onPressOut={isPrivate && !isConnected ? undefined : stopTalkPress}
                  style={[
                    styles.pttBtn,
                    {
                      width: PTT_SIZE,
                      height: PTT_SIZE,
                      borderRadius: PTT_SIZE / 2,
                      ...pttShadow,
                    },
                    recording && styles.pttBtnActive,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={isPrivate && !isConnected ? 'Connect to a device first' : (recording ? 'Release to send' : 'Hold to speak')}
                  disabled={isPrivate && !isConnected}
                >
                  <Ionicons
                    name={recording ? 'mic' : 'mic-outline'}
                    size={IS_SMALL_SCREEN ? 36 : 42}
                    color={COLORS.white}
                  />
                </Pressable>
              </PulsingRings>
            </Animated.View>

            <Text style={[styles.pttLabel, recording && { color: COLORS.accent }]}>
              {recording
                ? 'Recording — release to send'
                : communicationState === 'TRANSCRIBING'
                ? 'Transcribing...'
                : communicationState === 'SENDING'
                ? 'Transmitting...'
                : isConnected
                ? 'Hold to speak'
                : isConnecting
                ? 'Connecting...'
                : isPrivate
                ? 'Connect to a device'
                : 'Hold to Speak'}
            </Text>
            {(isConnected || isPrivate) && (
              <Text style={styles.privateTarget} numberOfLines={1}>
                {isConnected ? `Connected to ${connectedDevice?.name}` : `to ${selectedDevice.name}`}
              </Text>
            )}
          </View>

          {/* Alerts */}
          <View style={styles.sideAction}>
            <Pressable
              style={styles.sideBtn}
              onPress={() => navigation.navigate('AutoAlerts')}
              accessibilityLabel="Open alerts"
            >
              <Ionicons name="warning-outline" size={22} color={COLORS.textSecondary} />
            </Pressable>
            <Text style={styles.sideLabel}>Alerts</Text>
          </View>
        </Animated.View>

        {/* ── Recent Transmission ─────────────────────────────── */}
        <Animated.View
          style={[
            styles.sectionCard,
            {
              opacity: cardAnim[2],
              transform: [{ translateY: cardAnim[2].interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
            },
          ]}
        >
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Recent Transmission</Text>
            <Pressable
              onPress={() => navigation.navigate('Main' as any)}
              hitSlop={8}
              accessibilityLabel="View all transmissions"
            >
              <Text style={styles.seeAll}>See all</Text>
            </Pressable>
          </View>

          {latest ? (
            <Pressable
              onPress={() => navigation.navigate('MessageReceived', { messageId: latest.id })}
              accessibilityLabel={`View message from ${latest.from}`}
            >
              <MessageCard
                channel={latest.to ? `To ${latest.to}` : channel.label}
                tag={latest.tag ?? '#FloodAlert'}
                from={latest.from ?? 'Device_A'}
                time={latest.time ?? '10:15 AM'}
                durationSec={latest.durationSec ?? 25}
                priority={latest.priority}
              />
            </Pressable>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubble-outline" size={28} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No transmissions yet</Text>
              <Text style={styles.emptySub}>Incoming messages will appear here</Text>
            </View>
          )}
        </Animated.View>

        {/* ── Peers Card ──────────────────────────────────────── */}
        <Animated.View
          style={[
            styles.peersCard,
            {
              opacity: cardAnim[3],
              transform: [{ translateY: cardAnim[3].interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
            },
          ]}
        >
          <Pressable
            onPress={() => navigation.navigate('Devices')}
            accessibilityLabel={`${online} peer${online !== 1 ? 's' : ''} in range. Tap to view connected devices.`}
            style={styles.peersPressable}
          >
            <View style={styles.peersLeft}>
              <View style={styles.peersIconWrap}>
                <Ionicons name="people-outline" size={18} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.peersTitle}>
                  {devices.length === 0
                    ? 'No nearby devices'
                    : isPrivate
                    ? (selectedDevice.name || 'Select a peer')
                    : `${online} connected · ${devices.length} discovered`}
                </Text>
                <Text style={styles.peersBody}>
                  {devices.length === 0
                    ? 'Move closer or start discovery again'
                    : devices.slice(0, 2).map(d => d.name).join(', ')}
                </Text>
              </View>
            </View>
            <SignalBars strength={connectedDevice?.signal ?? 0} size={16} color={COLORS.primary} />
          </Pressable>
        </Animated.View>

        {/* ── Speech Language Selector ────────────────────────── */}
        <View style={styles.sttCard}>
          <View style={styles.sttHeader}>
            <View style={styles.sttIconWrap}>
              <Ionicons name="mic-outline" size={16} color={COLORS.primary} />
            </View>
            <View style={styles.sttTitleBlock}>
              <Text style={styles.sttTitle}>
                {isPrivate ? 'Private Network · Speech Language' : 'Public Mesh · Speech Language'}
              </Text>
              <Text style={styles.sttSub}>STT / TTS are MOCK until on-device models are wired</Text>
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sttChips}
          >
            {LANGUAGES.map(l => {
              const active = speakLanguage === l.name;
              return (
                <Pressable
                  key={l.code}
                  style={[styles.sttChip, active && styles.sttChipActive]}
                  onPress={() => setSpeakLanguage(l.name)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  accessibilityLabel={`${l.name} ${active ? 'selected' : ''}`}
                >
                  <Text style={[styles.sttChipText, active && styles.sttChipTextActive]}>
                    {l.name}
                  </Text>
                  <Text style={[styles.sttChipNative, active && styles.sttChipNativeActive]}>
                    {l.native}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

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
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Top Bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.xs,
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.xs,
  },
  modeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modeText: {
    ...TYPOGRAPHY.captionMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },

  // Connection Status Card
  statusCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOW.card,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    ...TYPOGRAPHY.captionMedium,
    fontWeight: '600',
  },
  channelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  channelInfo: {
    flex: 1,
  },
  channelLabel: {
    ...TYPOGRAPHY.headline,
    color: COLORS.textPrimary,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  freqText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  meshBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
  },
  meshText: {
    ...TYPOGRAPHY.captionMedium,
    color: COLORS.primary,
    fontWeight: '700',
  },

  // PTT Section
  pttSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
    paddingHorizontal: 8,
    gap: 8,
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
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.xs,
  },
  disconnectBtn: {
    borderColor: COLORS.sos + '60',
    backgroundColor: COLORS.sosSoft,
  },
  secondaryBtn: {
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardInner,
  },
  sideLabel: {
    ...TYPOGRAPHY.captionMedium,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  pttWrap: {
    flex: 1,
    alignItems: 'center',
    gap: 10,
    position: 'relative',
  },
  pttBtn: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary + '30',
  },
  pttBtnActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent + '40',
  },
  pttLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  privateTarget: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: -6,
    maxWidth: 180,
    textAlign: 'center',
  },

  // Section Card (Recent, Peers, Language)
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginTop: SPACING.md,
    ...SHADOW.card,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  emptySub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },

  // Peers Card
  peersCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginTop: SPACING.md,
    ...SHADOW.card,
  },
  peersPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  peersLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  peersIconWrap: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
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

  // STT Language Selector
  sttCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
    marginTop: SPACING.md,
    ...SHADOW.card,
  },
  sttHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sttIconWrap: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sttTitleBlock: {
    flex: 1,
  },
  sttTitle: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  sttSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  sttChips: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
    paddingBottom: 2,
  },
  sttChip: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardInner,
    gap: 2,
    minHeight: 44,
    justifyContent: 'center',
  },
  sttChipActive: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primary,
  },
  sttChipText: {
    ...TYPOGRAPHY.captionMedium,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  sttChipTextActive: {
    color: COLORS.primary,
  },
  sttChipNative: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontSize: 10,
  },
  sttChipNativeActive: {
    color: COLORS.primary,
  },

  // SOS Button
  sosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
    paddingVertical: 14,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.sos + '40',
    backgroundColor: COLORS.sosSoft,
  },
  sosText: {
    ...TYPOGRAPHY.label,
    color: COLORS.sos,
    fontWeight: '600',
  },
});