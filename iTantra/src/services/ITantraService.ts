/**
 * Single bridge between React Native UI and the Kotlin ITantraModule.
 * Screens must not call NativeModules directly.
 */

import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { AutoAlert, Device, MeshMessage } from '../data/mockData';
import {
  CommunicationState,
  ConnectionState,
  ConnectionStatus,
  DiagnosticsSnapshot,
  InitState,
  NetworkSnapshot,
  formatClock,
  mapNativeDevice,
  mapNativeDiagnostics,
  mapNativeNetwork,
} from '../types';

export type ITantraEvent =
  | { type: 'backendReady'; nodeId: string; demoMode: boolean; transport: string }
  | { type: 'backendError'; error: string }
  | { type: 'networkChanged'; network: NetworkSnapshot }
  | { type: 'deviceDiscovered'; device: Device }
  | { type: 'deviceLost'; deviceId: string }
  | { type: 'connectionChanged'; status: ConnectionStatus; deviceId?: string }
  | { type: 'recordingStarted' }
  | { type: 'recordingStopped' }
  | { type: 'recordingAmplitude'; amplitude: number }
  | { type: 'transcriptionStarted' }
  | { type: 'transcriptionCompleted'; text: string }
  | { type: 'packetCreated'; messageId: string }
  | { type: 'messageSending'; messageId: string }
  | { type: 'messageReceived'; message: MeshMessage }
  | { type: 'messageDelivered'; messageId: string; hops?: number }
  | { type: 'messageFailed'; messageId: string; error: string }
  | { type: 'ackReceived'; messageId: string }
  | { type: 'retryStarted'; messageId: string }
  | { type: 'ttsStarted'; text: string }
  | { type: 'ttsCompleted' }
  | { type: 'translationStarted' }
  | { type: 'translationCompleted'; text: string }
  | { type: 'emergencyReceived'; messageId: string }
  | { type: 'sosSent'; messageId: string };

export type ITantraEventListener = (event: ITantraEvent) => void;

interface NativeBridge {
  initialize(): Promise<Record<string, unknown>>;
  connect(): Promise<Record<string, unknown>>;
  disconnect(): Promise<boolean>;
  startDiscovery(): Promise<Record<string, unknown>>;
  stopDiscovery(): Promise<boolean>;
  connectDevice(id: string): Promise<boolean>;
  disconnectDevice(id: string): Promise<boolean>;
  startRecording(): Promise<boolean>;
  stopRecording(): Promise<string>;
  sendMessage(
    text: string,
    language: string,
    channelId: string,
    emergency: boolean,
    destinationId: string | null,
  ): Promise<Record<string, unknown>>;
  sendSOS(): Promise<Record<string, unknown>>;
  sendAlert(type: string): Promise<Record<string, unknown>>;
  playTTS(text: string, lang: string | null): Promise<boolean>;
  translate(text: string, src: string, tgt: string): Promise<string>;
  getNetworkStatus(): Promise<Record<string, unknown>>;
  getDiagnostics(): Promise<Record<string, unknown>>;
  getDevices(): Promise<Record<string, unknown>[]>;
  setMode(mode: string): Promise<string>;
}

const MOCK_TRANSCRIPT = 'Water level is rising near the bridge. Please move to a safe zone.';

function toConnectionStatus(raw?: string): ConnectionStatus {
  const s = (raw ?? '').toUpperCase();
  if (s === 'CONNECTED') return 'connected';
  if (s === 'CONNECTING') return 'connecting';
  if (s === 'REJECTED') return 'rejected';
  return 'idle';
}

export class ITantraService {
  private native: NativeBridge | null = null;
  private emitterSub: { remove(): void } | null = null;
  private listeners = new Set<ITantraEventListener>();
  private amplitudeTimer: ReturnType<typeof setInterval> | null = null;

  initState: InitState = 'idle';
  initError: string | null = null;
  demoMode = true;
  nodeId = '0';
  communicationState: CommunicationState = 'IDLE';
  connectionStatus: ConnectionStatus = 'idle';
  network: NetworkSnapshot = {
    status: 'OFFLINE',
    nodeId: '0',
    demoMode: true,
    transport: 'NONE',
    peers: 0,
    discovered: 0,
    pending: 0,
    lastTransmission: 0,
    lastReceived: 0,
  };
  devices: Device[] = [];
  isRecording = false;

