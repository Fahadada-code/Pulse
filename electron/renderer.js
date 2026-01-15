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
const miniBackground = document.getElementById('mini-background');
const canvas = document.getElementById('visualizer');
const canvasCtx = canvas.getContext('2d');
const miniCanvas = document.getElementById('mini-visualizer');
const miniCanvasCtx = miniCanvas.getContext('2d');

// Resume AudioContext on first click (browser security requirement)
document.addEventListener('click', () => {
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
});

let isNavigating = false;
function handleNav(action) {
    if (isNavigating) return;
    isNavigating = true;
    window.electronAPI.sendMediaCommand(action);
    // Prevent spamming
    setTimeout(() => isNavigating = false, 500);
}

playPauseBtn.addEventListener('click', () => window.electronAPI.sendMediaCommand('play'));
prevBtn.addEventListener('click', () => handleNav('prev'));
nextBtn.addEventListener('click', () => handleNav('next'));

// Mini Mode (Floating Bubble)
minBtn.addEventListener('click', () => {
    extendedUI.style.display = 'none';
    miniModeContainer.style.display = 'block';

    window.electronAPI.resizeWindow(60, 60);
    document.body.style.padding = '0';
    document.body.style.background = 'transparent';
    document.body.style.border = 'none';

    // Let layout settle before resizing canvas
    setTimeout(resizeCanvas, 50);
});

// Extended Mode (Main UI)
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

    setTimeout(resizeCanvas, 50);
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

// Track dominant color for theme
let themeColor = '0, 255, 255';

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

let audioContext;
let analyser;
let dataArray;
let source;
let animationId;
let isVisualizerRunning = false;

// Set up audio capture visualizer
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

        const audioStream = new MediaStream(stream.getAudioTracks());

        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 64;

        source = audioContext.createMediaStreamSource(audioStream);
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);

        // Initialize canvas sizing
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

    } catch (e) {
        console.error('Visualizer Setup Failed:', e);
    }
}

function resizeCanvas() {
    if (canvas) {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    }
    if (miniCanvas) {
        miniCanvas.width = miniCanvas.offsetWidth;
        miniCanvas.height = miniCanvas.offsetHeight;
    }
}

function drawVisualizer() {
    if (!isVisualizerRunning || !analyser) return;

    animationId = requestAnimationFrame(drawVisualizer);

    analyser.getByteFrequencyData(dataArray);

    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    miniCanvasCtx.clearRect(0, 0, miniCanvas.width, miniCanvas.height);

    const isMiniMode = miniModeContainer.style.display !== 'none';

    let sum = 0;
    let peak = 0;
    for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
        if (dataArray[i] > peak) peak = dataArray[i];
    }
    const average = sum / dataArray.length;

    // Reactivity response
    const reactivity = Math.pow(average / 255, 1.5);
    const reactivityPeak = Math.pow(peak / 255, 2);

    const opacity = 0.5 + (reactivity * 0.5);
    const colorString = `rgba(${themeColor}, ${opacity})`;

    if (isMiniMode) {
        // Mini Mode: Pulsing glow only
        const miniBg = document.getElementById('mini-background');
        if (miniBg) {
            const flashIntensity = reactivityPeak * 60;

            miniBg.style.boxShadow = `
                inset 0 0 ${20 + flashIntensity}px ${flashIntensity / 2}px ${colorString},
                0 0 ${10 + (reactivity * 20)}px rgba(${themeColor}, 0.6)
            `;
            miniBg.style.borderColor = `rgba(255, 255, 255, ${0.4 + reactivityPeak})`;
            miniBg.style.backgroundColor = `rgba(${themeColor}, ${reactivity * 0.3})`;
        }

        // Clear Main Window
        document.body.style.boxShadow = 'none';
        document.body.style.borderColor = 'transparent';

    } else {
        // Full Mode: Waves and border glow
        const blurRadius = 20 + (reactivity * 60);
        const spreadRadius = reactivity * 10;
        const brightColorString = `rgba(${themeColor}, ${Math.min(1, opacity + 0.3)})`;

        document.body.style.boxShadow = `
            inset 0 0 ${blurRadius}px ${spreadRadius}px ${colorString},
            inset 0 0 10px ${brightColorString}
        `;
        document.body.style.borderColor = `rgba(255, 255, 255, ${0.4 + reactivity})`;

        const miniBg = document.getElementById('mini-background');
        if (miniBg) miniBg.style.boxShadow = 'none';

        // Render audio waves
        const barWidth = (canvas.width / dataArray.length) * 2.5;
        let barHeight;
        let x = 0;

        const gradient = canvasCtx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, `rgba(${themeColor}, 1.0)`);
        gradient.addColorStop(0.5, `rgba(${themeColor}, 0.8)`);
        gradient.addColorStop(1, `rgba(255, 255, 255, 0.9)`);

        canvasCtx.fillStyle = gradient;
        canvasCtx.shadowBlur = 15;
        canvasCtx.shadowColor = `rgba(${themeColor}, 0.8)`;

        for (let i = 0; i < dataArray.length; i++) {
            barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
            canvasCtx.beginPath();
            canvasCtx.roundRect(x, canvas.height - barHeight, barWidth, barHeight, [10, 10, 0, 0]);
            canvasCtx.fill();
            x += barWidth + 2;
        }
        canvasCtx.shadowBlur = 0;
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
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    // Reset borders
    document.body.style.boxShadow = 'none';
    const miniBg = document.getElementById('mini-background');
    if (miniBg) {
        miniBg.style.boxShadow = 'none';
        miniBg.style.borderColor = 'rgba(255, 255, 255, 0.2)';
    }
}

