const titleEl = document.getElementById('track-title');
const artistEl = document.getElementById('artist-name');
const artEl = document.getElementById('album-art');
const placeholderEl = document.getElementById('album-art-placeholder');
const playPauseBtn = document.getElementById('play-pause-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const minBtn = document.getElementById('min-btn');

// Playback Controls
playPauseBtn.addEventListener('click', () => window.electronAPI.sendMediaCommand('play'));
prevBtn.addEventListener('click', () => window.electronAPI.sendMediaCommand('prev'));
nextBtn.addEventListener('click', () => window.electronAPI.sendMediaCommand('next'));

// Minimize
minBtn.addEventListener('click', () => window.electronAPI.minimizeWindow());

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

// Update UI on Data
window.electronAPI.onTrackUpdate((data) => {
    // If empty data or bad state, maybe fallback? 
    // But usually content script sends valid data.

    titleEl.innerText = data.title || 'Not Playing';
    artistEl.innerText = data.artist || 'Waiting for music...';

    // Update Play/Pause Button
    playPauseBtn.innerText = data.isPlaying ? '⏸' : '▶';

    // Update Album Art
    if (data.albumArt) {
        artEl.src = data.albumArt;
        artEl.style.display = 'block';
        placeholderEl.style.display = 'none';
    } else {
        artEl.style.display = 'none';
        placeholderEl.style.display = 'block';
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