  subscribe(listener: ITantraEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  get isDemo(): boolean {
    return this.demoMode;
  }

  async initialize(): Promise<NetworkSnapshot> {
    this.initState = 'initializing';
    this.initError = null;
    this.attachNative();

    try {
      if (this.native) {
        const snapshot = await this.native.initialize();
        this.applyNetwork(mapNativeNetwork(snapshot));
        this.initState = 'ready';
        this.emit({
          type: 'backendReady',
          nodeId: this.nodeId,
          demoMode: this.demoMode,
          transport: this.network.transport,
        });
      } else {
        this.demoMode = true;
        this.initState = 'ready';
        this.applyNetwork({
          ...this.network,
          status: 'OFFLINE',
          demoMode: true,
          transport: 'MOCK',
        });
        this.emit({
          type: 'backendReady',
          nodeId: this.nodeId,
          demoMode: true,
          transport: 'MOCK',
        });
      }
      return this.network;
    } catch (err: any) {
      this.initState = 'failed';
      this.initError = err?.message ?? 'Communication engine unavailable';
      this.emit({ type: 'backendError', error: this.initError });
      throw err;
    }
  }

  async startDiscovery(): Promise<Device[]> {
    if (this.native) {
      await this.native.startDiscovery();
      const list = await this.native.getDevices();
      this.mergeDevices(list.map(row => mapNativeDevice(row)).filter(Boolean) as Device[]);
      return this.devices;
    }

    this.applyNetwork({ ...this.network, status: 'DISCOVERING', demoMode: true, transport: 'MOCK' });
    await delay(700);
    const demo = this.demoDevices();
    this.mergeDevices(demo);
    demo.forEach(device => this.emit({ type: 'deviceDiscovered', device }));
    this.applyNetwork({
      ...this.network,
      status: 'CONNECTED',
      peers: demo.filter(d => d.connectionState === 'CONNECTED').length,
      discovered: demo.length,
      demoMode: true,
      transport: 'MOCK',
    });
    return this.devices;
  }

  async stopDiscovery(): Promise<void> {
    if (this.native) {
      await this.native.stopDiscovery();
      return;
    }
    this.applyNetwork({ ...this.network, status: this.network.peers > 0 ? 'CONNECTED' : 'OFFLINE' });
  }

  async connectDevice(id: string): Promise<void> {
    this.connectionStatus = 'connecting';
    this.emit({ type: 'connectionChanged', status: 'connecting', deviceId: id });
    if (this.native) {
      await this.native.connectDevice(id);
      return;
    }
    await delay(600);
    this.devices = this.devices.map(d =>
      d.id === id ? { ...d, connectionState: 'CONNECTED' } : d,
    );
    this.connectionStatus = 'connected';
    this.emit({ type: 'connectionChanged', status: 'connected', deviceId: id });
    this.applyNetwork({
      ...this.network,
      status: 'CONNECTED',
      peers: this.devices.filter(d => d.connectionState === 'CONNECTED').length,
    });
  }

  async disconnectDevice(id?: string): Promise<void> {
    if (this.native) {
      if (id) await this.native.disconnectDevice(id);
      else await this.native.disconnect();
    }
    this.connectionStatus = 'idle';
    this.emit({ type: 'connectionChanged', status: 'idle', deviceId: id });
  }

  async startRecording(): Promise<void> {
    if (this.isRecording) return;
    this.isRecording = true;
    this.communicationState = 'RECORDING';
    this.emit({ type: 'recordingStarted' });
    if (this.native) {
      await this.native.startRecording();
      return;
    }
    this.amplitudeTimer = setInterval(() => {
      this.emit({ type: 'recordingAmplitude', amplitude: 0.15 + Math.random() * 0.4 });
    }, 180);
  }

  async stopRecording(): Promise<string> {
    if (!this.isRecording) return '';
    this.isRecording = false;
    this.clearAmplitude();
    this.communicationState = 'PROCESSING';
    this.emit({ type: 'recordingStopped' });
    this.communicationState = 'TRANSCRIBING';
    this.emit({ type: 'transcriptionStarted' });

    if (this.native) {
      const text = await this.native.stopRecording();
      this.communicationState = 'IDLE';
      this.emit({ type: 'transcriptionCompleted', text });
      return text;
    }

    await delay(700);
    this.communicationState = 'IDLE';
    this.emit({ type: 'transcriptionCompleted', text: MOCK_TRANSCRIPT });
    return MOCK_TRANSCRIPT;
  }

  async sendMessage(opts: {
    text: string;
    language: string;
    channelId: string;
    emergency?: boolean;
    destinationId?: string | null;
  }): Promise<MeshMessage> {
    const localId = `local-${Date.now()}`;
    this.communicationState = 'PACKETIZING';
    this.emit({ type: 'packetCreated', messageId: localId });
    this.communicationState = 'SENDING';
    this.emit({ type: 'messageSending', messageId: localId });

    if (this.native) {
      const result = await this.native.sendMessage(
        opts.text,
        opts.language,
        opts.channelId,
        !!opts.emergency,
        opts.destinationId ?? null,
      );
      return this.messageFromSendResult(result, opts);
    }

    await delay(800);
    const peers = this.devices.filter(d => d.connectionState === 'CONNECTED').length;
    if (peers === 0) {
      this.communicationState = 'FAILED';
      this.emit({ type: 'messageFailed', messageId: localId, error: 'No connected peers' });
      return this.localMessage(localId, opts, 'FAILED');
    }
    this.communicationState = 'DELIVERED';
    this.emit({ type: 'ackReceived', messageId: localId });
    this.emit({ type: 'messageDelivered', messageId: localId, hops: 1 });
    return this.localMessage(localId, opts, 'DELIVERED', 1);
  }

  async sendSOS(): Promise<MeshMessage> {
    if (this.native) {
      const result = await this.native.sendSOS();
      return this.messageFromSendResult(result, {
        text: 'EMERGENCY SOS',
        language: 'English',
        channelId: 'emergency',
        emergency: true,
      });
    }
    return this.sendMessage({
      text: 'EMERGENCY SOS',
      language: 'English',
      channelId: 'emergency',
      emergency: true,
    });
  }

  async sendAlert(type: string, text: string, language: string, channelId: string): Promise<MeshMessage> {
    if (this.native) {
      const result = await this.native.sendAlert(type);
      return this.messageFromSendResult(result, { text, language, channelId, emergency: true });
    }
    return this.sendMessage({ text, language, channelId, emergency: true });
  }

  async playTTS(text: string, lang?: string): Promise<void> {
    this.emit({ type: 'ttsStarted', text });
    if (this.native) {
      await this.native.playTTS(text, lang ?? null);
      return;
    }
    await delay(400);
    this.emit({ type: 'ttsCompleted' });
  }

  async translate(text: string, src: string, tgt: string): Promise<string> {
    this.emit({ type: 'translationStarted' });
    if (this.native) {
      const translated = await this.native.translate(text, src, tgt);
      this.emit({ type: 'translationCompleted', text: translated });
      return translated;
    }
    await delay(350);
    const translated = `[${tgt} MOCK] ${text}`;
    this.emit({ type: 'translationCompleted', text: translated });
    return translated;
  }

  async refreshNetwork(): Promise<NetworkSnapshot> {
    if (this.native) {
      this.applyNetwork(mapNativeNetwork(await this.native.getNetworkStatus()));
    }
    return this.network;
  }

  async getDiagnostics(): Promise<DiagnosticsSnapshot> {
    if (this.native) {
      return mapNativeDiagnostics(await this.native.getDiagnostics());
    }
    return mapNativeDiagnostics({
      nodeId: this.nodeId,
      demoMode: true,
      transport: 'MOCK',
      initialized: this.initState === 'ready',
      connectedPeers: this.network.peers,
      discoveredPeers: this.devices.length,
      packetsSent: 0,
      packetsReceived: 0,
      packetsRelayed: 0,
      packetsDropped: 0,
      acks: 0,
      retries: 0,
      pending: 0,
      lastTransmission: this.network.lastTransmission,
      lastReceived: this.network.lastReceived,
      aiStatus: 'MOCK',
      databaseStatus: 'NOT_AVAILABLE',
    });
  }

  async setMode(mode: string): Promise<void> {
    if (this.native) await this.native.setMode(mode);
  }

  destroy(): void {
    this.emitterSub?.remove();
    this.emitterSub = null;
    this.clearAmplitude();
    this.listeners.clear();
  }

  private attachNative() {
    if (this.native || Platform.OS !== 'android') return;
    const module = (NativeModules as { ITantraModule?: NativeBridge }).ITantraModule;
    if (!module?.initialize) return;
    this.native = module;
    const emitter = new NativeEventEmitter(NativeModules.ITantraModule);
    this.emitterSub = emitter.addListener('ITantraEvent', (payload: Record<string, unknown>) => {
      this.handleNativeEvent(payload);
    });
  }

  private handleNativeEvent(payload: Record<string, unknown>) {
    const type = String(payload.type ?? '');
    switch (type) {
      case 'backendReady':
        this.demoMode = Boolean(payload.demoMode);
        this.nodeId = String(payload.nodeId ?? this.nodeId);
        this.initState = 'ready';
        this.emit({
          type: 'backendReady',
          nodeId: this.nodeId,
          demoMode: this.demoMode,
          transport: String(payload.transport ?? 'NONE'),
        });
        break;
      case 'backendError':
        this.initState = 'failed';
        this.initError = String(payload.error ?? 'Unknown error');
        this.emit({ type: 'backendError', error: this.initError });
        break;
      case 'networkChanged':
        this.applyNetwork(mapNativeNetwork(payload));
        break;
      case 'deviceDiscovered': {
        const device = mapNativeDevice(payload.device as Record<string, unknown> ?? payload);
        if (device) {
          this.mergeDevices([device]);
          this.emit({ type: 'deviceDiscovered', device });
        }
        break;
      }
      case 'deviceLost': {
        const id = String(payload.deviceId ?? '');
        this.devices = this.devices.filter(d => d.id !== id);
        this.emit({ type: 'deviceLost', deviceId: id });
        break;
      }
      case 'connectionChanged': {
        const status = toConnectionStatus(String(payload.status));
        this.connectionStatus = status;
        const nested = mapNativeDevice(payload.device as Record<string, unknown>);
        if (nested) this.mergeDevices([nested]);
        this.emit({ type: 'connectionChanged', status, deviceId: String(payload.deviceId ?? '') });
        break;
      }
      case 'recordingStarted':
        this.isRecording = true;
        this.communicationState = 'RECORDING';
        this.emit({ type: 'recordingStarted' });
        break;
      case 'recordingStopped':
        this.isRecording = false;
        this.emit({ type: 'recordingStopped' });
        break;
      case 'transcriptionStarted':
        this.communicationState = 'TRANSCRIBING';
        this.emit({ type: 'transcriptionStarted' });
        break;
      case 'transcriptionCompleted':
        this.emit({ type: 'transcriptionCompleted', text: String(payload.text ?? '') });
        break;
      case 'packetCreated':
        this.communicationState = 'PACKETIZING';
        this.emit({ type: 'packetCreated', messageId: String(payload.messageId ?? '') });
        break;
      case 'messageSending':
        this.communicationState = 'SENDING';
        this.emit({ type: 'messageSending', messageId: String(payload.messageId ?? '') });
        break;
      case 'messageDelivered':
        this.communicationState = 'DELIVERED';
        this.emit({
          type: 'messageDelivered',
          messageId: String(payload.messageId ?? ''),
          hops: payload.hops != null ? Number(payload.hops) : undefined,
        });
        break;
      case 'messageFailed':
        this.communicationState = 'FAILED';
        this.emit({
          type: 'messageFailed',
          messageId: String(payload.messageId ?? ''),
          error: String(payload.error ?? 'Send failed'),
        });
        break;
      case 'ackReceived':
        this.emit({ type: 'ackReceived', messageId: String(payload.messageId ?? '') });
        break;
      case 'retryStarted':
        this.emit({ type: 'retryStarted', messageId: String(payload.messageId ?? '') });
        break;
      case 'messageReceived':
        this.emit({ type: 'messageReceived', message: this.messageFromIncoming(payload) });
        break;
      case 'emergencyReceived':
        this.emit({ type: 'emergencyReceived', messageId: String(payload.messageId ?? '') });
        break;
      case 'ttsStarted':
        this.emit({ type: 'ttsStarted', text: String(payload.text ?? '') });
        break;
      case 'ttsCompleted':
        this.emit({ type: 'ttsCompleted' });
        break;
      case 'translationStarted':
        this.emit({ type: 'translationStarted' });
        break;
      case 'translationCompleted':
        this.emit({ type: 'translationCompleted', text: String(payload.text ?? '') });
        break;
      default:
        break;
    }
  }

  private applyNetwork(network: NetworkSnapshot) {
    this.network = network;
    this.demoMode = network.demoMode;
    this.nodeId = network.nodeId;
    if (network.status === 'CONNECTED') this.connectionStatus = 'connected';
    else if (network.status === 'CONNECTING') this.connectionStatus = 'connecting';
    else if (this.connectionStatus === 'connected') this.connectionStatus = 'idle';
    this.emit({ type: 'networkChanged', network });
  }

  private mergeDevices(incoming: Device[]) {
    const map = new Map(this.devices.map(d => [d.id, d]));
    incoming.forEach(d => map.set(d.id, { ...map.get(d.id), ...d }));
    this.devices = Array.from(map.values());
  }

  private emit(event: ITantraEvent) {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (err) {
        console.warn('[ITantraService] listener error', err);
      }
    });
  }

  private clearAmplitude() {
    if (this.amplitudeTimer) {
      clearInterval(this.amplitudeTimer);
      this.amplitudeTimer = null;
    }
  }

  private demoDevices(): Device[] {
    return [
      {
        id: '101',
        name: 'FIELD NODE 01',
        distance: '—',
        signal: 0,
        nodeId: '101',
        transport: 'MOCK',
        connectionState: 'CONNECTED',
      },
      {
        id: '102',
        name: 'FIELD NODE 02',
        distance: '—',
        signal: 0,
        nodeId: '102',
        transport: 'MOCK',
        connectionState: 'CONNECTED',
      },
      {
        id: '103',
        name: 'FIELD NODE 03',
        distance: '—',
        signal: 0,
        nodeId: '103',
        transport: 'MOCK',
        connectionState: 'DISCOVERING',
      },
    ];
  }

  private localMessage(
    id: string,
    opts: { text: string; language: string; channelId: string; emergency?: boolean; destinationId?: string | null },
    status: MeshMessage['status'],
    hops?: number,
  ): MeshMessage {
    return {
      id,
      tag: opts.emergency ? '#Emergency' : '#Voice',
      from: `NODE ${this.nodeId}`,
      to: opts.destinationId ?? undefined,
      time: formatClock(),
      language: opts.language,
      channel: opts.channelId,
      priority: opts.emergency ? 'SOS' : 'Normal',
      type: opts.emergency ? 'alert' : 'sent',
      originalText: opts.text,
      durationSec: Math.max(3, Math.round(opts.text.length / 14)),
      status,
      hops,
    };
  }

  private messageFromSendResult(
    result: Record<string, unknown>,
    opts: { text: string; language: string; channelId: string; emergency?: boolean; destinationId?: string | null },
  ): MeshMessage {
    const statusRaw = String(result.status ?? '').toUpperCase();
    const status: MeshMessage['status'] =
      statusRaw === 'DELIVERED' ? 'DELIVERED' : statusRaw === 'FAILED' ? 'FAILED' : 'SENDING';
    const id = String(result.messageId ?? `local-${Date.now()}`);
    if (status === 'DELIVERED') {
      this.emit({ type: 'messageDelivered', messageId: id, hops: result.hops != null ? Number(result.hops) : undefined });
    } else if (status === 'FAILED') {
      this.emit({ type: 'messageFailed', messageId: id, error: String(result.error ?? 'Send failed') });
    }
    return {
      id,
      tag: opts.emergency ? '#Emergency' : '#Voice',
      from: String(result.from ?? `NODE ${this.nodeId}`),
      to: String(result.to ?? opts.destinationId ?? ''),
      time: formatClock(Number(result.timestamp ?? Date.now())),
      language: String(result.language ?? opts.language),
      channel: String(result.channelId ?? opts.channelId),
      priority: opts.emergency ? 'SOS' : 'Normal',
      type: opts.emergency ? 'alert' : 'sent',
      originalText: String(result.text ?? opts.text),
      durationSec: Math.max(3, Math.round(String(result.text ?? opts.text).length / 14)),
      status,
      hops: result.hops != null ? Number(result.hops) : undefined,
    };
  }

  private messageFromIncoming(payload: Record<string, unknown>): MeshMessage {
    const emergency = Boolean(payload.emergency);
    return {
      id: String(payload.messageId ?? `rx-${Date.now()}`),
      tag: emergency ? '#Emergency' : '#Incoming',
      from: String(payload.from ?? 'Unknown node'),
      time: formatClock(Number(payload.timestamp ?? Date.now())),
      language: String(payload.language ?? 'Unknown'),
      channel: String(payload.channelId ?? '—'),
      priority: emergency ? 'SOS' : 'Normal',
      type: emergency ? 'alert' : 'received',
      originalText: String(payload.text ?? ''),
      durationSec: Math.max(3, Math.round(String(payload.text ?? '').length / 14)),
      status: 'DELIVERED',
      hops: payload.hops != null ? Number(payload.hops) : undefined,
      transport: String(payload.transport ?? ''),
    };
  }
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const itantraService = new ITantraService();
export default itantraService;
