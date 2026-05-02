// =============================================
//  ANIBOX - editor.js
//  Photo editor: canvas rendering, stickers,
//  frames, filters, download, gallery save
// =============================================

// --- STATE ---
let state = {
  photoCount: 1,          // how many photos in strip
  photos: [],             // Array<HTMLImageElement|null>
  filter: 'normal',       // current filter name
  frame: 'none',          // current frame name
  bgColor: '#ffffff',     // canvas background color
  selectedSticker: null,  // emoji selected to place
  stickers: [],           // [{emoji, x, y, id}] placed stickers
};

// --- CONSTANTS ---
const PHOTO_W   = 300;
const PHOTO_H   = 260;
const PADDING   = 22;
const GAP       = 14;

const FILTERS = {
  normal:  'none',
  soft:    'brightness(1.1) saturate(0.85)',
  manga:   'grayscale(1) contrast(1.7)',
  pastel:  'saturate(0.7) brightness(1.2) hue-rotate(10deg)',
  neon:    'saturate(2.5) brightness(1.05) contrast(1.1)',
  vintage: 'sepia(0.75) saturate(0.9) brightness(0.92)',
  dreamy:  'brightness(1.15) saturate(1.4) hue-rotate(-20deg)',
  dark:    'brightness(0.72) contrast(1.35) saturate(1.2)',
};

const FILTER_LABELS = {
  normal: '🖼️ Normal', soft: '🌤 Soft', manga: '📚 Manga', pastel: '🎀 Pastel',
  neon: '⚡ Neon', vintage: '🎞️ Vintage', dreamy: '☁️ Dreamy', dark: '🌑 Dark',
};

const FRAMES = {
  none:   { label: '❌ None',    draw: null },
  sakura: { label: '🌸 Sakura',  draw: drawFrameSakura },
  stars:  { label: '⭐ Stars',   draw: drawFrameStars },
  manga:  { label: '💥 Manga',   draw: drawFrameManga },
  nature: { label: '🌿 Nature',  draw: drawFrameNature },
  neon:   { label: '⚡ Neon',    draw: drawFrameNeon },
  hearts: { label: '💖 Hearts',  draw: drawFrameHearts },
};

const STICKER_SETS = {
  '🌸': 'Sakura',  '💖': 'Love',   '✨': 'Sparkle', '🎀': 'Bow',    '⭐': 'Star',
  '🌟': 'Glow',   '💫': 'Dizzy',  '🌙': 'Moon',   '🔥': 'Fire',   '💥': 'Boom',
  '🌈': 'Rainbow','☁️': 'Cloud',  '🦋': 'Butterfly','🍀': 'Clover', '🎵': 'Music',
  '😊': 'Happy',  '😍': 'Love',   '🥺': 'Puppy',  '😎': 'Cool',   '🤩': 'Wow',
  '👑': 'Crown',  '🎉': 'Party',  '💎': 'Gem',    '🌺': 'Flower', '🍡': 'Dango',
};

const BG_COLORS = [
  '#ffffff', '#fff0f9', '#ffecd2', '#e8f4f8', '#f0ffe0',
  '#fffde7', '#e8e4d0', '#0a0a1a', '#1a1a3a', '#1a0a2e',
  '#f5e6fa', '#e0f0ff', '#fff5e6', '#ffe4e4', '#e4ffe4',
];

// --- CANVAS ---

function getCanvas() { return document.getElementById('mainCanvas'); }
function getCtx()    { return getCanvas().getContext('2d'); }

function getCanvasSize() {
  const w = PHOTO_W + PADDING * 2;
  const h = PADDING * 2 + state.photoCount * PHOTO_H + (state.photoCount - 1) * GAP;
  return { w, h };
}

