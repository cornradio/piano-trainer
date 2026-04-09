// Web Audio API 简易声音合成
let audioCtx = null;
let soundEnabled = true;

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

function playNoteSound(m) {
  if (!soundEnabled) return;
  initAudio();
  if (!audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  // 使用三角波合成清脆的类似电子琴的声音
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(m2f(m), audioCtx.currentTime);
  
  // 包络线形成敲击感与衰减
  gain.gain.setValueAtTime(0, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0.6, audioCtx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + 1.3);
}

function setSoundEnabled(val) {
  soundEnabled = val === 'on';
}
