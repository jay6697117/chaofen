// 炒粉大师 — 3D 火焰粒子系统

import * as THREE from 'three';

class FireParticle {
  constructor(sprite, material) {
    this.sprite = sprite;
    this.material = material;
    this.active = false;
    this.life = 0;
    this.maxLife = 1;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.startSize = 0.3;
  }

  reset(x, y, z, opts = {}) {
    this.active = true;
    this.life = 0;
    this.maxLife = opts.maxLife || 0.4 + Math.random() * 0.4;
    this.sprite.position.set(x, y, z);
    this.vx = opts.vx || (Math.random() - 0.5) * 0.6;
    this.vy = opts.vy || 2 + Math.random() * 3;
    this.vz = opts.vz || (Math.random() - 0.5) * 0.6;
    this.startSize = opts.size || 0.25 + Math.random() * 0.35;
    this.sprite.scale.set(this.startSize, this.startSize, 1);
    this.sprite.visible = true;

    // 随机火焰颜色
    const colors = [0xff4400, 0xff6600, 0xff8800, 0xffaa00, 0xffdd00];
    this.material.color.set(colors[Math.floor(Math.random() * colors.length)]);
    this.material.opacity = 0.8;
  }

  update(dt) {
    if (!this.active) return;

    this.life += dt;
    if (this.life >= this.maxLife) {
      this.active = false;
      this.sprite.visible = false;
      return;
    }

    const t = this.life / this.maxLife;

    // 位移
    this.sprite.position.x += this.vx * dt;
    this.sprite.position.y += this.vy * dt;
    this.sprite.position.z += this.vz * dt;

    // 速度衰减
    this.vx *= 0.98;
    this.vy *= 0.97;
    this.vz *= 0.98;

    // 湍流
    this.vx += (Math.random() - 0.5) * 2 * dt;
    this.vz += (Math.random() - 0.5) * 2 * dt;

    // 淡出 + 缩小
    this.material.opacity = (1 - t) * 0.7;
    const scale = this.startSize * (1 - t * 0.6);
    this.sprite.scale.set(scale, scale, 1);
  }
}

export class FireSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.maxParticles = 80;
    this.intensity = 0.5;
    this.basePosition = new THREE.Vector3(0, 0.4, 0);
    this.spreadRadius = 1.3;

    // 创建火焰纹理
    this._fireTexture = this._createTexture();

    // 粒子池
    for (let i = 0; i < this.maxParticles; i++) {
      const material = new THREE.SpriteMaterial({
        map: this._fireTexture,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(material);
      sprite.visible = false;
      scene.add(sprite);
      this.particles.push(new FireParticle(sprite, material));
    }

    // 蒸汽粒子
    this._steamTexture = this._createSteamTexture();
    this.steamParticles = [];
    for (let i = 0; i < 15; i++) {
      const mat = new THREE.SpriteMaterial({
        map: this._steamTexture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const sp = new THREE.Sprite(mat);
      sp.visible = false;
      scene.add(sp);
      this.steamParticles.push(new FireParticle(sp, mat));
    }
  }

  _createTexture() {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255, 255, 255, 1)');
    g.addColorStop(0.2, 'rgba(255, 220, 100, 0.9)');
    g.addColorStop(0.5, 'rgba(255, 120, 20, 0.5)');
    g.addColorStop(1, 'rgba(255, 50, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
  }

  _createSteamTexture() {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    g.addColorStop(0.5, 'rgba(240, 240, 240, 0.15)');
    g.addColorStop(1, 'rgba(200, 200, 200, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
  }

  // 发射火焰粒子
  _emitFire() {
    const p = this.particles.find((p) => !p.active);
    if (!p) return;

    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * this.spreadRadius;
    const x = this.basePosition.x + Math.cos(angle) * r;
    const z = this.basePosition.z + Math.sin(angle) * r;

    p.reset(x, this.basePosition.y, z, {
      vy: 1.5 + Math.random() * 2.5 * this.intensity,
      size: (0.2 + Math.random() * 0.4) * this.intensity,
      maxLife: 0.3 + Math.random() * 0.3,
    });
  }

  // 发射蒸汽
  _emitSteam(wokCenter) {
    const p = this.steamParticles.find((p) => !p.active);
    if (!p) return;

    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * 1.0;
    const x = wokCenter.x + Math.cos(angle) * r;
    const z = wokCenter.z + Math.sin(angle) * r;

    p.reset(x, wokCenter.y + 0.5, z, {
      vy: 0.5 + Math.random() * 1,
      vx: (Math.random() - 0.5) * 0.3,
      vz: (Math.random() - 0.5) * 0.3,
      size: 0.5 + Math.random() * 0.8,
      maxLife: 1 + Math.random() * 1.5,
    });
  }

  // 颠锅特效 — 爆发式火焰
  burst(wokCenter) {
    for (let i = 0; i < 12; i++) {
      const p = this.particles.find((p) => !p.active);
      if (!p) break;

      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * this.spreadRadius * 0.8;
      p.reset(
        wokCenter.x + Math.cos(angle) * r,
        wokCenter.y - 0.3,
        wokCenter.z + Math.sin(angle) * r,
        {
          vy: 4 + Math.random() * 5,
          vx: (Math.random() - 0.5) * 3,
          vz: (Math.random() - 0.5) * 3,
          size: 0.3 + Math.random() * 0.5,
          maxLife: 0.4 + Math.random() * 0.3,
        }
      );
    }
  }

  // 油花飞溅
  splashOil(wokCenter, intensity) {
    const count = Math.floor(5 * intensity);
    for (let i = 0; i < count; i++) {
      const p = this.particles.find((p) => !p.active);
      if (!p) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4 * intensity;
      p.reset(wokCenter.x, wokCenter.y + 0.2, wokCenter.z, {
        vx: Math.cos(angle) * speed,
        vy: 3 + Math.random() * 4,
        vz: Math.sin(angle) * speed,
        size: 0.1 + Math.random() * 0.15,
        maxLife: 0.3 + Math.random() * 0.2,
      });
      // 油花用金色
      p.material.color.set(0xffd700);
    }
  }

  // 每帧更新
  update(dt, wokCenter) {
    // 发射火焰
    const emitRate = this.intensity * 10;
    if (Math.random() < emitRate * dt) {
      this._emitFire();
    }

    // 发射蒸汽
    if (wokCenter && this.intensity > 0.3 && Math.random() < 0.8 * dt) {
      this._emitSteam(wokCenter);
    }

    // 更新粒子
    for (const p of this.particles) {
      p.update(dt);
    }
    for (const p of this.steamParticles) {
      p.update(dt);
    }
  }

  setIntensity(val) {
    this.intensity = Math.max(0.2, Math.min(2, val));
  }

  setBasePosition(pos) {
    this.basePosition.copy(pos);
  }
}
