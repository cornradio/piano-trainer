// 程序总入口
let currentDifficulty = 'easy';

document.addEventListener('DOMContentLoaded', () => {
  // 1. 初始化钢琴键盘
  initPiano(handleKeyTap);

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

  // 4. 开启第一局
  setGameMode('rh', currentDifficulty);

  // 5. 处理屏幕缩放、翻转时的重绘画布请求
  window.addEventListener('resize', () => {
    renderCanvas();
  });
});
