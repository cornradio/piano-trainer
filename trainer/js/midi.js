// MIDI 键盘支持 (Web MIDI API)
let midiAccess = null;

function initMIDI() {
  if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
  } else {
    updateMidiStatus("❌ 您的浏览器不支持 Web MIDI API", "#c62828");
  }
}

function updateMidiStatus(text, color) {
  const midiStatusEl = document.getElementById('midiStatus');
  if (midiStatusEl) {
    midiStatusEl.textContent = text;
    midiStatusEl.style.color = color || "#546e7a";
  }
}

function onMIDISuccess(access) {
  midiAccess = access;
  
  let hasKeyboard = false;
  for (let input of midiAccess.inputs.values()) {
    input.onmidimessage = getMIDIMessage;
    hasKeyboard = true;
  }
  
  if (hasKeyboard) {
    updateMidiStatus("✅ MIDI 设备已连接，可直接弹奏！", "#2e7d32");
  } else {
    updateMidiStatus("🎹 未检测到 MIDI 设备，请插上物理键盘", "#f57c00");
  }
  
  // 监听设备插拔状态
  midiAccess.onstatechange = (e) => {
    if (e.port.type === "input") {
      if (e.port.state === "connected") {
        e.port.onmidimessage = getMIDIMessage;
        updateMidiStatus(`✅ MIDI 设备 "${e.port.name}" 已连接！`, "#2e7d32");
      } else if (e.port.state === "disconnected") {
        updateMidiStatus(`🎹 MIDI 设备 "${e.port.name}" 已断开。`, "#c62828");
      }
    }
  };
}

function onMIDIFailure(msg) {
  console.warn("无法获取 MIDI 设备的访问权限: ", msg);
  updateMidiStatus("❌ 请求 MIDI 权限失败，请检查浏览器设置", "#c62828");
}

function getMIDIMessage(message) {
  const command = message.data[0];
  const note = message.data[1];
  const velocity = (message.data.length > 2) ? message.data[2] : 0;

  // MIDI 命令: NOTE ON (144 - 159 代表 Channel 1-16 的 Note On)
  // 一些物理键盘使用 Note On+力度为 0 来表示 Note Off
  if (command >= 144 && command <= 159) {
    if (velocity > 0) {
      if (typeof handleKeyTap === 'function') {
        // null 代表没有鼠标事件 e
        handleKeyTap(null, note);
      }
    }
  }
}