function renderCanvas() {
  const canvas = getCanvas();
  const { w, h } = getCanvasSize();
  canvas.width  = w;
  canvas.height = h;
  const ctx = getCtx();

  // 1) Background
  ctx.fillStyle = state.bgColor;
  ctx.fillRect(0, 0, w, h);

  // Subtle texture dots for aesthetic
  ctx.globalAlpha = 0.04;
  ctx.fillStyle = '#888';
  for (let x = 0; x < w; x += 8) {
    for (let y = 0; y < h; y += 8) {
      ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // 2) Draw each photo slot
  for (let i = 0; i < state.photoCount; i++) {
    const px = PADDING;
    const py = PADDING + i * (PHOTO_H + GAP);
    drawPhotoSlot(ctx, i, px, py);
  }

  // 3) Frame overlay
  if (state.frame !== 'none' && FRAMES[state.frame]?.draw) {
    FRAMES[state.frame].draw(ctx, w, h);
  }
}

function drawPhotoSlot(ctx, idx, x, y) {
  const photo = state.photos[idx];

  if (photo) {
    // Clip to slot rectangle
    ctx.save();
    roundedRect(ctx, x, y, PHOTO_W, PHOTO_H, 10);
    ctx.clip();

    // Apply filter
    ctx.filter = FILTERS[state.filter] || 'none';
    drawImageCover(ctx, photo, x, y, PHOTO_W, PHOTO_H);
    ctx.filter = 'none';
    ctx.restore();

    // Subtle border on photo
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;
    roundedRect(ctx, x, y, PHOTO_W, PHOTO_H, 10);
    ctx.stroke();
  } else {
    // Empty placeholder
    ctx.save();
    roundedRect(ctx, x, y, PHOTO_W, PHOTO_H, 10);
    ctx.fillStyle = 'rgba(180,180,200,0.18)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(160,160,200,0.35)';
    ctx.setLineDash([6, 5]);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Placeholder icon + text
    ctx.font = '48px serif';
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.35;
    ctx.fillText('📷', x + PHOTO_W / 2, y + PHOTO_H / 2 - 10);
    ctx.globalAlpha = 1;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = 'rgba(150,150,180,0.7)';
    ctx.fillText(`Foto ${idx + 1}`, x + PHOTO_W / 2, y + PHOTO_H / 2 + 30);
    ctx.textAlign = 'left';
  }
}

// Draw image with cover/crop behavior
function drawImageCover(ctx, img, x, y, w, h) {
  const imgAspect = img.width / img.height;
  const boxAspect = w / h;
  let sx, sy, sw, sh;
  if (imgAspect > boxAspect) {
    sh = img.height; sw = sh * boxAspect;
    sx = (img.width - sw) / 2; sy = 0;
  } else {
    sw = img.width; sh = sw / boxAspect;
    sx = 0; sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

// Helper: rounded rectangle path
function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// =============================================
//  FRAME DRAWING FUNCTIONS
// =============================================

function drawFrameSakura(ctx, w, h) {
  const flowers = [
    [0,0],[w,0],[0,h],[w,h],
    [w/2,0],[w/2,h],[0,h/2],[w,h/2],
    [w*0.25,0],[w*0.75,0],[w*0.25,h],[w*0.75,h],
  ];
  ctx.font = '22px serif';
  ctx.textAlign = 'center';
  flowers.forEach(([fx, fy]) => {
    ctx.globalAlpha = 0.85;
    ctx.fillText('🌸', fx, fy + 14);
  });
  ctx.globalAlpha = 1;
  // Pink border
  ctx.strokeStyle = 'rgba(255,130,185,0.85)';
  ctx.lineWidth = 6;
  ctx.setLineDash([10, 5]);
  roundedRect(ctx, 6, 6, w - 12, h - 12, 16);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.textAlign = 'left';
}

function drawFrameStars(ctx, w, h) {
  const stars = [
    [10,10],[w-10,10],[10,h-10],[w-10,h-10],
    [w*0.3,5],[w*0.7,5],[w*0.3,h-5],[w*0.7,h-5],
    [5,h*0.3],[5,h*0.7],[w-5,h*0.3],[w-5,h*0.7],
  ];
  ctx.font = '18px serif';
  ctx.textAlign = 'center';
  stars.forEach(([sx, sy]) => {
    ctx.fillText('⭐', sx, sy + 10);
  });
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(255,215,0,0.9)';
  ctx.lineWidth = 5;
  roundedRect(ctx, 6, 6, w - 12, h - 12, 14);
  ctx.stroke();
  ctx.textAlign = 'left';
}

function drawFrameManga(ctx, w, h) {
  // Action speed lines from center
  const cx = w / 2, cy = h / 2;
  const lines = 32;
  ctx.save();
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < lines; i++) {
    const angle = (i / lines) * Math.PI * 2;
    const ex = cx + Math.cos(angle) * Math.max(w, h);
    const ey = cy + Math.sin(angle) * Math.max(w, h);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();
  }
  ctx.restore();
  // Bold black border
  ctx.strokeStyle = 'rgba(0,0,0,0.9)';
  ctx.lineWidth = 10;
  ctx.strokeRect(4, 4, w - 8, h - 8);
  ctx.strokeStyle = 'rgba(255,220,0,0.9)';
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, w - 20, h - 20);
}

function drawFrameNature(ctx, w, h) {
  const corners = [[0,0],[w,0],[0,h],[w,h]];
  ctx.font = '24px serif';
  ctx.textAlign = 'center';
  corners.forEach(([cx, cy]) => {
    const ems = ['🌿','🍀','🌸','🌻'];
    ctx.fillText(ems[corners.indexOf([cx,cy]) % ems.length] || '🌿', cx, cy + 16);
  });
  // Scatter leaves along edges
  for (let x = 30; x < w - 30; x += 40) {
    ctx.fillText('🍃', x, 16);
    ctx.fillText('🍃', x, h - 4);
  }
  ctx.strokeStyle = 'rgba(60,140,80,0.7)';
  ctx.lineWidth = 5;
  ctx.setLineDash([12, 6]);
  roundedRect(ctx, 8, 8, w - 16, h - 16, 18);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.textAlign = 'left';
}

function drawFrameNeon(ctx, w, h) {
  const theme = getCurrentTheme ? getCurrentTheme() : 'kawaii';
  const colors = {
    kawaii: '#ff79b7', dark: '#8b5cf6', shonen: '#ef4444', ghibli: '#4a8c5c',
  };
  const color = colors[theme] || '#7b2fff';

  // Outer glow
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 20;
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  roundedRect(ctx, 6, 6, w - 12, h - 12, 16);
  ctx.stroke();
  ctx.shadowBlur = 0;
  // Inner line
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 2;
  roundedRect(ctx, 12, 12, w - 24, h - 24, 12);
  ctx.stroke();
  ctx.restore();
}

function drawFrameHearts(ctx, w, h) {
  const positions = [];
  for (let x = 15; x < w; x += 30) {
    positions.push([x, 14]);
    positions.push([x, h - 8]);
  }
  for (let y = 40; y < h - 30; y += 30) {
    positions.push([10, y]);
    positions.push([w - 10, y]);
  }
  ctx.font = '16px serif';
  ctx.textAlign = 'center';
  positions.forEach(([px, py]) => ctx.fillText(['💖','💗','💕','💞'][Math.floor((px+py)%4)], px, py));
  ctx.strokeStyle = 'rgba(255,100,150,0.7)';
  ctx.lineWidth = 4;
  roundedRect(ctx, 8, 8, w - 16, h - 16, 16);
  ctx.stroke();
  ctx.textAlign = 'left';
}

// =============================================
//  PHOTO UPLOAD
// =============================================

function handleFileInput(input, slotIndex) {
  const file = input.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('❌ Hanya file gambar yang bisa di-upload ya!'); return;
  }
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      state.photos[slotIndex] = img;
      updateSlotPreview(slotIndex, e.target.result);
      renderCanvas();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function updateSlotPreview(idx, src) {
  const slot = document.querySelector(`.upload-slot[data-idx="${idx}"]`);
  if (!slot) return;
  slot.classList.add('has-photo');
  let img = slot.querySelector('img.slot-preview');
  if (!img) {
    img = document.createElement('img');
    img.className = 'slot-preview';
    slot.prepend(img);
  }
  img.src = src;
}

function removePhoto(idx) {
  state.photos[idx] = null;
  const slot = document.querySelector(`.upload-slot[data-idx="${idx}"]`);
  if (slot) {
    slot.classList.remove('has-photo');
    const img = slot.querySelector('img.slot-preview');
    if (img) img.remove();
    const input = slot.querySelector('input[type=file]');
    if (input) input.value = '';
  }
  renderCanvas();
}

// =============================================
//  STICKER SYSTEM
// =============================================

function selectStickerEmoji(emoji, btn) {
  if (state.selectedSticker === emoji) {
    state.selectedSticker = null;
    document.querySelectorAll('.sticker-btn').forEach(b => b.classList.remove('selected'));
    showToast('🚫 Stiker dibatalkan');
  } else {
    state.selectedSticker = emoji;
    document.querySelectorAll('.sticker-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    showToast(`${emoji} Klik foto untuk menaruh stiker!`);
  }
}

function handleCanvasClick(e) {
  if (!state.selectedSticker) return;
  const canvas = getCanvas();
  const rect   = canvas.getBoundingClientRect();
  // Scale click pos to actual canvas dimensions
  const scaleX = canvas.width  / rect.width;
  const scaleY = canvas.height / rect.height;
  const cx = (e.clientX - rect.left)  * scaleX;
  const cy = (e.clientY - rect.top)   * scaleY;

  const id = Date.now();
  state.stickers.push({ emoji: state.selectedSticker, x: cx, y: cy, id });
  addStickerToOverlay({ emoji: state.selectedSticker, x: cx, y: cy, id }, rect.width, rect.height, canvas.width, canvas.height);
  showToast(state.selectedSticker + ' Stiker ditambahkan!');
}

function addStickerToOverlay(sticker, dispW, dispH, canvW, canvH) {
  const layer = document.getElementById('stickerLayer');
  const el = document.createElement('span');
  el.className = 'placed-sticker';
  el.dataset.id = sticker.id;
  el.textContent = sticker.emoji;
  // position as % of canvas display size
  el.style.left = (sticker.x / canvW * dispW) + 'px';
  el.style.top  = (sticker.y / canvH * dispH) + 'px';

  // Delete button
  const del = document.createElement('button');
  del.className = 'sticker-del';
  del.textContent = '×';
  del.addEventListener('click', e => {
    e.stopPropagation();
    state.stickers = state.stickers.filter(s => s.id !== sticker.id);
    el.remove();
    showToast('🗑️ Stiker dihapus');
  });
  el.appendChild(del);

  // Drag
  makeDraggable(el, sticker, canvW, canvH, dispW, dispH);
  layer.appendChild(el);
}

function makeDraggable(el, sticker, canvW, canvH, dispW, dispH) {
  let dragging = false, ox = 0, oy = 0;
  el.addEventListener('mousedown', e => {
    if (e.target.classList.contains('sticker-del')) return;
    dragging = true;
    const r = el.getBoundingClientRect();
    ox = e.clientX - r.left - r.width / 2;
    oy = e.clientY - r.top  - r.height / 2;
    el.style.zIndex = 10;
    e.stopPropagation();
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const layer = document.getElementById('stickerLayer');
    const lr = layer.getBoundingClientRect();
    const nx = e.clientX - lr.left - ox;
    const ny = e.clientY - lr.top  - oy;
    el.style.left = nx + 'px';
    el.style.top  = ny + 'px';
    // Update state
    const s = state.stickers.find(s => s.id === sticker.id);
    if (s) { s.x = nx / dispW * canvW; s.y = ny / dispH * canvH; }
  });
  document.addEventListener('mouseup', () => { dragging = false; el.style.zIndex = ''; });
}

function clearStickers() {
  state.stickers = [];
  document.getElementById('stickerLayer').innerHTML = '';
  state.selectedSticker = null;
  document.querySelectorAll('.sticker-btn').forEach(b => b.classList.remove('selected'));
  showToast('🧹 Semua stiker dihapus');
}

// =============================================
//  DOWNLOAD & SAVE
// =============================================

async function downloadPhoto() {
  const srcCanvas = getCanvas();
  const w = srcCanvas.width, h = srcCanvas.height;
  const outCanvas = document.createElement('canvas');
  outCanvas.width = w; outCanvas.height = h;
  const ctx = outCanvas.getContext('2d');

  // Draw main canvas
  ctx.drawImage(srcCanvas, 0, 0);

  // Draw stickers
  const layer = document.getElementById('stickerLayer');
  const layerRect = layer.getBoundingClientRect();
  const canvasRect = srcCanvas.getBoundingClientRect();
  const scaleX = w / canvasRect.width;
  const scaleY = h / canvasRect.height;

  ctx.font = `${32 * scaleX}px serif`;
  ctx.textAlign = 'center';
  state.stickers.forEach(s => {
    ctx.fillText(s.emoji, s.x, s.y + 12 * scaleY);
  });

  // Download
  const link = document.createElement('a');
  link.download = `anibox-${Date.now()}.png`;
  link.href = outCanvas.toDataURL('image/png');
  link.click();
  showToast('📥 Foto berhasil didownload!');
}

function saveToGallery() {
  const srcCanvas = getCanvas();
  const w = srcCanvas.width, h = srcCanvas.height;
  const outCanvas = document.createElement('canvas');
  outCanvas.width = w; outCanvas.height = h;
  const ctx = outCanvas.getContext('2d');
  ctx.drawImage(srcCanvas, 0, 0);

  ctx.font = '32px serif'; ctx.textAlign = 'center';
  state.stickers.forEach(s => {
    ctx.fillText(s.emoji, s.x, s.y + 12);
  });

  const dataUrl = outCanvas.toDataURL('image/jpeg', 0.85);
  const gallery = JSON.parse(localStorage.getItem('anibox-gallery') || '[]');
  gallery.unshift({ src: dataUrl, date: new Date().toLocaleDateString('id-ID'), theme: getCurrentTheme() });
  if (gallery.length > 50) gallery.pop();  // max 50 photos
  localStorage.setItem('anibox-gallery', JSON.stringify(gallery));
  showToast('💾 Tersimpan ke Galeri!');
}

// =============================================
//  UI BUILDER - dynamically builds editor panels
// =============================================

function buildFilterPanel() {
  const panel = document.getElementById('filtersPanel');
  if (!panel) return;
  panel.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'filters-grid';
  Object.entries(FILTER_LABELS).forEach(([key, label]) => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn' + (key === state.filter ? ' active' : '');
    btn.innerHTML = `<div class="filter-preview fp-${key}"></div>${label}`;
    btn.onclick = () => {
      state.filter = key;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderCanvas();
    };
    grid.appendChild(btn);
  });
  panel.appendChild(grid);
}

function buildFramePanel() {
  const panel = document.getElementById('framesPanel');
  if (!panel) return;
  panel.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'frames-grid';
  Object.entries(FRAMES).forEach(([key, { label }]) => {
    const btn = document.createElement('button');
    btn.className = 'frame-btn' + (key === state.frame ? ' active' : '');
    const icon = label.split(' ')[0];
    btn.innerHTML = `<div class="frame-preview">${icon}</div>${label.slice(icon.length+1)}`;
    btn.onclick = () => {
      state.frame = key;
      document.querySelectorAll('.frame-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderCanvas();
    };
    grid.appendChild(btn);
  });
  panel.appendChild(grid);
}

function buildStickerPanel() {
  const panel = document.getElementById('stickersPanel');
  if (!panel) return;
  panel.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'stickers-grid';
  Object.keys(STICKER_SETS).forEach(emoji => {
    const btn = document.createElement('button');
    btn.className = 'sticker-btn';
    btn.title = STICKER_SETS[emoji];
    btn.textContent = emoji;
    btn.onclick = () => selectStickerEmoji(emoji, btn);
    grid.appendChild(btn);
  });
  panel.appendChild(grid);
}

function buildBgColorPanel() {
  const panel = document.getElementById('bgColorPanel');
  if (!panel) return;
  panel.innerHTML = '';
  const row = document.createElement('div');
  row.className = 'bg-colors';
  BG_COLORS.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'bg-color-btn' + (c === state.bgColor ? ' active' : '');
    btn.style.background = c;
    btn.style.boxShadow = c === '#ffffff' || c === '#f0ede0' ? 'inset 0 0 0 1px #ccc' : '';
    btn.onclick = () => {
      state.bgColor = c;
      document.querySelectorAll('.bg-color-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderCanvas();
    };
    row.appendChild(btn);
  });
  panel.appendChild(row);
}

function buildUploadSlots() {
  const container = document.getElementById('uploadSlots');
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < state.photoCount; i++) {
    const slot = document.createElement('div');
    slot.className = 'upload-slot' + (state.photos[i] ? ' has-photo' : '');
    slot.dataset.idx = i;

    const label = document.createElement('div');
    label.className = 'upload-slot-label';
    label.innerHTML = `<span>📷</span><span>Foto ${i + 1}</span>`;

    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.addEventListener('change', () => handleFileInput(input, i));

    const del = document.createElement('button');
    del.className = 'remove-photo'; del.textContent = '×';
    del.addEventListener('click', e => { e.stopPropagation(); removePhoto(i); });

    if (state.photos[i]) {
      const img = document.createElement('img');
      img.className = 'slot-preview';
      img.src = state.photos[i].src;
      slot.appendChild(img);
    }

    slot.appendChild(label); slot.appendChild(input); slot.appendChild(del);
    slot.addEventListener('click', () => input.click());
    container.appendChild(slot);
  }
}

// =============================================
//  STRIP PICKER
// =============================================

function setPhotoCount(n) {
  state.photoCount = n;
  // Keep existing photos, trim/expand
  while (state.photos.length < n) state.photos.push(null);
  document.querySelectorAll('.strip-btn').forEach((b, i) => {
    b.classList.toggle('active', (i + 1) === n);
  });
  buildUploadSlots();
  renderCanvas();
}

// =============================================
//  INIT
// =============================================

document.addEventListener('DOMContentLoaded', () => {
  state.photos = [null, null, null, null];

  // Build panels
  buildFilterPanel();
  buildFramePanel();
  buildStickerPanel();
  buildBgColorPanel();
  buildUploadSlots();

  // Canvas click for sticker placement
  const canvas = getCanvas();
  canvas.addEventListener('click', handleCanvasClick);

  // Strip picker buttons
  document.querySelectorAll('.strip-btn').forEach((btn, i) => {
    btn.addEventListener('click', () => setPhotoCount(i + 1));
  });

  // Initial render
  renderCanvas();

  // Drag-and-drop on canvas wrapper
  const wrapper = document.getElementById('canvasWrapper');
  if (wrapper) {
    wrapper.addEventListener('dragover', e => { e.preventDefault(); wrapper.style.outline = '3px dashed var(--primary)'; });
    wrapper.addEventListener('dragleave', () => { wrapper.style.outline = ''; });
    wrapper.addEventListener('drop', e => {
      e.preventDefault(); wrapper.style.outline = '';
      const file = e.dataTransfer.files[0];
      if (!file || !file.type.startsWith('image/')) return;
      // Find first empty slot
      const idx = state.photos.findIndex(p => p === null);
      if (idx === -1) { showToast('❗ Semua slot sudah terisi!'); return; }
      const reader = new FileReader();
      reader.onload = ev => {
        const img = new Image();
        img.onload = () => { state.photos[idx] = img; updateSlotPreview(idx, ev.target.result); renderCanvas(); };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
      showToast(`📸 Foto di-upload ke slot ${idx + 1}!`);
    });
  }
});