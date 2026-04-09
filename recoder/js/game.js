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

// 自由模式专属：淡出虚影
let activePhantoms = []; // [{note, alpha, x}]
let phantomLoop = null;
let lastNoteM = null; // 上一个出现的音符，用于避免重复

let score = { ok: 0, streak: 0, maxStreak: 0, total: 0 };

// 乐曲库 - 经典旋律（单音，简单）
const SONGS = [
  { name: '小星星', notes: [60,60,67,67,69,69,67,0, 65,65,64,64,62,62,60,0, 67,67,65,65,64,64,62,0, 67,67,65,65,64,64,62,0] },
  { name: '玛丽有只小羊羔', notes: [64,66,68,69,68,66,64,66,69,69,69,66,66,66,64,64,64,64,66,66,64,0] },
  { name: '生日快乐', notes: [64,64,67,64,72,71,0, 64,64,67,64,74,72,0, 64,64,79,76,72,74,72,0] },
  { name: '欢乐颂', notes: [69,69,70,72,72,70,69,67,64,64,67,69,69,67,67,0] },
  { name: '伦敦大桥', notes: [67,65,67,65,67,69,65,67,64,67,65,64,67,65,67,0] },
  { name: '童年', notes: [67,69,71,71,69,67,69,69,67,67,69,67,64,67,67,0] },
];

let currentSong = null;
let songIndex = 0;

// 录制模式变量
let isRecording = false;
let isPlaying = false;
let recordedNotes = []; // 录制的音符 [{m, t}] m=midi, t=timestamp (ms)
let recordStartTime = 0;
let playbackIndex = 0;
let playbackTimeout = null;
let savedSongs = JSON.parse(localStorage.getItem('piano_recordings') || '[]'); // 保存的乐曲列表

const fb = document.getElementById('fb');
const sOk = document.getElementById('sOk');
const sSt = document.getElementById('sSt');
const sAl = document.getElementById('sAl');

