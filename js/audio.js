// 炒粉大师 — 音效系统（Web Audio API 程序化生成）

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.3;
  }

  // 懒初始化（需要用户交互后才能创建 AudioContext）
  _init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // 创建增益节点
  _gain(value = this.volume) {
    const gain = this.ctx.createGain();
    gain.gain.value = value;
    gain.connect(this.ctx.destination);
    return gain;
  }

  // 播放噪声（用于翻炒滋滋声）
  playSizzle() {
    if (!this.enabled) return;
    this._init();
    const duration = 0.15;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      // 带衰减的褐色噪声
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize) * 0.3;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    // 带通滤波器 — 模拟油炸声
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3000 + Math.random() * 2000;
    filter.Q.value = 0.5;

    source.connect(filter);
    filter.connect(this._gain(this.volume * 0.4));
    source.start();
  }

  // 食材入锅声
  playDrop() {
    if (!this.enabled) return;
    this._init();
    const osc = this.ctx.createOscillator();
    const gain = this._gain(this.volume * 0.5);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(this.volume * 0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);

    osc.connect(gain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  // Perfect 音效
  playPerfect() {
    if (!this.enabled) return;
    this._init();
    const notes = [523, 659, 784]; // C5, E5, G5 和弦
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this._gain(this.volume * 0.3);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, this.ctx.currentTime + i * 0.08);
      gain.gain.linearRampToValueAtTime(
        this.volume * 0.3,
        this.ctx.currentTime + i * 0.08 + 0.05
      );
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        this.ctx.currentTime + i * 0.08 + 0.4
      );
      osc.connect(gain);
      osc.start(this.ctx.currentTime + i * 0.08);
      osc.stop(this.ctx.currentTime + i * 0.08 + 0.4);
    });
  }

  // Good 音效
  playGood() {
    if (!this.enabled) return;
    this._init();
    const osc = this.ctx.createOscillator();
    const gain = this._gain(this.volume * 0.4);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.setValueAtTime(554, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(this.volume * 0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  // Miss 音效
  playMiss() {
    if (!this.enabled) return;
    this._init();
    const osc = this.ctx.createOscillator();
    const gain = this._gain(this.volume * 0.3);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(this.volume * 0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  // 出餐音效
  playServe() {
    if (!this.enabled) return;
    this._init();
    // 叮叮声
    const frequencies = [1047, 1319, 1568, 2093]; // C6, E6, G6, C7
    frequencies.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this._gain(this.volume * 0.25);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = this.ctx.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(this.volume * 0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + 0.5);
    });
  }

  // 倒计时警告声
  playTick() {
    if (!this.enabled) return;
    this._init();
    const osc = this.ctx.createOscillator();
    const gain = this._gain(this.volume * 0.2);
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(this.volume * 0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
    osc.connect(gain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  // 游戏结束音效
  playGameOver() {
    if (!this.enabled) return;
    this._init();
    const notes = [784, 659, 523, 392]; // G5, E5, C5, G4 下行
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this._gain(this.volume * 0.3);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = this.ctx.currentTime + i * 0.2;
      gain.gain.setValueAtTime(this.volume * 0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  }

  // Combo 连击音效
  playCombo(level) {
    if (!this.enabled) return;
    this._init();
    const baseFreq = 523 + level * 50; // 连击越高音越高
    const osc = this.ctx.createOscillator();
    const gain = this._gain(this.volume * 0.35);
    osc.type = 'square';
    osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
    osc.frequency.setValueAtTime(baseFreq * 1.5, this.ctx.currentTime + 0.05);
    osc.frequency.setValueAtTime(baseFreq * 2, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(this.volume * 0.35, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
    osc.connect(gain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }
}
