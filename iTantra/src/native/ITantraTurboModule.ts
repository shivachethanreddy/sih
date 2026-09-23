// iTANTRA TurboModule Specification
// This file defines the TypeScript interface for the native module

import { TurboModule, TurboModuleRegistry } from 'react-native';
import { EventEmitter } from 'events';

// ============================================
// Types
// ============================================

export type NetworkState = {
  status: 'OFFLINE' | 'DISCOVERING' | 'CONNECTED';
  nodeId: number;
  demoMode: boolean;
  transport: string;
  peers: number;
  discovered: number;
  pending: number;
  lastTransmission: number;
  lastReceived: number;
};

export type Device = {
  id: string;
  name: string;
  nodeId: string;
  transport: 'WIFI_DIRECT' | 'BLUETOOTH' | 'MOCK';
  connectionState: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'DISCONNECTING' | 'FAILED';
  signalStrength: number;
  lastSeen: number;
};

export type Message = {
  messageId: string;
  text: string;
  language: string;
  channelId: string;
  priority: 'NORMAL' | 'HIGH' | 'EMERGENCY';
  emergency: boolean;
  from: string;
  to: string;
  hops: number;
  timestamp: number;
  status?: 'PENDING' | 'SENDING' | 'SENT' | 'DELIVERED' | 'FAILED';
};

export type Diagnostics = {
  nodeId: number;
  demoMode: boolean;
  transport: string;
  initialized: boolean;
  connectedPeers: number;
  discoveredPeers: number;
  packetsSent: number;
  packetsReceived: number;
  packetsRelayed: number;
  packetsDropped: number;
  acks: number;
  retries: number;
  pending: number;
  lastTransmission: number;
  lastReceived: number;
  aiStatus: string;
  databaseStatus: string;
  storedMessages: number;
  storedDevices: number;
};

export type EventMap = {
  backendReady: { nodeId: number; demoMode: boolean; transport: string };
  networkChanged: NetworkState;
  deviceDiscovered: Device;
  deviceLost: { deviceId: string };
  connectionChanged: { status: string; deviceId: string; device?: Device; error?: string };
  packetCreated: { messageId: string; channelId: string; emergency: boolean; hopCount: number };
  messageSending: { messageId: string };
  messageDelivered: Message & { status: 'DELIVERED'; peers: number };
  messageFailed: Message & { status: 'FAILED'; error: string };
  messageReceived: {
    messageId: string;
    text: string;
    from: string;
    fromId: string;
    transport: string;
    hops: number;
    emergency: boolean;
    channelId: string;
    language: string;
    timestamp: number;
  };
  emergencyReceived: { messageId: string };
  ackReceived: { messageId: string; peers: number };
  recordingStarted: { hasAmplitude: boolean; ai: string };
  recordingStopped: Record<string, never>;
  transcriptionStarted: { ai: string };
  transcriptionCompleted: { text: string; ai: string };
  ttsStarted: { text: string; ai: string };
  ttsCompleted: { ai: string };
  translationStarted: { ai: string };
  translationCompleted: { text: string; ai: string };
  backendError: { error: string };
};

export type ITantraSpec = TurboModule & {
  // Core lifecycle
  initialize(): Promise<NetworkState>;
  getNetworkStatus(): Promise<NetworkState>;
  getDiagnostics(): Promise<Diagnostics>;
  getDevices(): Promise<Device[]>;
  getMessages(channelId?: string | null): Promise<Message[]>;
  
  // Network
  startDiscovery(): Promise<NetworkState>;
  stopDiscovery(): Promise<NetworkState>;
  connectDevice(deviceId: string): Promise<void>;
  disconnectDevice(deviceId: string): Promise<void>;
  disconnectAll(): Promise<void>;
  setMode(mode: string): Promise<string>;
  
  // Voice recording
  startRecording(): Promise<void>;
  stopRecording(): Promise<string>; // returns transcribed text
  
  // Messaging
  sendMessage(
    text: string,
    language: string,
    channelId: string,
    emergency: boolean,
    destinationId?: string | null
  ): Promise<Message>;
  
  sendAlert(alertType: string): Promise<Message>;
  sendSOS(): Promise<Message>;
  
  // AI
  playTTS(text: string, language?: string | null): Promise<void>;
  translate(text: string, sourceLang: string, targetLang: string): Promise<string>;
  
  // Event handling
  addListener(eventName: string): void;
  removeListeners(count: number): void;
};

