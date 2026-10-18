'use strict';
/* ===== Chiikawa Pet Window (v1.4 static pool) =====
 * 정적으로 선언된 pet-N 슬롯 중 하나. 메인 창의 이벤트로만 제어된다.
 * 스프라이트 시트 실측: 11행 전부 idle/감정 모션 (walk 사이클 없음).
 * - 기본 idle 행에서 천천히(280ms) 프레임 전환
 * - 12~25초마다 40% 확률로 happy 행으로 2.5초간 감정 표현 후 복귀
 * - 이동은 창 움직임으로 표현
 */
const COLS = 8, CELL_W = 192, CELL_H = 208;
const IDLE_ROWS = [0, 2];       // 차분한 idle (바운딩박스 실측 일치)
const HAPPY_ROWS = [4, 6, 9];   // 밝은 감정
const TAU = window.__TAURI__;

let myLabel = '';
let win = null;
let assigned = false;
let uid = null;
let charId = 'chiikawa';
let scaleFactor = 1;
let petScale = 1;
let dragging = false;

const spriteCache = {};
let sprite = new Image();
let spriteLoaded = false;
let isPlaceholder = false;
const canvas = document.getElementById('pet');
const ctx = canvas.getContext('2d');

let frame = 0, frameTick = 0;
let idleRow = IDLE_ROWS[0], curRow = IDLE_ROWS[0];
let emoTimer = 80 + Math.random() * 80;  // 다음 감정까지 (틱)
let emoHold = 0;                          // 감정 유지 틱
let x = 0, y = 0, vx = 0, vy = 0;
let state = 'idle', stateTimer = 0;
let stopped = false;
let loopStarted = false;

function cssW() { return CELL_W * petScale; }
function cssH() { return CELL_H * petScale; }

async function applyWindowSize() {
  if (!win) return;
  try {
    await win.setSize(new TAU.window.PhysicalSize(
      Math.round(cssW() * scaleFactor),
      Math.round(cssH() * scaleFactor)
    ));
  } catch (e) { console.warn('setSize 실패', e); }
}

async function placeWindow() {
  if (!win) return;
  try {
    await win.setPosition(new TAU.window.PhysicalPosition(
      Math.round(x * scaleFactor),
      Math.round(y * scaleFactor)
    ));
  } catch (e) {}
}

function loadSprite(id) {
  spriteLoaded = false;
  isPlaceholder = false;
  if (spriteCache[id]) {
    sprite = spriteCache[id];
    spriteLoaded = true;
    draw();
    return;
  }
  // 썸네일 플레이스홀더로 즉시 표시
  const ph = new Image();
  ph.onload = () => {
    if (!spriteLoaded) { sprite = ph; isPlaceholder = true; spriteLoaded = true; draw(); }
  };
  ph.src = 'assets/thumb_' + id + '.png';
  const img = new Image();
  img.onload = () => {
    sprite = img; spriteLoaded = true; isPlaceholder = false;
    spriteCache[id] = img;
    draw();
  };
  img.onerror = () => {
    // 풀 스프라이트 실패 시 썸네일로 유지
    if (isPlaceholder) { spriteCache[id] = sprite; }
  };
  img.src = 'assets/' + id + '.png';
}

function draw() {
  if (!spriteLoaded) return;
  ctx.clearRect(0, 0, CELL_W, CELL_H);
  ctx.save();
  if (vx < 0) { ctx.scale(-1, 1); ctx.translate(-CELL_W, 0); }
  if (isPlaceholder) {
    ctx.drawImage(sprite, 0, 0, CELL_W, CELL_H);
  } else {
    const sx = (frame % COLS) * CELL_W;
    const sy = curRow * CELL_H;
    ctx.drawImage(sprite, sx, sy, CELL_W, CELL_H, 0, 0, CELL_W, CELL_H);
  }
  ctx.restore();
}

function tick() {
  if (!assigned || dragging) { draw(); return; }
  if (stopped) { draw(); return; }

  // 프레임은 천천히 (280ms)
  frameTick++;
  if (frameTick >= 3) { frameTick = 0; frame = (frame + 1) % COLS; }

  // 감정 전환
  if (emoHold > 0) {
    emoHold--;
    if (emoHold === 0) { curRow = idleRow; frame = 0; }
  } else {
    emoTimer--;
    if (emoTimer <= 0) {
      emoTimer = 120 + Math.random() * 130; // 12~25초
      if (Math.random() < 0.4) {
        curRow = HAPPY_ROWS[Math.floor(Math.random() * HAPPY_ROWS.length)];
        emoHold = 25; // 2.5초
        frame = 0;
      }
    }
  }

  // 이동 상태머신
  stateTimer--;
  if (stateTimer <= 0) {
    if (state === 'idle') {
      state = 'walk';
      const a = Math.random() * Math.PI * 2;
      const sp = 1 + Math.random() * 1.4;
      vx = Math.cos(a) * sp;
      vy = Math.sin(a) * sp * 0.55;
      stateTimer = 120 + Math.random() * 140;
    } else {
      state = 'idle';
      vx = 0; vy = 0;
      stateTimer = 60 + Math.random() * 180;
    }
  }
  if (state === 'walk') {
    x += vx; y += vy;
    const W = cssW(), H = cssH();
    const sw = window.screen.width, sh = window.screen.height;
    if (x < 0) { x = 0; vx *= -1; }
    if (x > sw - W) { x = Math.max(0, sw - W); vx *= -1; }
    if (y < 0) { y = 0; vy *= -1; }
    if (y > sh - H) { y = Math.max(0, sh - H); vy *= -1; }
    placeWindow();
  }
  draw();
}

