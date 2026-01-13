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
        const titleElement = document.querySelector('ytmusic-player-bar .title');
        const artistElement = document.querySelector('ytmusic-player-bar .byline');
        const imageElement = document.querySelector('ytmusic-player-bar .image');
        const videoElement = document.querySelector('video');

        let title = titleElement ? titleElement.innerText : 'Unknown Title';
        let artist = artistElement ? artistElement.innerText.split('•')[0].trim() : 'Unknown Artist';
        let albumArt = imageElement ? imageElement.src : '';
        let isPlaying = videoElement ? !videoElement.paused : false;

        // Clean up high-res art URL if needed (sometimes google returns s60-something)
        // If it looks small, try to replace w-h pattern if exists, or just leave it.
        // Usually YT Music uses typical google user content URLs.

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
