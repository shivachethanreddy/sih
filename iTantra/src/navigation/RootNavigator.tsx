import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator, BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { MainTabParamList, RootStackParamList } from './types';
import { COLORS, RADIUS, SHADOW, TYPOGRAPHY } from '../theme';

import SplashScreen from '../screens/onboarding/SplashScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import ModeSelectScreen from '../screens/onboarding/ModeSelectScreen';

import HomeScreen from '../screens/main/HomeScreen';
import HistoryScreen from '../screens/main/HistoryScreen';
import ChannelsScreen from '../screens/main/ChannelsScreen';
import SettingsScreen from '../screens/main/SettingsScreen';

import AutoAlertsScreen from '../screens/broadcast/AutoAlertsScreen';
import AlertDetailScreen from '../screens/broadcast/AlertDetailScreen';
import CustomMessageScreen from '../screens/broadcast/CustomMessageScreen';
import BroadcastingScreen from '../screens/broadcast/BroadcastingScreen';
import BroadcastSuccessScreen from '../screens/broadcast/BroadcastSuccessScreen';
import ManageAlertsScreen from '../screens/broadcast/ManageAlertsScreen';
import AddCustomAlertScreen from '../screens/broadcast/AddCustomAlertScreen';

import IncomingAlertScreen from '../screens/receiver/IncomingAlertScreen';
import MessageReceivedScreen from '../screens/receiver/MessageReceivedScreen';
import ConnectionRequestScreen from '../screens/receiver/ConnectionRequestScreen';

import NowPlayingScreen from '../screens/receiver/NowPlayingScreen';
import QuickResponseScreen from '../screens/receiver/QuickResponseScreen';
import ReplySentScreen from '../screens/receiver/ReplySentScreen';

import DevicesScreen from '../screens/utility/DevicesScreen';
import ChannelMonitorScreen from '../screens/utility/ChannelMonitorScreen';
import EmergencyScreen from '../screens/utility/EmergencyScreen';
import HelpScreen from '../screens/utility/HelpScreen';
import AboutScreen from '../screens/utility/AboutScreen';
import LanguageScreen from '../screens/utility/LanguageScreen';
import DiagnosticsScreen from '../screens/utility/DiagnosticsScreen';
import IncomingBridge from '../components/EngineStatus';

import { useApp } from '../context/AppContext';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// ─── Tab icon map ──────────────────────────────────────────────────────────
const TAB_ICONS: Record<
  string,
  { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap; label: string }
> = {
  HomeTab:     { active: 'home',         inactive: 'home-outline',         label: 'Home'     },
  HistoryTab:  { active: 'time',         inactive: 'time-outline',         label: 'History'  },
  ChannelsTab: { active: 'radio',        inactive: 'radio-outline',        label: 'Devices' },
  SettingsTab: { active: 'settings',     inactive: 'settings-outline',     label: 'Settings' },
};

// ─── Dynamic tab component that switches based on mode ───────────────────────
const ChannelsTabContent: React.FC<any> = () => {
  const { mode } = useApp();
  return mode === 'private' ? <DevicesScreen /> : <ChannelsScreen />;
};

function MainTabs() {
  const { mode } = useApp();
  const channelsTabLabel = mode === 'private' ? 'Devices' : 'Channels';

  return (
    <Tab.Navigator
      id="MainTabs"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarShowLabel: false,
        tabBarIcon: ({ focused, color }) => {
          const def = TAB_ICONS[route.name] ?? TAB_ICONS.HomeTab;

          const icon =
            route.name === 'ChannelsTab' ? (
              <MaterialCommunityIcons
                name="access-point"
                size={22}
                color={color}
              />
            ) : (
              <Ionicons
                name={focused ? def.active : def.inactive}
                size={22}
                color={color}
              />
            );

          const label = route.name === 'ChannelsTab' ? channelsTabLabel : def.label;

          return (
            <View style={styles.tabItem}>
              {icon}
              <Text
                style={[
                  styles.tabLabel,
                  { color: focused ? COLORS.primary : COLORS.textMuted },
                ]}
              >
                {label}
              </Text>
              {focused ? <View style={styles.tabDot} /> : null}
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="HomeTab"     component={HomeScreen}     />
      <Tab.Screen name="HistoryTab"  component={HistoryScreen}  />
      <Tab.Screen name="ChannelsTab" component={ChannelsTabContent} />
      <Tab.Screen name="SettingsTab" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

// ─── Root navigator ────────────────────────────────────────────────────────
interface Props {
  hasOnboarded: boolean;
  onOnboardingDone: () => void;
}

export default function RootNavigator({ hasOnboarded, onOnboardingDone }: Props) {
  return (
    <>
    <IncomingBridge />
    <Stack.Navigator
      id="RootStack"
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Splash">
        {props => <SplashScreen {...props} hasOnboarded={hasOnboarded} />}
      </Stack.Screen>
      <Stack.Screen name="Onboarding">
        {props => <OnboardingScreen {...props} onDone={onOnboardingDone} />}
      </Stack.Screen>
      <Stack.Screen name="ModeSelect" component={ModeSelectScreen} />
      <Stack.Screen name="Main"       component={MainTabs} />

      {/* Broadcast */}
      <Stack.Screen name="AutoAlerts"      component={AutoAlertsScreen} />
      <Stack.Screen name="AlertDetail"     component={AlertDetailScreen} />
      <Stack.Screen name="CustomMessage"   component={CustomMessageScreen} />
      <Stack.Screen name="Broadcasting"    component={BroadcastingScreen}    options={{ gestureEnabled: false }} />
      <Stack.Screen name="BroadcastSuccess" component={BroadcastSuccessScreen} options={{ gestureEnabled: false }} />
      <Stack.Screen name="ManageAlerts"    component={ManageAlertsScreen} />
      <Stack.Screen name="AddCustomAlert"  component={AddCustomAlertScreen} />

      {/* Receiver */}
      <Stack.Screen name="IncomingAlert"   component={IncomingAlertScreen}  options={{ gestureEnabled: false }} />
      <Stack.Screen name="MessageReceived" component={MessageReceivedScreen} />
      <Stack.Screen name="ConnectionRequest" component={ConnectionRequestScreen} options={{ gestureEnabled: false }} />

      <Stack.Screen name="NowPlaying"      component={NowPlayingScreen} />
      <Stack.Screen name="QuickResponse"   component={QuickResponseScreen} />
      <Stack.Screen name="ReplySent"       component={ReplySentScreen}      options={{ gestureEnabled: false }} />

      {/* Utility */}
      <Stack.Screen name="Devices"        component={DevicesScreen} />
      <Stack.Screen name="ChannelMonitor" component={ChannelMonitorScreen} />
      <Stack.Screen name="Emergency"      component={EmergencyScreen} />
      <Stack.Screen name="Help"           component={HelpScreen} />
      <Stack.Screen name="About"          component={AboutScreen} />
      <Stack.Screen name="Language"       component={LanguageScreen} />
      <Stack.Screen name="Diagnostics"    component={DiagnosticsScreen} />
    </Stack.Navigator>
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 82 : 66,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
    ...SHADOW.xs,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingTop: 2,
  },
  tabLabel: {
    ...TYPOGRAPHY.captionMedium,
    fontWeight: '600',
  },
  tabDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
    marginTop: 1,
  },
});
