// 键盘渲染和事件监听
const PI = document.getElementById('PI');

function initPiano(onKeyTap, minK = 48, maxK = 84) {
  if (!PI) return;
  PI.innerHTML = '';
  
  // 核心改动：不再依赖绝对像素进行位置测量，借助 Flexbox 让 CSS 引擎完美分配位置和自适应宽度

  const ns = NOTES_DATA.filter(x => x.m >= minK && x.m <= maxK);
  const w = ns.filter(x => !x.b);
  const k = ns.filter(x => x.b);

  w.forEach(n => {
    const d = document.createElement('div');
    d.className = 'wk';
    d.dataset.m = n.m;
    d.innerHTML = `<span class="lb">${n.n}</span>`;

    // 查找该白键右侧是否带有黑键 (黑键 MIDI = 白键 MIDI + 1)
    const hasBlack = k.find(bk => bk.m === n.m + 1);

    if (hasBlack) {
      const bD = document.createElement('div');
      bD.className = 'bk';
      bD.dataset.m = hasBlack.m;
      bD.innerHTML = `<span class="lb">${hasBlack.n}</span>`;
      
      bD.addEventListener('pointerdown', (e) => {
        e.stopPropagation(); // 阻止事件冒泡到白键
        const vel = e.pressure ? Math.round(e.pressure * 127) : 80 + Math.floor(Math.random() * 30);
        onKeyTap(e, parseInt(hasBlack.m), vel);
      });

      d.appendChild(bD);
    }

    d.addEventListener('pointerdown', (e) => {
      const vel = e.pressure ? Math.round(e.pressure * 127) : 80 + Math.floor(Math.random() * 30);
      onKeyTap(e, parseInt(n.m), vel);
    });
    PI.appendChild(d);
  });
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
