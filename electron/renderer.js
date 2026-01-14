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

// Resume audio context
document.addEventListener('click', () => {
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
});

// Audio controls
playPauseBtn.addEventListener('click', () => window.electronAPI.sendMediaCommand('play'));
prevBtn.addEventListener('click', () => window.electronAPI.sendMediaCommand('prev'));
nextBtn.addEventListener('click', () => window.electronAPI.sendMediaCommand('next'));

// Collapse
minBtn.addEventListener('click', () => {
    extendedUI.style.display = 'none';
    miniModeContainer.style.display = 'block';

    window.electronAPI.resizeWindow(60, 60);
    document.body.style.padding = '0';
    document.body.style.background = 'transparent';
    document.body.style.border = 'none';
});

// Expand
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

// Theme color
let themeColor = '0, 255, 255'; // Default Cyan

function getDominantColor(img) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1;
    canvas.height = 1;

    // Get average color
    ctx.drawImage(img, 0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return `${r}, ${g}, ${b}`;
}

// Visualizer
const canvas = document.getElementById('visualizer');
const canvasCtx = canvas.getContext('2d');
let audioContext;
let analyser;
let dataArray;
let source;
let animationId;
let isVisualizerRunning = false;

// Setup visualizer
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

        // Audio only
        const audioStream = new MediaStream(stream.getAudioTracks());

        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 64; // Small fft size

        source = audioContext.createMediaStreamSource(audioStream);
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);

        // Resize
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

    } catch (e) {
        console.error('Visualizer Setup Failed:', e);
    }
}

function resizeCanvas() {
    if (canvas) {
        // Match canvas size
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    }
}

function drawVisualizer() {
    if (!isVisualizerRunning || !analyser) return;

    animationId = requestAnimationFrame(drawVisualizer);

    analyser.getByteFrequencyData(dataArray);

    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    // Soft bars
    const barWidth = (canvas.width / dataArray.length) * 2.5;
    let barHeight;
    let x = 0;

    // Calculate volume
    let sum = 0;
    let peak = 0;
    for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
        if (dataArray[i] > peak) peak = dataArray[i];
    }
    const average = sum / dataArray.length;

    // Non-linear response
    const reactivity = Math.pow(average / 255, 1.5);

    // Border intensity
    const blurRadius = 20 + (reactivity * 60); // Pulse range
    const spreadRadius = reactivity * 10; // Inward spread
    const opacity = 0.5 + (reactivity * 0.5); // Opacity range

    const colorString = `rgba(${themeColor}, ${opacity})`;
    const brightColorString = `rgba(${themeColor}, ${Math.min(1, opacity + 0.3)})`;

    // Update container
    if (miniModeContainer.style.display !== 'none') {
        const miniBg = document.getElementById('mini-background');
        if (miniBg) {
            // Inset shadow
            miniBg.style.boxShadow = `
                inset 0 0 ${blurRadius}px ${spreadRadius}px ${colorString},
                inset 0 0 ${blurRadius / 2}px ${colorString}
            `;
            miniBg.style.borderColor = `rgba(255, 255, 255, ${0.3 + reactivity})`;
        }
        // Clear main window
        document.body.style.boxShadow = 'none';
        document.body.style.borderColor = 'transparent';
    } else {
        // Main window shadow
        document.body.style.boxShadow = `
            inset 0 0 ${blurRadius}px ${spreadRadius}px ${colorString},
            inset 0 0 10px ${brightColorString}
        `;
        document.body.style.borderColor = `rgba(255, 255, 255, ${0.4 + reactivity})`;

        // Clear mini mode
        const miniBg = document.getElementById('mini-background');
        if (miniBg) {
            miniBg.style.boxShadow = 'none';
        }
    }

    // Bar gradient
    const gradient = canvasCtx.createLinearGradient(0, canvas.height, 0, 0);
    gradient.addColorStop(0, `rgba(${themeColor}, 1.0)`); // Base
    gradient.addColorStop(0.5, `rgba(${themeColor}, 0.8)`);
    gradient.addColorStop(1, `rgba(255, 255, 255, 0.9)`); // White tips

    canvasCtx.fillStyle = gradient;

    // Bar glow
    canvasCtx.shadowBlur = 15;
    canvasCtx.shadowColor = `rgba(${themeColor}, 0.8)`;

    for (let i = 0; i < dataArray.length; i++) {
        // Boost height
        barHeight = (dataArray[i] / 255) * canvas.height * 0.8;

        // Draw bar
        canvasCtx.beginPath();
        canvasCtx.roundRect(x, canvas.height - barHeight, barWidth, barHeight, [10, 10, 0, 0]);
        canvasCtx.fill();

        x += barWidth + 2;
    }

    // Reset shadow
    canvasCtx.shadowBlur = 0;
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
    // Clear
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    // Reset borders
    document.body.style.boxShadow = 'none';
    const miniBg = document.getElementById('mini-background');
    if (miniBg) {
        miniBg.style.boxShadow = 'none';
        miniBg.style.borderColor = 'rgba(255, 255, 255, 0.2)';
    }
}

// Update UI
window.electronAPI.onTrackUpdate((data) => {
    titleEl.innerText = data.title || 'Not Playing';
    artistEl.innerText = data.artist || 'Waiting for music...';

    // Toggle visualizer
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

        // Mini-mode bg
        miniBackground.style.backgroundImage = `url(${data.albumArt})`;

        // Get color
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

        // Reset theme
        themeColor = '0, 255, 255'; // Default Cyan

        // Reset bg
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
