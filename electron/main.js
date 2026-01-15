const { app, BrowserWindow, ipcMain, shell, desktopCapturer, screen } = require('electron');
const path = require('path');
const WebSocket = require('ws');
require('dotenv').config();

const PORT = process.env.WS_PORT || 8999;
let wss;
let mainWindow;

// --- SINGLE INSTANCE LOCK ---
// We only want one widget running at a time.
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        // If someone tries to run a second instance, focus the existing one instead.
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    // --- ERROR HANDLING ---
    // Prevent the app from crashing silently on unhandled errors.
    process.on('uncaughtException', (error) => {
        console.error('CRITICAL ERROR:', error);
    });
}

// --- WEBSOCKET SERVER ---
// This acts as the bridge between the Chrome Extension and our Desktop App.
function startServer() {
    wss = new WebSocket.Server({ port: PORT });

    wss.on('error', (err) => {
        console.error('WebSocket Server Error:', err);
    });

    wss.on('connection', (ws) => {
        // console.log('Client connected'); 

        // Let the renderer know we're connected to the music source
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
            // console.log('Client disconnected');
            // If all clients differ, tell the UI we lost connection
            if (mainWindow && wss.clients.size === 0) {
                mainWindow.webContents.send('connection-status', false);
            }
        });
    });

    console.log(`Bridge Server running on port ${PORT}`);
}

// --- MAIN WINDOW CREATION ---
function createWindow() {
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
    const widgetWidth = 400;
    const widgetHeight = 120;

    mainWindow = new BrowserWindow({
        width: widgetWidth,
        height: widgetHeight,
        x: screenWidth - widgetWidth - 20, // Bottom right corner
        y: screenHeight - widgetHeight - 20,
        frame: false, // No title bar
        transparent: true,
        alwaysOnTop: true,
        resizable: false,
        skipTaskbar: true, // Hide from taskbar and Alt-Tab
        type: 'toolbar',  // Helps hide from Alt-Tab on Windows
        focusable: true,  // Keep it interactive
        show: false,      // Don't show immediately to prevent focus theft
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            autoplayPolicy: 'no-user-gesture-required' // Allow audio to start automatically
        },
        icon: path.join(__dirname, '../assets/icon.png')
    });

    // High level always-on-top to stay above other windows
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    // Show without stealing focus from the user's active app
    mainWindow.showInactive();

    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    // --- IPC EVENTS ---

    // Broadcast commands (play, pause, next) to the Chrome Extension
    ipcMain.on('media-command', (event, command) => {
        if (wss) {
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'COMMAND', command }));
                }
            });
        }
    });

    // Window Management
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

    // Audio Capture for Visualizer
    // We need the ID of the screen/desktop to capture system audio.
    ipcMain.handle('get-desktop-stream-id', async () => {
        const sources = await desktopCapturer.getSources({ types: ['screen'] });
        return sources[0]?.id;
    });
}

// --- APP LIFECYCLE ---

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
