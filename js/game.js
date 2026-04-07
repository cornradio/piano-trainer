// 游戏逻辑与状态管理
let mode = 'rh';
let gameDifficulty = 'easy'; // 新增的难度管理状态
let includeAccid = true; // 是否包含升号
let rightNote = null;
let leftNote = null;
let isDone = false;
let currentHits = []; // 当前双手模式已击中的音符数组
let wrongNote = null; // 存储用户弹错的那个音符对象

// 手动范围存储 (MIDI 值)
let customMin = 60;
let customMax = 72;
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
  wrongNote = null; // 清空上一局的错误记录
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
    minRH = 60; maxRH = 84; // 右手双八度: C4 - B5
    minLH = 36; maxLH = 60; // 左手双八度: C2 - C4
  } else if (gameDifficulty === 'custom') {
    minRH = customMin; maxRH = customMax; // 精确锁定右手在自定义范围内
    minLH = customMin; maxLH = customMax; // 精确锁定左手在自定义范围内
  } else {
    minRH = 60; maxRH = 84; // 右手三八度: C4 - B5
    minLH = 36; maxLH = 60; // 即使三八度，左手低音表也仅包含低音区
  }

  // 过滤出符合音域和升号要求的备选音符
  const candidatesRH = NOTES_DATA.filter(x => x.m >= minRH && x.m <= maxRH && (includeAccid || x.b === 0));
  const candidatesLH = NOTES_DATA.filter(x => x.m >= minLH && x.m <= maxLH && (includeAccid || x.b === 0));

  if (mode === 'rh') {
    rightNote = candidatesRH[Math.floor(Math.random() * candidatesRH.length)];
    leftNote = null;
    hint.textContent = '🎵 请认出该音符在高音谱表上的位置并弹出';
  } else {
    leftNote = candidatesLH[Math.floor(Math.random() * candidatesLH.length)];
    rightNote = null;
    hint.textContent = '🎵 请认出该音符在低音谱表上的位置并弹出';
  }

  // 渲染显示逻辑：为了防止离谱加线，如果是手动模式就强制显示大谱图，但即便如此，音符也只有一个单音！
  let renderMode = mode;
  if (gameDifficulty === 'custom') renderMode = 'both';

  currentHits = []; // 重置当前已击中列表

  drawGameStaff(renderMode, rightNote, leftNote, isDone, '');
  
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
  
  const expectedNotes = [rightNote, leftNote].filter(n => n !== null);
  const target = expectedNotes.find(t => t.m === m);

  // 发出声音反馈
  playNoteSound(m);

  if (!target) {
    // 弹错了：立即结束本轮
    score.streak = 0;
    isDone = true;
    lockPianoKeys();
    highlightKey(m, 'wh');
    expectedNotes.forEach(t => highlightKey(t.m, 'ch'));
    
    // 记录弹错的那个音，用于在谱面上绘制显示
    wrongNote = NOTES_DATA.find(n => n.m === m);
    
    fb.textContent = '❌ 弹错了，标准答案是 ' + expectedNotes.map(t => t.n).join(' 与 ');
    fb.className = 'fb no';
    renderCanvas('no');
    if (gameTimer) clearTimeout(gameTimer);
    gameTimer = setTimeout(generateStage, 900);
  } else {
    // 弹对了其中一个
    if (!currentHits.find(h => h.m === m)) {
      currentHits.push(target);
      highlightKey(m, 'ch');
    }

    if (currentHits.length === expectedNotes.length) {
      // 全部弹对
      isDone = true;
      score.ok++;
      score.total++;
      score.streak++;
      if (score.streak > score.maxStreak) score.maxStreak = score.streak;
      
      const msgs = ['✅ 正确！', '🎉 太棒了！', '✨ 漂亮！', '👏 完全正确！'];
      fb.textContent = msgs[Math.floor(Math.random() * msgs.length)] + ' ' + expectedNotes.map(t => t.n).join(' ');
      fb.className = 'fb ok';
      
      renderCanvas('ok');
      if (gameTimer) clearTimeout(gameTimer);
      gameTimer = setTimeout(generateStage, 900);
    } else {
      // 还在等待另一个音
      fb.textContent = '🎹 还有一个音！加油...';
      fb.className = 'fb';
    }
  }
  
  updateScoreUI();
}

function updateScoreUI() {
  sOk.textContent = score.ok;
  sSt.textContent = score.streak + (score.streak >= 3 ? ' 🔥' : '');
  sAl.textContent = score.total;
}

function renderCanvas(feedbackState = '') {
  let rm = mode;
  if(gameDifficulty === 'custom') rm = 'both';
  drawGameStaff(rm, rightNote, leftNote, isDone, feedbackState, wrongNote);
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
  } else if (gameDifficulty === 'custom') {
    minK = customMin; maxK = customMax;
  } else {
    // 默认三八度模式 (Hard)
    if (mode === 'lh') { minK = 36; maxK = 72; } // 低音三八度：C2 - C5
    else { minK = 48; maxK = 84; }               // 高音三八度：C3 - C6
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

/**
 * 手动设置练习范围
 * @param {number} min 
 * @param {number} max 
 */
function setCustomRange(min, max) {
  customMin = min;
  customMax = max;
  // 如果当前是手动模式，立即重置游戏
  if (gameDifficulty === 'custom') {
    setGameMode('custom', 'custom');
  }
}
