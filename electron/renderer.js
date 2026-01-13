const titleEl = document.getElementById('track-title');
const artistEl = document.getElementById('artist-name');
const artEl = document.getElementById('album-art');
const placeholderEl = document.getElementById('album-art-placeholder');
const playPauseBtn = document.getElementById('play-pause-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');

// Handle Playback Controls
playPauseBtn.addEventListener('click', () => {
    window.electronAPI.sendMediaCommand('play'); // 'play' toggles in content script usually, or we can be specific
});

prevBtn.addEventListener('click', () => {
    window.electronAPI.sendMediaCommand('prev');
});

nextBtn.addEventListener('click', () => {
    window.electronAPI.sendMediaCommand('next');
});

// Update UI on Data
window.electronAPI.onTrackUpdate((data) => {
    // Update Text
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

