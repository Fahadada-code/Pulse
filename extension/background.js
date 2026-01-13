let socket = null;
let reconnectInterval = null;

function connect() {
    console.log('Pulse: Connecting to WebSocket...');
    socket = new WebSocket('ws://localhost:8999');

    socket.onopen = () => {
        console.log('Pulse: Connected to Desktop App');
        if (reconnectInterval) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
        }
    };

    socket.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            if (message.type === 'COMMAND') {
                // Forward command to content script
                chrome.tabs.query({ url: 'https://music.youtube.com/*' }, (tabs) => {
                    if (tabs.length > 0) {
                        tabs.forEach((tab) => {
                            chrome.tabs.sendMessage(tab.id, message);
                        });
                    } else if (['play', 'next', 'prev'].includes(message.command)) {
                        // Smart Launch: No tab found, create one
                        console.log('Pulse: No YTM tab found, creating one...');
                        chrome.tabs.create({ url: 'https://music.youtube.com' });
                    }
                });
            }
        } catch (e) {
            console.error('Pulse: Error parsing message', e);
        }
    };

    socket.onclose = () => {
        console.log('Pulse: Disconnected, retrying in 3s...');
        socket = null;
        if (!reconnectInterval) {
            reconnectInterval = setInterval(connect, 3000);
        }
    };

    socket.onerror = (error) => {
        console.error('Pulse: WebSocket error', error);
        socket.close(); // Trigger onclose to retry
    };
}

// Start connection
connect();

// Listen for updates from Content Script and forward to Desktop
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'TRACK_UPDATE') {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'TRACK_UPDATE', data: request.data }));
        }
    }
});
