// 炒粉大师 — 粒子特效系统

export class Particle {
  constructor(options = {}) {
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.vx = options.vx || 0;
    this.vy = options.vy || 0;
    this.size = options.size || 5;
    this.originalSize = this.size;
    this.sizeDecay = options.sizeDecay ?? 0.97;
    this.life = options.life || 60;
    this.maxLife = this.life;
    this.color = options.color || '#FF6B35';
    this.alpha = options.alpha ?? 1;
    this.alphaDecay = options.alphaDecay ?? 0.015;
    this.gravity = options.gravity ?? 0;
    this.friction = options.friction ?? 0.99;
    this.rotation = options.rotation || 0;
    this.rotationSpeed = options.rotationSpeed || 0;
    this.shape = options.shape || 'circle'; // circle, star, ring
    this.emoji = options.emoji || null;
    this.glow = options.glow || false;
    this.glowColor = options.glowColor || this.color;
    this.glowSize = options.glowSize || 10;
    this.turbulence = options.turbulence || 0;
  }

  update() {
    // 湍流效果
    if (this.turbulence > 0) {
      this.vx += (Math.random() - 0.5) * this.turbulence;
      this.vy += (Math.random() - 0.5) * this.turbulence;
    }

    this.vx *= this.friction;
    this.vy *= this.friction;
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    this.life--;
    this.alpha = Math.max(0, this.alpha - this.alphaDecay);
    this.size = Math.max(0.1, this.size * this.sizeDecay);
    this.rotation += this.rotationSpeed;
    return this.life > 0 && this.alpha > 0.01 && this.size > 0.2;
  }

