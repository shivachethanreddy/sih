# iTANTRA — UI ↔ Backend Mapping

> Phase 1: Audit & Planning
> Generated: 2026-02-28
> Status: DRAFT — Kotlin module not yet present. Fill `Kotlin Method` and `Native Event` columns when backend lands.

## Legend

| Column | Meaning |
|---|---|
| **Screen** | React screen name |
| **User Action** | What the user does |
| **RN Method** | JS/TS method called from UI (via `ITantraService`) |
| **Kotlin Method** | Native module method (TBD) |
| **Native Event** | Emitted from Kotlin → RN (TBD) |
| **UI State** | Visual state driven by backend |
| **Error State** | Failure visual |

---

## 1. SPLASH / INITIALIZATION

| Screen | User Action | RN Method | Kotlin Method | Native Event | UI State | Error State |
|---|---|---|---|---|---|---|
| Splash | Auto-init on mount | `ITantraService.initialize()` | `ITantraEngine.init()` | `backendReady` / `backendError` | INITIALIZING → READY | INITIALIZATION_FAILED |
| Splash | Retry | `ITantraService.initialize()` | `ITantraEngine.init()` | `backendReady` | RETRYING | — |
| Splash | Diagnostics | Navigate | — | — | DIAGNOSTICS_OPEN | — |

## 2. ONBOARDING

| Screen | User Action | RN Method | Kotlin Method | Native Event | UI State | Error State |
|---|---|---|---|---|---|---|
| Onboarding | Next / Skip | — | — | — | onboarding step | — |
| Mode Select | Choose mode | `ITantraService.setMode(mode)` | `ITantraEngine.setMode()` | `modeChanged` | BROADCAST / RECEIVER / UNIFIED | — |

## 3. HOME / COMMUNICATION

| Screen | User Action | RN Method | Kotlin Method | Native Event | UI State | Error State |
|---|---|---|---|---|---|---|
| Home | On mount | `ITantraService.connect()` | `ITantraEngine.startDiscovery()` | `networkChanged`, `deviceDiscovered`, `deviceLost` | DISCOVERING | DISCOVER_FAILED |
| Home | Auto-refresh | (subscribe) | — | `networkChanged` | CONNECTED / OFFLINE | — |

**Hold-to-Speak Pipeline:**

| Step | User Action | RN Method | Kotlin Method | Native Event | UI State | Error |
|---|---|---|---|---|---|---|
| 1 | Press & hold | `ITantraService.startRecording()` | `AudioRecorder.start()` | `recordingStarted` | RECORDING | AUDIO_ERROR |
| 2 | Hold | — | — | `recordingAmplitude` | recording waveform | — |
| 3 | Release | `ITantraService.stopRecording()` | `AudioRecorder.stop()` | `recordingStopped` | PROCESSING | — |
| 4 | STT | — | `STTInterface.transcribe()` | `transcriptionStarted` → `transcriptionCompleted` | TRANSCRIBING | STT_ERROR |
| 5 | Packet | — | `PacketBuilder.create()` | `packetCreated` | PACKETIZING | PACKET_ERROR |
| 6 | Send | `ITantraService.sendMessage(packet)` | `MeshSender.send()` | `messageSending` | TRANSMITTING | SEND_ERROR |
| 7 | ACK | — | `Acker.ackReceived()` | `ackReceived` | ACK_RECEIVED | — |
| 8 | Delivered | — | `DeliveryTracker.delivered()` | `messageDelivered` | DELIVERED | DELIVERY_FAILED |
| 9 | Retry | — | `RetryScheduler.retry()` | `retryStarted` | RETRYING | — |

## 4. NEARBY DEVICES

| Screen | User Action | RN Method | Kotlin Method | Native Event | UI State | Error |
|---|---|---|---|---|---|---|
| Home – Devices | Auto | — | — | `deviceDiscovered`, `deviceLost`, `connectionChanged` | list of DeviceCard | NO_DEVICES |
| Device Card | Tap connect | `ITantraService.connectDevice(id)` | `MeshConnector.connect()` | `connectionChanged` | CONNECTING | CONNECT_FAILED |
| Device Card | Tap disconnect | `ITantraService.disconnectDevice(id)` | `MeshConnector.disconnect()` | `connectionChanged` | DISCONNECTING | — |

## 5. RECEIVER

| Screen | User Action | RN Method | Kotlin Method | Native Event | UI State | Error |
|---|---|---|---|---|---|---|
| Receiver | Packet arrives | — | `PacketReceiver.onPacket()` | `messageReceived` | INCOMING | — |
| Receiver | Play TTS | `ITantraService.playTTS(text, lang)` | `TTSInterface.play()` | `ttsStarted` → `ttsCompleted` | PLAYING | TTS_ERROR |
| Receiver | Translate | `ITantraService.translate(text, src, tgt)` | `Translator.translate()` | `translationStarted` → `translationCompleted` | TRANSLATING | TRANSLATE_ERROR |
| Receiver | Hold to reply | `ITantraService.startRecording()` | `AudioRecorder.start()` | `recordingStarted` | RECORDING | AUDIO_ERROR |
| Receiver | Release reply | `ITantraService.stopRecording()` | `AudioRecorder.stop()` | `recordingStopped` | TRANSMITTING | SEND_ERROR |
| Receiver | Dismiss | — | — | — | dismissed | — |

