const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    onTrackUpdate: (callback) => ipcRenderer.on('track-update', (event, data) => callback(data)),
    sendMediaCommand: (command) => ipcRenderer.send('media-command', command)
});
