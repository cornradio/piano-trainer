// 键盘渲染和事件监听
const PI = document.getElementById('PI');
const WK_W = 48, BK_W = 30;

function initPiano(onKeyTap, minK = 48, maxK = 84) {
  if (!PI) return;
  PI.innerHTML = '';
  // 根据传入的范围动态渲染键盘
  const ns = NOTES_DATA.filter(x => x.m >= minK && x.m <= maxK);
  const w = ns.filter(x => !x.b);
  const k = ns.filter(x => x.b);

  w.forEach(n => {
    const d = document.createElement('div');
    d.className = 'wk'; 
    d.dataset.m = n.m;
    d.innerHTML = `<span class="lb">${n.n}</span>`;
    d.addEventListener('pointerdown', (e) => onKeyTap(e, parseInt(n.m)));
    PI.appendChild(d);
  });

  k.forEach(n => {
    const base = n.n[0] + n.n.replace(/^[A-G]#/, '');
    const wi = w.findIndex(x => x.n === base);
    if (wi < 0) return;
    
    const d = document.createElement('div');
    d.className = 'bk'; 
    d.dataset.m = n.m;
    d.innerHTML = `<span class="lb">${n.n}</span>`;
    d.addEventListener('pointerdown', (e) => onKeyTap(e, parseInt(n.m)));
    
    d.style.left = (wi * WK_W + WK_W * 0.65) + 'px';
    d.style.top = '0';
    PI.appendChild(d);
  });

  PI.style.width = (w.length * WK_W) + 'px';

  // 稍微把滑条滚动到中间偏右一点，更贴近常见操作习惯
  setTimeout(() => {
    const pwBox = PI.parentElement;
    if (pwBox) {
      pwBox.scrollLeft = (pwBox.scrollWidth - pwBox.clientWidth) / 2;
    }
  }, 100);
}

function clearPianoKeysClasses() {
  PI.querySelectorAll('.wk, .bk').forEach(k => k.classList.remove('ch', 'wh', 'kd'));
}

function lockPianoKeys() {
  PI.querySelectorAll('.wk, .bk').forEach(k => k.classList.add('kd'));
}

function highlightKey(m, type) {
  const el = PI.querySelector(`[data-m="${m}"]`);
  if (el) el.classList.add(type);
}
