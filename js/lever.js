// 炒粉大师 — 操作杆控制器

export class LeverControl {
  constructor(container) {
    this.container = container;

    // 操作杆状态
    this.value = 0;           // 0=底部, 1=顶部
    this.velocity = 0;        // 推动速度
    this.isDragging = false;

    // 回调
    this._onToss = null;
    this._onChange = null;

    // 创建 DOM
    this._createDOM();
    // 绑定事件
    this._bindEvents();
  }

  _createDOM() {
    this.el = document.createElement('div');
    this.el.id = 'lever-control';
    this.el.classList.add('hidden');
    this.el.innerHTML = `
      <div class="lever-track" id="lever-track">
        <div class="lever-glow"></div>
        <div class="lever-fill" id="lever-fill"></div>
        <div class="lever-knob" id="lever-knob">
          <div class="lever-knob-inner">
            <span class="lever-knob-grip"></span>
            <span class="lever-knob-grip"></span>
            <span class="lever-knob-grip"></span>
          </div>
        </div>
        <div class="lever-markers">
          <div class="lever-marker"></div>
          <div class="lever-marker"></div>
          <div class="lever-marker"></div>
          <div class="lever-marker"></div>
        </div>
      </div>
      <div class="lever-label">↑ 颠锅</div>
    `;
    this.container.appendChild(this.el);

    this.track = this.el.querySelector('#lever-track');
    this.knob = this.el.querySelector('#lever-knob');
    this.fill = this.el.querySelector('#lever-fill');
  }

  _bindEvents() {
    let lastY = 0;
    let lastTime = 0;
    let velocitySamples = [];

    const getClientY = (e) => {
      return e.touches ? e.touches[0].clientY : e.clientY;
    };

    const onDown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.isDragging = true;
      lastY = getClientY(e);
      lastTime = performance.now();
      velocitySamples = [];
      this.knob.classList.add('active');
      this.el.classList.add('dragging');
    };

    const onMove = (e) => {
      if (!this.isDragging) return;
      e.preventDefault();
      e.stopPropagation();

      const clientY = getClientY(e);
      const rect = this.track.getBoundingClientRect();
      const trackHeight = rect.height - 48; // 减去 knob 高度
      const relY = rect.bottom - 24 - clientY; // 从底部计算
      this.value = Math.max(0, Math.min(1, relY / trackHeight));

      // 计算瞬时速度
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      if (dt > 0) {
        const instantVel = (lastY - clientY) / dt; // 正值=向上
        velocitySamples.push(instantVel);
        if (velocitySamples.length > 5) velocitySamples.shift();
      }
      lastY = clientY;
      lastTime = now;

      this._updateVisual();
      if (this._onChange) this._onChange(this.value);
    };

    const onUp = (e) => {
      if (!this.isDragging) return;
      e.preventDefault?.();
      this.isDragging = false;
      this.knob.classList.remove('active');
      this.el.classList.remove('dragging');

      // 计算平均速度
      const avgVel =
        velocitySamples.length > 0
          ? velocitySamples.reduce((a, b) => a + b, 0) / velocitySamples.length
          : 0;

      // 判断颠锅：速度够快 + 位置够高
      if (avgVel > 150 && this.value > 0.2) {
        const force = Math.min(1, avgVel / 800);
        if (this._onToss) this._onToss(force);
      }

      // 回弹动画
      this._animateReturn();
    };

    // 触摸事件
    this.track.addEventListener('touchstart', onDown, { passive: false });
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp, { passive: false });

    // 鼠标事件
    this.track.addEventListener('mousedown', onDown);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  _updateVisual() {
    const pct = this.value * 100;
    this.knob.style.bottom = `calc(${pct}% - 24px)`;
    this.fill.style.height = `${pct}%`;

    // 操作杆颜色随力度变化
    if (this.value > 0.6) {
      this.fill.style.background =
        'linear-gradient(to top, #ff6b35, #ffd700)';
    } else {
      this.fill.style.background =
        'linear-gradient(to top, #ff6b35, #ff9f1c)';
    }
  }

  _animateReturn() {
    const animate = () => {
      if (this.isDragging) return;
      this.value *= 0.82;
      if (this.value < 0.008) this.value = 0;
      this._updateVisual();
      if (this._onChange) this._onChange(this.value);
      if (this.value > 0) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }

  // 注册颠锅回调
  onToss(callback) {
    this._onToss = callback;
  }

  // 注册操作杆值变化回调
  onChange(callback) {
    this._onChange = callback;
  }

  show() {
    this.el.classList.remove('hidden');
  }

  hide() {
    this.el.classList.add('hidden');
    this.value = 0;
    this._updateVisual();
  }
}
