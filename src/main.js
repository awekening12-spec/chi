// Chiikawa Pet Engine - Codex style
const COLS = 8, ROWS = 11, CELL_W = 192, CELL_H = 208;
const CHARS = [
  {id:'chiikawa', name:'치이카와'}, {id:'hachiware', name:'하치와레'},
  {id:'usagi', name:'우사기'}, {id:'momonga', name:'모몽가'},
  {id:'shisa', name:'시사'}, {id:'rakko', name:'랏코'},
  {id:'kurimanju', name:'쿠리만주'}, {id:'siren', name:'세이렌'},
  {id:'furuhonya', name:'후루혼야'}, {id:'anoko', name:'아노코'},
  {id:'dekatsuyo', name:'데카츠요'},
];
const MOTIONS = [
  {row:0, name:'기본'}, {row:1, name:'걷기'}, {row:2, name:'뛰기'},
  {row:3, name:'쳐다보기'}, {row:4, name:'대기'}, {row:5, name:'손흔들기'},
  {row:6, name:'점프'}, {row:7, name:'실패'}, {row:8, name:'리뷰'},
  {row:9, name:'왼쪽'}, {row:10, name:'오른쪽'},
];
let currentPet = 'chiikawa', currentRow = 0, frame = 0;
let sprite = new Image();
const canvas = document.getElementById('pet');
const ctx = canvas.getContext('2d');

function setPet(id) {
  currentPet = id;
  sprite.src = `../assets/${id}.png`;
  frame = 0;
  document.querySelectorAll('.char-btn').forEach(b => b.classList.toggle('active', b.dataset.id === id));
}
function setMotion(row) {
  currentRow = row;
  frame = 0;
  document.querySelectorAll('.motion-btn').forEach(b => b.classList.toggle('active', +b.dataset.row === row));
}
function togglePanel() {
  document.getElementById('panel').classList.toggle('hidden');
}

// 캐릭터 그리드 생성
const grid = document.getElementById('charGrid');
CHARS.forEach(c => {
  const btn = document.createElement('div');
  btn.className = 'char-btn' + (c.id === currentPet ? ' active' : '');
  btn.dataset.id = c.id;
  btn.innerHTML = `<img src="../assets/thumb_${c.id}.png">${c.name}`;
  btn.onclick = () => setPet(c.id);
  grid.appendChild(btn);
});
// 썸네일은 스프라이트시트 첫 셀 크롭으로 (CSS로 처리)

// 모션 버튼 생성
const mrow = document.getElementById('motionRow');
MOTIONS.forEach(m => {
  const btn = document.createElement('button');
  btn.className = 'motion-btn' + (m.row === 0 ? ' active' : '');
  btn.dataset.row = m.row;
  btn.textContent = m.name;
  btn.onclick = () => setMotion(m.row);
  mrow.appendChild(btn);
});

sprite.onload = () => draw();
function draw() {
  ctx.clearRect(0, 0, CELL_W, CELL_H);
  const sx = (frame % COLS) * CELL_W;
  const sy = currentRow * CELL_H;
  ctx.drawImage(sprite, sx, sy, CELL_W, CELL_H, 0, 0, CELL_W, CELL_H);
}
setInterval(() => { frame = (frame + 1) % COLS; draw(); }, 180);
canvas.addEventListener('click', () => { currentRow = (currentRow + 1) % ROWS; setMotion(currentRow); });
setPet('chiikawa');