function forMe(d) { return d && d.label === myLabel; }

async function onAssign(d) {
  if (!forMe(d)) return;
  uid = d.uid;
  charId = d.charId || 'chiikawa';
  assigned = true;
  stopped = false;
  document.body.classList.remove('stopped');
  idleRow = IDLE_ROWS[Math.floor(Math.random() * IDLE_ROWS.length)];
  curRow = idleRow;
  frame = 0; frameTick = 0;
  emoTimer = 80 + Math.random() * 80;
  emoHold = 0;
  vx = 0; vy = 0; state = 'idle'; stateTimer = 60 + Math.random() * 120;
  loadSprite(charId);
  const sw = window.screen.width, sh = window.screen.height;
  x = Math.random() * Math.max(1, sw - cssW());
  y = Math.random() * Math.max(1, sh - cssH());
  await applyWindowSize();
  await placeWindow();
  try { await win.show(); } catch (e) { console.warn('show 실패', e); }
  if (!loopStarted) { loopStarted = true; setInterval(tick, 100); }
}

async function onShow(d) {
  if (!forMe(d) || !assigned) return;
  try { await win.show(); } catch (e) {}
}
async function onHide(d) {
  if (!forMe(d)) return;
  try { await win.hide(); } catch (e) {}
}
function onToggle(d) {
  if (!forMe(d) || !assigned) return;
  stopped = !stopped;
  document.body.classList.toggle('stopped', stopped);
}
async function onSize(d) {
  const s = parseFloat(d && d.scale);
  if (!(s > 0 && s < 5)) return;
  petScale = s;
  if (assigned) {
    await applyWindowSize();
    const sw = window.screen.width, sh = window.screen.height;
    x = Math.max(0, Math.min(sw - cssW(), x));
    y = Math.max(0, Math.min(sh - cssH(), y));
    await placeWindow();
  }
}
async function onClear() {
  if (!assigned) return;
  try { await win.hide(); } catch (e) {}
}
async function onVisibility(d) {
  if (!assigned) return;
  try {
    if (d && d.visible === false) await win.hide();
    else await win.show();
  } catch (e) {}
}

/* 드래그: OS 네이티브 드래그 사용 */
document.addEventListener('mousedown', async (e) => {
  if (e.button !== 0 || !assigned || dragging) return;
  dragging = true;
  try { await win.startDragging(); }
  catch (err) { /* 드래그 미지원 환경 */ }
  finally {
    dragging = false;
    try {
      const p = await win.outerPosition();
      x = p.x / scaleFactor;
      y = p.y / scaleFactor;
      const sw = window.screen.width, sh = window.screen.height;
      x = Math.max(0, Math.min(sw - cssW(), x));
      y = Math.max(0, Math.min(sh - cssH(), y));
    } catch (err) {}
  }
});

/* 우클릭으로 제거 */
document.addEventListener('contextmenu', async (e) => {
  e.preventDefault();
  if (!assigned) return;
  try { await win.hide(); } catch (err) {}
  try { await TAU.event.emit('pet-closed', { label: myLabel, uid: uid }); } catch (err) {}
});

async function boot() {
  if (!TAU || !TAU.event || !TAU.window) {
    console.error('pet: __TAURI__ 없음');
    return;
  }
  win = TAU.window.getCurrentWindow();
  myLabel = win.label || '';
  try { scaleFactor = await win.scaleFactor(); } catch (e) { scaleFactor = 1; }
  const ev = TAU.event;
  try {
    await ev.listen('pet-assign', e => { onAssign(e.payload || {}); });
    await ev.listen('pet-show', e => { onShow(e.payload || {}); });
    await ev.listen('pet-hide', e => { onHide(e.payload || {}); });
    await ev.listen('pet-toggle', e => { onToggle(e.payload || {}); });
    await ev.listen('pet-size', e => { onSize(e.payload || {}); });
    await ev.listen('pets-clear', () => { onClear(); });
    await ev.listen('pets-visibility', e => { onVisibility(e.payload || {}); });
    await ev.listen('main-ready', () => { ev.emit('pet-ready', { label: myLabel }).catch(() => {}); });
    await ev.emit('pet-ready', { label: myLabel });
  } catch (e) {
    console.error('pet: 이벤트 바인딩 실패', e);
  }
}
boot();
