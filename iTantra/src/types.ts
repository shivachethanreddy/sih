import { AutoAlert, Device, MeshMessage } from './data/mockData';

export type MessageStatus = 'PENDING' | 'SENDING' | 'DELIVERED' | 'FAILED' | 'RETRYING';

export type EnginePriority = 'NORMAL' | 'HIGH' | 'EMERGENCY';

export type ConnectionState =
  | 'DISCOVERING'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'OFFLINE';

export type TransportType = 'WIFI_DIRECT' | 'BLUETOOTH' | 'MOCK' | 'NONE';

export type CommunicationState =
  | 'IDLE'
  | 'RECORDING'
  | 'PROCESSING'
  | 'TRANSCRIBING'
  | 'PACKETIZING'
  | 'SENDING'
  | 'DELIVERED'
  | 'FAILED';

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'rejected';

export type InitState = 'idle' | 'initializing' | 'ready' | 'failed';

export interface NetworkSnapshot {
  status: ConnectionState;
  nodeId: string;
  demoMode: boolean;
  transport: string;
  peers: number;
  discovered: number;
  pending: number;
  lastTransmission: number;
  lastReceived: number;
}

export interface DiagnosticsSnapshot {
  nodeId: string;
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
}

export const EMPTY_DEVICE: Device = {
  id: '',
  name: 'No peer selected',
  distance: '—',
  signal: 0,
  connectionState: 'DISCONNECTED',
  transport: 'NONE',
};

export function formatClock(ms?: number): string {
  const d = ms ? new Date(ms) : new Date();
  if (ms && ms <= 0) return '—';
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ap}`;
}

export function mapNativeDevice(raw: Record<string, unknown> | null | undefined): Device | null {
  if (!raw) return null;
  const id = String(raw.id ?? raw.nodeId ?? '');
  if (!id) return null;
  const signal100 = Number(raw.signalStrength ?? 0);
  return {
    id,
    name: String(raw.name ?? `NODE ${id}`),
    distance: '—',
    signal: Math.max(0, Math.min(4, Math.round(signal100 / 25))),
    nodeId: String(raw.nodeId ?? id),
    transport: String(raw.transport ?? 'NONE'),
    connectionState: String(raw.connectionState ?? 'DISCOVERED'),
    lastSeen: Number(raw.lastSeen ?? Date.now()),
  };
}

export function mapNativeNetwork(raw: Record<string, unknown> | null | undefined): NetworkSnapshot {
  const status = String(raw?.status ?? 'OFFLINE').toUpperCase() as ConnectionState;
  return {
    status: ['DISCOVERING', 'CONNECTING', 'CONNECTED', 'DISCONNECTED', 'OFFLINE'].includes(status)
      ? status
      : 'OFFLINE',
    nodeId: String(raw?.nodeId ?? '0'),
    demoMode: Boolean(raw?.demoMode),
    transport: String(raw?.transport ?? 'NONE'),
    peers: Number(raw?.peers ?? 0),
    discovered: Number(raw?.discovered ?? 0),
    pending: Number(raw?.pending ?? 0),
    lastTransmission: Number(raw?.lastTransmission ?? 0),
    lastReceived: Number(raw?.lastReceived ?? 0),
  };
}

export function mapNativeDiagnostics(raw: Record<string, unknown> | null | undefined): DiagnosticsSnapshot {
  return {
    nodeId: String(raw?.nodeId ?? '0'),
    demoMode: Boolean(raw?.demoMode),
    transport: String(raw?.transport ?? 'NONE'),
    initialized: Boolean(raw?.initialized),
    connectedPeers: Number(raw?.connectedPeers ?? 0),
    discoveredPeers: Number(raw?.discoveredPeers ?? 0),
    packetsSent: Number(raw?.packetsSent ?? 0),
    packetsReceived: Number(raw?.packetsReceived ?? 0),
    packetsRelayed: Number(raw?.packetsRelayed ?? 0),
    packetsDropped: Number(raw?.packetsDropped ?? 0),
    acks: Number(raw?.acks ?? 0),
    retries: Number(raw?.retries ?? 0),
    pending: Number(raw?.pending ?? 0),
    lastTransmission: Number(raw?.lastTransmission ?? 0),
    lastReceived: Number(raw?.lastReceived ?? 0),
    aiStatus: String(raw?.aiStatus ?? 'MOCK'),
    databaseStatus: String(raw?.databaseStatus ?? 'NOT_AVAILABLE'),
  };
}

export type { AutoAlert, Device, MeshMessage };
