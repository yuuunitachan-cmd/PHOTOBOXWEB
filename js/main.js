// =============================================
//  ANIBOX - main.js
//  Shared utilities: theme, nav, particles, toast
// =============================================

// --- THEME MANAGEMENT ---

const THEME_KEY = 'anibox-theme';

const THEME_NAMES = {
  kawaii: 'Kawaii Pastel 🌸',
  dark:   'Dark Aesthetic 🌙',
  shonen: 'Shonen Action 🔥',
  ghibli: 'Studio Ghibli 🌿',
};

function getCurrentTheme() {
  return localStorage.getItem(THEME_KEY) || 'kawaii';
}

function applyThemeClass(theme) {
  document.body.classList.remove('theme-kawaii','theme-dark','theme-shonen','theme-ghibli');
  document.body.classList.add('theme-' + theme);
}

function selectTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
  applyThemeClass(theme);
  // Animate → redirect to editor
  setTimeout(() => { window.location.href = 'editor.html'; }, 400);
}

// --- NAV BADGE ---

function updateNavBadge() {
  const badge = document.getElementById('navThemeBadge');
  if (!badge) return;
  const t = getCurrentTheme();
  badge.textContent = THEME_NAMES[t] || t;
}

// --- PARTICLES ---

const THEME_PARTICLES = {
  kawaii: ['✨','🌸','💖','⭐','🎀','🌺','💕','🌟'],
  dark:   ['✨','🌙','💜','⚡','🔮','⭐','💫','🌟'],
  shonen: ['🔥','💥','⚡','💪','🏆','✨','💫','⭐'],
  ghibli: ['🌿','🍃','☁️','🌻','🦋','✨','🌱','🍀'],
};

function initParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  const theme = getCurrentTheme();
  const emojis = THEME_PARTICLES[theme] || THEME_PARTICLES.kawaii;
  container.innerHTML = '';
  for (let i = 0; i < 25; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    p.style.left = Math.random() * 100 + 'vw';
    p.style.animationDelay = (Math.random() * 6) + 's';
    p.style.animationDuration = (4 + Math.random() * 5) + 's';
    p.style.fontSize = (12 + Math.random() * 18) + 'px';
    container.appendChild(p);
  }
}

// --- TOAST ---

function showToast(msg, duration = 2500) {
  let toast = document.getElementById('globalToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'globalToast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), duration);
}

// --- INIT ON LOAD ---

document.addEventListener('DOMContentLoaded', () => {
  const theme = getCurrentTheme();
  applyThemeClass(theme);
  updateNavBadge();
  initParticles();

  // Highlight active nav link
  const path = window.location.pathname;
  document.querySelectorAll('.nav-link').forEach(link => {
    if (path.includes(link.dataset.page)) link.classList.add('active');
  });
});