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
  signal: number; // 0..4
}

export const NEARBY_DEVICES: Device[] = [
  { id: 'R01-A7', name: 'Rescue_01', distance: '1.2 m', signal: 4 },
  { id: 'T02-B3', name: 'Team_Alpha', distance: '3.4 m', signal: 3 },
  { id: 'U77-C1', name: 'Unit_77', distance: '5.1 m', signal: 3 },
  { id: 'F09-D2', name: 'Field_Comm', distance: '7.3 m', signal: 2 },
];

export interface Channel {
  id: string;
  label: string; // CH 3/10
  name: string;
  members: number;
  signal: number;
  frequency?: string;
}

export const CHANNELS: Channel[] = [
  { id: 'c1', label: 'CH 1/5', name: 'Rescue Operations', members: 2, signal: 3, frequency: '433.125 MHz' },
  { id: 'c2', label: 'CH 2/5', name: 'Medical Team', members: 4, signal: 4, frequency: '433.250 MHz' },
  { id: 'c3', label: 'CH 3/10', name: 'Public Broadcast', members: 3, signal: 4, frequency: '433.920 MHz' },
  { id: 'c4', label: 'CH 4/5', name: 'Logistics', members: 1, signal: 2, frequency: '434.100 MHz' },
  { id: 'c5', label: 'CH 5/5', name: 'Command Center', members: 2, signal: 3, frequency: '434.500 MHz' },
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
}

export const INITIAL_MESSAGES: MeshMessage[] = [
  {
    id: 'm1', tag: '#FloodAlert', from: 'Rescue_01', time: '10:15 AM', language: 'Telugu',
    translatedTo: 'English', channel: 'CH 3/10', priority: 'High', type: 'received', durationSec: 12,
    originalText: 'నీటి మట్టం పెరుగుతోంది.\nవంతెన దగ్గరికి వెళ్లకండి.\nసురక్షిత ప్రాంతానికి వెళ్లండి.',
    translatedText: 'Water level is rising.\nDo not go near the bridge.\nMove to a safe zone immediately.',
  },
  {
    id: 'm2', tag: '#MedicalHelp', from: 'Unit_77', time: '09:52 AM', language: 'Telugu',
    channel: 'CH 3/10', priority: 'High', type: 'alert', durationSec: 8,
    originalText: 'వైద్య సహాయం అవసరం.', translatedText: 'Medical assistance needed.',
  },
  {
    id: 'm3', tag: '#Evacuation', from: 'Team_Alpha', time: '09:32 AM', language: 'English',
    channel: 'CH 2/5', priority: 'High', type: 'received', durationSec: 10,
    originalText: 'Evacuate now to higher ground. Follow instructions.',
  },
  {
    id: 'm4', tag: '#WeAreSafe', from: 'Field_Comm', time: 'Yesterday', language: 'English',
    channel: 'CH 3/10', priority: 'Normal', type: 'received', durationSec: 5,
    originalText: 'We are safe. All people accounted for.',
  },
  {
    id: 'm5', tag: '#BridgeClosed', from: 'Rescue_01', time: 'Yesterday', language: 'English',
    channel: 'CH 3/10', priority: 'Normal', type: 'sent', durationSec: 6,
    originalText: 'Bridge closed. Take the north route.',
  },
];

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
export const DEMO_INCOMING: MeshMessage = INITIAL_MESSAGES[0];
