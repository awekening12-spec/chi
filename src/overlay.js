'use strict';
/* ===== Chiikawa Pet Overlay (v1.1) =====
 * 전체 화면 투명 스테이지. 메인 창에서 오는 Tauri 이벤트로 펫을 관리한다.
 * 동적 윈도우 생성 없음. 클릭스루(마우스 이벤트 무시)라 바탕화면 조작에 간섭 없음.
 */
const COLS = 8, CELL_W = 192, CELL_H = 208;
const stage = document.getElementById('stage');
const TAU = window.__TAURI__;
const pets = new Map(); // uid -> pet
let scale = 1;

const scr = () => ({ w: window.innerWidth, h: window.innerHeight });

function makePet(uid, charId) {
  if (pets.has(uid)) return;
  const el = document.createElement('div');
  el.className = 'pet';
  const cv = document.createElement('canvas');
  cv.width = CELL_W; cv.height = CELL_H;
  el.appendChild(cv);
  const badge = document.createElement('div');
  badge.className = 'badge';
  badge.textContent = '💤';
  el.appendChild(badge);
  stage.appendChild(el);

  const img = new Image();
  img.src = 'assets/' + charId + '.png';
  const { w, h } = scr();
  const pet = {
    uid, el, ctx: cv.getContext('2d'), img,
    frame: Math.floor(Math.random() * COLS),
    row: 0,
    x: Math.random() * Math.max(1, w - CELL_W),
    y: Math.random() * Math.max(1, h - CELL_H),
    vx: 0, vy: 0,
    state: 'idle',
    timer: 60 + Math.random() * 120,
    stopped: false,
    loaded: false,
  };
  img.onload = () => { pet.loaded = true; draw(pet); };
  img.onerror = () => { /* 스프라이트 없으면 썸네일로 대체 */
    const fb = new Image();
    fb.src = 'assets/thumb_' + charId + '.png';
    fb.onload = () => { pet.img = fb; pet.isFallback = true; pet.loaded = true; draw(pet); };
  };
  pets.set(uid, pet);
  place(pet);
  applyScaleTo(pet);
}

function draw(p) {
  if (!p.loaded) return;
  const c = p.ctx;
  c.clearRect(0, 0, CELL_W, CELL_H);
  const sx = (p.frame % COLS) * CELL_W;
  const sy = p.row * CELL_H;
  c.save();
  if (p.vx < 0) { c.scale(-1, 1); c.translate(-CELL_W, 0); }
  // 썸네일 대체 시에는 전체 이미지를 그대로 그림
  if (p.isFallback) { c.drawImage(p.img, 0, 0, CELL_W, CELL_H); }
  else { c.drawImage(p.img, sx, sy, CELL_W, CELL_H, 0, 0, CELL_W, CELL_H); }
  c.restore();
}

function place(p) {
  p.el.style.left = p.x + 'px';
  p.el.style.top = p.y + 'px';
}

function applyScaleTo(p) {
  p.el.style.transform = 'scale(' + scale + ')';
}

function removePet(uid) {
  const p = pets.get(uid);
  if (p) { p.el.remove(); pets.delete(uid); }
}

function togglePet(uid) {
  const p = pets.get(uid);
  if (p) {
    p.stopped = !p.stopped;
    p.el.classList.toggle('stopped', p.stopped);
  }
}

function clearPets() {
  pets.forEach(p => p.el.remove());
  pets.clear();
}

/* 상태머신: idle <-> walk (2D 이동) */
function tick() {
  const { w, h } = scr();
  const W = CELL_W * scale, H = CELL_H * scale;
  pets.forEach(p => {
    if (p.stopped) { draw(p); return; }
    p.timer--;
    if (p.timer <= 0) {
      if (p.state === 'idle') {
        p.state = 'walk';
        p.row = 1;
        const a = Math.random() * Math.PI * 2;
        const sp = 1 + Math.random() * 1.4;
        p.vx = Math.cos(a) * sp;
        p.vy = Math.sin(a) * sp * 0.55;
        p.timer = 120 + Math.random() * 140;
      } else {
        p.state = 'idle';
        p.row = 0;
        p.vx = 0; p.vy = 0;
        p.timer = 60 + Math.random() * 180;
      }
      p.frame = 0;
    }
    if (p.state === 'walk') {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) { p.x = 0; p.vx *= -1; }
      if (p.x > w - W) { p.x = Math.max(0, w - W); p.vx *= -1; }
      if (p.y < 0) { p.y = 0; p.vy *= -1; }
      if (p.y > h - H) { p.y = Math.max(0, h - H); p.vy *= -1; }
      p.frame = (p.frame + 1) % COLS;
      place(p);
    } else {
      p.frame = (p.frame + 1) % COLS;
    }
    draw(p);
  });
}
setInterval(tick, 100);

async function boot() {
  if (!TAU || !TAU.event || !TAU.window) {
    console.error('overlay: __TAURI__ 없음');
    return;
  }
  const win = TAU.window.getCurrentWindow();
  const ev = TAU.event;

  // 클릭스루: 실패해도 오버레이 동작은 계속 (메인 창으로 숨기기 가능)
  try { await win.setIgnoreCursorEvents(true); }
  catch (e) { console.warn('overlay: 클릭스루 설정 실패', e); }

  try {
    await ev.listen('pet-add', e => {
      const d = e.payload || {};
      if (d.uid != null) makePet(d.uid, d.charId || 'chiikawa');
    });
    await ev.listen('pet-remove', e => {
      const d = e.payload || {};
      if (d.uid != null) removePet(d.uid);
    });
    await ev.listen('pet-toggle', e => {
      const d = e.payload || {};
      if (d.uid != null) togglePet(d.uid);
    });
    await ev.listen('pet-clear', () => clearPets());
    await ev.listen('pet-size', e => {
      const d = e.payload || {};
      const s = parseFloat(d.scale);
      if (s > 0 && s < 5) {
        scale = s;
        pets.forEach(applyScaleTo);
      }
    });
    await ev.listen('overlay-visibility', e => {
      const d = e.payload || {};
      try {
        if (d.visible === false) win.hide(); else win.show();
      } catch (err) { console.warn('overlay: 표시 전환 실패', err); }
    });
    // 메인 창이 나중에 뜰 경우를 위한 재동기화 요청 수신
    await ev.listen('main-ready', () => ev.emit('overlay-ready', {}).catch(() => {}));
    await ev.emit('overlay-ready', {});
  } catch (e) {
    console.error('overlay: 이벤트 바인딩 실패', e);
  }
}
boot();
