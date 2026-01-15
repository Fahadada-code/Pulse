# 🎵 Pulse — YouTube Music Desktop Widget

Pulse is a lightweight, always-on-top desktop widget that lets you control **YouTube Music** without switching tabs or disrupting your workflow. It provides live track information, playback controls, and visual feedback in a minimal, unobtrusive UI that stays accessible while you work, game, or multitask.

Pulse bridges the gap between web-based music playback and a native desktop experience using Electron and a browser extension, creating a smooth, system-like mini music controller.

---

## ✨ Features

- Always-on-top desktop widget  
- Live track info (title, artist, album art, playback state)  
- Play / pause / next / previous controls  
- Volume control  
- Automatically opens YouTube Music when controls are used  
- Visual music feedback (sound waves + animated borders while music plays)  
- Remains visible while gaming or multitasking  
- Clean, minimal UI with minimize and close controls  

---

## 🧠 How It Works

Pulse uses a **hybrid architecture**:

- **Electron** renders the native desktop widget  
- A **Chrome Extension** reads playback state directly from YouTube Music  
- **WebSocket communication** syncs playback data and controls in real time  

This approach allows Pulse to feel like a native system widget while still interacting with a browser-based music service.

---

## 🛠 Tech Stack

### Desktop
- **Electron**
- **HTML / CSS / JavaScript**
- **Canvas / Web Audio API** (visualizations)

### Browser Integration
- **Chrome Extension (Manifest V3)**
- **YouTube Music DOM hooks**

### Communication
- **WebSockets** (real-time sync)

### Tooling
- **Node.js**
- **Electron Builder**
- **npm**

---

## 🧩 Development Setup

Pulse is developed and built locally using Electron.

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build the standalone desktop application
npm run dist

# After building, the app will be in the dist/win-unpacked folder
