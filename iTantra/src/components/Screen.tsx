import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, ViewStyle, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';

interface Props {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  avoidKeyboard?: boolean;
  hideBack?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

export default function Screen({
  children,
  scroll,
  padded = true,
  avoidKeyboard = false,
  hideBack = false,
  style,
  contentStyle,
}: Props) {
  const navigation = useNavigation();
  const showBack = !hideBack && navigation.canGoBack();

  const backButton = showBack ? (
    <View style={styles.header}>
      <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="Go back">
        <Ionicons name="chevron-back" size={28} color={COLORS.textPrimary} />
      </Pressable>
    </View>
  ) : null;

  const inner = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[padded && styles.padded, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, padded && styles.padded, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={[styles.safe, style]} edges={['top', 'bottom']}>
      {backButton}
      {avoidKeyboard ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {inner}
        </KeyboardAvoidingView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: { flex: 1 },
  padded: { paddingHorizontal: 20 },
  header: {
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    padding: 8,
  },
});
