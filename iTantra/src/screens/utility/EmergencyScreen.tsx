import React, { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import Screen from '../../components/Screen';
import Header from '../../components/Header';
import PulsingRings from '../../components/PulsingRings';
import { useApp } from '../../context/AppContext';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Emergency'>;
const HOLD_MS = 2000;

export default function EmergencyScreen({ navigation }: Props) {
  const { sendSos } = useApp();
  const [holding, setHolding] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const anim = useRef<Animated.CompositeAnimation | null>(null);
  const done = useRef(false);

  const start = () => {
    setHolding(true);
    done.current = false;
    anim.current = Animated.timing(progress, {
      toValue: 1,
      duration: HOLD_MS,
      useNativeDriver: false,
    });
    anim.current.start(({ finished }) => {
      if (finished && !done.current) {
        done.current = true;
        setHolding(false);
        progress.setValue(0);
        sendSos().then(msg => {
          navigation.replace('Broadcasting', { messageId: msg.id });
        });
      }
    });
  };

  const cancel = () => {
    if (done.current) return;
    setHolding(false);
    anim.current?.stop();
    progress.setValue(0);
  };

  return (
    <Screen padded>
      <Header
        title="Emergency SOS"
        titleColor={COLORS.sos}
        subtitle="PRIORITY ZERO"
        onBack={() => navigation.goBack()}
      />

      {/* Warning banner */}
      <View style={styles.banner}>
        <View style={styles.bannerIcon}>
          <Ionicons name="warning" size={18} color={COLORS.sos} />
        </View>
        <View style={styles.bannerText}>
          <Text style={styles.bannerTitle}>Maximum priority override</Text>
          <Text style={styles.bannerBody}>
            Broadcasts to all nearby devices, bypassing channel mutes.
          </Text>
        </View>
      </View>

      {/* SOS button */}
      <View style={styles.center}>
        <PulsingRings size={180} color={COLORS.sos} active={holding}>
          <Pressable
            onPressIn={start}
            onPressOut={cancel}
            style={[styles.sosBtn, SHADOW.sos]}
            accessibilityRole="button"
            accessibilityLabel="Hold 2 seconds to send SOS"
          >
            <MaterialCommunityIcons
              name="broadcast"
              size={32}
              color={COLORS.white}
            />
            <Text style={styles.sosBtnText}>SOS</Text>
            <Text style={styles.holdHint}>
              {holding ? 'ARMING...' : 'HOLD 2s'}
            </Text>
          </Pressable>
        </PulsingRings>

        {/* Progress bar */}
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
          <Text style={styles.progressHint}>
            {holding
              ? 'Keep holding to broadcast distress signal'
              : 'Press and hold to transmit emergency SOS'}
          </Text>
        </View>

        {/* Telemetry card */}
        <View style={styles.telemetryCard}>
          {[
            { key: 'Routing', val: 'Highest priority flood' },
            { key: 'Override', val: 'All logical channels', danger: true },
            { key: 'Confirm', val: 'Shown after engine ACK' },
          ].map((row, i) => (
            <View
              key={i}
              style={[styles.telemetryRow, i < 2 && styles.telemetryBorder]}
            >
              <Text style={styles.telemetryKey}>{row.key}</Text>
              <Text
                style={[
                  styles.telemetryVal,
                  row.danger ? { color: COLORS.sos } : null,
                ]}
              >
                {row.val}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.sosSoft,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.sos + '25',
    padding: 14,
    marginTop: 4,
    marginBottom: SPACING.lg,
  },
  bannerIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.sos + '18',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.sos,
    fontWeight: '700',
  },
  bannerBody: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 17,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: SPACING.xl,
  },
  sosBtn: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: COLORS.sos,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    gap: 2,
  },
  sosBtnText: {
    ...TYPOGRAPHY.display,
    color: COLORS.white,
    fontWeight: '900',
    letterSpacing: 3,
  },
  holdHint: {
    ...TYPOGRAPHY.captionMedium,
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1,
    fontWeight: '700',
  },
  progressWrap: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    gap: 8,
  },
  progressTrack: {
    width: '100%',
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.border,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
  },
  progressFill: {
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.sos,
  },
  progressHint: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  telemetryCard: {
    alignSelf: 'stretch',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.lg,
    overflow: 'hidden',
    ...SHADOW.xs,
  },
  telemetryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  telemetryBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
  },
  telemetryKey: {
    ...TYPOGRAPHY.captionMedium,
    color: COLORS.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  telemetryVal: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
});
