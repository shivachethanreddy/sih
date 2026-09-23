import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import Screen from '../../components/Screen';
import Header from '../../components/Header';
import PrimaryButton from '../../components/PrimaryButton';
import { SectionLabel } from '../../components/Toggle';
import { useApp } from '../../context/AppContext';
import { LANGUAGES } from '../../data/mockData';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Language'>;

export default function LanguageScreen({ navigation }: Props) {
  const { appLanguage, setAppLanguage, speakLanguage, setSpeakLanguage } = useApp();

  return (
    <Screen padded scroll>
      <Header title="Language" onBack={() => navigation.goBack()} />

      {/* App Language */}
      <SectionLabel title="App Language" />
      <View style={styles.card}>
        <Pressable
          style={styles.row}
          onPress={() => setAppLanguage('English')}
          accessibilityRole="radio"
          accessibilityState={{ checked: appLanguage === 'English' }}
        >
          <View style={styles.langInfo}>
            <Text style={styles.langName}>English</Text>
            <Text style={styles.langNative}>English</Text>
          </View>
          {appLanguage === 'English' ? (
            <View style={styles.checkWrap}>
              <Ionicons name="checkmark" size={14} color={COLORS.white} />
            </View>
          ) : (
            <View style={styles.radioEmpty} />
          )}
        </Pressable>
      </View>

{/* Speech model */}
      <SectionLabel title="Speech / TTS Model Language" />
      {LANGUAGES.map((l, i) => {
        const selected = speakLanguage === l.name;
        const isFirst = i === 0;
        const isLast = i === LANGUAGES.length - 1;
        return (
          <Pressable
            key={l.code}
            style={({ pressed }) => [
              styles.rowCard,
              isFirst && styles.rowCardFirst,
              isLast && styles.rowCardLast,
              !isLast && styles.rowBorder,
              pressed && styles.rowPressed,
            ]}
            onPress={() => setSpeakLanguage(l.name)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
          >
            <View style={styles.langInfo}>
              <Text style={styles.langName}>{l.name}</Text>
              <Text style={styles.langNative}>{l.native}</Text>
            </View>
            {selected ? (
              <View style={styles.checkWrap}>
                <Ionicons name="checkmark" size={14} color={COLORS.white} />
              </View>
            ) : (
              <View style={styles.radioEmpty} />
            )}
          </Pressable>
        );
      })}

      <View style={{ flex: 1, minHeight: SPACING.xl }} />

      <PrimaryButton
        label="Done"
        icon="checkmark"
        onPress={() => navigation.goBack()}
        style={styles.cta}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: 4,
    ...SHADOW.xs,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rowCardFirst: {
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
  },
  rowCardLast: {
    borderBottomLeftRadius: RADIUS.lg,
    borderBottomRightRadius: RADIUS.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
  },
  rowPressed: {
    backgroundColor: COLORS.cardInner,
  },
  langInfo: {
    flex: 1,
    gap: 2,
  },
  langName: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  langNative: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  checkWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioEmpty: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  cta: {
    marginBottom: SPACING.lg,
  },
});
