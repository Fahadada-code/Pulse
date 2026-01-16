# Pulse - YouTube Music Controller

![Pulse Preview 1](assets/preview1.png)
![Pulse Preview 2](assets/preview2.png)
![Pulse Preview 3](assets/preview3.png)

Pulse is a lightweight desktop widget designed for real-time control and visualization of YouTube Music playback. It functions as a persistent, frameless overlay that remains accessible over other windows, providing a seamless bridge between the browser-based player and the desktop environment.

## Architecture

Pulse utilizes a three-tier architecture to achieve low-latency communication and system-level desktop integration:

1. **Desktop Widget (Electron)**: A specialized frameless window configured with secondary-instance locking and high-level window positioning. It renders the user interface and processes real-time audio data for the visualizer.
2. **Browser Layer (Chrome Extension)**: A localized extension that interacts directly with the YouTube Music Document Object Model (DOM) to monitor playback state and inject media commands.
3. **Communication Bridge (WebSockets)**: A local WebSocket server facilitates bidirectional data flow between the extension and the desktop app, ensuring instantaneous state synchronization.

## Features

- **Desktop Presence**: A frameless, always-on-top window designed to stay visible during multitasking or gaming.
- **Dynamic Visualizer**: Real-time audio analysis using the Web Audio API to render reactive visual elements and borders based on frequency data.
- **Media Control Sync**: Full bidirectional control for play/pause, volume adjustment, and seeking, with forced volume consistency across track transitions.
- **Dynamic UI States**: Adaptive interface featuring both a full control panel and a compact mini-mode, with theme colors extracted from current album art.
- **Automatic Cleanup**: Integrated shutdown procedures that broadcast pause commands to the browser when the widget is terminated.

## Installation

### Desktop Application
To initialize the development environment or build a standalone executable:

npm install
npm start
npm run dist

Built executables are available in the dist directory upon successful completion of the build script.

### Browser Extension
1. Open Chrome and navigate to chrome://extensions.
2. Enable Developer Mode.
3. Click Load unpacked and select the extension directory from this repository.

## Usage

Launch the Pulse application and ensure the Chrome extension is active with a YouTube Music tab open. The widget will automatically establish a connection to the browser tab. Direct interaction with the widget—such as clicking on it once—may be required to initialize the Web Audio context for the visualizer.

## Troubleshooting

If the connection status is inactive, verify that valid audio is playing and that the browser tab has not been discarded by the system. Most synchronization issues can be resolved by restarting the desktop application.
