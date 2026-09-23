import React, { useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import Screen from '../../components/Screen';
import Header from '../../components/Header';
import PulsingRings from '../../components/PulsingRings';
import PrimaryButton from '../../components/PrimaryButton';
import EmptyState from '../../components/EmptyState';
import { useApp } from '../../context/AppContext';
import { QUICK_REPLIES } from '../../data/mockData';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'QuickResponse'>;

const TABS = ['Pre-set', 'Voice Reply', 'Text Reply'] as const;
const MAX_TEXT = 200;

export default function QuickResponseScreen({ navigation, route }: Props) {
  const { sendQuickReply, transcribeAudio } = useApp();
  const to = route.params?.to ?? 'Device_A';
  const [tab, setTab] = useState<(typeof TABS)[number]>('Pre-set');
  const [selected, setSelected] = useState(QUICK_REPLIES[0].id);
  const [recording, setRecording] = useState(false);
  const [text, setText] = useState('');
  const pressStart = useRef(0);
  const busy = useRef(false);
  const pttScale = useRef(new Animated.Value(1)).current;

  const selectedReply = QUICK_REPLIES.find(r => r.id === selected) ?? QUICK_REPLIES[0];

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
    const transcribedText = await transcribeAudio();
    sendQuickReply(transcribedText, to);
    busy.current = false;
    navigation.navigate('ReplySent', { to });
  };

  const sendText = () => {
    if (!text.trim()) return;
    sendQuickReply(text.trim(), to);
    navigation.navigate('ReplySent', { to });
  };

  const send = () => {
    if (tab === 'Pre-set') {
      sendQuickReply(selectedReply.text, to);
      navigation.navigate('ReplySent', { to });
    } else if (tab === 'Voice Reply') {
      // Voice reply uses PTT button
    } else if (tab === 'Text Reply') {
      sendText();
    }
  };

  const charsLeft = MAX_TEXT - text.length;
  const nearLimit = charsLeft <= 30;

  return (
    <Screen padded avoidKeyboard>
      <Header
        title="Quick Response"
        subtitle={`Replying to ${to}`}
        onBack={() => navigation.goBack()}
      />

      {/* Tab switcher */}
      <View style={styles.tabBar}>
        {TABS.map(t => {
          const active = tab === t;
          return (
            <Pressable
              key={t}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => { setTab(t); Keyboard.dismiss(); }}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Content */}
      {tab === 'Pre-set' ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {QUICK_REPLIES.map(r => {
            const active = r.id === selected;
            return (
              <Pressable
                key={r.id}
                style={[styles.replyRow, active && styles.replyRowActive]}
                onPress={() => setSelected(r.id)}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
              >
                {/* Color tile icon */}
                <View
                  style={[
                    styles.iconTile,
                    { backgroundColor: r.color + '15', borderColor: r.color + '30' },
                  ]}
                >
                  <Ionicons
                    name={r.icon as keyof typeof Ionicons.glyphMap}
                    size={18}
                    color={r.color}
                  />
                </View>

                <Text style={styles.replyText}>{r.text}</Text>

                {/* Selection indicator */}
                <View
                  style={[
                    styles.radioOuter,
                    active && styles.radioOuterActive,
                  ]}
                >
                  {active ? <View style={styles.radioInner} /> : null}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : tab === 'Voice Reply' ? (
        <View style={styles.voiceReplyContent}>
          <Text style={styles.voiceInstruction}>Hold the button to record your voice reply</Text>

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

          <View style={{ flex: 1 }} />
        </View>
      ) : (
        <View style={styles.textReplyContent}>
          <Text style={styles.voiceInstruction}>Type your custom reply</Text>

          {/* Text input */}
          <View style={styles.inputCard}>
            <TextInput
              style={styles.input}
              placeholder="Type your reply here..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              maxLength={MAX_TEXT}
              value={text}
              onChangeText={setText}
              autoFocus
              textAlignVertical="top"
              accessibilityLabel="Reply text"
            />
            <Text style={[styles.counter, nearLimit && styles.counterWarn]}>
              {charsLeft} chars remaining
            </Text>
          </View>

          <View style={{ flex: 1 }} />
        </View>
      )}

      {/* Send button */}
      <View style={styles.footer}>
        <PrimaryButton
          label={tab === 'Voice Reply' ? 'Sent via Voice' : tab === 'Text Reply' ? `Send to ${to}` : `Send to ${to}`}
          icon="paper-plane"
          onPress={send}
          disabled={tab === 'Text Reply' ? !text.trim() : false}
          style={styles.cta}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardInner,
    borderRadius: RADIUS.pill,
    padding: 3,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.card,
    ...SHADOW.xs,
  },
  tabText: {
    ...TYPOGRAPHY.captionMedium,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  tabTextActive: {
    ...TYPOGRAPHY.captionMedium,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  listContent: {
    gap: 8,
    paddingBottom: 96,
  },
  replyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 12,
    ...SHADOW.xs,
  },
  replyRowActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.background,
  },
  iconTile: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },
  replyText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    flex: 1,
    lineHeight: 20,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioOuterActive: {
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  placeholder: {
    flex: 1,
  },
  footer: {
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.background,
  },
  voiceReplyContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
  },
  textReplyContent: {
    flex: 1,
    paddingBottom: SPACING.xl,
  },
  voiceInstruction: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.md,
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
  inputCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    minHeight: 130,
    marginHorizontal: 16,
    ...SHADOW.xs,
  },
  input: {
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    minHeight: 90,
    lineHeight: 22,
  },
  counter: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textAlign: 'right',
    marginTop: 6,
  },
  counterWarn: {
    color: COLORS.warning,
  },
  cta: {
    marginBottom: SPACING.lg,
    marginHorizontal: 16,
  },
});
