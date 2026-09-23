import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import Screen from '../../components/Screen';
import Header from '../../components/Header';
import PrimaryButton from '../../components/PrimaryButton';
import SelectRow from '../../components/SelectRow';
import { useApp } from '../../context/AppContext';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'CustomMessage'>;
const MAX = 200;

export default function CustomMessageScreen({ navigation }: Props) {
  const { mode, channel, selectedDevice, sendCustomMessage, sendDirectMessage, speakLanguage } = useApp();
  const [text, setText] = useState('');
  const isPrivate = mode === 'private';

  const send = () => {
    if (!text.trim()) return;
    const msg = isPrivate
      ? sendDirectMessage(text.trim(), selectedDevice.name)
      : sendCustomMessage(text.trim());
    navigation.navigate('Broadcasting', { messageId: msg.id });
  };

  const charsLeft = MAX - text.length;
  const nearLimit = charsLeft <= 30;

  return (
    <Screen padded avoidKeyboard>
      <Header title="Custom Message" onBack={() => navigation.goBack()} />

      {/* Text input */}
      <View style={styles.inputCard}>
        <TextInput
          style={styles.input}
          placeholder="Type your message here..."
          placeholderTextColor={COLORS.textMuted}
          multiline
          maxLength={MAX}
          value={text}
          onChangeText={setText}
          autoFocus
          textAlignVertical="top"
          accessibilityLabel="Message text"
        />
        <Text style={[styles.counter, nearLimit && styles.counterWarn]}>
          {charsLeft} chars remaining
        </Text>
      </View>

      {/* Broadcast settings */}
      <Text style={styles.sectionLabel}>{isPrivate ? 'Private settings' : 'Broadcast settings'}</Text>
      <View style={styles.card}>
        <SelectRow
          label={isPrivate ? 'To Device' : 'Channel'}
          value={isPrivate ? selectedDevice.name : channel.label}
          options={[isPrivate ? selectedDevice.name : channel.label]}
          onChange={() => {}}
        />
        <View style={styles.settingDivider} />
        <SelectRow
          label="Speech Language"
          value={speakLanguage}
          options={[speakLanguage]}
          onChange={() => {}}
        />
        <View style={styles.settingDivider} />
        <SelectRow
          label="Priority"
          value="Normal"
          options={['Normal']}
          onChange={() => {}}
        />
      </View>

      <View style={{ flex: 1 }} />

      <PrimaryButton
        label={isPrivate ? 'Send to Device' : 'Broadcast Message'}
        icon="paper-plane"
        onPress={send}
        disabled={!text.trim()}
        style={styles.cta}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  inputCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    minHeight: 130,
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
  sectionLabel: {
    ...TYPOGRAPHY.captionMedium,
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: SPACING.md,
    marginBottom: 8,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    ...SHADOW.xs,
  },
  settingDivider: {
    height: 1,
    backgroundColor: COLORS.borderSoft,
    marginHorizontal: 16,
  },
  cta: {
    marginBottom: SPACING.lg,
  },
});
