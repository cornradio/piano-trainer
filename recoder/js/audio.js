// Web Audio API 简易声音合成
let audioCtx = null;
let soundEnabled = true;
let velocityBoost = 0; // 音量增幅，0表示不增幅

function initAudio() {
  if (soundEnabled && !audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function m2f(m) {
  return Math.pow(2, (m - 69) / 12) * 440;
}

function playNoteSound(m, velocity = 100) {
  if (!soundEnabled) return;
  initAudio();
  if (!audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  // 使用三角波合成清脆的类似电子琴的声音
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(m2f(m), audioCtx.currentTime);

  // 根据力度计算音量 (0-127 转 0-1)，并应用力度增幅
  let actualVelocity = velocity;
  if (velocityBoost !== 0) {
    // 直接加到力度上
    actualVelocity = Math.min(127, velocity + velocityBoost);
  }
  const vol = Math.min(1, (actualVelocity / 127) * 0.7);

  // 包络线形成敲击感与衰减
  gain.gain.setValueAtTime(0, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(vol, audioCtx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + 1.3);
}

function setSoundEnabled(val) {
  soundEnabled = val === 'on';
}

function setVelocityBoost(val) {
  velocityBoost = val;
  localStorage.setItem('piano_velocity_boost', val);
}

function getVelocityBoost() {
  return velocityBoost;
}
