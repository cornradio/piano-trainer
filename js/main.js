// 程序总入口
let currentDifficulty = 'easy';

const SETTINGS_KEY = 'piano_trainer_v1_settings';

function saveSettings() {
  const sNote = document.getElementById('startNote');
  const eNote = document.getElementById('endNote');
  const settings = {
    difficulty: currentDifficulty,
    mode: document.querySelector('#RB button.on')?.dataset.r || 'rh',
    sound: document.querySelector('#SoundBox button.on')?.dataset.s || 'on',
    accid: document.querySelector('#AccidBox button.on')?.dataset.a || 'on',
    customMin: parseInt(sNote ? sNote.value : 60),
    customMax: parseInt(eNote ? eNote.value : 72)
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function loadSettings() {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch(e) { return null; }
}

document.addEventListener('DOMContentLoaded', () => {
  const saved = loadSettings();
  // 1. 初始化钢琴键盘
  initPiano(handleKeyTap);

  // 初始化物理 MIDI 键盘检测
  initMIDI();

  // 初始化手动范围选择器内容 (仅展示白键作为锚点)
  const sNote = document.getElementById('startNote');
  const eNote = document.getElementById('endNote');
  if (sNote && eNote) {
    // NOTES_DATA 已在 config.js 定义
    const whiteNotes = NOTES_DATA.filter(n => !n.b);
    whiteNotes.forEach(n => {
      sNote.add(new Option(n.n, n.m));
      eNote.add(new Option(n.n, n.m));
    });
    sNote.value = (saved && saved.customMin) || 60; // C4
    eNote.value = (saved && saved.customMax) || 72; // C5
    setCustomRange(parseInt(sNote.value), parseInt(eNote.value));
    
    [sNote, eNote].forEach(el => {
      el.addEventListener('change', () => {
        const min = Math.min(parseInt(sNote.value), parseInt(eNote.value));
        const max = Math.max(parseInt(sNote.value), parseInt(eNote.value));
        setCustomRange(min, max);
        saveSettings();
      });
    });
  }

  // 2. 绑定难度切换
  document.getElementById('DiffBox').addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    currentDifficulty = btn.dataset.d;
    
    document.querySelectorAll('#DiffBox button').forEach(x => x.classList.remove('on'));
    btn.classList.add('on');
    
    // 传入当前模式和新难度，重建键盘并重置游戏
    const curModeBtn = document.querySelector('#RB button.on');
    const curMode = curModeBtn ? curModeBtn.dataset.r : 'rh';
    
    // 显示/隐藏手动范围 UI
    const customUI = document.getElementById('CustomRangeUI');
    if (customUI) customUI.style.display = (currentDifficulty === 'custom') ? 'flex' : 'none';

    setGameMode(curMode, currentDifficulty);
    saveSettings();
  });

  // 3. 绑定声音开关
  document.getElementById('SoundBox').addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    setSoundEnabled(btn.dataset.s);
    
    document.querySelectorAll('#SoundBox button').forEach(x => x.classList.remove('on'));
    btn.classList.add('on');
    
    // 初始化 Audio Context (必须在用户交互事件内触发)
    initAudio();
    saveSettings();
  });

  // 4. 绑定练习模式切换按钮，根据不同需求重置练习
  document.getElementById('RB').addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;

    const newMode = btn.dataset.r;

    document.querySelectorAll('#RB button').forEach(x => x.classList.remove('on'));
    btn.classList.add('on');

    setGameMode(newMode, currentDifficulty);
    saveSettings();
  });

  // 4. 绑定升降号开关
  document.getElementById('AccidBox').addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const val = btn.dataset.a;
    setAccidentals(val === 'on');
    e.currentTarget.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === btn));
    saveSettings();
  });

  // 5. 应用保存的设置
  if (saved) {
    currentDifficulty = saved.difficulty;
    setSoundEnabled(saved.sound);
    setAccidentals(saved.accid === 'on');

    // 更新 UI 状态
    document.querySelectorAll('#DiffBox button').forEach(b => b.classList.toggle('on', b.dataset.d === saved.difficulty));
    document.querySelectorAll('#RB button').forEach(b => b.classList.toggle('on', b.dataset.r === saved.mode));
    document.querySelectorAll('#SoundBox button').forEach(b => b.classList.toggle('on', b.dataset.s === saved.sound));
    document.querySelectorAll('#AccidBox button').forEach(b => b.classList.toggle('on', b.dataset.a === saved.accid));
    
    const customUI = document.getElementById('CustomRangeUI');
    if (customUI) customUI.style.display = (currentDifficulty === 'custom') ? 'flex' : 'none';

    setGameMode(saved.mode, saved.difficulty);
  } else {
    // 开启第一局
    setGameMode('rh', currentDifficulty);
  }

  // 5. 处理屏幕翻转和大小变化的画布重置
  window.addEventListener('resize', () => {
    setTimeout(() => {
       renderCanvas();
    }, 150);
  });

  // 6. 横屏设置菜单面板 Toggle
  const toggleBtn = document.getElementById('ToggleMenuBtn');
  const closeBtn = document.getElementById('CloseMenuBtn');
  const controlsMenu = document.getElementById('ControlsMenu');
  
  if(toggleBtn && closeBtn && controlsMenu) {
    toggleBtn.addEventListener('click', () => {
      controlsMenu.classList.add('open');
    });
    closeBtn.addEventListener('click', () => {
      controlsMenu.classList.remove('open');
    });
  }
});
