# iTantra — Professional UI Build Notes

This document explains **what was built, what was used, and how it all fits together**
after the complete UI rebuild (dark tactical theme, per the reference wireframes).

---

## 1. What happened (summary)

The old 3-tab prototype (Talk / Network / Debug, light amber theme) was **fully replaced**
with a production-grade, dark-themed UI matching the iTantra broadcast + receiver
wireframes: **24 screens**, a shared component library, a global state layer, and
mock data that simulates the mesh + AI pipeline.

**Removed:** `src/screens/TalkScreen.tsx`, `NetworkScreen.tsx`, `DebugScreen.tsx`,
`src/components/RadarView.tsx`, `WalkieLcdDisplay.tsx` (old theme, unused).

**Kept for later integration:** `src/services/` (SpeechService, WebSocketService) and
`src/protocol.ts` — untouched reference code for the real STT/TTS/mesh work.
Only fix applied there: a web `Audio` constructor clash in SpeechService (line 465).

---

## 2. Tech stack used

| Piece | Choice | Why |
|---|---|---|
| Framework | **Expo SDK 51 / React Native 0.74 / TypeScript** | Already in the project |
| Navigation | **@react-navigation/native-stack v7** (newly installed) + **bottom-tabs** | Stack for flows, tabs for the 4 main sections |
| State | **React Context** (`src/context/AppContext.tsx`) | Single source of truth, zero extra deps |
| Animations | **React Native `Animated` API** (core) | Pulsing radar rings, waveform bars, progress — no native deps, works on web + Android + iOS |
| Icons | **@expo/vector-icons** (Ionicons + MaterialCommunityIcons) | Already installed |
| Storage | **AsyncStorage** | Remembers "onboarding seen" flag |
| Styling | `StyleSheet` + central design tokens (`src/theme.ts`) | Consistent, no runtime CSS lib |

No other dependencies were added. `@react-navigation/native-stack` is the only new package.

---

## 3. Design system (`src/theme.ts`)

| Token | Value | Used for |
|---|---|---|
| `background` | `#0A0E13` | App background |
| `card` / `cardInner` | `#151C26` / `#1C2532` | Cards, inputs |
| `primary` | `#A8E10C` (signal lime) | Brand, active states, message cards, buttons |
| `accent` | `#FF9F0A` (broadcast orange) | Live states: receiving, playing, broadcasting |
| `sos` | `#FF453A` | Emergency / HIGH priority |
| `info` / `link` | `#64D2FF` / `#5E8CE6` | Devices, translation cards |
| `border` | `#232C38` | Card outlines |

Shared components in `src/components/`: `Screen`, `Header`, `PrimaryButton`
(lime/orange/danger/outline/ghost), `Toggle` + `SettingRow` + `SectionLabel`,
`SignalBars`, `PulsingRings` (radar animation), `Waveform` (animated audio bars),
`MessageCard` (signature lime broadcast card), `AlertIcon`, `SelectRow`
(tap-to-cycle dropdown), `Slider` (dependency-free volume slider).

---

## 4. Screens & navigation map

```
Splash → Onboarding (3 slides, once) → ModeSelect (Public/Private) → Main tabs
Main tabs:  Home | History | Channels | Settings
```

**Broadcast flow:** Home (hold mic) → Broadcasting → BroadcastSuccess
Home → AutoAlerts → AlertDetail → Broadcasting;  AutoAlerts → CustomMessage → Broadcasting
Settings → ManageAlerts → AddCustomAlert

**Receiver flow:** (tap the access-point icon on Home to simulate) IncomingAlert
→ MessageReceived → NowPlaying / Translation → Acknowledge → QuickResponse → ReplySent

**Utility:** Devices (discovery radar), ChannelMonitor (channel radar + users),
Emergency (hold-to-send SOS, 1.5 s hold), Help, About, Language (10 languages).

### Files
```
src/
  navigation/types.ts, RootNavigator.tsx
  context/AppContext.tsx          ← global state + AI stubs
  data/mockData.ts                ← alerts, devices, channels, messages, languages
  screens/onboarding/   Splash, Onboarding, ModeSelect
  screens/main/         Home, History, Channels, Settings
  screens/broadcast/    AutoAlerts, AlertDetail, CustomMessage, Broadcasting,
                        BroadcastSuccess, ManageAlerts, AddCustomAlert
  screens/receiver/     IncomingAlert, MessageReceived, Translation,
                        NowPlaying, QuickResponse, ReplySent
  screens/utility/      Devices, ChannelMonitor, Emergency, Help, About, Language
```

---

## 5. Where the AI / mesh integration goes

Everything the UI needs is already stubbed in **`src/context/AppContext.tsx`**:

- **`transcribeAudio()`** — called when the user releases the PTT button.
  Replace the mock with Silero VAD → Conformer/Whisper STT and return the text.
  The rest (broadcast → success → history) already works.
- **`synthesizeSpeech(text, lang)`** — called from MessageReceived, NowPlaying,
  Translation, AutoAlerts. Replace with MMS-TTS/Piper playback.
- **`simulateIncoming()`** — replace with your mesh packet listener (Wi-Fi Direct/BLE
  gossip). Push a `MeshMessage` and the whole receiver flow lights up.
- Mock data in `src/data/mockData.ts` mirrors what decoded mesh packets will look like
  (`MeshMessage`: tag, from, language, priority, channel, originalText, translatedText...).

---

## 6. How to run

```bash
cd iTantra
npm install          # if needed
npx expo start       # then press 'a' for Android or 'w' for web
```

Typecheck: `npx tsc --noEmit` (passes clean).

**Demo path:** Splash → Get Started → Public → hold the mic (sends a voice message)
→ Broadcasting → Success. Tap the radio icon (top-right of Home) to simulate an
incoming Telugu flood alert → play it, translate it, acknowledge, quick-reply.
