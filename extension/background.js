let socket = null;
let reconnectInterval = null;
let keepAliveInterval = null;

function connect() {
    console.log('Pulse: Connecting to WebSocket...');
    socket = new WebSocket('ws://localhost:8999');

    socket.onopen = () => {
        console.log('Pulse: Connected to Desktop App');
        if (reconnectInterval) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
        }

        // Keep-alive (10s)
        if (keepAliveInterval) clearInterval(keepAliveInterval);
        keepAliveInterval = setInterval(() => {
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'PING' }));
            }
        }, 10000);
    };

    socket.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            if (message.type === 'COMMAND') {
                // Forward to content
                chrome.tabs.query({ url: 'https://music.youtube.com/*' }, (tabs) => {
                    if (tabs.length > 0) {
                        tabs.forEach((tab) => {
                            chrome.tabs.sendMessage(tab.id, message).catch(err => {
                                // Tab errors
                                console.log('Pulse: Failed to send to tab', tab.id, err);
                            });
                        });
                    } else if (['play', 'next', 'prev'].includes(message.command)) {
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
        if (keepAliveInterval) {
            clearInterval(keepAliveInterval);
            keepAliveInterval = null;
        }
        if (!reconnectInterval) {
            reconnectInterval = setInterval(connect, 3000);
        }
    };

    socket.onerror = (error) => {
        console.error('Pulse: WebSocket error', error);
        socket.close(); // Retry
    };
}

// Connect
connect();

// Content updates
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'TRACK_UPDATE') {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'TRACK_UPDATE', data: request.data }));
        } else if (!socket || socket.readyState !== WebSocket.OPEN) {
            // Reconnect
            connect();
        }
    } else if (request.type === 'KEEP_ALIVE') {
        // SW keep-alive
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            connect();
        }
    }
});
