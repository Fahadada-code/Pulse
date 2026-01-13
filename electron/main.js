const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const WebSocket = require('ws');
require('dotenv').config();

const PORT = process.env.WS_PORT || 8999;

let wss;
let mainWindow;

function startServer() {
    wss = new WebSocket.Server({ port: PORT });

    wss.on('connection', (ws) => {
        console.log('Client connected');

        ws.on('message', (message) => {
            try {
                const parsed = JSON.parse(message);
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
    });

    console.log('WebSocket server started on port 8999');
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
        alwaysOnTop: true,
        resizable: false,
        skipTaskbar: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

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
