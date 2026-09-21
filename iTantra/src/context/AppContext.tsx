// iTantra — Global application state.
//
// AI INTEGRATION NOTES (for whoever wires the models in):
//   • `transcribeAudio()` — replace the mock with your on-device STT
//     (Silero VAD -> IndicConformer/Whisper INT8). Return UTF-8 text.
//   • `synthesizeSpeech()` — replace the mock with your on-device TTS
//     (MMS-TTS / Piper). It receives (text, languageCode).
//   • `simulateIncoming()` — replace with a real mesh-packet listener
//     (Wi-Fi Direct / BLE gossip). Everything downstream (screens,
//     history, playback UI) already reacts to the message object.

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  AutoAlert,
  Channel,
  CHANNELS,
  DEMO_INCOMING,
  Device,
  INITIAL_MESSAGES,
  MeshMessage,
  NEARBY_DEVICES,
  PREDEFINED_ALERTS,
} from '../data/mockData';

export type AppMode = 'public' | 'private';

interface Settings {
  autoPlay: boolean;
  textToSpeech: boolean;
  volume: number; // 0..100
  autoTranslate: boolean;
  vibration: boolean;
  autoAlerts: boolean;
}

interface AppState {
  myName: string;
  mode: AppMode;
  channel: Channel;
  channels: Channel[];
  devices: Device[];
  appLanguage: string;
  speakLanguage: string;
  translateTo: string;
  settings: Settings;
  messages: MeshMessage[];
  alerts: AutoAlert[];
  incoming: MeshMessage | null;

