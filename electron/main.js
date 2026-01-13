const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const WebSocket = require('ws');
require('dotenv').config();

const PORT = process.env.WS_PORT || 8999;

let wss;
let mainWindow;

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        // Someone tried to run a second instance, we should focus our window.
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    // Global Error Handling to prevent crashes
    process.on('uncaughtException', (error) => {
        console.error('CRITICAL ERROR:', error);
        // Keep running if possible
    });

    // Auto-start disabled per user request
    app.setLoginItemSettings({
        openAtLogin: false,
        path: app.getPath('exe'),
    });
}

function startServer() {
    wss = new WebSocket.Server({ port: PORT });

    wss.on('error', (err) => {
        console.error('WebSocket Server Error:', err);
        // Don't crash the app, but maybe retry or log
    });

    wss.on('connection', (ws) => {
        console.log('Client connected');
        // Notify renderer of connection
        if (mainWindow) mainWindow.webContents.send('connection-status', true);

        ws.on('message', (message) => {
            try {
                const parsed = JSON.parse(message);

                if (parsed.type === 'PING') {
                    // console.log('Ping received'); // Optional: debug
                    return;
                }

                if (parsed.type === 'TRACK_UPDATE') {
                    // Forward to renderer
                    if (mainWindow) {
                        mainWindow.webContents.send('track-update', parsed.data);
                    }
                }
            } catch (e) {
                console.error('Failed to parse message:', e);
            }
        });

        ws.on('close', () => {
            console.log('Client disconnected');
            if (mainWindow && wss.clients.size === 0) {
                mainWindow.webContents.send('connection-status', false);
            }
        });
    });

    console.log('WebSocket server started on port ' + PORT);
}

function createWindow() {
    const { width: screenWidth, height: screenHeight } = require('electron').screen.getPrimaryDisplay().workAreaSize;
    const widgetWidth = 400;
    const widgetHeight = 120;

    mainWindow = new BrowserWindow({
        width: widgetWidth,
        height: widgetHeight,
        x: screenWidth - widgetWidth - 20,
        y: screenHeight - widgetHeight - 20,
        frame: false,
        transparent: true,
        transparent: true,
        alwaysOnTop: true,
        resizable: false,
        skipTaskbar: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            autoplayPolicy: 'no-user-gesture-required'
        },
        icon: path.join(__dirname, '../assets/icon.png') // Set app icon
    });

    // CRITICAL: Set level to 'screen-saver' to stay above exclusive-mode games
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    // Handle commands from renderer
    ipcMain.on('media-command', (event, command) => {
        // Broadcast to all connected clients (extensions)
        if (wss) {
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'COMMAND', command }));
                }
            });
        }
    });

    // Handle Mini-Mode
    ipcMain.on('resize-window', (event, { width, height }) => {
        if (mainWindow) {
            mainWindow.setSize(width, height);
        }
    });

    ipcMain.on('move-window', (event, { x, y }) => {
        if (mainWindow) {
            mainWindow.setPosition(x, y);
        }
    });

    ipcMain.on('minimize-window', () => {
        if (mainWindow) mainWindow.minimize();
    });

    // Handle Desktop Audio Stream Request
    ipcMain.handle('get-desktop-stream-id', async () => {
        const sources = await require('electron').desktopCapturer.getSources({ types: ['screen'] });
        console.log('Desktop Sources Found:', sources.length, sources[0]?.id);
        // Return the first screen source (usually the primary display with system audio)
        return sources[0]?.id;
    });
}

app.whenReady().then(() => {
    startServer();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
