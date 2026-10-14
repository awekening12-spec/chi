import { getCurrentWindow } from './tauri-api/window.js';
import { listen } from './tauri-api/event.js';

// Pet Window - 자율 이동
const COLS = 8, ROWS = 11, CELL_W = 192, CELL_H = 208;
let frame = 0, currentRow = 0;
let x = Math.random() * (screen.width - 200);
let y = Math.random() * (screen.height - 300);
let vx = (Math.random() - 0.5) * 2, vy = 0;
let state = 'idle', stateTimer = 0;
let sprite = new Image();
const canvas = document.getElementById('pet');
const ctx = canvas.getContext('2d');
const urlParams = new URLSearchParams(location.search);
const petId = urlParams.get('pet') || 'chiikawa';
sprite.src = `assets/${petId}.png`;
sprite.onload = () => draw();

function draw() {
  ctx.clearRect(0, 0, CELL_W, CELL_H);
  const sx = (frame % COLS) * CELL_W;
  const sy = currentRow * CELL_H;
  // 좌우 반전 (이동 방향)
  ctx.save();
  if (vx < 0) { ctx.scale(-1, 1); ctx.translate(-CELL_W, 0); }
  ctx.drawImage(sprite, sx, sy, CELL_W, CELL_H, 0, 0, CELL_W, CELL_H);
  ctx.restore();
}

// Tauri 윈도우 이동
async function moveWindow() {
  try {
    const win = getCurrentWindow();
    await win.setPosition({ x: Math.round(x), y: Math.round(y), type: 'Physical' });
  } catch(e) {}
}

let stopped = false;

// Tauri 이벤트: 정지
listen('pet-stop', () => { stopped = !stopped; }).catch(()=>{});

// 우클릭으로 제거
document.addEventListener('contextmenu', async (e) => {
  e.preventDefault();
  try { await getCurrentWindow().close(); } catch(err) {}
});

// 상태머신: idle <-> walk
setInterval(() => {
  if (stopped) { draw(); return; }
  stateTimer--;
  if (stateTimer <= 0) {
    if (state === 'idle') {
      state = 'walk';
      currentRow = 1; // 걷기 모션
      const angle = Math.random() * Math.PI * 2;
      vx = Math.cos(angle) * 1.5;
      stateTimer = 120 + Math.random() * 120; // 2-4초 걷기
    } else {
      state = 'idle';
      currentRow = 0; // 기본 모션
      vx = 0;
      stateTimer = 60 + Math.random() * 180; // 1-4초 쉬기
    }
    frame = 0;
  }
  if (state === 'walk') {
    x += vx;
    // 화면 경계
    if (x < 0 || x > screen.width - 200) vx *= -1;
    x = Math.max(0, Math.min(screen.width - 200, x));
    frame = (frame + 1) % COLS;
    moveWindow();
  } else {
    frame = (frame + 1) % COLS;
  }
  draw();
}, 100);

// 드래그로 이동 (Tauri drag)
document.body.addEventListener('mousedown', () => { state = 'idle'; vx = 0; });
