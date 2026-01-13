const titleEl = document.getElementById('track-title');
const artistEl = document.getElementById('artist-name');
const artEl = document.getElementById('album-art');
const placeholderEl = document.getElementById('album-art-placeholder');
const playPauseBtn = document.getElementById('play-pause-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const minBtn = document.getElementById('min-btn');
const extendedUI = document.getElementById('extended-ui');
const miniModeContainer = document.getElementById('mini-mode-container');
const expandBtn = document.getElementById('expand-btn');

// Playback Controls
playPauseBtn.addEventListener('click', () => window.electronAPI.sendMediaCommand('play'));
prevBtn.addEventListener('click', () => window.electronAPI.sendMediaCommand('prev'));
nextBtn.addEventListener('click', () => window.electronAPI.sendMediaCommand('next'));

// Mode Switching - Collapse
minBtn.addEventListener('click', () => {
    extendedUI.style.display = 'none';
    miniModeContainer.style.display = 'block';

    window.electronAPI.resizeWindow(60, 60);
    document.body.style.padding = '0';
    document.body.style.background = 'transparent';
    document.body.style.border = 'none';
});

// Expand button click
expandBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    expandUI();
});

function expandUI() {
    miniModeContainer.style.display = 'none';
    extendedUI.style.display = 'flex';

    window.electronAPI.resizeWindow(400, 120);
    document.body.style.padding = '15px';
    document.body.style.background = 'rgba(20, 20, 20, 0.95)';
    document.body.style.border = '1px solid rgba(255, 255, 255, 0.1)';
}

function setIdleState() {
    titleEl.innerText = 'Not Playing';
    artistEl.innerText = 'Waiting for music...';
    playPauseBtn.innerText = '▶';
    artEl.style.display = 'none';
    placeholderEl.style.display = 'block';
}

function setLaunchingState() {
    titleEl.innerText = 'Opening...';
    artistEl.innerText = 'Launching YouTube Music';
    playPauseBtn.innerText = '⏳';
}

const miniBackground = document.getElementById('mini-background');

// Update UI on Data
window.electronAPI.onTrackUpdate((data) => {
    titleEl.innerText = data.title || 'Not Playing';
    artistEl.innerText = data.artist || 'Waiting for music...';

    playPauseBtn.innerText = data.isPlaying ? '⏸' : '▶';

    if (data.albumArt) {
        artEl.src = data.albumArt;
        artEl.style.display = 'block';
        placeholderEl.style.display = 'none';

        // Update Mini-Mode Background
        miniBackground.style.backgroundImage = `url(${data.albumArt})`;
    } else {
        artEl.style.display = 'none';
        placeholderEl.style.display = 'block';

        // Reset Mini-Mode Background
        miniBackground.style.backgroundImage = 'none';
    }
});

window.electronAPI.onLaunchingPlugin(() => {
    setLaunchingState();
});

window.electronAPI.onConnectionStatus((isConnected) => {
    if (!isConnected) {
        setIdleState();
    }
});
