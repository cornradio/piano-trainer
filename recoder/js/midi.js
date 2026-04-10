// MIDI 键盘支持 (Web MIDI API)
let midiAccess = null;
let midiOutput = null; // MIDI 输出设备

function initMIDI() {
  if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
  } else {
    updateMidiStatus("❌ 您的浏览器不支持 Web MIDI API", "#c62828");
  }
}

function updateMidiStatus(text, connected) {
  const midiStatusEl = document.getElementById('midiStatus');
  if (midiStatusEl) {
    midiStatusEl.textContent = text;
    midiStatusEl.className = 'midi-status-bar ' + (connected ? 'connected' : 'disconnected');
  }
}

function onMIDISuccess(access) {
  midiAccess = access;

  let hasKeyboard = false;
  for (let input of midiAccess.inputs.values()) {
    input.onmidimessage = getMIDIMessage;
    hasKeyboard = true;
  }

  // 获取第一个输出设备
  for (let output of midiAccess.outputs.values()) {
    midiOutput = output;
    break;
  }

  // 更新MIDI状态
  if (typeof updateMidiStatus === 'function') {
    if (hasKeyboard && midiOutput) {
      updateMidiStatus("✅ MIDI 已连接 (输入+输出)", true);
    } else if (hasKeyboard) {
      updateMidiStatus("✅ MIDI 输入已连接", true);
    } else if (midiOutput) {
      updateMidiStatus("🎹 MIDI 输出已连接", false);
    } else {
      updateMidiStatus("🎹 未检测到 MIDI 设备", false);
    }
  }

  // 监听设备插拔状态
  midiAccess.onstatechange = (e) => {
    if (e.port.type === "input") {
      if (e.port.state === "connected") {
        e.port.onmidimessage = getMIDIMessage;
        if (typeof updateMidiStatus === 'function') {
          updateMidiStatus(`✅ MIDI 设备 "${e.port.name}" 已连接！`, true);
        }
      } else if (e.port.state === "disconnected") {
        if (typeof updateMidiStatus === 'function') {
          updateMidiStatus(`🎹 MIDI 设备 "${e.port.name}" 已断开`, false);
        }
      }
    } else if (e.port.type === "output") {
      // 刷新输出设备
      midiOutput = null;
      for (let output of midiAccess.outputs.values()) {
        midiOutput = output;
        break;
      }
    }
  };
}

function onMIDIFailure(msg) {
  console.warn("无法获取 MIDI 设备的访问权限: ", msg);
  if (typeof updateMidiStatus === 'function') {
    updateMidiStatus("❌ MIDI 权限失败，请检查浏览器设置", false);
  }
}

function getMIDIMessage(message) {
  const command = message.data[0];
  const note = message.data[1];
  const velocity = (message.data.length > 2) ? message.data[2] : 100;

  // NOTE ON (144-159, velocity > 0)
  if (command >= 144 && command <= 159 && velocity > 0) {
    if (typeof handleKeyOn === 'function') {
      handleKeyOn(note, velocity);
    }
    // 兼容旧的 handleKeyTap（index.html 用）
    if (typeof handleKeyTap === 'function') {
      handleKeyTap(note, velocity);
    }
  }
  // NOTE OFF (128-143)
  else if (command >= 128 && command <= 143) {
    if (typeof handleKeyOff === 'function') {
      handleKeyOff(note, velocity);
    }
  }
}

// 发送 MIDI 音符到输出设备
function sendMIDINoteOn(note, velocity = 100) {
  if (midiOutput) {
    // 应用力度增幅
    let actualVelocity = velocity;
    if (typeof getVelocityBoost === 'function') {
      const boost = getVelocityBoost();
      if (boost !== 0) {
        actualVelocity = Math.min(127, velocity + boost);
      }
    }
    midiOutput.send([144, note, actualVelocity]);
  }
}

// 发送 MIDI 音符关闭
function sendMIDINoteOff(note) {
  if (midiOutput) {
    midiOutput.send([128, note, 0]);
  }
}
