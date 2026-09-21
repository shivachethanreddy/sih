/**
 * iTantra — Offline Multilingual Neural Transceiver
 * Light-mode shell. STT/TTS/mesh plug in via AppContext stubs.
 */

import React, { useEffect, useState } from 'react';
import { Platform, StatusBar, StyleSheet, View } from 'react-native';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import RootNavigator from './src/navigation/RootNavigator';
import { AppProvider } from './src/context/AppContext';
import { COLORS } from './src/theme';

const ONBOARD_KEY = '@itantra/onboarded';

const NAV_THEME = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.background,
    card: COLORS.surface,
    primary: COLORS.primary,
    border: COLORS.border,
    text: COLORS.textPrimary,
    notification: COLORS.sos,
  },
};

export default function App() {
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARD_KEY)
      .then(v => setHasOnboarded(v === '1'))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const markOnboarded = () => {
    setHasOnboarded(true);
    AsyncStorage.setItem(ONBOARD_KEY, '1').catch(() => {});
  };

  if (!ready) return <View style={{ flex: 1, backgroundColor: COLORS.background }} />;

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <View style={styles.webBackdrop}>
        <View style={styles.mobileContainer}>
          <AppProvider>
            <NavigationContainer theme={NAV_THEME}>
              <RootNavigator hasOnboarded={hasOnboarded} onOnboardingDone={markOnboarded} />
            </NavigationContainer>
          </AppProvider>
        </View>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  webBackdrop: {
    flex: 1,
    backgroundColor: COLORS.cardInner,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileContainer: {
    width: '100%',
    maxWidth: 480,
    flex: 1,
    backgroundColor: COLORS.background,
    overflow: 'hidden',
    borderLeftWidth: Platform.OS === 'web' ? 1 : 0,
    borderRightWidth: Platform.OS === 'web' ? 1 : 0,
    borderColor: COLORS.border,
  },
});