const volumeSlider = document.getElementById('volume-slider');
const muteBtn = document.getElementById('mute-btn');
const seekBackBtn = document.getElementById('seek-back-btn');
const seekFwdBtn = document.getElementById('seek-fwd-btn');
const closeBtnExt = document.getElementById('close-btn-ext');

let isDraggingVolume = false;

// App exit
closeBtnExt.addEventListener('click', () => window.electronAPI.quitApp());

// Volume control
volumeSlider.addEventListener('input', (e) => {
    isDraggingVolume = true;
    const val = e.target.value;
    window.electronAPI.sendMediaCommand({ action: 'setVolume', value: val });
    updateMuteIcon(val, false);
});

volumeSlider.addEventListener('change', () => {
    isDraggingVolume = false;
});

muteBtn.addEventListener('click', () => {
    window.electronAPI.sendMediaCommand({ action: 'toggleMute' });
});

function updateMuteIcon(vol, isMuted) {
    if (isMuted || vol == 0) {
        muteBtn.innerText = '🔇';
        volumeSlider.style.opacity = '0.5';
    } else {
        muteBtn.innerText = '🔊';
        volumeSlider.style.opacity = '1';
        if (vol < 50) muteBtn.innerText = '🔉';

    }
}

// Seeking
seekBackBtn.addEventListener('click', () => window.electronAPI.sendMediaCommand({ action: 'seek', value: -10 }));
seekFwdBtn.addEventListener('click', () => window.electronAPI.sendMediaCommand({ action: 'seek', value: 10 }));

// Sync UI with track updates
let currentTrackTitle = '';

window.electronAPI.onTrackUpdate((data) => {
    const isNewTrack = data.title && data.title !== currentTrackTitle && data.title !== 'Not Playing' && data.title !== 'Disconnected';

    // Always update the internal state
    currentTrackTitle = data.title || 'Not Playing';

    titleEl.innerText = currentTrackTitle;
    artistEl.innerText = data.artist || 'Waiting for music...';

    // Track visualizer state
    if (data.isPlaying) {
        playPauseBtn.innerText = '⏸';
        startVisualizer();
    } else {
        playPauseBtn.innerText = '▶';
        stopVisualizer();
    }

    // Sync volume if not dragging
    if (data.volume === undefined && data.isPlaying) {
        titleEl.innerText = "⚠️ Extension Outdated";
        artistEl.innerText = "Please reload Pulse in chrome://extensions";
        volumeSlider.style.opacity = '0.2';
        volumeSlider.disabled = true;
    } else if (!isDraggingVolume) {
        volumeSlider.disabled = false;
        if (data.volume !== undefined) {
            if (isNewTrack) {
                // If song changed, force our current widget volume level onto the new song
                window.electronAPI.sendMediaCommand({ action: 'setVolume', value: volumeSlider.value });
            } else {
                // During the same song, stay synced with the browser's volume
                volumeSlider.value = data.volume;
                updateMuteIcon(data.volume, data.isMuted);
            }
        }
    }

    if (data.albumArt) {
        artEl.src = data.albumArt;
        artEl.style.display = 'block';
        placeholderEl.style.display = 'none';

        // Update theme based on art
        if (artEl.complete) {
            themeColor = getDominantColor(artEl);
        } else {
            artEl.onload = () => {
                themeColor = getDominantColor(artEl);
            };
        }
        miniBackground.style.backgroundImage = `url(${data.albumArt})`;
    } else {
        artEl.style.display = 'none';
        placeholderEl.style.display = 'block';
        themeColor = '0, 255, 255';
        miniBackground.style.backgroundImage = 'none';
    }

    // Color close button to match art
    const btnColor = `rgba(${themeColor}, 0.6)`;
    const btnHoverColor = `rgba(${themeColor}, 0.9)`;

    if (closeBtnExt) {
        closeBtnExt.style.backgroundColor = btnColor;
        closeBtnExt.onmouseover = () => closeBtnExt.style.backgroundColor = btnHoverColor;
        closeBtnExt.onmouseout = () => closeBtnExt.style.backgroundColor = btnColor;
    }
});

window.electronAPI.onLaunchingPlugin(() => {
    setLaunchingState();
});

window.electronAPI.onConnectionStatus((isConnected) => {
    if (!isConnected) {
        titleEl.innerText = 'Disconnected';
        artistEl.innerText = 'Please Reload Extension';
        playPauseBtn.innerText = '❌';
        artEl.style.display = 'none';
        placeholderEl.style.display = 'block';
    } else {
        if (titleEl.innerText === 'Disconnected') {
            setIdleState();
        }
    }
});
