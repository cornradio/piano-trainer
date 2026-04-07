// 游戏逻辑与状态管理
let mode = 'rh';
let gameDifficulty = 'easy'; // 新增的难度管理状态
let includeAccid = true; // 是否包含升号
let rightNote = null;
let leftNote = null;
let isDone = false;
let gameTimer = null;

let score = { ok: 0, streak: 0, maxStreak: 0, total: 0 };

const fb = document.getElementById('fb');
const hint = document.getElementById('hint');
const sOk = document.getElementById('sOk');
const sSt = document.getElementById('sSt');
const sAl = document.getElementById('sAl');

function pickNote(lo, hi) {
  const ns = NOTES_DATA.filter(n => n.m >= lo && n.m <= hi);
  return ns[Math.floor(Math.random() * ns.length)];
}

function generateStage() {
  isDone = false;
  fb.textContent = '';
  fb.className = 'fb';
  clearPianoKeysClasses();

  // 根据难度决定生成的音符范围
  let minRH = 60, maxRH = 84;
  let minLH = 48, maxLH = 64;

  if (gameDifficulty === 'easy') {
    minRH = 60; maxRH = 71; // 单八度: C4 - B4
    minLH = 48; maxLH = 59; // 单八度: C3 - B3
  } else if (gameDifficulty === 'med') {
    minRH = 60; maxRH = 83; // 双八度: C4 - B5
    minLH = 48; maxLH = 71; // 双八度: C3 - B4 (延伸)
  } else {
    minRH = 48; maxRH = 84; // 三八度: C3 - C6
    minLH = 48; maxLH = 84; // 三八度: C3 - C6
  }

  // 过滤出符合音域和升号要求的备选音符
  const candidatesRH = NOTES_DATA.filter(x => x.m >= minRH && x.m <= maxRH && (includeAccid || x.b === 0));
  const candidatesLH = NOTES_DATA.filter(x => x.m >= minLH && x.m <= maxLH && (includeAccid || x.b === 0));

  if (mode === 'rh') {
    rightNote = candidatesRH[Math.floor(Math.random() * candidatesRH.length)];
    leftNote = null;
    hint.textContent = '🎵 认出高音谱表（右手）的这个音并弹出来';
  } else if (mode === 'lh') {
    leftNote = candidatesLH[Math.floor(Math.random() * candidatesLH.length)];
    rightNote = null;
    hint.textContent = '🎵 认出低音谱表（左手）的这个音并弹出来';
  } else {
    rightNote = candidatesRH[Math.floor(Math.random() * candidatesRH.length)];
    leftNote = candidatesLH[Math.floor(Math.random() * candidatesLH.length)];
    hint.textContent = '🎵 认出图中两个音，并在下方键盘弹出来';
  }

  renderCanvas();
  
  // 延迟一小小会儿产生出题声音，更贴近使用习惯
  setTimeout(() => {
    if (rightNote) playNoteSound(rightNote.m);
    if (leftNote && !rightNote) playNoteSound(leftNote.m);
    else if (leftNote && rightNote) {
      // 若双手，左手稍作微小延迟播放以区分
      setTimeout(() => playNoteSound(leftNote.m), 50);
    }
  }, 100);
}

function handleKeyTap(e, m) {
  if (isDone) return;
  
  let expectedNotes = [];
  if (rightNote) expectedNotes.push(rightNote);
  if (leftNote) expectedNotes.push(leftNote);

  const hit = expectedNotes.find(t => t.m === m);
  isDone = true;
  score.total++;
  lockPianoKeys();

  if (gameTimer) clearTimeout(gameTimer);

  // 用户点击键盘时发出声音
  playNoteSound(m);

  if (hit) {
    score.ok++;
    score.streak++;
    if (score.streak > score.maxStreak) score.maxStreak = score.streak;
    
    highlightKey(m, 'ch');
    
    const msgs = ['✅ 正确！', '🎉 太棒了！', '✨ 漂亮！', '👏 完全正确！', '🎵 答对啦！'];
    fb.textContent = msgs[Math.floor(Math.random() * msgs.length)] + ' ' + hit.n;
    fb.className = 'fb ok';
    
    renderCanvas('ok');
    gameTimer = setTimeout(generateStage, 900);
  } else {
    score.streak = 0;
    highlightKey(m, 'wh');
    
    expectedNotes.forEach(t => {
      highlightKey(t.m, 'ch');
    });
    
    fb.textContent = '❌ 弹错了，标准答案是 ' + expectedNotes.map(t => t.n).join(' 与 ');
    fb.className = 'fb no';
    
    renderCanvas('no');
    gameTimer = setTimeout(generateStage, 900); // 错误也只需等待一样短的时间
  }
  
  updateScoreUI();
}

function updateScoreUI() {
  sOk.textContent = score.ok;
  sSt.textContent = score.streak + (score.streak >= 3 ? ' 🔥' : '');
  sAl.textContent = score.total;
}

function renderCanvas(feedbackState = '') {
  drawGameStaff(mode, rightNote, leftNote, isDone, feedbackState);
}

function resetGame() {
  score = { ok: 0, streak: 0, maxStreak: 0, total: 0 };
  updateScoreUI();
  generateStage();
}

function getKeyboardRange() {
  let minK = 48, maxK = 84;
  if (gameDifficulty === 'easy') {
    if (mode === 'rh') { minK = 60; maxK = 72; }      // 右手：单八度
    else if (mode === 'lh') { minK = 48; maxK = 60; } // 左手：单八度
    else { minK = 48; maxK = 72; }                    // 双手：C3-C5
  } else if (gameDifficulty === 'med') {
    if (mode === 'rh') { minK = 60; maxK = 84; }      // 右手：双八度
    else if (mode === 'lh') { minK = 48; maxK = 72; } // 左手：双八度
    else { minK = 48; maxK = 84; }                    // 双手：C3-C6
  } else {
    minK = 48; maxK = 84;                             // 三八度
  }
  return { minK, maxK };
}

function setGameMode(newMode, diff) {
  mode = newMode;
  gameDifficulty = diff || gameDifficulty || 'easy';

  const range = getKeyboardRange();
  initPiano(handleKeyTap, range.minK, range.maxK);
  resetGame();
}

function setAccidentals(val) {
  includeAccid = val;
  resetGame();
}
