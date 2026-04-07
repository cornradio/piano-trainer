// 五线谱绘制模块
const staffCanvas = document.getElementById('S');

function drawGameStaff(mode, rightNote, leftNote, isDone, feedbackState) {
  if (!staffCanvas) return;
  const ctx = staffCanvas.getContext('2d');

  // 固定逻辑宽高，进行缩放以保持比例清晰
  const logicW = 600;
  const logicH = 260; 

  const dpr = window.devicePixelRatio || 1;
  const rect = staffCanvas.getBoundingClientRect();
  const W = rect.width || logicW;
  const H = rect.height || logicH;

  staffCanvas.width = W * dpr;
  staffCanvas.height = H * dpr;
  
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  
  // 基于宽度或者高度的自适应缩放策略
  const scale = Math.min(W / logicW, H / logicH) || 1;
  
  // 使内容在 canvas 居中
  const dx = (W - logicW * scale) / 2;
  const dy = (H - logicH * scale) / 2;
  ctx.translate(dx, dy);
  ctx.scale(scale, scale);
  
  ctx.clearRect(-dx/scale, -dy/scale, W/scale, H/scale);

  // 计算音符颜色
  let nColor = '#e53935'; 
  if (isDone) {
    nColor = feedbackState === 'ok' ? '#2e7d32' : '#d32f2f';
  } else {
    nColor = '#1976d2'; 
  }

  // 分析绘制模式与位置
  const isBoth = mode === 'both';
  
  if (isBoth) {
    const tyTop = 50;  
    const tyBot = 160; 
    drawGrandStaffBrace(ctx, tyTop, tyBot, logicW);
    drawStaffBase(ctx, tyTop, rightNote, 't', logicW, nColor);
    drawStaffBase(ctx, tyBot, leftNote, 'b', logicW, nColor);
  } else if (mode === 'rh') {
    const ty = 100;
    drawStaffBase(ctx, ty, rightNote, 't', logicW, nColor);
  } else {
    const ty = 90;
    drawStaffBase(ctx, ty, leftNote, 'b', logicW, nColor);
  }
}

function drawGrandStaffBrace(ctx, tyTop, tyBot, W) {
  const lx = 40;
  ctx.strokeStyle = '#546e7a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(lx, tyTop);
  ctx.lineTo(lx, tyBot + 56);
  ctx.stroke();
  
  ctx.font = '86px serif';
  ctx.fillStyle = '#546e7a';
  ctx.fillText('{', lx - 28, tyTop + ((tyBot - tyTop) / 2) + 50);
}

function drawStaffBase(ctx, ty, note, clef, W, noteColor) {
  const lx = 40;
  const rx = W - 20;

  // 画5条线
  ctx.strokeStyle = '#546e7a';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 5; i++) {
    const y = ty + i * 14;
    ctx.beginPath();
    ctx.moveTo(lx, y);
    ctx.lineTo(rx, y);
    ctx.stroke();
  }

  // 谱号更贴近现实的大小
  ctx.fillStyle = '#263238';
  if (clef === 't') {
    ctx.font = '95px serif';
    ctx.fillText('𝄞', lx + 2, ty + 70); 
  } else {           
    ctx.font = '68px serif';
    ctx.fillText('𝄢', lx + 8, ty + 47);
  }

  // 画音符
  if (note) {
    drawStaffNote(ctx, note, ty, W * 0.6, clef, noteColor);
  }
}

function drawStaffNote(ctx, note, ty, px, clef, noteColor) {
  const dy = clef === 't' ? note.td : note.bd;
  const y = ty + dy;
  const lw = 22; 

  ctx.strokeStyle = '#546e7a';
  ctx.lineWidth = 1.5;

  if (clef === 't') {
    if (dy >= 70) { 
      for (let ld = 70; ld <= dy; ld += 14) { 
        ctx.beginPath(); ctx.moveTo(px - lw, ty + ld); ctx.lineTo(px + lw, ty + ld); ctx.stroke(); 
      }
    }
    if (dy <= -14) { 
      for (let ld = -14; ld >= dy; ld -= 14) { 
        ctx.beginPath(); ctx.moveTo(px - lw, ty + ld); ctx.lineTo(px + lw, ty + ld); ctx.stroke(); 
      }
    }
  } else {
    if (dy >= 70) { 
      for (let ld = 70; ld <= dy; ld += 14) { 
        ctx.beginPath(); ctx.moveTo(px - lw, ty + ld); ctx.lineTo(px + lw, ty + ld); ctx.stroke(); 
      }
    }
    if (dy <= -14) { 
      for (let ld = -14; ld >= dy; ld -= 14) { 
        ctx.beginPath(); ctx.moveTo(px - lw, ty + ld); ctx.lineTo(px + lw, ty + ld); ctx.stroke(); 
      }
    }
  }

  let nx = px;
  if (note.b) {
    ctx.fillStyle = noteColor;
    ctx.font = 'bold 22px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    const sw = ctx.measureText('♯').width;
    // 井号只往左移，不改变符头原本所在的 nx 位置 (This prevents overlapping)
    ctx.fillText('♯', px - sw - 8, y + 7);
  }

  ctx.fillStyle = noteColor;
  ctx.beginPath();
  ctx.ellipse(nx, y, 12, 9, -0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = noteColor;
  ctx.lineWidth = 2.5;
  if (clef === 't') {
    if (dy >= 28) { 
      ctx.beginPath(); ctx.moveTo(nx + 10, y); ctx.lineTo(nx + 10, y - 48); ctx.stroke();
    } else {       
      ctx.beginPath(); ctx.moveTo(nx - 10, y); ctx.lineTo(nx - 10, y + 48); ctx.stroke();
    }
  } else {
    if (dy >= 28) {
      ctx.beginPath(); ctx.moveTo(nx + 10, y); ctx.lineTo(nx + 10, y - 48); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(nx - 10, y); ctx.lineTo(nx - 10, y + 48); ctx.stroke();
    }
  }
}
