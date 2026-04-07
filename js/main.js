// 程序总入口
let currentDifficulty = 'easy';

document.addEventListener('DOMContentLoaded', () => {
  // 1. 初始化钢琴键盘
  initPiano(handleKeyTap);

  // 初始化物理 MIDI 键盘检测
  initMIDI();

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
    setGameMode(curMode, currentDifficulty);
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
  });

  // 4. 绑定练习模式切换按钮，根据不同需求重置练习
  document.getElementById('RB').addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;

    const newMode = btn.dataset.r;

    document.querySelectorAll('#RB button').forEach(x => x.classList.remove('on'));
    btn.classList.add('on');

    setGameMode(newMode, currentDifficulty);
  });

  // 4. 绑定升降号开关
  document.getElementById('AccidBox').addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const val = btn.dataset.a;
    setAccidentals(val === 'on');
    e.currentTarget.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === btn));
  });

  // 5. 开启第一局
  setGameMode('rh', currentDifficulty);

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
