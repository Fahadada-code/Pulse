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

// Resume AudioContext on any interaction (Fallback)
document.addEventListener('click', () => {
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
});

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

// Theme Color State
let themeColor = '0, 255, 255'; // Default Cyan

function getDominantColor(img) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1;
    canvas.height = 1;

    // Draw image to 1x1 canvas to get average color
    ctx.drawImage(img, 0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return `${r}, ${g}, ${b}`;
}

// Visualizer Logic
const canvas = document.getElementById('visualizer');
const canvasCtx = canvas.getContext('2d');
let audioContext;
let analyser;
let dataArray;
let source;
let animationId;
let isVisualizerRunning = false;

// Setup Audio Visualizer
async function setupVisualizer() {
    try {
        const streamId = await window.electronAPI.getDesktopStreamId();
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                mandatory: {
                    chromeMediaSource: 'desktop',
                    chromeMediaSourceId: streamId
                }
            },
            video: {
                mandatory: {
                    chromeMediaSource: 'desktop',
                    chromeMediaSourceId: streamId
                }
            }
        });

        // We only need audio
        const audioStream = new MediaStream(stream.getAudioTracks());

        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 64; // Small size for bars

        source = audioContext.createMediaStreamSource(audioStream);
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);

        // Resize canvas
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

    } catch (e) {
        console.error('Visualizer Setup Failed:', e);
    }
}

function resizeCanvas() {
    if (canvas) {
        // Use offsetWidth/Height for pixel-perfect standard scaling, 
        // but for high-DPI (Retina) we might want window.devicePixelRatio, 
        // however simple size is fast and sufficient for this "blurry" style.
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    }
}

function drawVisualizer() {
    if (!isVisualizerRunning || !analyser) return;

    animationId = requestAnimationFrame(drawVisualizer);

    analyser.getByteFrequencyData(dataArray);

    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    // Style: Soft, rounded bars
    const barWidth = (canvas.width / dataArray.length) * 2.5;
    let barHeight;
    let x = 0;

    // Calculate Average Volume for Border Pulse
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
    }
    const average = sum / dataArray.length;

    // Map average to glow intensity (0 to 30px)
    const intensity = (average / 255) * 40;
    const borderColor = `rgba(${themeColor}, ${average / 255})`; // Dynamic Opacity

    // Apply to current mode container
    if (miniModeContainer.style.display !== 'none') {
        const miniBg = document.getElementById('mini-background');
        if (miniBg) {
            // INSET Shadow for Mini Mode
            miniBg.style.boxShadow = `inset 0 0 ${intensity}px ${borderColor}`;
            miniBg.style.borderColor = `rgba(255, 255, 255, ${0.4 + (average / 255) * 0.6})`;
        }
    } else {
        // INSET Shadow for Main Window
        document.body.style.boxShadow = `inset 0 0 ${intensity}px ${borderColor}`;
        document.body.style.borderColor = `rgba(255, 255, 255, ${0.3 + (average / 255) * 0.7})`;
    }

    // Dynamic Gradient for Bars
    const gradient = canvasCtx.createLinearGradient(0, canvas.height, 0, 0);
    gradient.addColorStop(0, `rgba(${themeColor}, 0.8)`);
    gradient.addColorStop(1, `rgba(${themeColor}, 0.2)`);
    canvasCtx.fillStyle = gradient;

    for (let i = 0; i < dataArray.length; i++) {
        barHeight = dataArray[i] / 2; // Scale down

        // Draw rounded top bar
        canvasCtx.beginPath();
        // Draw from bottom up
        canvasCtx.roundRect(x, canvas.height - barHeight, barWidth, barHeight, [5, 5, 0, 0]);
        canvasCtx.fill();

        x += barWidth + 2;
    }
}

function startVisualizer() {
    if (!audioContext) {
        setupVisualizer().then(() => {
            isVisualizerRunning = true;
            drawVisualizer();
        });
        return;
    }

    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    isVisualizerRunning = true;
    if (!animationId) drawVisualizer();
}

function stopVisualizer() {
    isVisualizerRunning = false;
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    // Clear canvas
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    // Reset Borders
    document.body.style.boxShadow = 'none';
    const miniBg = document.getElementById('mini-background');
    if (miniBg) {
        miniBg.style.boxShadow = 'none';
        miniBg.style.borderColor = 'rgba(255, 255, 255, 0.2)';
    }
}

// Update UI on Data
window.electronAPI.onTrackUpdate((data) => {
    titleEl.innerText = data.title || 'Not Playing';
    artistEl.innerText = data.artist || 'Waiting for music...';

    // Toggle Visualizer based on play state
    if (data.isPlaying) {
        playPauseBtn.innerText = '⏸';
        startVisualizer();
    } else {
        playPauseBtn.innerText = '▶';
        stopVisualizer();
    }

    if (data.albumArt) {
        artEl.src = data.albumArt;
        artEl.style.display = 'block';
        placeholderEl.style.display = 'none';

        // Update Mini-Mode Background
        miniBackground.style.backgroundImage = `url(${data.albumArt})`;

        // Extract Theme Color
        if (artEl.complete) {
            themeColor = getDominantColor(artEl);
        } else {
            artEl.onload = () => {
                themeColor = getDominantColor(artEl);
            };
        }
    } else {
        artEl.style.display = 'none';
        placeholderEl.style.display = 'block';

        // Reset Theme
        themeColor = '0, 255, 255'; // Default Cyan

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
