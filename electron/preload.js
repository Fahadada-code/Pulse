const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    onTrackUpdate: (callback) => ipcRenderer.on('track-update', (event, data) => callback(data)),
    onConnectionStatus: (callback) => ipcRenderer.on('connection-status', (event, isConnected) => callback(isConnected)),
    onLaunchingPlugin: (callback) => ipcRenderer.on('launching-plugin', () => callback()),
    sendMediaCommand: (command) => ipcRenderer.send('media-command', command),
    minimizeWindow: () => ipcRenderer.send('minimize-window'),
    resizeWindow: (width, height) => ipcRenderer.send('resize-window', { width, height }),
    moveWindow: (x, y) => ipcRenderer.send('move-window', { x, y }),

    // Audio Capture
    getDesktopStreamId: () => ipcRenderer.invoke('get-desktop-stream-id'),
});
