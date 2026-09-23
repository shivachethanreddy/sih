import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  AutoAlert,
  Channel,
  CHANNELS,
  Device,
  MeshMessage,
  PREDEFINED_ALERTS,
} from '../data/mockData';
import itantraService, { ITantraEvent } from '../services/ITantraService';
import {
  CommunicationState,
  ConnectionStatus,
  EMPTY_DEVICE,
  InitState,
  NetworkSnapshot,
  formatClock,
} from '../types';

export type AppMode = 'public' | 'private';

interface Settings {
  autoPlay: boolean;
  textToSpeech: boolean;
  volume: number;
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
  selectedDevice: Device;
  appLanguage: string;
  speakLanguage: string;
  translateTo: string;
  settings: Settings;
  messages: MeshMessage[];
  alerts: AutoAlert[];
  incoming: MeshMessage | null;
  connectionRequest: { from: string; fromName: string; deviceId: string } | null;
  connectedDevice: Device | null;
  connectionStatus: ConnectionStatus;
  demoMode: boolean;
  initState: InitState;
  initError: string | null;
  network: NetworkSnapshot;
  communicationState: CommunicationState;
  lastSendError: string | null;

  setMode: (m: AppMode) => void;
  setChannel: (c: Channel) => void;
  setSelectedDevice: (d: Device) => void;
  setAppLanguage: (l: string) => void;
  setSpeakLanguage: (l: string) => void;
  setTranslateTo: (l: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  toggleAlert: (id: string) => void;
  addCustomAlert: (a: Omit<AutoAlert, 'id' | 'custom'>) => void;
  deleteCustomAlert: (id: string) => void;
  broadcastAlert: (a: AutoAlert, translateTo?: string) => MeshMessage;
  sendCustomMessage: (text: string, translateTo?: string) => MeshMessage;
  sendDirectMessage: (text: string, to: string) => MeshMessage;
  sendQuickReply: (text: string, to: string) => MeshMessage;
  sendSos: () => Promise<MeshMessage>;
  startTalk: () => Promise<void>;
  stopTalkAndSend: () => Promise<MeshMessage | null>;
  simulateIncoming: () => MeshMessage | null;
  clearIncoming: () => void;
  clearHistory: () => void;
  requestConnection: (device: Device) => void;
  acceptConnection: () => void;
  rejectConnection: () => void;
  disconnect: () => void;
  startScan: () => Promise<void>;
  stopScan: () => Promise<void>;
  initializeEngine: () => Promise<void>;
  translateText: (text: string, src: string, tgt: string) => Promise<string>;
  transcribeAudio: () => Promise<string>;
  synthesizeSpeech: (text: string, languageCode?: string) => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

let idCounter = 100;
const nextId = (p: string) => `${p}${++idCounter}`;

function upsertMessage(list: MeshMessage[], msg: MeshMessage): MeshMessage[] {
  const idx = list.findIndex(m => m.id === msg.id);
  if (idx === -1) return [msg, ...list];
  const copy = [...list];
  copy[idx] = { ...copy[idx], ...msg };
  return copy;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<AppMode>('public');
  const [channel, setChannel] = useState<Channel>(CHANNELS[2]);
  const [selectedDevice, setSelectedDevice] = useState<Device>(EMPTY_DEVICE);
  const [appLanguage, setAppLanguage] = useState('English');
  const [speakLanguage, setSpeakLanguage] = useState('Telugu');
  const [translateTo, setTranslateTo] = useState('Telugu');
  const [settings, setSettings] = useState<Settings>({
    autoPlay: true,
    textToSpeech: true,
    volume: 80,
    autoTranslate: true,
    vibration: true,
    autoAlerts: true,
  });
  const [messages, setMessages] = useState<MeshMessage[]>([]);
  const [alerts, setAlerts] = useState<AutoAlert[]>(PREDEFINED_ALERTS);
  const [incoming, setIncoming] = useState<MeshMessage | null>(null);
  const [connectionRequest, setConnectionRequest] = useState<{ from: string; fromName: string; deviceId: string } | null>(null);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [devices, setDevices] = useState<Device[]>([]);
  const [demoMode, setDemoMode] = useState(true);
  const [initState, setInitState] = useState<InitState>('idle');
  const [initError, setInitError] = useState<string | null>(null);
  const [network, setNetwork] = useState<NetworkSnapshot>(itantraService.network);
  const [communicationState, setCommunicationState] = useState<CommunicationState>('IDLE');
  const [lastSendError, setLastSendError] = useState<string | null>(null);
  const [nodeLabel, setNodeLabel] = useState('NODE');

  useEffect(() => {
    const unsub = itantraService.subscribe((event: ITantraEvent) => {
      switch (event.type) {
        case 'backendReady':
          setInitState('ready');
          setInitError(null);
          setDemoMode(event.demoMode);
          setNodeLabel(`NODE ${event.nodeId}`);
          break;
        case 'backendError':
          setInitState('failed');
          setInitError(event.error);
          break;
        case 'networkChanged':
          setNetwork(event.network);
          setDemoMode(event.network.demoMode);
          setNodeLabel(`NODE ${event.network.nodeId}`);
          if (event.network.status === 'CONNECTED') setConnectionStatus('connected');
          else if (event.network.status === 'CONNECTING') setConnectionStatus('connecting');
          else setConnectionStatus(s => (s === 'connecting' ? 'idle' : s === 'connected' ? 'idle' : s));
          break;
        case 'deviceDiscovered':
          setDevices(list => {
            const next = list.filter(d => d.id !== event.device.id);
            return [...next, event.device];
          });
          break;
        case 'deviceLost':
          setDevices(list => list.filter(d => d.id !== event.deviceId));
          setConnectedDevice(cur => (cur?.id === event.deviceId ? null : cur));
          break;
        case 'connectionChanged':
          setConnectionStatus(event.status);
          if (event.status === 'connected' && event.deviceId) {
            setConnectedDevice(cur => {
              const found = itantraService.devices.find(d => d.id === event.deviceId);
              return found ?? cur;
            });
            setDevices([...itantraService.devices]);
          }
          if (event.status === 'idle') setConnectedDevice(null);
          break;
        case 'recordingStarted':
          setCommunicationState('RECORDING');
          break;
        case 'transcriptionStarted':
          setCommunicationState('TRANSCRIBING');
          break;
        case 'packetCreated':
          setCommunicationState('PACKETIZING');
          break;
        case 'messageSending':
          setCommunicationState('SENDING');
          setMessages(list =>
            list.map(m => (m.id === event.messageId ? { ...m, status: 'SENDING' } : m)),
          );
          break;
        case 'ackReceived':
          setMessages(list =>
            list.map(m => (m.id === event.messageId ? { ...m, ackReceived: true, status: m.status } : m)),
          );
          break;
        case 'messageDelivered':
          setCommunicationState('DELIVERED');
          setMessages(list =>
            list.map(m =>
              m.id === event.messageId
                ? { ...m, status: 'DELIVERED', hops: event.hops, ackReceived: true }
                : m,
            ),
          );
          break;
        case 'messageFailed':
          setCommunicationState('FAILED');
          setLastSendError(event.error);
          setMessages(list =>
            list.map(m => (m.id === event.messageId ? { ...m, status: 'FAILED' } : m)),
          );
          break;
        case 'retryStarted':
          setMessages(list =>
            list.map(m => (m.id === event.messageId ? { ...m, status: 'RETRYING' } : m)),
          );
          break;
        case 'messageReceived':
          setMessages(list => upsertMessage(list, event.message));
          setIncoming(event.message);
          break;
        default:
          break;
      }
    });
    return unsub;
  }, []);

  const initializeEngine = useCallback(async () => {
    setInitState('initializing');
    try {
      await itantraService.initialize();
      setInitState(itantraService.initState);
      setDemoMode(itantraService.demoMode);
      setNetwork(itantraService.network);
      await itantraService.startDiscovery();
      setDevices([...itantraService.devices]);
    } catch (err: any) {
      setInitState('failed');
      setInitError(err?.message ?? 'Communication engine unavailable');
    }
  }, []);

  const setMode = useCallback((m: AppMode) => {
    setModeState(m);
    itantraService.setMode(m).catch(() => {});
  }, []);

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

  const queueOutbound = useCallback(
    (partial: Omit<MeshMessage, 'id' | 'time' | 'from'> & { id?: string }): MeshMessage => {
      const msg: MeshMessage = {
        ...partial,
        id: partial.id ?? nextId('m'),
        from: nodeLabel,
        time: formatClock(),
        status: 'SENDING',
      };
      setMessages(list => [msg, ...list]);
      return msg;
    },
    [nodeLabel],
  );

  const dispatchSend = useCallback(
    (local: MeshMessage, opts: { emergency?: boolean; destinationId?: string | null }) => {
      itantraService
        .sendMessage({
          text: local.originalText,
          language: local.language,
          channelId: channel.id,
          emergency: opts.emergency,
          destinationId: opts.destinationId,
        })
        .then(result => {
          setMessages(list => {
            const withoutLocal = list.filter(m => m.id !== local.id);
            return upsertMessage(withoutLocal, { ...local, ...result });
          });
        })
        .catch(err => {
          setLastSendError(err?.message ?? 'Send failed');
          setMessages(list =>
            list.map(m => (m.id === local.id ? { ...m, status: 'FAILED' } : m)),
          );
        });
    },
    [channel.id],
  );

  const broadcastAlert = useCallback(
    (a: AutoAlert): MeshMessage => {
      const msg = queueOutbound({
        tag: `#${a.title.replace(/\s+/g, '')}`,
        language: a.language,
        channel: channel.label,
        priority: a.priority,
        type: a.priority === 'SOS' ? 'alert' : 'sent',
        originalText: a.message,
        durationSec: Math.max(4, Math.round(a.message.length / 12)),
      });
      itantraService
        .sendAlert(a.kind, a.message, a.language, channel.id)
        .then(result => {
          setMessages(list => {
            const withoutLocal = list.filter(m => m.id !== msg.id);
            return upsertMessage(withoutLocal, { ...msg, ...result });
          });
        })
        .catch(() => {
          setMessages(list => list.map(m => (m.id === msg.id ? { ...m, status: 'FAILED' } : m)));
        });
      return msg;
    },
    [channel, queueOutbound],
  );

  const sendCustomMessage = useCallback(
    (text: string): MeshMessage => {
      const msg = queueOutbound({
        tag: '#CustomMessage',
        language: speakLanguage,
        channel: channel.label,
        priority: 'Normal',
        type: 'sent',
        originalText: text,
        durationSec: Math.max(3, Math.round(text.length / 14)),
      });
      dispatchSend(msg, { emergency: false });
      return msg;
    },
    [channel.label, speakLanguage, queueOutbound, dispatchSend],
  );

  const sendDirectMessage = useCallback(
    (text: string, to: string): MeshMessage => {
      const dest = devices.find(d => d.name === to || d.id === to);
      const msg = queueOutbound({
        tag: '#DirectMessage',
        to,
        language: speakLanguage,
        channel: channel.label,
        priority: 'Normal',
        type: 'sent',
        originalText: text,
        durationSec: Math.max(3, Math.round(text.length / 14)),
      });
      dispatchSend(msg, { destinationId: dest?.id ?? null });
      return msg;
    },
    [channel.label, speakLanguage, devices, queueOutbound, dispatchSend],
  );

  const sendQuickReply = useCallback(
    (text: string, to: string): MeshMessage => sendDirectMessage(text, to),
    [sendDirectMessage],
  );

  const sendSos = useCallback(async (): Promise<MeshMessage> => {
    const local = queueOutbound({
      tag: '#SOS',
      language: 'English',
      channel: channel.label,
      priority: 'SOS',
      type: 'alert',
      originalText: 'EMERGENCY! Immediate medical and rescue assistance required.',
      durationSec: 6,
    });
    try {
      const result = await itantraService.sendSOS();
      setMessages(list => {
        const withoutLocal = list.filter(m => m.id !== local.id);
        return upsertMessage(withoutLocal, { ...local, ...result });
      });
      return { ...local, ...result };
    } catch {
      setMessages(list => list.map(m => (m.id === local.id ? { ...m, status: 'FAILED' } : m)));
      return { ...local, status: 'FAILED' };
    }
  }, [channel.label, queueOutbound]);

  const startTalk = useCallback(async () => {
    setLastSendError(null);
    await itantraService.startRecording();
  }, []);

  const stopTalkAndSend = useCallback(async (): Promise<MeshMessage | null> => {
    const text = await itantraService.stopRecording();
    if (!text.trim()) return null;
    if (mode === 'private') {
      if (!connectedDevice) return null;
      return sendDirectMessage(text, connectedDevice.name);
    }
    return sendCustomMessage(text);
  }, [mode, connectedDevice, sendDirectMessage, sendCustomMessage]);

  const simulateIncoming = useCallback((): MeshMessage | null => {
    if (!demoMode) return incoming;
    return incoming;
  }, [demoMode, incoming]);

  const clearIncoming = useCallback(() => setIncoming(null), []);
  const clearHistory = useCallback(() => setMessages([]), []);

  const requestConnection = useCallback((device: Device) => {
    setSelectedDevice(device);
    setConnectionStatus('connecting');
    itantraService.connectDevice(device.id).catch(() => setConnectionStatus('idle'));
  }, []);

  const acceptConnection = useCallback(() => {
    if (!connectionRequest) return;
    const device = devices.find(d => d.id === connectionRequest.deviceId);
    if (device) {
      setConnectedDevice(device);
      setConnectionStatus('connected');
    }
    setConnectionRequest(null);
  }, [connectionRequest, devices]);

  const rejectConnection = useCallback(() => {
    setConnectionRequest(null);
    setConnectionStatus('rejected');
    setTimeout(() => setConnectionStatus('idle'), 2000);
  }, []);

  const disconnect = useCallback(() => {
    const id = connectedDevice?.id;
    setConnectedDevice(null);
    setConnectionStatus('idle');
    itantraService.disconnectDevice(id).catch(() => {});
  }, [connectedDevice]);

  const startScan = useCallback(async () => {
    await itantraService.startDiscovery();
    setDevices([...itantraService.devices]);
  }, []);

  const stopScan = useCallback(async () => {
    await itantraService.stopDiscovery();
  }, []);

  const translateText = useCallback(async (text: string, src: string, tgt: string) => {
    return itantraService.translate(text, src, tgt);
  }, []);

  const transcribeAudio = useCallback(async () => itantraService.stopRecording(), []);

  const synthesizeSpeech = useCallback(async (text: string, lang?: string) => {
    await itantraService.playTTS(text, lang);
  }, []);

  const value = useMemo<AppState>(
    () => ({
      myName: nodeLabel,
      mode,
      channel,
      channels: CHANNELS,
      devices,
      selectedDevice: selectedDevice.id ? selectedDevice : devices[0] ?? EMPTY_DEVICE,
      appLanguage,
      speakLanguage,
      translateTo,
      settings,
      messages,
      alerts,
      incoming,
      connectionRequest,
      connectedDevice,
      connectionStatus,
      demoMode,
      initState,
      initError,
      network,
      communicationState,
      lastSendError,
      setMode,
      setChannel,
      setSelectedDevice,
      setAppLanguage,
      setSpeakLanguage,
      setTranslateTo,
      updateSettings,
      toggleAlert,
      addCustomAlert,
      deleteCustomAlert,
      broadcastAlert,
      sendCustomMessage,
      sendDirectMessage,
      sendQuickReply,
      sendSos,
      startTalk,
      stopTalkAndSend,
      simulateIncoming,
      clearIncoming,
      clearHistory,
      requestConnection,
      acceptConnection,
      rejectConnection,
      disconnect,
      startScan,
      stopScan,
      initializeEngine,
      translateText,
      transcribeAudio,
      synthesizeSpeech,
    }),
    [
      nodeLabel, mode, channel, devices, selectedDevice, appLanguage, speakLanguage, translateTo,
      settings, messages, alerts, incoming, connectionRequest, connectedDevice, connectionStatus,
      demoMode, initState, initError, network, communicationState, lastSendError,
      setMode, updateSettings, toggleAlert, addCustomAlert, deleteCustomAlert, broadcastAlert,
      sendCustomMessage, sendDirectMessage, sendQuickReply, sendSos, startTalk, stopTalkAndSend,
      simulateIncoming, clearIncoming, clearHistory, requestConnection, acceptConnection,
      rejectConnection, disconnect, startScan, stopScan, initializeEngine, translateText,
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
