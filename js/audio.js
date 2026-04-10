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

  // 开启持续播放的油煎声
  playSizzle(intensity = 1) {
    if (!this.enabled) return;
    this._init();
    
    // 更新已有音量
    if (this._sizzleGain) {
      this._sizzleGain.gain.setTargetAtTime(this.volume * 0.4 * intensity, this.ctx.currentTime, 0.1);
      return;
    }

    const duration = 2.0;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3; // 持平的白噪声
    }

    this._sizzleSource = this.ctx.createBufferSource();
    this._sizzleSource.buffer = buffer;
    this._sizzleSource.loop = true; // 循环播放

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 4000;
    filter.Q.value = 0.5;

    this._sizzleGain = this._gain(this.volume * 0.4 * intensity);
    this._sizzleSource.connect(filter);
    filter.connect(this._sizzleGain);
    this._sizzleSource.start();
  }

  // 停止油煎声
  stopSizzle() {
    if (this._sizzleSource) {
      this._sizzleGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      setTimeout(() => {
        if (this._sizzleSource) {
          this._sizzleSource.stop();
          this._sizzleSource.disconnect();
          this._sizzleSource = null;
          this._sizzleGain = null;
        }
      }, 150);
    }
  }

  // 真实的颠锅音效（金属碰撞 + 食材摩擦）
  playToss(force = 1) {
    if (!this.enabled) return;
    this._init();
    
    const t = this.ctx.currentTime;
    const actualForce = Math.min(1.5, Math.max(0.3, force)); // 约束力度范围
    
    // 1. 低频碰撞重击声 (Wok thud) 模拟锅底碰到灶台或颠起瞬间的发力
    const thud = this.ctx.createOscillator();
    const thudGain = this._gain(this.volume * 0.7 * actualForce);
    thud.type = 'sine';
    thud.frequency.setValueAtTime(180, t);
    thud.frequency.exponentialRampToValueAtTime(40, t + 0.1);
    thudGain.gain.setValueAtTime(this.volume * 0.7 * actualForce, t);
    thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    thud.connect(thudGain);
    thud.start(t);
    thud.stop(t + 0.15);

    // 2. 金属撞击/食材在铁锅刮擦的宽频噪音 (Crash/Scrape)
    const bufferSize = this.ctx.sampleRate * 0.25; 
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    // 使用带通滤波器塑造金属脆擦声
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 3200;
    noiseFilter.Q.value = 1.0;
    
    const noiseGain = this._gain(this.volume * 0.8 * actualForce);
    noiseGain.gain.setValueAtTime(this.volume * 0.8 * actualForce, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25); // 噪音衰减
    
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noise.start(t);

    // 3. 铁锅的金属共振和余震 (Metallic Ringing)
    const ringFreqs = [750, 1800, 3100]; // 不和谐金属相差频率
    ringFreqs.forEach((freq) => {
      const ring = this.ctx.createOscillator();
      const rGain = this._gain(this.volume * 0.15 * actualForce);
      ring.type = 'triangle'; // 三角波适合做金属闷声
      ring.frequency.setValueAtTime(freq, t);
      // 让部分频率稍微滑动模拟多普勒/结构变形音
      ring.frequency.exponentialRampToValueAtTime(freq * 0.95, t + 0.3);
      
      rGain.gain.setValueAtTime(this.volume * 0.15 * actualForce, t);
      rGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3); // 尾音
      ring.connect(rGain);
      ring.start(t);
      ring.stop(t + 0.3);
    });
  }

  // 成功别名
  playSuccess() {
    this.playServe();
  }

  // 调料判定别名
  playSeasoning(type) {
    if (type === 'perfect') this.playPerfect();
    else if (type === 'good') this.playGood();
    else this.playMiss();
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
