import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import Screen from '../../components/Screen';
import Slider from '../../components/Slider';
import { SectionLabel, SettingRow } from '../../components/Toggle';
import { useApp } from '../../context/AppContext';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  const { settings, updateSettings, speakLanguage, appLanguage, channel, clearHistory, mode } = useApp();

  const confirmClear = () => {
    Alert.alert(
      'Clear History',
      'This will permanently delete all stored messages from this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: clearHistory },
      ],
    );
  };

  return (
    <Screen padded scroll hideBack>
      {/* Page header */}
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Audio, language, and mesh preferences</Text>
      </View>

      {/* ── Voice & Playback ─────────────────────────────── */}
      <SectionLabel title="Voice & Playback" />
      <View style={styles.group}>
        <SettingRow
          icon="volume-high-outline"
          label="Auto Play Incoming Audio"
          description="Automatically play received voice messages"
          value={settings.autoPlay}
          onToggle={v => updateSettings({ autoPlay: v })}
        />
        <SettingRow
          icon="chatbox-ellipses-outline"
          label="Speech Synthesis (TTS)"
          description="Convert received text to spoken audio"
          value={settings.textToSpeech}
          onToggle={v => updateSettings({ textToSpeech: v })}
          last
        />
      </View>

      {/* Volume slider */}
      <View style={styles.sliderCard}>
        <View style={styles.sliderLabelRow}>
          <Text style={styles.sliderLabel}>Speaker Volume</Text>
          <Text style={styles.sliderValue}>{settings.volume}%</Text>
        </View>
        <Slider value={settings.volume} onChange={v => updateSettings({ volume: v })} />
      </View>

      {/* ── Language Models ──────────────────────────────── */}
      <SectionLabel title="Language Models" />
      <View style={styles.group}>
        <SettingRow
          icon="mic-outline"
          label="Speech Model"
          description="STT and TTS language loaded on this device"
          rightText={speakLanguage}
          chevron
          onPress={() => navigation.navigate('Language')}
        />
        <SettingRow
          icon="globe-outline"
          label="App Language"
          rightText={appLanguage}
          chevron
          last
          onPress={() => navigation.navigate('Language')}
        />
      </View>

      {/* ── Network & Alerts ─────────────────────────────── */}
      <SectionLabel title="Network & Alerts" />
      <View style={styles.group}>
        {mode !== 'private' && (
          <SettingRow
            icon="radio-outline"
            label="Active Channel"
            rightText={channel.label}
            chevron
            onPress={() => navigation.navigate('ChannelMonitor')}
          />
        )}
        <SettingRow
          icon="warning-outline"
          label="Emergency Alerts"
          description="Receive and forward emergency broadcasts"
          value={settings.autoAlerts}
          onToggle={v => updateSettings({ autoAlerts: v })}
        />
        <SettingRow
          icon="options-outline"
          label="Manage Predefined Alerts"
          chevron
          last
          onPress={() => navigation.navigate('ManageAlerts')}
        />
      </View>

      {/* ── System ───────────────────────────────────────── */}
      <SectionLabel title="System" />
      <View style={styles.group}>
        <SettingRow
          icon="phone-portrait-outline"
          label="Vibration Feedback"
          value={settings.vibration}
          onToggle={v => updateSettings({ vibration: v })}
        />
        <SettingRow
          icon="trash-outline"
          label="Clear Message History"
          danger
          chevron
          last
          onPress={confirmClear}
        />
      </View>

      {/* ── About ────────────────────────────────────────── */}
      <SectionLabel title="About" />
      <View style={styles.group}>
        <SettingRow
          icon="help-circle-outline"
          label="Help & User Guide"
          chevron
          onPress={() => navigation.navigate('Help')}
        />
        <SettingRow
          icon="pulse-outline"
          label="Diagnostics"
          description="Engine, packets, and transport"
          chevron
          onPress={() => navigation.navigate('Diagnostics')}
        />
        <SettingRow
          icon="information-circle-outline"
          label="About iTantra"
          chevron
          last
          onPress={() => navigation.navigate('About')}
        />
      </View>

      <View style={{ height: SPACING.xxl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: SPACING.sm,
    marginBottom: 4,
  },
  title: {
    ...TYPOGRAPHY.headline,
    color: COLORS.textPrimary,
  },
  subtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  group: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  sliderCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 6,
  },
  sliderLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sliderLabel: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  sliderValue: {
    ...TYPOGRAPHY.label,
    color: COLORS.primary,
    fontWeight: '700',
  },
});