function pickNote(lo, hi) {
  let ns = NOTES_DATA.filter(n => n.m >= lo && n.m <= hi && (includeAccid || n.b === 0));

  // 避免选择和上一个音符太接近的音（相差小于3个半音）
  if (lastNoteM !== null) {
    const avoid = lastNoteM;
    const farEnough = ns.filter(n => Math.abs(n.m - avoid) >= 3);
    if (farEnough.length > 0) {
      ns = farEnough;
    }
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

  // 乐曲模式 - 强制使用高音谱表
  if (gameDifficulty === 'song' && currentSong) {
    // 强制使用右手/高音谱表
    mode = 'rh';

    if (songIndex >= currentSong.notes.length) {
      // 乐曲结束，重新开始
      songIndex = 0;
      fb.textContent = '🎵 ' + currentSong.name + ' 结束！再来一遍！';
      fb.className = 'fb ok';
      isDone = true;
      renderCanvas('ok');
      setTimeout(generateStage, 1500);
      return;
    }

    const midi = currentSong.notes[songIndex];
    if (midi === 0) {
      // 休止符
      songIndex++;
      fb.textContent = '🎵 ' + currentSong.name + ' - 休止';
      fb.className = 'fb';
      clearPianoKeysClasses();
      rightNote = null;
      leftNote = null;
      renderCanvas();
      setTimeout(generateStage, 300);
      return;
    }

    rightNote = NOTES_DATA.find(n => n.m === midi);
    leftNote = null;

    if (rightNote) {
      rightNote.displayName = rightNote.n;
      fb.textContent = '🎵 ' + currentSong.name + ' - ' + rightNote.displayName;
    }
    fb.className = 'fb';
    clearPianoKeysClasses();
    isDone = false;
    currentHits = []; // 重置已弹音符
    renderCanvas();
    songIndex++;
    return;
  }

  // 录制模式
  if (gameDifficulty === 'record') {
    mode = 'rh';
    isDone = false;
    wrongNote = null;
    fb.textContent = isRecording ? '🔴 录制中...' : '🎤 录制模式 - 弹奏音符开始录制';
    fb.className = 'fb';
    clearPianoKeysClasses();
    rightNote = null;
    leftNote = null;
    renderCanvas();
    return;
  }
  isDone = false;
  wrongNote = null; // 清空上一局的错误记录
  fb.textContent = '';
  fb.className = 'fb';
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

  if (mode === 'rh') {
    rightNote = pickNote(minRH, maxRH);
    lastNoteM = rightNote ? rightNote.m : null;
    leftNote = null;
  } else {
    leftNote = pickNote(minLH, maxLH);
    lastNoteM = leftNote ? leftNote.m : null;
    rightNote = null;
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
  if (gameDifficulty === 'custom' || gameDifficulty === 'free' || gameDifficulty === 'song') renderMode = 'both';

  currentHits = []; // 重置当前已击中列表

  drawGameStaff(renderMode, rightNote, leftNote, isDone, '', null, [], document.getElementById('S'));

  // 延迟一小小会儿产生出题声音，更贴近使用习惯
  setTimeout(() => {
    if (rightNote) playNoteSound(rightNote.m);
    if (leftNote) playNoteSound(leftNote.m);
  }, 100);
}

function handleKeyTap(e, m, velocity = 100) {
  playNoteSound(m, velocity);

  if (gameDifficulty === 'free') {
    // 自由模式：只负责生成飞舞的虚影
    const n = NOTES_DATA.find(x => x.m === m);
    if (n) {
      activePhantoms.push({ note: n, alpha: 0.8, x: 300 });
      startPhantomLoop();
    }
    return;
  }

  // 录制模式：录制用户弹奏
  if (gameDifficulty === 'record') {
    if (isPlaying) return; // 播放中不录制

    const n = NOTES_DATA.find(x => x.m === m);
    if (n) {
      // 添加虚影效果
      activePhantoms.push({ note: n, alpha: 0.8, x: 300 });
      startPhantomLoop();

      // 录制音符（含力度）
      if (isRecording) {
        const t = Date.now() - recordStartTime;
        recordedNotes.push({ m: m, t: t, v: velocity });
      }
    }
    return;
  }

  if (isDone) return;

  const expectedNotes = [rightNote, leftNote].filter(n => n !== null);
  const target = expectedNotes.find(t => t.m === m);

  // 发出声音反馈
  playNoteSound(m);

  if (!target) {
    // 弹错了：立即结束本轮
    score.streak = 0;
    score.total++;
    isDone = true;
    lockPianoKeys();
    highlightKey(m, 'wh');
    expectedNotes.forEach(t => highlightKey(t.m, 'ch'));

    // 记录弹错的那个音，用于在谱面上绘制显示
    wrongNote = NOTES_DATA.find(n => n.m === m);

    highlightKey(m, 'wh');
    expectedNotes.forEach(t => highlightKey(t.m, 'ch'));

    fb.textContent = '❌ 弹错了，标准答案是 ' + expectedNotes.map(t => t.displayName).join(' 与 ');
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

      let msgs;
      if (gameDifficulty === 'song') {
        msgs = ['🎵', '🎶', '🎼'];
      } else {
        msgs = ['✅ 正确！', '🎉 太棒了！', '✨ 漂亮！', '👏 完全正确！'];
      }
      fb.textContent = msgs[Math.floor(Math.random() * msgs.length)] + ' ' + expectedNotes.map(t => t.displayName).join(' ');
      fb.className = 'fb ok';

      renderCanvas('ok');
      if (gameTimer) clearTimeout(gameTimer);
      if (gameDifficulty === 'song') {
        gameTimer = setTimeout(generateStage, 600); // 乐曲模式更快
      } else {
        gameTimer = setTimeout(generateStage, 900);
      }
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
  sSt.textContent = score.streak;
  sAl.textContent = score.total;

  // 答对时连对跳动一下
  const streakEl = sSt;
  streakEl.classList.remove('pop');
  void streakEl.offsetWidth; // 强制重绘
  if (score.streak >= 2) {
    streakEl.classList.add('pop');
  }
}

function renderCanvas(feedbackState = '') {
  let rm = mode;
  if (gameDifficulty === 'custom' || gameDifficulty === 'free' || gameDifficulty === 'song' || gameDifficulty === 'record') rm = 'both';
  drawGameStaff(rm, rightNote, leftNote, isDone, feedbackState, wrongNote, activePhantoms, document.getElementById('S'));
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
  let minK = 48, maxK = 96;
  if (gameDifficulty === 'easy') {
    if (mode === 'rh') { minK = 60; maxK = 72; }      // 右手：单八度 (包含 C5)
    else if (mode === 'lh') { minK = 48; maxK = 60; } // 左手：单八度 (包含 C4)
    else { minK = 48; maxK = 72; }                    // 双手：C3-C5
  } else if (gameDifficulty === 'med') {
    if (mode === 'rh') { minK = 60; maxK = 84; }      // 右手：双八度
    else if (mode === 'lh') { minK = 48; maxK = 72; } // 左手：双八度
    else { minK = 48; maxK = 84; }                    // 双手：C3-C6
  } else if (gameDifficulty === 'custom') {
    minK = customMin; maxK = customMax;
  } else if (gameDifficulty === 'song' || gameDifficulty === 'record' || gameDifficulty === 'free') {
    // 乐曲/录制/自由模式：使用全范围
    minK = 36; maxK = 96;
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

// ========== 录制模式控制函数 ==========

function startRecording() {
  recordedNotes = [];
  recordStartTime = Date.now();
  isRecording = true;
  isPlaying = false;
  fb.textContent = '🔴 录制中...';
  fb.className = 'fb';
  document.getElementById('recBtn')?.classList.add('record-on');
}

function stopRecording() {
  isRecording = false;
  fb.textContent = recordedNotes.length > 0 ? '✅ 录制完成！' + recordedNotes.length + '个音符，点击保存' : '❌ 没有录制到音符';
  fb.className = 'fb ok';
  document.getElementById('recBtn')?.classList.remove('record-on');
  updateSongListUI();
}

function playRecording() {
  if (recordedNotes.length === 0) {
    fb.textContent = '❌ 没有可播放的录音';
    fb.className = 'fb no';
    return;
  }

  if (isPlaying) {
    stopPlayback();
    return;
  }

  isPlaying = true;
  isRecording = false;
  playbackIndex = 0;
  const playBtnEl = document.getElementById('playBtn');
  if (playBtnEl) playBtnEl.textContent = '⏸';

  fb.textContent = '▶ 播放中...';
  fb.className = 'fb';

  playNextNote();
}

function playNextNote() {
  if (!isPlaying || playbackIndex >= recordedNotes.length) {
    stopPlayback();
    fb.textContent = '✅ 播放完毕！';
    fb.className = 'fb ok';
    return;
  }

  const note = recordedNotes[playbackIndex];
  const vel = note.v || 100;
  const n = NOTES_DATA.find(x => x.m === note.m);
  if (n) {
    playNoteSound(note.m, vel);
    sendMIDINoteOn(note.m, vel); // 发送MIDI输出（带力度）
    activePhantoms.push({ note: n, alpha: 0.8, x: 300 });
    startPhantomLoop();
    highlightKey(note.m, 'ch');
    // 发送MIDI Note Off
    setTimeout(() => {
      highlightKey(note.m, 'kd');
      sendMIDINoteOff(note.m);
    }, 150);
  }

  fb.textContent = '▶ ' + (playbackIndex + 1) + '/' + recordedNotes.length;
  playbackIndex++;

  // 计算下一个音符的延迟
  let delay = 400;
  if (playbackIndex < recordedNotes.length) {
    delay = recordedNotes[playbackIndex].t - note.t;
    delay = Math.max(100, Math.min(2000, delay)); // 限制在100ms-2000ms之间
  }

  playbackTimeout = setTimeout(playNextNote, delay);
}

function stopPlayback() {
  isPlaying = false;
  if (playbackTimeout) {
    clearTimeout(playbackTimeout);
    playbackTimeout = null;
  }
  const playBtnEl2 = document.getElementById('playBtn');
  if (playBtnEl2) playBtnEl2.textContent = '▶';
  clearPianoKeysClasses();
}

function saveCurrentRecording() {
  if (recordedNotes.length === 0) {
    fb.textContent = '❌ 没有可保存的录音';
    fb.className = 'fb no';
    return;
  }

  const name = prompt('给这首曲子起个名字：', '我的作品 ' + (savedSongs.length + 1));
  if (!name) return;

  const song = {
    name: name,
    notes: recordedNotes.map(n => n.m), // 只存midi数组
    timings: recordedNotes.map(n => n.t), // 存时间轴
    velocities: recordedNotes.map(n => n.v || 100), // 存力度
    date: new Date().toLocaleDateString()
  };

  savedSongs.push(song);
  localStorage.setItem('piano_recordings', JSON.stringify(savedSongs));
  updateSongListUI();

  fb.textContent = '💾 "' + name + '" 已保存！';
  fb.className = 'fb ok';
}

function deleteRecording(index) {
  if (confirm('确定删除这首曲子？')) {
    const name = savedSongs[index].name;
    savedSongs.splice(index, 1);
    localStorage.setItem('piano_recordings', JSON.stringify(savedSongs));
    updateSongListUI();
    fb.textContent = '🗑️ "' + name + '" 已删除';
    fb.className = 'fb';
  }
}

function playSavedRecording(index) {
  const song = savedSongs[index];
  if (!song) return;

  // 转换为带时间的格式播放
  const notesWithTime = song.notes.map((m, i) => ({
    m: m,
    t: song.timings ? song.timings[i] : i * 400,
    v: song.velocities ? song.velocities[i] : 100
  }));

  isPlaying = true;
  const playBtnEl = document.getElementById('playBtn');
  if (playBtnEl) playBtnEl.textContent = '⏸';

  fb.textContent = '▶ 播放: ' + song.name;
  fb.className = 'fb';

  // 直接播放
  playbackIndex = 0;
  const originalNotes = recordedNotes;
  recordedNotes = notesWithTime;

  playNextNote();

  // 播放完毕后恢复
  setTimeout(() => {
    recordedNotes = originalNotes;
  }, 100);
}

function updateSongListUI() {
  const listEl = document.getElementById('savedSongList');
  if (!listEl) return;

  if (savedSongs.length === 0) {
    listEl.innerHTML = '<div class="no-songs">还没有保存的曲目</div>';
    return;
  }

  listEl.innerHTML = savedSongs.map((song, i) => `
    <div class="saved-song-item">
      <span class="song-name" onclick="playSavedRecording(${i})">${song.name}</span>
      <span class="song-date">${song.date}</span>
      <button class="del-btn" onclick="deleteRecording(${i})">×</button>
    </div>
  `).join('');
}

function showRecordControls(show) {
  const controls = document.getElementById('RecordControls');
  if (controls) {
    controls.style.display = show ? 'flex' : 'none';
  }
}