  draw(ctx) {
    if (this.alpha <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    // 发光效果
    if (this.glow) {
      ctx.shadowColor = this.glowColor;
      ctx.shadowBlur = this.glowSize;
    }

    if (this.emoji) {
      ctx.font = `${Math.max(1, this.size)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.emoji, 0, 0);
    } else if (this.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(0.5, this.size), 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
    } else if (this.shape === 'star') {
      this._drawStar(ctx, 5, this.size, this.size * 0.4);
    } else if (this.shape === 'ring') {
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(0.5, this.size), 0, Math.PI * 2);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();
  }

  _drawStar(ctx, points, outer, inner) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outer : inner;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = this.color;
    ctx.fill();
  }
}

export class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  // 发射粒子（支持随机范围）
  emit(options, count = 1) {
    for (let i = 0; i < count; i++) {
      const spreadX = options.spreadX || 0;
      const spreadY = options.spreadY || 0;
      const vxRange = options.vxRange || 0;
      const vyRange = options.vyRange || 0;
      const sizeRange = options.sizeRange || 0;
      const lifeRange = options.lifeRange || 0;

      this.particles.push(
        new Particle({
          ...options,
          x: (options.x || 0) + (Math.random() - 0.5) * spreadX,
          y: (options.y || 0) + (Math.random() - 0.5) * spreadY,
          vx: (options.vx || 0) + (Math.random() - 0.5) * vxRange,
          vy: (options.vy || 0) + (Math.random() - 0.5) * vyRange,
          size: (options.size || 5) + Math.random() * sizeRange,
          life: (options.life || 60) + Math.random() * lifeRange,
          rotation: options.randomRotation
            ? Math.random() * Math.PI * 2
            : options.rotation || 0,
          rotationSpeed: options.rotationSpeedRange
            ? (Math.random() - 0.5) * options.rotationSpeedRange
            : options.rotationSpeed || 0,
        })
      );
    }
  }

  // 发射火焰粒子
  emitFire(x, y, width, intensity = 1) {
    const count = Math.floor(2 * intensity);
    const fireColors = ['#FF4500', '#FF6600', '#FF8C00', '#FFA500', '#FFD700', '#FFEC8B'];
    for (let i = 0; i < count; i++) {
      const color = fireColors[Math.floor(Math.random() * fireColors.length)];
      this.emit({
        x, y, spreadX: width,
        vy: -2 - Math.random() * 3 * intensity,
        vxRange: 1.5,
        size: 4 + Math.random() * 6 * intensity,
        sizeDecay: 0.94,
        life: 20 + Math.random() * 20,
        color,
        alpha: 0.7 + Math.random() * 0.3,
        alphaDecay: 0.025,
        gravity: -0.08,
        glow: true,
        glowColor: color,
        glowSize: 8,
        turbulence: 0.3,
      });
    }
  }

  // 发射油花粒子
  emitOilSplash(x, y, intensity = 1) {
    const count = Math.floor(8 * intensity);
    const oilColors = ['#FFD700', '#FFA500', '#FF8C00', '#FFE4B5'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5 * intensity;
      this.emit({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        size: 2 + Math.random() * 4,
        sizeDecay: 0.96,
        life: 25 + Math.random() * 20,
        color: oilColors[Math.floor(Math.random() * oilColors.length)],
        alpha: 0.9,
        alphaDecay: 0.03,
        gravity: 0.15,
        glow: true,
        glowColor: '#FFD700',
        glowSize: 5,
      });
    }
  }

  // 发射蒸汽粒子
  emitSteam(x, y, width) {
    this.emit({
      x, y, spreadX: width,
      vy: -0.5 - Math.random() * 1.5,
      vxRange: 0.8,
      size: 15 + Math.random() * 20,
      sizeDecay: 1.01, // 蒸汽越来越大
      life: 40 + Math.random() * 30,
      color: 'rgba(255, 255, 255, 0.15)',
      alpha: 0.15,
      alphaDecay: 0.003,
      gravity: -0.02,
      friction: 0.995,
      turbulence: 0.2,
    });
  }

  // 发射火星
  emitSparks(x, y, count = 5) {
    const sparkColors = ['#FFFFFF', '#FFD700', '#FFA500'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 5;
      this.emit({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: 1.5 + Math.random() * 2,
        sizeDecay: 0.95,
        life: 15 + Math.random() * 15,
        color: sparkColors[Math.floor(Math.random() * sparkColors.length)],
        alpha: 1,
        alphaDecay: 0.04,
        gravity: 0.1,
        glow: true,
        glowColor: '#FFD700',
        glowSize: 4,
      });
    }
  }

  // 庆祝粒子（完成订单时）
  emitCelebration(x, y) {
    const colors = ['#FF6B35', '#FFD700', '#FF4500', '#32CD32', '#4169E1', '#FF69B4'];
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 8;
      const color = colors[Math.floor(Math.random() * colors.length)];
      this.emit({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4,
        size: 3 + Math.random() * 5,
        sizeDecay: 0.96,
        life: 40 + Math.random() * 30,
        color,
        alpha: 1,
        alphaDecay: 0.02,
        gravity: 0.12,
        shape: Math.random() > 0.5 ? 'star' : 'circle',
        randomRotation: true,
        rotationSpeedRange: 0.2,
        glow: true,
        glowColor: color,
        glowSize: 6,
      });
    }
  }

  // 金币飞散
  emitCoins(x, y, targetX, targetY, count = 5) {
    for (let i = 0; i < count; i++) {
      const delay = i * 3;
      setTimeout(() => {
        this.emit({
          x, y,
          vx: (targetX - x) / 30 + (Math.random() - 0.5) * 3,
          vy: (targetY - y) / 30 - 5 - Math.random() * 3,
          size: 16,
          emoji: '🪙',
          sizeDecay: 0.99,
          life: 50,
          alpha: 1,
          alphaDecay: 0.01,
          gravity: 0.08,
          rotationSpeedRange: 0.3,
        });
      }, delay * 16);
    }
  }

  update() {
    this.particles = this.particles.filter((p) => p.update());
  }

  draw(ctx) {
    for (const p of this.particles) {
      p.draw(ctx);
    }
  }

  get count() {
    return this.particles.length;
  }

  clear() {
    this.particles.length = 0;
  }
}
