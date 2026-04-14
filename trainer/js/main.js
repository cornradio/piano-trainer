// 程序总入口
let currentDifficulty = 'easy';

// 全屏功能
function setupFullscreen() {
  const btn = document.getElementById('FullscreenBtn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        btn.classList.add('active');
      }).catch(err => {
        console.log('全屏失败:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        btn.classList.remove('active');
      });
    }
  });

  // 监听全屏变化事件
  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// 键盘显示/隐藏功能
function setupKeyboardToggle() {
  const btn = document.getElementById('KeyboardToggleBtn');
  const pianoWrapper = document.querySelector('.piano-wrapper');
  if (!btn || !pianoWrapper) return;

  btn.addEventListener('click', () => {
    pianoWrapper.classList.toggle('hidden');
    btn.classList.toggle('hidden');
    // 更新aria-label
    btn.setAttribute('aria-label', pianoWrapper.classList.contains('hidden') ? '显示键盘' : '隐藏键盘');
  });
}

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

function openSettings() {
  document.getElementById('SettingsPanel')?.classList.add('open');
  document.getElementById('SettingsOverlay')?.classList.add('open');
}

function closeSettings() {
  document.getElementById('SettingsPanel')?.classList.remove('open');
  document.getElementById('SettingsOverlay')?.classList.remove('open');
}

document.addEventListener('DOMContentLoaded', () => {
  // 初始化全屏按钮
  setupFullscreen();

  // 初始化键盘显示/隐藏按钮
  setupKeyboardToggle();

  const saved = loadSettings();

  // 1. 初始化钢琴键盘
  initPiano(handleKeyTap);

  // 初始化物理 MIDI 键盘检测
  initMIDI();

  // 初始化手动范围选择器内容
  const sNote = document.getElementById('startNote');
  const eNote = document.getElementById('endNote');
  if (sNote && eNote) {
    const whiteNotes = NOTES_DATA.filter(n => !n.b);
    whiteNotes.forEach(n => {
      sNote.add(new Option(n.n, n.m));
      eNote.add(new Option(n.n, n.m));
    });
    sNote.value = (saved && saved.customMin) || 60;
    eNote.value = (saved && saved.customMax) || 72;
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

  // 2. 设置面板开关
  const settingsBtn = document.getElementById('SettingsBtn');
  const closeBtn = document.getElementById('CloseSettingsBtn');
  const overlay = document.getElementById('SettingsOverlay');

  settingsBtn?.addEventListener('click', openSettings);
  closeBtn?.addEventListener('click', closeSettings);
  overlay?.addEventListener('click', closeSettings);

  // 3. 绑定难度切换
  document.getElementById('DiffBox').addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    currentDifficulty = btn.dataset.d;

    document.querySelectorAll('#DiffBox button').forEach(x => x.classList.remove('on'));
    btn.classList.add('on');

    const curModeBtn = document.querySelector('#RB button.on');
    const curMode = curModeBtn ? curModeBtn.dataset.r : 'rh';

    const customUI = document.getElementById('CustomRangeUI');
    if (customUI) customUI.style.display = (currentDifficulty === 'custom') ? 'block' : 'none';

    setGameMode(curMode, currentDifficulty);
    saveSettings();
  });

  // 4. 绑定声音开关
  document.getElementById('SoundBox').addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    setSoundEnabled(btn.dataset.s);

    document.querySelectorAll('#SoundBox button').forEach(x => x.classList.remove('on'));
    btn.classList.add('on');

    initAudio();
    saveSettings();
  });

  // 5. 绑定练习模式切换
  document.getElementById('RB').addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;

    const newMode = btn.dataset.r;

    document.querySelectorAll('#RB button').forEach(x => x.classList.remove('on'));
    btn.classList.add('on');

    setGameMode(newMode, currentDifficulty);
    saveSettings();
  });

  // 6. 绑定升降号开关
  document.getElementById('AccidBox').addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const val = btn.dataset.a;
    setAccidentals(val === 'on');
    e.currentTarget.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === btn));
    saveSettings();
  });

  // 7. 应用保存的设置
  if (saved) {
    currentDifficulty = saved.difficulty;
    setSoundEnabled(saved.sound);
    setAccidentals(saved.accid === 'on');

    document.querySelectorAll('#DiffBox button').forEach(b => b.classList.toggle('on', b.dataset.d === saved.difficulty));
    document.querySelectorAll('#RB button').forEach(b => b.classList.toggle('on', b.dataset.r === saved.mode));
    document.querySelectorAll('#SoundBox button').forEach(b => b.classList.toggle('on', b.dataset.s === saved.sound));
    document.querySelectorAll('#AccidBox button').forEach(b => b.classList.toggle('on', b.dataset.a === saved.accid));

    const customUI = document.getElementById('CustomRangeUI');
    if (customUI) customUI.style.display = (currentDifficulty === 'custom') ? 'block' : 'none';

    setGameMode(saved.mode, saved.difficulty);
  } else {
    setGameMode('rh', currentDifficulty);
  }

  // 8. 画布重置
  window.addEventListener('resize', () => {
    setTimeout(() => {
      renderCanvas();
    }, 150);
  });
});
