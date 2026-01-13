console.log('Pulse: Content Script Loaded');

class PulseConnector {
    constructor() {
        this.lastState = {};
        this.observer = null;
        this.init();
    }

    init() {
        // Observer to watch for DOM changes (track change, play/pause)
        this.observer = new MutationObserver(() => {
            this.checkForUpdates();
        });

        const playerBar = document.querySelector('ytmusic-player-bar');
        if (playerBar) {
            this.observer.observe(playerBar, {
                attributes: true,
                childList: true,
                subtree: true,
                characterData: true
            });
            console.log('Pulse: Observer attached to player bar');
        } else {
            console.log('Pulse: Player bar not found, retrying in 1s');
            setTimeout(() => this.init(), 1000);
            return;
        }

        // Also check periodically for time updates or other non-DOM changes
        setInterval(() => this.checkForUpdates(), 1000);

        // Keep Service Worker Alive
        setInterval(() => {
            // Use void to ignore the promise return and .catch to handle errors
            void chrome.runtime.sendMessage({ type: 'KEEP_ALIVE' }).catch(() => {
                // Ignore errors if extension context invalidated or receiver missing
            });
        }, 10000);
    }

    checkForUpdates() {
        const state = this.getPlayerState();

        // Simple deep equal check to avoid spamming updates (JSON stringify is cheap enough here)
        if (JSON.stringify(state) !== JSON.stringify(this.lastState)) {
            this.lastState = state;
            this.sendUpdate(state);
        }
    }

    getPlayerState() {
        // Helper to try multiple selectors
        const getText = (selectors) => {
            for (const sel of selectors) {
                const el = document.querySelector(sel);
                if (el && el.innerText.trim()) return el.innerText;
            }
            return null;
        };

        const getSrc = (selectors) => {
            for (const sel of selectors) {
                const el = document.querySelector(sel);
                if (el && el.src) return el.src;
            }
            return null;
        };

        const title = getText(['ytmusic-player-bar .title', '.content-info-wrapper .title', 'yt-formatted-string.title']) || 'Unknown Title';

        let artist = getText(['ytmusic-player-bar .byline', '.content-info-wrapper .subtitle', '.content-info-wrapper .byline']);
        if (artist) {
            // Remove "• Album" or "• Views" parts often found in byline
            artist = artist.split('•')[0].trim();
        } else {
            artist = 'Unknown Artist';
        }

        const albumArt = getSrc(['ytmusic-player-bar .image', '.thumbnail-image-wrapper img', '#img']) || '';

        const videoElement = document.querySelector('video');
        const isPlaying = videoElement ? !videoElement.paused : false;

        console.log('Pulse Debug:', { title, artist, albumArt, isPlaying });

        return {
            title,
            artist,
            albumArt,
            isPlaying
        };
    }

    sendUpdate(data) {
        // Send to background script
        try {
            chrome.runtime.sendMessage({ type: 'TRACK_UPDATE', data });
        } catch (e) {
            // Extension might be reloaded
            console.log('Pulse: Failed to send update', e);
        }
    }

    // Control methods to be called via messages
    playPause() {
        const playButton = document.querySelector('#play-pause-button');
        if (playButton) playButton.click();
    }

    next() {
        const nextButton = document.querySelector('.next-button');
        if (nextButton) nextButton.click();
    }

    previous() {
        const prevButton = document.querySelector('.previous-button');
        if (prevButton) prevButton.click();
    }
}

// Initialize
const pulse = new PulseConnector();

// Listen for commands from background script (from Electron)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'COMMAND') {
        switch (request.command) {
            case 'play':
            case 'pause':
                pulse.playPause();
                break;
            case 'next':
                pulse.next();
                break; // corrected 'nect' to 'next'
            case 'prev':
                pulse.previous();
                break;
        }
    }
});
