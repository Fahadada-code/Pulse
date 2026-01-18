# Pulse - YouTube Music Controller

![Pulse Preview 1](assets/preview1.png)
![Pulse Preview 2](assets/preview2.png)
![Pulse Preview 3](assets/preview3.png)

Pulse is a desktop widget that allows you to control and visualize YouTube Music from your desktop. It works as a persistent overlay that stays on top of other windows so you can easily manage your music while working or gaming.

## How It Works

Pulse uses a simple architecture to bridge your browser and desktop:

* **Desktop Widget (Electron)**: A specialized window that handles the user interface and processes audio data for the visualizer.
* **Browser Layer (Chrome Extension)**: A small extension that monitors your YouTube Music tab and sends data to the desktop app.
* **Communication Bridge (WebSockets)**: A local server that allows the extension and the desktop app to talk to each other instantly.

## Features

* **Desktop Presence**: A window widget designed to stay always on top so it never gets lost behind other apps.
* **Dynamic Visualizer**: Real time audio analysis that creates reactive visual elements and borders based on the music.
* **Media Control Sync**: Full control for play, pause, volume, and seeking, with volume consistency across track changes.
* **Dynamic UI States**: An interface that features both a full panel and a compact mini mode, with colors that change based on album art.
* **Automatic Cleanup**: A shutdown system that automatically pauses your music when you close the widget.

## Installation

### Desktop Application
To set up the desktop application for development, run the following commands in your terminal:

```bash
npm install
npm start
```

To build a standalone executable for the application, use:

```bash
npm run dist
```

The output will be located in the dist folder once the build is finished.

### Browser Extension
Open Chrome and navigate to your extensions page. Turn on Developer Mode and click Load unpacked, then select the extension folder from this project.

## Usage

Launch Pulse and make sure a YouTube Music tab is open in your browser with the extension active. The widget will connect automatically. You might need to click once on the widget to enable the visualizer, as browsers require a user interaction before they allow audio analysis.

## Troubleshooting

If the widget shows a disconnected message, check that your YouTube Music tab is open and the extension is loaded. Most minor bugs can be fixed by simply closing and reopening the application. Have fun!
