// 五线谱绘制模块
function drawGameStaff(mode, rightNote, leftNote, isDone, feedbackState, wrongNote = null, phantoms = [], canvasEl) {
  const staffCanvas = canvasEl || document.getElementById('S');
  if (!staffCanvas) return;
  const ctx = staffCanvas.getContext('2d');

  // 固定逻辑宽高，进行缩放以保持比例清晰
  // 单音符模式只用较短宽度，够容纳谱号+音符+一些余白即可
  const logicW = 240;
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

  // 保护：如果音符不存在，清除画布后返回
  const hasRightNote = rightNote && rightNote.m !== undefined;
  const hasLeftNote = leftNote && leftNote.m !== undefined;
  if (isBoth) {
    if (!hasRightNote && !hasLeftNote) {
      ctx.clearRect(0, 0, W, H);
      return;
    }
  } else if (!hasRightNote && !hasLeftNote) {
    ctx.clearRect(0, 0, W, H);
    return;
  }

  if (isBoth) {
    const tyTop = 50;
    const tyBot = 160;
    drawGrandStaffBrace(ctx, tyTop, tyBot, logicW);
    drawStaffBase(ctx, tyTop, rightNote, 't', logicW, nColor, (wrongNote && wrongNote.m >= 60 ? wrongNote : null), phantoms.filter(p => (p.noteM || p.note.m) >= 60));
    drawStaffBase(ctx, tyBot, leftNote, 'b', logicW, nColor, (wrongNote && wrongNote.m < 60 ? wrongNote : null), phantoms.filter(p => (p.noteM || p.note.m) < 60));
  } else if (mode === 'rh') {
    const ty = 100;
    drawStaffBase(ctx, ty, rightNote, 't', logicW, nColor, wrongNote, phantoms);
  } else {
    const ty = 90;
    drawStaffBase(ctx, ty, leftNote, 'b', logicW, nColor, wrongNote, phantoms);
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

function drawStaffBase(ctx, ty, note, clef, W, noteColor, wrongNote = null, phantoms = []) {
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
    drawStaffNote(ctx, note, ty, W * 0.6, clef, noteColor, 1.0);
  }

  // 画用户弹错的那个音符【虚影模式】：在同一条竖线上呈现半透明红色
  if (wrongNote) {
    drawStaffNote(ctx, wrongNote, ty, W * 0.6, clef, '#ef5350', 0.4);
  }

  // 画乱点模式下的所有淡出虚影
  phantoms.forEach(phantom => {
    drawStaffNote(ctx, phantom.note, ty, phantom.x, clef, '#1976d2', phantom.alpha);
  });
}

function drawStaffNote(ctx, note, ty, px, clef, noteColor, alpha = 1.0) {
  if (alpha < 1.0) ctx.globalAlpha = alpha; // 设置淡出透明度
  
  // 核心修复：根据当前是显示“升号”还是“降号”，决定符头画在哪个位置
  let dy;
  if (clef === 't') {
    dy = note.useFlat ? (note.td_f !== undefined ? note.td_f : note.td) : (note.td_s !== undefined ? note.td_s : note.td);
  } else {
    dy = note.useFlat ? (note.bd_f !== undefined ? note.bd_f : note.bd) : (note.bd_s !== undefined ? note.bd_s : note.bd);
  }
  
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
    // 井号/降号位置
    const symbol = note.useFlat ? '♭' : '♯';
    const offset = note.useFlat ? 5 : 8; // 降号稍微胖一点，偏置自适应
    ctx.fillText(symbol, px - sw - offset, y + 7);
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

  if (alpha < 1.0) ctx.globalAlpha = 1.0; // 恢复透明度
}
