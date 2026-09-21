import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import Screen from '../../components/Screen';
import Header from '../../components/Header';
import PrimaryButton from '../../components/PrimaryButton';
import SelectRow from '../../components/SelectRow';
import AlertIcon from '../../components/AlertIcon';
import { useApp } from '../../context/AppContext';
import { AlertKind, LANGUAGES } from '../../data/mockData';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AddCustomAlert'>;

const ICON_CHOICES: AlertKind[] = ['flood', 'evac', 'medical', 'fire', 'quake', 'warn'];
const MAX = 200;

export default function AddCustomAlertScreen({ navigation }: Props) {
  const { addCustomAlert } = useApp();
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [kind, setKind] = useState<AlertKind>('warn');
  const [language, setLanguage] = useState('English');
  const [priority, setPriority] = useState<'Normal' | 'High' | 'SOS'>('High');

  const valid = name.trim().length > 0 && message.trim().length > 0;

  const save = () => {
    if (!valid) return;
    addCustomAlert({
      kind,
      title: name.trim(),
      message: message.trim(),
      language,
      priority,
      enabled: true,
    });
    navigation.goBack();
  };

  return (
    <Screen padded scroll>
      <Header
        title="Add Custom Alert"
        onBack={() => navigation.goBack()}
        right={
          <Pressable onPress={save} hitSlop={10} disabled={!valid}>
            <Text style={[styles.saveTop, !valid && { opacity: 0.4 }]}>Save</Text>
          </Pressable>
        }
      />

      <Text style={styles.label}>Alert Name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., Landslide Warning"
        placeholderTextColor={COLORS.textMuted}
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>Message</Text>
      <View style={styles.textAreaCard}>
        <TextInput
          style={styles.textArea}
          placeholder="Type the alert message..."
          placeholderTextColor={COLORS.textMuted}
          multiline
          maxLength={MAX}
          value={message}
          onChangeText={setMessage}
        />
        <Text style={styles.counter}>{message.length}/{MAX}</Text>
      </View>

      <Text style={styles.label}>Icon</Text>
      <View style={styles.iconRow}>
        {ICON_CHOICES.map(k => (
          <Pressable
            key={k}
            onPress={() => setKind(k)}
            style={[styles.iconPick, kind === k && styles.iconPickActive]}
          >
            <AlertIcon kind={k} size={40} iconSize={20} />
          </Pressable>
        ))}
      </View>

      <View style={styles.selectGroup}>
        <SelectRow label="Default Language" value={language} options={LANGUAGES.map(l => l.name)} onChange={setLanguage} />
        <View style={styles.divider} />
        <SelectRow
          label="Priority"
          value={priority}
          options={['Normal', 'High', 'SOS']}
          onChange={v => setPriority(v as 'Normal' | 'High' | 'SOS')}
        />
      </View>

      <PrimaryButton label="Save Alert" onPress={save} disabled={!valid} style={{ marginTop: 28, marginBottom: 30 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  saveTop: { ...TYPOGRAPHY.label, color: COLORS.primary, fontWeight: '700' },
  label: {
    ...TYPOGRAPHY.captionMedium,
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: SPACING.md,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    ...SHADOW.xs,
  },
  textAreaCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    minHeight: 120,
    ...SHADOW.xs,
  },
  textArea: {
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    lineHeight: 22,
    minHeight: 80,
  },
  counter: { ...TYPOGRAPHY.caption, color: COLORS.textMuted, textAlign: 'right', marginTop: 4 },
  iconRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  iconPick: {
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 4,
  },
  iconPickActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  selectGroup: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginTop: SPACING.md,
    ...SHADOW.xs,
  },
  divider: { height: 1, backgroundColor: COLORS.borderSoft },
});