## 6. EMERGENCY / SOS

| Screen | User Action | RN Method | Kotlin Method | Native Event | UI State | Error |
|---|---|---|---|---|---|---|
| SOS | Hold 3s | `ITantraService.sendSOS()` | `SOSTrigger.send()` | `messageSending` → `messageDelivered` | SENDING_SOS | SOS_FAILED |
| SOS | During hold | — | — | `recordingAmplitude` | progress ring | — |
| Alert Card | Tap auto alert | `ITantraService.sendAlert(type)` | `AlertSender.send()` | `messageSending` | ALERT_SENDING | ALERT_FAILED |

## 7. CHANNELS

| Screen | User Action | RN Method | Kotlin Method | Native Event | UI State | Error |
|---|---|---|---|---|---|---|
| Channels | Select | `ITantraService.selectChannel(id)` | `ChannelManager.select()` | `channelChanged` | ACTIVE | — |
| Channels | Switch | `ITantraService.switchChannel(id)` | `ChannelManager.switch()` | `channelChanged` | SWITCHING | — |

## 8. HISTORY

| Screen | User Action | RN Method | Kotlin Method | Native Event | UI State | Error |
|---|---|---|---|---|---|---|
| History | On mount | `ITantraService.getHistory(query)` | `Database.query()` | `historyLoaded` | list | EMPTY |
| History | Search | `ITantraService.getHistory(search)` | `Database.query()` | `historyLoaded` | filtered | NOT_FOUND |
| Message Detail | Tap | — | — | — | detail view | — |

## 9. TRANSLATION

| Screen | User Action | RN Method | Kotlin Method | Native Event | UI State | Error |
|---|---|---|---|---|---|---|
| Translation | Tap translate | `ITantraService.translate(text, src, tgt)` | `Translator.translate()` | `translationCompleted` | TRANSLATED | TRANSLATE_ERROR |

## 10. TTS

| Screen | User Action | RN Method | Kotlin Method | Native Event | UI State | Error |
|---|---|---|---|---|---|---|
| Any | Tap play | `ITantraService.playTTS(text, lang)` | `TTSInterface.play()` | `ttsStarted` → `ttsCompleted` | PLAYING | TTS_ERROR |

## 11. NETWORK / DIAGNOSTICS

| Screen | User Action | RN Method | Kotlin Method | Native Event | UI State | Error |
|---|---|---|---|---|---|---|
| Network | On mount | `ITantraService.getNetworkStatus()` | `NetStatus.get()` | `networkChanged` | status panel | — |
| Diagnostics | On mount | `ITantraService.getDiagnostics()` | `Diagnostics.collect()` | `diagnosticsUpdated` | metrics | — |

## 12. SETTINGS

| Screen | User Action | RN Method | Kotlin Method | Native Event | UI State | Error |
|---|---|---|---|---|---|---|
| Settings | Save lang | `ITantraService.setLanguage(lang)` | `Config.set()` | `settingChanged` | saved | — |
| Settings | Save channel | `ITantraService.setDefaultChannel(id)` | `Config.set()` | `settingChanged` | saved | — |

---

## Event Contract (Native → RN)

```
backendReady
backendError
networkChanged
deviceDiscovered
deviceLost
connectionChanged
recordingStarted
recordingStopped
recordingAmplitude
transcriptionStarted
transcriptionCompleted
packetCreated
messageSending
messageReceived
messageDelivered
messageFailed
ackReceived
retryStarted
packetRelayed
packetDropped
translationStarted
translationCompleted
ttsStarted
ttsCompleted
emergencyReceived
sosReceived
channelChanged
settingChanged
diagnosticsUpdated
historyLoaded
```

## Kotlin Method Contract (RN → Native)

```
initialize()
deinit()
connect()
disconnect()
startDiscovery()
stopDiscovery()
connectDevice(id: String)
disconnectDevice(id: String)
startRecording()
stopRecording()
sendMessage(packet: JSON)
sendSOS()
sendAlert(type: String)
selectChannel(id: String)
switchChannel(id: String)
setLanguage(lang: String)
setDefaultChannel(id: String)
playTTS(text: String, lang: String)
translate(text: String, src: String, tgt: String)
getHistory(query: JSON): JSON
getNetworkStatus(): JSON
getDiagnostics(): JSON
setMode(mode: String)
getDiagnostics
```
