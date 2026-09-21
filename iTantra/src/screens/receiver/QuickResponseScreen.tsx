import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import Screen from '../../components/Screen';
import Header from '../../components/Header';
import PrimaryButton from '../../components/PrimaryButton';
import EmptyState from '../../components/EmptyState';
import { useApp } from '../../context/AppContext';
import { QUICK_REPLIES } from '../../data/mockData';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'QuickResponse'>;

const TABS = ['Pre-set', 'Voice Reply', 'Text Reply'] as const;

export default function QuickResponseScreen({ navigation, route }: Props) {
  const { sendQuickReply } = useApp();
  const to = route.params?.to ?? 'Rescue_01';
  const [tab, setTab] = useState<(typeof TABS)[number]>('Pre-set');
  const [selected, setSelected] = useState(QUICK_REPLIES[0].id);

  const selectedReply = QUICK_REPLIES.find(r => r.id === selected) ?? QUICK_REPLIES[0];

  const send = () => {
    sendQuickReply(selectedReply.text, to);
    navigation.navigate('ReplySent', { to });
  };

  return (
    <Screen padded>
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
              onPress={() => setTab(t)}
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
      ) : (
        <View style={styles.placeholder}>
          <EmptyState
            icon={tab === 'Voice Reply' ? 'mic-outline' : 'chatbox-ellipses-outline'}
            title={tab === 'Voice Reply' ? 'Voice Reply' : 'Text Reply'}
            body={
              tab === 'Voice Reply'
                ? 'Hold the mic button on the Home screen to record a voice reply.'
                : 'Type a custom message from the Broadcast screen.'
            }
          />
        </View>
      )}

      {/* Send button */}
      <View style={styles.footer}>
        <PrimaryButton
          label={`Send to ${to}`}
          icon="paper-plane"
          onPress={send}
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
});
