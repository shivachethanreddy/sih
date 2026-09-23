export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  ModeSelect: undefined;
  Main: undefined;

  // Broadcast flow
  AutoAlerts: undefined;
  AlertDetail: { alertId: string };
  CustomMessage: undefined;
  Broadcasting: { messageId: string };
  BroadcastSuccess: { messageId: string };
  ManageAlerts: undefined;
  AddCustomAlert: undefined;

  // Receiver flow
  IncomingAlert: undefined;
  MessageReceived: { messageId: string };
  ConnectionRequest: { from: string; fromName: string; deviceId: string };

  NowPlaying: { messageId: string };
  QuickResponse: { to?: string };
  ReplySent: { to?: string };

  // Utility
  Devices: undefined;
  ChannelMonitor: undefined;
  Emergency: undefined;
  Help: undefined;
  About: undefined;
  Language: undefined;
  Diagnostics: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  HistoryTab: undefined;
  ChannelsTab: undefined;
  SettingsTab: undefined;
};
