'use strict';
/* ===== Chiikawa Pet Window (v1.2 static pool) =====
 * 정적으로 선언된 pet-N 슬롯 중 하나. 메인 창의 이벤트로만 제어된다.
 * - pet-assign {label, uid, charId} : 펫 배치 + 창 표시
 * - pet-show / pet-hide {label}    : 표시 / 숨김
 * - pet-toggle {label}             : 정지 토글
 * - pet-size {scale}               : 전체 크기 (브로드캐스트)
 * - pets-clear {}                  : 전체 숨김 (브로드캐스트)
 * - pets-visibility {visible}      : 전체 표시/숨김 (브로드캐스트)
 * 동적 창 생성 없음. 드래그는 -webkit-app-region, 우클릭은 제거.
 */
const COLS = 8, CELL_W = 192, CELL_H = 208;
const TAU = window.__TAURI__;

let myLabel = '';
let win = null;
let assigned = false;
let uid = null;
let charId = 'chiikawa';
let scaleFactor = 1;
let petScale = 1;

let sprite = new Image();
let spriteLoaded = false;
const canvas = document.getElementById('pet');
const ctx = canvas.getContext('2d');

let frame = 0, row = 0;
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

function draw() {
  if (!spriteLoaded) return;
  ctx.clearRect(0, 0, CELL_W, CELL_H);
  const sx = (frame % COLS) * CELL_W;
  const sy = row * CELL_H;
  ctx.save();
  if (vx < 0) { ctx.scale(-1, 1); ctx.translate(-CELL_W, 0); }
  ctx.drawImage(sprite, sx, sy, CELL_W, CELL_H, 0, 0, CELL_W, CELL_H);
  ctx.restore();
}

function tick() {
  if (!assigned) return;
  if (stopped) { draw(); return; }
  stateTimer--;
  if (stateTimer <= 0) {
    if (state === 'idle') {
      state = 'walk'; row = 1;
      const a = Math.random() * Math.PI * 2;
      const sp = 1 + Math.random() * 1.4;
      vx = Math.cos(a) * sp;
      vy = Math.sin(a) * sp * 0.55;
      stateTimer = 120 + Math.random() * 140;
    } else {
      state = 'idle'; row = 0;
      vx = 0; vy = 0;
      stateTimer = 60 + Math.random() * 180;
    }
    frame = 0;
  }
  if (state === 'walk') {
    x += vx; y += vy;
    const W = cssW(), H = cssH();
    const sw = window.screen.width, sh = window.screen.height;
    if (x < 0) { x = 0; vx *= -1; }
    if (x > sw - W) { x = Math.max(0, sw - W); vx *= -1; }
    if (y < 0) { y = 0; vy *= -1; }
    if (y > sh - H) { y = Math.max(0, sh - H); vy *= -1; }
    frame = (frame + 1) % COLS;
    placeWindow();
  } else {
    frame = (frame + 1) % COLS;
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
  spriteLoaded = false;
  sprite = new Image();
  sprite.onload = () => { spriteLoaded = true; draw(); };
  sprite.onerror = () => {
    const fb = new Image();
    fb.src = 'assets/thumb_' + charId + '.png';
    fb.onload = () => { sprite = fb; spriteLoaded = true; draw(); };
  };
  sprite.src = 'assets/' + charId + '.png';
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
