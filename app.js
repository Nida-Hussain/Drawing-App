const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { alpha: true });
const colorEl = document.getElementById('color');
const sizeEl = document.getElementById('size');
const sizeVal = document.getElementById('sizeVal');
const penBtn = document.getElementById('pen');
const eraserBtn = document.getElementById('eraser');
const undoBtn = document.getElementById('undo');
const clearBtn = document.getElementById('clear');
const saveBtn = document.getElementById('save');

// State
let drawing = false;
let last = { x: 0, y: 0 };
let tool = 'pen';
let brushColor = colorEl.value;
let brushSize = Number(sizeEl.value);

// Undo stack (store data URLs) — small cap to avoid memory bloat
const undoStack = [];
const UNDO_MAX = 20;

function setCanvasSize() {
    // Preserve current image when resizing
    const data = canvas.toDataURL();
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * ratio);
    canvas.height = Math.floor(rect.height * ratio);
    ctx.scale(ratio, ratio);
    // restore
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
    img.src = data;
}

// Initialize canvas size to the CSS size
function initCanvas() {
    // set explicit CSS size to allow responsive height
    const wrap = canvas.parentElement;
    canvas.style.width = '100%';
    canvas.style.height = getComputedStyle(canvas).height || '600px';
    // Ensure proper pixel density
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * ratio);
    canvas.height = Math.floor(rect.height * ratio);
    ctx.scale(ratio, ratio);
    // Styling
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, rect.width, rect.height);

    saveState(); // initial blank state
}

function getPointerPos(evt) {
    const rect = canvas.getBoundingClientRect();
    // support pointer events
    return {
        x: (evt.clientX - rect.left),
        y: (evt.clientY - rect.top)
    };
}

function startDrawing(evt) {
    evt.preventDefault();
    drawing = true;
    last = getPointerPos(evt);
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    pushIfNeeded();
}

function draw(evt) {
    if (!drawing) return;
    const p = getPointerPos(evt);
    ctx.lineWidth = brushSize;
    if (tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = brushColor;
    }
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last = p;
}

function stopDrawing(evt) {
    if (!drawing) return;
    drawing = false;
    ctx.closePath();
    saveState();
}

// Save the canvas state (data URL)
function saveState() {
    try {
        const data = canvas.toDataURL('image/png');
        undoStack.push(data);
        if (undoStack.length > UNDO_MAX) undoStack.shift();
    } catch (e) {
        console.warn('saveState failed', e);
    }
}

function pushIfNeeded() {
    // Avoid pushing too often — we push when stroke starts
    // Already handled in startDrawing
}

function undo() {
    if (undoStack.length <= 1) return; // keep at least one state
    // remove current state
    undoStack.pop();
    const lastData = undoStack[undoStack.length - 1];
    const img = new Image();
    img.onload = () => {
        // clear and draw
        const rect = canvas.getBoundingClientRect();
        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
    };
    img.src = lastData;
}

function clearCanvas() {
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    saveState();
}

function saveImage() {
    const link = document.createElement('a');
    link.download = 'drawing.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
}

// UI wiring
colorEl.addEventListener('input', e => { brushColor = e.target.value; });
sizeEl.addEventListener('input', e => { brushSize = Number(e.target.value); sizeVal.textContent = e.target.value; });
penBtn.addEventListener('click', () => { tool = 'pen'; penBtn.classList.add('primary'); eraserBtn.classList.remove('primary'); });
eraserBtn.addEventListener('click', () => { tool = 'eraser'; eraserBtn.classList.add('primary'); penBtn.classList.remove('primary'); });
undoBtn.addEventListener('click', undo);
clearBtn.addEventListener('click', () => { if (confirm('Clear the canvas?')) clearCanvas(); });
saveBtn.addEventListener('click', saveImage);

// Pointer events for mouse + touch
canvas.addEventListener('pointerdown', startDrawing);
canvas.addEventListener('pointermove', draw);
window.addEventListener('pointerup', stopDrawing);
window.addEventListener('pointercancel', stopDrawing);

// Keyboard shortcuts: z = undo, c = clear, e = eraser, p = pen, s = save
window.addEventListener('keydown', (e) => {
    if (e.key === 'z') { undo(); }
    if (e.key === 'c') { clearCanvas(); }
    if (e.key === 'e') { tool = 'eraser'; eraserBtn.classList.add('primary'); penBtn.classList.remove('primary'); }
    if (e.key === 'p') { tool = 'pen'; penBtn.classList.add('primary'); eraserBtn.classList.remove('primary'); }
    if (e.key === 's') { e.preventDefault(); saveImage(); }
});

// Handle window resize — preserve drawing
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { setCanvasSize(); }, 150);
});

// Init
// Place initial default active button
penBtn.classList.add('primary');
// Wait a tick for layout to settle then initialize canvas
requestAnimationFrame(initCanvas);