  setMode: (m: AppMode) => void;
  setChannel: (c: Channel) => void;
  setAppLanguage: (l: string) => void;
  setSpeakLanguage: (l: string) => void;
  setTranslateTo: (l: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  toggleAlert: (id: string) => void;
  addCustomAlert: (a: Omit<AutoAlert, 'id' | 'custom'>) => void;
  deleteCustomAlert: (id: string) => void;
  broadcastAlert: (a: AutoAlert, translateTo?: string) => MeshMessage;
  sendCustomMessage: (text: string, translateTo?: string) => MeshMessage;
  sendQuickReply: (text: string, to: string) => MeshMessage;
  simulateIncoming: () => MeshMessage;
  clearIncoming: () => void;
  clearHistory: () => void;

  // ---- AI pipeline stubs (swap with real models) ----
  transcribeAudio: () => Promise<string>;
  synthesizeSpeech: (text: string, languageCode?: string) => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

const nowTime = () => {
  const d = new Date();
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ap}`;
};

let idCounter = 100;
const nextId = (p: string) => `${p}${++idCounter}`;

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<AppMode>('public');
  const [channel, setChannel] = useState<Channel>(CHANNELS[2]);
  const [appLanguage, setAppLanguage] = useState('English');
  const [speakLanguage, setSpeakLanguage] = useState('English');
  const [translateTo, setTranslateTo] = useState('Telugu');
  const [settings, setSettings] = useState<Settings>({
    autoPlay: true,
    textToSpeech: true,
    volume: 80,
    autoTranslate: true,
    vibration: true,
    autoAlerts: true,
  });
  const [messages, setMessages] = useState<MeshMessage[]>(INITIAL_MESSAGES);
  const [alerts, setAlerts] = useState<AutoAlert[]>(PREDEFINED_ALERTS);
  const [incoming, setIncoming] = useState<MeshMessage | null>(null);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings(s => ({ ...s, ...patch }));
  }, []);

  const toggleAlert = useCallback((id: string) => {
    setAlerts(list => list.map(a => (a.id === id ? { ...a, enabled: !a.enabled } : a)));
  }, []);

  const addCustomAlert = useCallback((a: Omit<AutoAlert, 'id' | 'custom'>) => {
    setAlerts(list => [...list, { ...a, id: nextId('c'), custom: true }]);
  }, []);

  const deleteCustomAlert = useCallback((id: string) => {
    setAlerts(list => list.filter(a => a.id !== id));
  }, []);

  const pushMessage = useCallback((msg: MeshMessage) => {
    setMessages(list => [msg, ...list]);
  }, []);

  const broadcastAlert = useCallback(
    (a: AutoAlert, translate?: string): MeshMessage => {
      const msg: MeshMessage = {
        id: nextId('m'),
        tag: `#${a.title.replace(/\s+/g, '')}`,
        from: 'Me',
        time: nowTime(),
        language: a.language,
        translatedTo: translate,
        channel: channel.label,
        priority: a.priority,
        type: a.priority === 'SOS' ? 'alert' : 'sent',
        originalText: a.message,
        durationSec: Math.max(4, Math.round(a.message.length / 12)),
      };
      pushMessage(msg);
      return msg;
    },
    [channel, pushMessage],
  );

  const sendCustomMessage = useCallback(
    (text: string, translate?: string): MeshMessage => {
      const msg: MeshMessage = {
        id: nextId('m'),
        tag: '#CustomMessage',
        from: 'Me',
        time: nowTime(),
        language: speakLanguage,
        translatedTo: translate,
        channel: channel.label,
        priority: 'Normal',
        type: 'sent',
        originalText: text,
        durationSec: Math.max(3, Math.round(text.length / 14)),
      };
      pushMessage(msg);
      return msg;
    },
    [channel, speakLanguage, pushMessage],
  );

  const sendQuickReply = useCallback(
    (text: string, to: string): MeshMessage => {
      const msg: MeshMessage = {
        id: nextId('m'),
        tag: '#Reply',
        from: 'Me',
        to,
        time: nowTime(),
        language: speakLanguage,
        channel: channel.label,
        priority: 'Normal',
        type: 'sent',
        originalText: text,
        durationSec: 3,
      };
      pushMessage(msg);
      return msg;
    },
    [channel, speakLanguage, pushMessage],
  );

  const simulateIncoming = useCallback((): MeshMessage => {
    const msg: MeshMessage = { ...DEMO_INCOMING, id: nextId('m'), time: nowTime() };
    setIncoming(msg);
    pushMessage(msg);
    return msg;
  }, [pushMessage]);

  const clearIncoming = useCallback(() => setIncoming(null), []);
  const clearHistory = useCallback(() => setMessages([]), []);

  // ------------------------------------------------------------------
  // AI PIPELINE STUBS
  // ------------------------------------------------------------------
  // TODO(STT): Replace with on-device speech-to-text.
  //   VAD (Silero) gates the mic; Conformer/Whisper INT8 decodes to text.
  const transcribeAudio = useCallback(async (): Promise<string> => {
    await new Promise(r => setTimeout(r, 1200));
    return 'Water level is rising near the bridge. Please move to a safe zone.';
  }, []);

  // TODO(TTS): Replace with on-device text-to-speech (MMS-TTS / Piper).
  //   Should stream 16 kHz PCM into the speaker / AudioTrack.
  const synthesizeSpeech = useCallback(async (_text: string, _lang?: string) => {
    await new Promise(r => setTimeout(r, 300));
  }, []);

  const value = useMemo<AppState>(
    () => ({
      myName: 'Rescue_01',
      mode,
      channel,
      channels: CHANNELS,
      devices: NEARBY_DEVICES,
      appLanguage,
      speakLanguage,
      translateTo,
      settings,
      messages,
      alerts,
      incoming,
      setMode,
      setChannel,
      setAppLanguage,
      setSpeakLanguage,
      setTranslateTo,
      updateSettings,
      toggleAlert,
      addCustomAlert,
      deleteCustomAlert,
      broadcastAlert,
      sendCustomMessage,
      sendQuickReply,
      simulateIncoming,
      clearIncoming,
      clearHistory,
      transcribeAudio,
      synthesizeSpeech,
    }),
    [
      mode, channel, appLanguage, speakLanguage, translateTo, settings, messages, alerts, incoming,
      updateSettings, toggleAlert, addCustomAlert, deleteCustomAlert, broadcastAlert,
      sendCustomMessage, sendQuickReply, simulateIncoming, clearIncoming, clearHistory,
      transcribeAudio, synthesizeSpeech,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
