// iTantra — Mock data layer.
// Everything here simulates what the mesh network + AI pipeline will
// provide later. Swap these with live data when integrating STT/TTS/mesh.

export interface Language {
  code: string;
  name: string;
  native: string;
}

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'hi', name: 'Hindi', native: 'हिंदी' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ' },
];

export type AlertKind = 'flood' | 'evac' | 'medical' | 'fire' | 'quake' | 'warn' | 'custom';

export interface AutoAlert {
  id: string;
  kind: AlertKind;
  title: string;
  message: string;
  language: string;
  priority: 'Normal' | 'High' | 'SOS';
  enabled: boolean;
  custom?: boolean;
}

export const PREDEFINED_ALERTS: AutoAlert[] = [
  { id: 'a1', kind: 'flood', title: 'Flood Alert', message: 'Water level is rising. Move to safe zone immediately.', language: 'English', priority: 'High', enabled: true },
  { id: 'a2', kind: 'evac', title: 'Evacuation', message: 'Evacuate now to higher ground. Follow instructions.', language: 'English', priority: 'High', enabled: true },
  { id: 'a3', kind: 'medical', title: 'Medical Help', message: 'Medical assistance needed at this location.', language: 'English', priority: 'High', enabled: true },
  { id: 'a4', kind: 'fire', title: 'Fire Alert', message: 'Fire reported in the area. Stay away and be safe.', language: 'English', priority: 'High', enabled: true },
  { id: 'a5', kind: 'quake', title: 'Earthquake Alert', message: 'Strong tremors detected. Move to open area.', language: 'English', priority: 'Normal', enabled: false },
  { id: 'a6', kind: 'warn', title: 'General Warning', message: 'Attention! Please stay alert and follow updates.', language: 'English', priority: 'Normal', enabled: true },
];

export interface Device {
  id: string;
  name: string;
  distance: string;
  signal: number; // 0..4 from backend RSSI when provided, else 0
  nodeId?: string;
  transport?: string;
  connectionState?: string;
  lastSeen?: number;
}

export const NEARBY_DEVICES: Device[] = [];

export interface Channel {
  id: string;
  label: string; // CH 3/10
  name: string;
  members: number;
  signal: number;
  frequency?: string;
}

export const CHANNELS: Channel[] = [
  { id: 'c1', label: 'CH 1/5', name: 'Rescue Operations', members: 0, signal: 0, frequency: '433.125 MHz' },
  { id: 'c2', label: 'CH 2/5', name: 'Medical Team', members: 0, signal: 0, frequency: '434.250 MHz' },
  { id: 'c3', label: 'CH 3/10', name: 'Public Broadcast', members: 0, signal: 0, frequency: '433.920 MHz' },
  { id: 'c4', label: 'CH 4/5', name: 'Logistics', members: 0, signal: 0, frequency: '434.100 MHz' },
  { id: 'c5', label: 'CH 5/5', name: 'Command Center', members: 0, signal: 0, frequency: '434.500 MHz' },
];

export type MessageType = 'received' | 'sent' | 'alert';

export interface MeshMessage {
  id: string;
  tag: string; // #FloodAlert
  from: string;
  to?: string;
  time: string;
  language: string;
  translatedTo?: string;
  channel: string;
  priority: 'Normal' | 'High' | 'SOS';
  type: MessageType;
  originalText: string;
  translatedText?: string;
  durationSec: number;
  status?: 'PENDING' | 'SENDING' | 'DELIVERED' | 'FAILED' | 'RETRYING';
  hops?: number;
  retryCount?: number;
  ackReceived?: boolean;
  transport?: string;
}

export const INITIAL_MESSAGES: MeshMessage[] = [];

export const QUICK_REPLIES = [
  { id: 'q1', icon: 'checkmark-circle', color: '#32D74B', text: 'Message received.' },
  { id: 'q2', icon: 'location', color: '#FFD60A', text: 'Moving to safe zone.' },
  { id: 'q3', icon: 'medkit', color: '#FF9F0A', text: 'Need medical help.' },
  { id: 'q4', icon: 'add-circle', color: '#FF453A', text: 'Emergency! Send help.' },
  { id: 'q5', icon: 'information-circle', color: '#64D2FF', text: 'All people accounted for.' },
];

export const HELP_TOPICS = [
  { id: 'h1', title: 'How it works?' },
  { id: 'h2', title: 'How to connect?' },
  { id: 'h3', title: 'Sending a message' },
  { id: 'h4', title: 'Receiving a message' },
  { id: 'h5', title: 'Offline communication' },
  { id: 'h6', title: 'FAQs' },
];

// Demo payload used by "simulate incoming message"
export const DEMO_INCOMING: MeshMessage = {
  id: '',
  tag: '#Incoming',
  from: 'Unknown node',
  time: '—',
  language: '—',
  channel: '—',
  priority: 'Normal',
  type: 'received',
  originalText: '',
  durationSec: 0,
  status: 'PENDING',
};
