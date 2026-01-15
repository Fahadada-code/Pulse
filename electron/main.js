const { app, BrowserWindow, ipcMain, shell, desktopCapturer, screen } = require('electron');
const path = require('path');
const WebSocket = require('ws');
require('dotenv').config();

const PORT = process.env.WS_PORT || 8999;
let wss;
let mainWindow;

// Only allow one instance to run at a time
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        // Focus the existing window if user tries to open Pulse again
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    process.on('uncaughtException', (error) => {
        console.error('Unhandled Exception:', error);
    });
}

// Bridge service for Chrome Extension communication
function startServer() {
    wss = new WebSocket.Server({ port: PORT });

    wss.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log('Port already in use. Likely another instance is running.');
        } else {
            console.error('WebSocket Server Error:', err);
        }
    });

    wss.on('connection', (ws) => {
        // console.log('Client connected'); 

        // Notify UI that we have a connection
        if (mainWindow) mainWindow.webContents.send('connection-status', true);

        ws.on('message', (message) => {
            try {
                const parsed = JSON.parse(message);

                // Ignore heartbeat pings to keep logs clean
                if (parsed.type === 'PING') return;

                if (parsed.type === 'TRACK_UPDATE') {
                    // Pass the song info straight to the UI
                    if (mainWindow) {
                        mainWindow.webContents.send('track-update', parsed.data);
                    }
                }
            } catch (e) {
                console.error('Failed to parse incoming message:', e);
            }
        });

        ws.on('close', () => {
            // Signal disconnection if no clients are left
            if (mainWindow && wss.clients.size === 0) {
                mainWindow.webContents.send('connection-status', false);
            }
        });
    });

    console.log(`Bridge Server running on port ${PORT}`);
}

function createWindow() {
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
    const widgetWidth = 400;
    const widgetHeight = 120;

    mainWindow = new BrowserWindow({
        width: widgetWidth,
        height: widgetHeight,
        x: screenWidth - widgetWidth - 20, // Bottom right corner
        y: screenHeight - widgetHeight - 20,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: false,
        skipTaskbar: true,
        type: 'toolbar',
        focusable: true,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            autoplayPolicy: 'no-user-gesture-required' // Allow audio to start automatically
        },
        icon: path.join(__dirname, '../assets/icon.png')
    });

    // Keep window on top and visible across workspaces
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    // Show without stealing focus from the user's active app
    mainWindow.showInactive();

    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    // Relay media commands to the browser extension
    ipcMain.on('media-command', (event, command) => {
        if (wss) {
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'COMMAND', command }));
                }
            });
        }
    });
    ipcMain.on('resize-window', (event, { width, height }) => {
        if (mainWindow) mainWindow.setSize(width, height);
    });

    ipcMain.on('move-window', (event, { x, y }) => {
        if (mainWindow) mainWindow.setPosition(x, y);
    });

    ipcMain.on('minimize-window', () => {
        if (mainWindow) mainWindow.minimize();
    });

    ipcMain.on('quit-app', () => {
        app.quit();
    });

    // Handle desktop stream capture for the visualizer
    ipcMain.handle('get-desktop-stream-id', async () => {
        const sources = await desktopCapturer.getSources({ types: ['screen'] });
        return sources[0]?.id;
    });
}

// App lifecycle

app.whenReady().then(() => {
    startServer();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
