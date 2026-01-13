const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    onTrackUpdate: (callback) => ipcRenderer.on('track-update', (event, data) => callback(data)),
    onConnectionStatus: (callback) => ipcRenderer.on('connection-status', (event, isConnected) => callback(isConnected)),
    onLaunchingPlugin: (callback) => ipcRenderer.on('launching-plugin', () => callback()),
    sendMediaCommand: (command) => ipcRenderer.send('media-command', command),
    minimizeWindow: () => ipcRenderer.send('minimize-window')
});
