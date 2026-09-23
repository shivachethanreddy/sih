import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import Screen from '../../components/Screen';
import Header from '../../components/Header';
import PulsingRings from '../../components/PulsingRings';
import Waveform from '../../components/Waveform';
import { useApp } from '../../context/AppContext';
import { DEMO_INCOMING } from '../../data/mockData';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'NowPlaying'>;

const fmt = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, '0')}:${Math.max(0, Math.floor(s)).toString().padStart(2, '0')}`;

export default function NowPlayingScreen({ navigation, route }: Props) {
  const { messages, synthesizeSpeech, settings } = useApp();
  const msg = messages.find(m => m.id === route.params.messageId) ?? DEMO_INCOMING;
  const duration = msg.durationSec;

  const [playing, setPlaying] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  const runProgress = (from: number) => {
    animRef.current?.stop();
    progress.setValue(from / duration);
    animRef.current = Animated.timing(progress, {
      toValue: 1,
      duration: (duration - from) * 1000,
      useNativeDriver: false,
    });
    animRef.current.start(({ finished }) => finished && setPlaying(false));
  };

  useEffect(() => {
    if (settings.textToSpeech) {
      synthesizeSpeech(msg.originalText, msg.language);
    }
    runProgress(0);
    const timer = setInterval(
      () => setElapsed(e => Math.min(duration, e + (playing ? 1 : 0))),
      1000,
    );
    return () => {
      animRef.current?.stop();
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (playing) runProgress(elapsed);
    else animRef.current?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const skip = (delta: number) => {
    const next = Math.max(0, Math.min(duration - 1, elapsed + delta));
    setElapsed(next);
    if (playing) runProgress(next);
    else progress.setValue(next / duration);
  };

  const progressPct = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const knobLeft = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '96%'] });

  return (
    <Screen padded scroll>
      <Header
        title="Voice Playback"
        subtitle={msg.channel}
        onBack={() => navigation.goBack()}
        right={
          <Ionicons
            name="volume-high-outline"
            size={20}
            color={COLORS.primary}
          />
        }
      />

      {/* Speaker animation */}
      <View style={styles.speakerWrap}>
        <PulsingRings size={120} color={COLORS.primary} active={playing}>
          <View style={[styles.speakerCircle, SHADOW.blue]}>
            <Ionicons name="volume-high" size={42} color={COLORS.white} />
          </View>
        </PulsingRings>
      </View>

      {/* Waveform */}
      <View style={styles.waveformWrap}>
        <Waveform animated={playing} bars={22} height={28} color={COLORS.primary} />
      </View>

      {/* Progress bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressPct }]} />
          <Animated.View style={[styles.progressKnob, { left: knobLeft }]} />
        </View>
        <View style={styles.timesRow}>
          <Text style={styles.timeText}>{fmt(elapsed)}</Text>
          <Text style={styles.timeText}>{fmt(duration)}</Text>
        </View>
      </View>

      {/* Transcript */}
      <View style={styles.transcriptCard}>
        <View style={styles.transcriptHeader}>
          <Text style={styles.transcriptLang}>
            Original · {msg.language}
          </Text>
          <Text style={styles.transcriptSender}>from {msg.from}</Text>
        </View>
        <Text style={styles.originalText}>"{msg.originalText}"</Text>

      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <Pressable
          style={styles.skipBtn}
          onPress={() => skip(-5)}
          accessibilityLabel="Skip back 5 seconds"
        >
          <Ionicons name="play-back" size={18} color={COLORS.textSecondary} />
          <Text style={styles.skipLabel}>−5s</Text>
        </Pressable>

        <Pressable
          style={[styles.playBtn, SHADOW.blue]}
          onPress={() => setPlaying(p => !p)}
          accessibilityRole="button"
          accessibilityLabel={playing ? 'Pause' : 'Play'}
        >
          <Ionicons
            name={playing ? 'pause' : 'play'}
            size={28}
            color={COLORS.white}
          />
        </Pressable>

        <Pressable
          style={styles.skipBtn}
          onPress={() => skip(5)}
          accessibilityLabel="Skip forward 5 seconds"
        >
          <Ionicons name="play-forward" size={18} color={COLORS.textSecondary} />
          <Text style={styles.skipLabel}>+5s</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  speakerWrap: {
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  speakerCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveformWrap: {
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  progressSection: {
    paddingHorizontal: 4,
    marginBottom: SPACING.md,
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    overflow: 'visible',
  },
  progressFill: {
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  progressKnob: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.primary,
    top: -4.5,
    ...SHADOW.xs,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  timesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  transcriptCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: SPACING.md,
    ...SHADOW.xs,
  },
  transcriptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transcriptLang: {
    ...TYPOGRAPHY.captionMedium,
    color: COLORS.primary,
    fontWeight: '600',
  },
  transcriptSender: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  originalText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: SPACING.md,
    marginBottom: SPACING.md,
  },
  skipBtn: {
    alignItems: 'center',
    gap: 4,
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    ...SHADOW.xs,
  },
  skipLabel: {
    ...TYPOGRAPHY.captionMedium,
    color: COLORS.textMuted,
  },
  playBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
