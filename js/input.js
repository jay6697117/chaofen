// 炒粉大师 — 输入管理（鼠标 + 触摸手势识别）

export class InputManager {
  constructor(canvas, scaleFunc) {
    this.canvas = canvas;
    this.scaleFunc = scaleFunc; // 坐标转换函数

    // 当前状态
    this.isDown = false;
    this.pos = { x: 0, y: 0 };
    this.lastPos = { x: 0, y: 0 };
    this.downPos = { x: 0, y: 0 };

    // 手势追踪
    this.trail = []; // 最近的位置轨迹
    this.maxTrailLength = 30;
    this.angularSum = 0; // 累计角度变化
    this.lastAngle = null;
    this.circularCenter = { x: 0, y: 0 }; // 圆形手势的中心

    // 回调
    this._onTap = null;
    this._onStir = null;
    this._onDragStart = null;
    this._onDragEnd = null;

    this._bindEvents();
  }

  _bindEvents() {
    // 鼠标事件
    this.canvas.addEventListener('mousedown', (e) => this._handleDown(e));
    this.canvas.addEventListener('mousemove', (e) => this._handleMove(e));
    this.canvas.addEventListener('mouseup', (e) => this._handleUp(e));
    this.canvas.addEventListener('mouseleave', (e) => this._handleUp(e));

    // 触摸事件
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this._handleDown(e.touches[0]);
    }, { passive: false });
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      this._handleMove(e.touches[0]);
    }, { passive: false });
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this._handleUp(e.changedTouches[0]);
    }, { passive: false });
  }

  _getPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const raw = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    return this.scaleFunc ? this.scaleFunc(raw) : raw;
  }

  _handleDown(e) {
    this.isDown = true;
    this.pos = this._getPos(e);
    this.downPos = { ...this.pos };
    this.lastPos = { ...this.pos };
    this.trail = [{ ...this.pos }];
    this.angularSum = 0;
    this.lastAngle = null;

    if (this._onDragStart) {
      this._onDragStart(this.pos);
    }
  }

  _handleMove(e) {
    this.lastPos = { ...this.pos };
    this.pos = this._getPos(e);

    if (this.isDown) {
      this.trail.push({ ...this.pos });
      if (this.trail.length > this.maxTrailLength) {
        this.trail.shift();
      }

      // 计算圆形手势
      this._updateCircularMotion();
    }
  }

  _handleUp(e) {
    if (!this.isDown) return;
    this.isDown = false;

    // 判定是否为点击（移动距离很小）
    const dx = this.pos.x - this.downPos.x;
    const dy = this.pos.y - this.downPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 15 && this._onTap) {
      this._onTap(this.pos);
    }

    if (this._onDragEnd) {
      this._onDragEnd(this.pos);
    }

    this.trail = [];
    this.angularSum = 0;
    this.lastAngle = null;
  }

  // 计算圆形滑动进度
  _updateCircularMotion() {
    if (this.trail.length < 3) return;

    // 计算轨迹中心
    let sumX = 0, sumY = 0;
    for (const p of this.trail) {
      sumX += p.x;
      sumY += p.y;
    }
    this.circularCenter.x = sumX / this.trail.length;
    this.circularCenter.y = sumY / this.trail.length;

    // 计算当前点相对于中心的角度
    const dx = this.pos.x - this.circularCenter.x;
    const dy = this.pos.y - this.circularCenter.y;
    const currentAngle = Math.atan2(dy, dx);

    if (this.lastAngle !== null) {
      let delta = currentAngle - this.lastAngle;
      // 处理角度跳变（-π 到 π）
      if (delta > Math.PI) delta -= Math.PI * 2;
      if (delta < -Math.PI) delta += Math.PI * 2;

      this.angularSum += delta;

      // 如果累计了超过一定角度，触发翻炒
      const intensity = Math.abs(delta) * 10;
      if (intensity > 0.1 && this._onStir) {
        this._onStir(intensity);
      }
    }

    this.lastAngle = currentAngle;
  }

  // 获取圆形手势完成了多少圈
  getCircularProgress() {
    return Math.abs(this.angularSum) / (Math.PI * 2);
  }

  // 获取滑动速度
  getSpeed() {
    if (this.trail.length < 2) return 0;
    const last = this.trail[this.trail.length - 1];
    const prev = this.trail[this.trail.length - 2];
    const dx = last.x - prev.x;
    const dy = last.y - prev.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // 注册回调
  onTap(callback) { this._onTap = callback; }
  onStir(callback) { this._onStir = callback; }
  onDragStart(callback) { this._onDragStart = callback; }
  onDragEnd(callback) { this._onDragEnd = callback; }

  // 检测位置是否在某圆形区域内
  isInCircle(px, py, cx, cy, r) {
    const dx = px - cx;
    const dy = py - cy;
    return dx * dx + dy * dy <= r * r;
  }
}