// Event emitter type
export type ITantraEventEmitter = EventEmitter & {
  emit<EventName extends keyof EventMap>(eventName: EventName, data: EventMap[EventName]): boolean;
  on<EventName extends keyof EventMap>(eventName: EventName, listener: (data: EventMap[EventName]) => void): ITantraEventEmitter;
  off<EventName extends keyof EventMap>(eventName: EventName, listener: (data: EventMap[EventName]) => void): ITantraEventEmitter;
};

// ============================================
// JS-side helper class
// ============================================

import { NativeEventEmitter, NativeModules } from 'react-native';

const { ITantraModule } = NativeModules;

if (!ITantraModule) {
  console.warn('ITantraModule not found. Make sure the native module is linked.');
}

export const iTantraEmitter = new NativeEventEmitter(ITantraModule);

export const iTantra = {
  // Core
  async initialize(): Promise<NetworkState> {
    return await ITantraModule.initialize();
  },
  
  async getNetworkStatus(): Promise<NetworkState> {
    return await ITantraModule.getNetworkStatus();
  },
  
  async getDiagnostics(): Promise<Diagnostics> {
    return await ITantraModule.getDiagnostics();
  },
  
  async getDevices(): Promise<Device[]> {
    return await ITantraModule.getDevices();
  },

  async getMessages(channelId?: string | null): Promise<Message[]> {
    return await ITantraModule.getMessages(channelId ?? null);
  },
  
  // Network
  async startDiscovery(): Promise<NetworkState> {
    return await ITantraModule.startDiscovery();
  },
  
  async stopDiscovery(): Promise<NetworkState> {
    return await ITantraModule.stopDiscovery();
  },
  
  async connectDevice(deviceId: string): Promise<void> {
    return await ITantraModule.connectDevice(deviceId);
  },
  
  async disconnectDevice(deviceId: string): Promise<void> {
    return await ITantraModule.disconnectDevice(deviceId);
  },
  
  async disconnectAll(): Promise<void> {
    return await ITantraModule.disconnectAll();
  },
  
  async setMode(mode: string): Promise<string> {
    return await ITantraModule.setMode(mode);
  },
  
  // Voice
  async startRecording(): Promise<void> {
    return await ITantraModule.startRecording();
  },
  
  async stopRecording(): Promise<string> {
    return await ITantraModule.stopRecording();
  },
  
  // Messaging
  async sendMessage(
    text: string,
    language: string,
    channelId: string,
    emergency: boolean,
    destinationId?: string | null
  ): Promise<Message> {
    return await ITantraModule.sendMessage(text, language, channelId, emergency, destinationId);
  },
  
  async sendAlert(alertType: string): Promise<Message> {
    return await ITantraModule.sendAlert(alertType);
  },
  
  async sendSOS(): Promise<Message> {
    return await ITantraModule.sendSOS();
  },
  
  // AI
  async playTTS(text: string, language?: string | null): Promise<void> {
    return await ITantraModule.playTTS(text, language);
  },
  
  async translate(text: string, sourceLang: string, targetLang: string): Promise<string> {
    return await ITantraModule.translate(text, sourceLang, targetLang);
  },
  
  // Events
  on<EventName extends keyof EventMap>(eventName: EventName, listener: (data: EventMap[EventName]) => void) {
    return iTantraEmitter.addListener(eventName, listener);
  },
  
  off<EventName extends keyof EventMap>(eventName: EventName, listener: (data: EventMap[EventName]) => void) {
    return iTantraEmitter.removeListener(eventName, listener);
  },
};

export default iTantra;