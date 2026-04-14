// 游戏逻辑与状态管理
let mode = 'rh';
let gameDifficulty = 'easy'; // 新增的难度管理状态
let includeAccid = true; // 是否包含升号
let rightNote = null;
let leftNote = null;
let isDone = false;
let currentHits = []; // 当前双手模式已击中的音符数组
let wrongNote = null; // 存储用户弹错的那个音符对象
let lastNoteM = null; // 上一个音符的MIDI值，用于避免重复

// 手动范围存储 (MIDI 值)
let customMin = 60;
let customMax = 72;
let gameTimer = null;

// 自由模式专属：淡出虚影
let activePhantoms = []; // [{note, alpha, x}]
let phantomLoop = null;

let score = { ok: 0, streak: 0, maxStreak: 0, total: 0 };

const fb = document.getElementById('fb');
const sOk = document.getElementById('sOk');
const sSt = document.getElementById('sSt');
const sAl = document.getElementById('sAl');

// Toast 弹窗函数
function showToast(message, type = 'info', duration = 1200) {
  // 移除已存在的 toast
  const existing = document.querySelector('.toast-popup');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast-popup toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // 触发显示动画
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  // 自动消失
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function pickNote(lo, hi, avoidM = null) {
  let ns = NOTES_DATA.filter(n => n.m >= lo && n.m <= hi);
  // 避免重复：如果可选音符多于1个，且有避免值，则过滤掉
  if (avoidM !== null && ns.length > 1) {
    ns = ns.filter(n => n.m !== avoidM);
  }
  return ns[Math.floor(Math.random() * ns.length)];
}

function generateStage() {
  if (gameDifficulty === 'free') {
    isDone = false;
    wrongNote = null;
    rightNote = null;
    leftNote = null;
    fb.textContent = '🎨 自由模式：随便乱弹，看着音符飞舞吧！';
    fb.className = 'fb ok';
    renderCanvas();
    return;
  }
  isDone = false;
  wrongNote = null; // 清空上一局的错误记录
  fb.textContent = '';
  fb.className = 'fb';
  currentHits = []; // 重置当前已击中列表

  // 立即清除键盘高亮
  clearPianoKeysClasses();

  // 根据难度决定生成的音符范围
  let minRH = 60, maxRH = 84;
  let minLH = 48, maxLH = 64;

  if (gameDifficulty === 'easy') {
    minRH = 60; maxRH = 72; // 单八度: C4 - C5 (包含结束音)
    minLH = 48; maxLH = 60; // 单八度: C3 - C4 (包含结束音)
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

  // 避免重复：过滤掉与上次相同的音符
  const filteredRH = lastNoteM !== null ? candidatesRH.filter(n => n.m !== lastNoteM) : candidatesRH;
  const filteredLH = lastNoteM !== null ? candidatesLH.filter(n => n.m !== lastNoteM) : candidatesLH;

  if (mode === 'rh') {
    rightNote = filteredRH.length > 0 ? filteredRH[Math.floor(Math.random() * filteredRH.length)] : candidatesRH[Math.floor(Math.random() * candidatesRH.length)];
    leftNote = null;
    lastNoteM = rightNote ? rightNote.m : null;
    // hint.textContent = '🎵 请认出该音符在高音谱表上的位置并弹出';
  } else {
    leftNote = filteredLH.length > 0 ? filteredLH[Math.floor(Math.random() * filteredLH.length)] : candidatesLH[Math.floor(Math.random() * candidatesLH.length)];
    rightNote = null;
    lastNoteM = leftNote ? leftNote.m : null;
    // hint.textContent = '🎵 请认出该音符在低音谱表上的位置并弹出';
  }

  // 处理升降号显示逻辑：随机选择显示升号还是降号
  if (rightNote && rightNote.b) {
    rightNote.useFlat = Math.random() > 0.5;
    rightNote.displayName = rightNote.useFlat ? rightNote.f : rightNote.s;
  } else if (rightNote) {
    rightNote.displayName = rightNote.n;
  }

  if (leftNote && leftNote.b) {
    leftNote.useFlat = Math.random() > 0.5;
    leftNote.displayName = leftNote.useFlat ? leftNote.f : leftNote.s;
  } else if (leftNote) {
    leftNote.displayName = leftNote.n;
  }

  // 渲染显示逻辑：为了防止离谱加线，如果是手动模式就强制显示大谱图，但即便如此，音符也只有一个单音！
  let renderMode = mode;
  if (gameDifficulty === 'custom' || gameDifficulty === 'free') renderMode = 'both';

  currentHits = []; // 重置当前已击中列表

  drawGameStaff(renderMode, rightNote, leftNote, isDone, '');

  // 延迟一小小会儿产生出题声音，更贴近使用习惯
  setTimeout(() => {
    if (rightNote) playNoteSound(rightNote.m);
    if (leftNote) playNoteSound(leftNote.m);
  }, 100);
}

function handleKeyTap(e, m) {
  playNoteSound(m);

  if (gameDifficulty === 'free') {
    // 自由模式：只负责生成飞舞的虚影
    const n = NOTES_DATA.find(x => x.m === m);
    if (n) {
      activePhantoms.push({ note: n, alpha: 0.8, x: 300 });
      startPhantomLoop();
    }
    return;
  }

  if (isDone) return;

  const expectedNotes = [rightNote, leftNote].filter(n => n !== null);
  const target = expectedNotes.find(t => t.m === m);

  if (!target) {
    // 弹错了
    score.streak = 0;
    score.total++;
    isDone = true;

    // 显示错误 toast
    showToast('❌ 错误！答案是 ' + expectedNotes.map(t => t.displayName).join(' / '), 'wrong', 1500);

    // 立即生成下一题（更新 lastNoteM 避免重复）
    lastNoteM = expectedNotes[0] ? expectedNotes[0].m : null;
    setTimeout(generateStage, 600);
  } else {
    // 弹对了
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

      // 显示正确 toast
      showToast('✅ 正确! ' + expectedNotes.map(t => t.displayName).join(' / '), 'ok', 800);

      // 记录正确答案并立即生成下一题
      lastNoteM = expectedNotes[0] ? expectedNotes[0].m : null;
      setTimeout(generateStage, 500);
    } else {
      // 还在等待另一个音
      showToast('🎹 还有一个音...', 'info', 600);
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
  if (gameDifficulty === 'custom' || gameDifficulty === 'free') rm = 'both';
  drawGameStaff(rm, rightNote, leftNote, isDone, feedbackState, wrongNote, activePhantoms);
}

function startPhantomLoop() {
  if (phantomLoop) return;
  phantomLoop = setInterval(() => {
    if (activePhantoms.length === 0) {
      clearInterval(phantomLoop);
      phantomLoop = null;
      return;
    }
    // 透明度衰减并产生位移动画
    activePhantoms.forEach(p => {
      p.alpha -= 0.05;
      p.x += 1; // 稍微向右飘动一点点
    });
    activePhantoms = activePhantoms.filter(p => p.alpha > 0);
    renderCanvas();
  }, 40);
}

function resetGame() {
  score = { ok: 0, streak: 0, maxStreak: 0, total: 0 };
  updateScoreUI();
  generateStage();
}

function getKeyboardRange() {
  let minK = 48, maxK = 84;
  if (gameDifficulty === 'easy') {
    if (mode === 'rh') { minK = 60; maxK = 72; }      // 右手：单八度 (包含 C5)
    else if (mode === 'lh') { minK = 48; maxK = 60; } // 左手：单八度 (包含 C4)
    else { minK = 48; maxK = 72; }                    // 双手：C3-C5
  } else if (gameDifficulty === 'med') {
    if (mode === 'rh') { minK = 60; maxK = 84; }      // 右手：双八度 C4-C5
    else if (mode === 'lh') { minK = 36; maxK = 60; } // 左手：双八度 C2-C4
    else { minK = 48; maxK = 84; }                    // 双手：C3-C5
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
