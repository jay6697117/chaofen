// 炒粉大师 — 核心游戏逻辑（颠锅版）

import { ParticleSystem } from './particles.js';
import { AudioManager } from './audio.js';
import { INGREDIENTS, ORDERS, GAME } from './data.js';

// 游戏状态
const STATE = { MENU: 0, COOK: 1, SERVE: 2, RESULT: 3 };

// 锅中食材物理对象
class FoodItem {
  constructor(ingredient, x, y) {
    this.ingredient = ingredient;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.size = 30;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotVel = 0;
    this.isFlying = false;
    this.flipped = false;
    this.settled = true;
    this.baseX = x; // 锅内基准位置偏移
  }

  update(wokX, wokY, wokRX) {
    // 重力
    this.vy += 0.4;

    // 应用速度
    this.x += this.vx;
    this.y += this.vy;

    // 碗底碰撞（锅的弧形底部）
    const relX = this.x - wokX;
    const normalizedX = relX / (wokRX * 0.7);
    const bowlFloor = wokY + 8 + normalizedX * normalizedX * 35;

    if (this.y > bowlFloor) {
      this.y = bowlFloor;
      this.vy = -Math.abs(this.vy) * 0.25;
      this.vx *= 0.8;
      if (Math.abs(this.vy) < 1) {
        this.vy = 0;
        this.settled = true;
        this.isFlying = false;
      }
    }

    // 横向跟随锅移动（食材在锅里）
    if (this.settled) {
      this.x += (wokX + this.baseX - this.x) * 0.15;
    }

    // 横向边界
    const maxX = wokRX * 0.65;
    if (Math.abs(this.x - wokX) > maxX) {
      this.x = wokX + Math.sign(this.x - wokX) * maxX;
      this.vx = -this.vx * 0.3;
    }

    // 阻尼
    this.vx *= 0.97;
    this.rotVel *= 0.96;
    this.rotation += this.rotVel;

    // 飞行状态判定
    if (this.y < wokY - 20) {
      this.isFlying = true;
      this.settled = false;
    }
  }
}

// 分数弹出文字
class ScorePopup {
  constructor(text, x, y, color = '#FFD700', fontSize = 24) {
    this.text = text;
    this.x = x;
    this.y = y;
    this.color = color;
    this.fontSize = fontSize;
    this.alpha = 1;
    this.scale = 0;
    this.targetScale = 1;
    this.life = 50;
    this.vy = -2;
  }

  update() {
    this.y += this.vy;
    this.vy *= 0.97;
    this.life--;
    this.scale += (this.targetScale - this.scale) * 0.25;
    if (this.life < 15) this.alpha = this.life / 15;
    return this.life > 0;
  }

  draw(ctx) {
    if (this.alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.translate(this.x, this.y);
    ctx.scale(this.scale, this.scale);
    ctx.font = `bold ${this.fontSize}px "Outfit", "Noto Sans SC", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 4;
    ctx.strokeText(this.text, 0, 0);
    ctx.fillStyle = this.color;
    ctx.fillText(this.text, 0, 0);
    ctx.restore();
  }
}

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.W = GAME.WIDTH;
    this.H = GAME.HEIGHT;
    canvas.width = this.W;
    canvas.height = this.H;

    // 系统
    this.particles = new ParticleSystem();
    this.audio = new AudioManager();

    // 锅的参数
    this.wokBaseX = this.W / 2;
    this.wokBaseY = 410;
    this.wokX = this.wokBaseX;
    this.wokY = this.wokBaseY;
    this.wokRX = GAME.WOK_RX;
    this.wokRY = GAME.WOK_RY;

    // 锅的物理
    this.wokTargetX = this.wokBaseX;
    this.prevWokX = this.wokBaseX;
    this.wokVelocity = 0;
    this.prevWokVelocity = 0;
    this.isDragging = false;

    // 手的角度
    this.handAngle = 0;

    // 游戏状态
    this.state = STATE.MENU;
    this.score = 0;
    this.timer = GAME.GAME_DURATION;
    this.cookProgress = 0;
    this.tossCount = 0;
    this.bestTossHeight = 0;
    this.tossCooldown = 0;
    this.stars = 0;
    this.dishesServed = 0;
    this.totalScore = 0;

    // 当前订单
    this.currentOrder = null;
    this.orderIndex = 0;

    // 食材
    this.foodItems = [];

    // 特效
    this.popups = [];
    this.fireIntensity = 0.4;
    this.shakeX = 0;
    this.shakeY = 0;
    this.shakeIntensity = 0;

    // 背景缓存
    this._bgGradient = null;

    // 计时
    this._timerAccum = 0;
    this.lastTimestamp = 0;
    this.frameCount = 0;

    // 提示显示
    this._hintVisible = true;
    this._hintTimer = 0;

    // 出餐动画
    this._serveTimer = 0;
    this._servePhase = 0;

    // 绑定输入
    this._setupInput();
  }

  // ==================== 输入 ====================

  _setupInput() {
    const getX = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      return (clientX - rect.left) * (this.W / rect.width);
    };

    const getY = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return (clientY - rect.top) * (this.H / rect.height);
    };

    const onDown = (e) => {
      if (this.state !== STATE.COOK) return;
      this.isDragging = true;
      this.wokTargetX = getX(e);
    };

    const onMove = (e) => {
      if (!this.isDragging || this.state !== STATE.COOK) return;
      e.preventDefault();
      this.wokTargetX = getX(e);
    };

    const onUp = () => {
      this.isDragging = false;
    };

    // 鼠标
    this.canvas.addEventListener('mousedown', onDown);
    this.canvas.addEventListener('mousemove', onMove);
    this.canvas.addEventListener('mouseup', onUp);
    this.canvas.addEventListener('mouseleave', onUp);

    // 触摸
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      onDown(e);
    }, { passive: false });
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      onMove(e);
    }, { passive: false });
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      onUp();
    }, { passive: false });
  }

  // ==================== 游戏控制 ====================

  start() {
    this.score = 0;
    this.totalScore = 0;
    this.timer = GAME.GAME_DURATION;
    this.dishesServed = 0;
    this.orderIndex = 0;
    this.popups = [];
    this.particles.clear();
    this._timerAccum = 0;
    this._hintVisible = true;
    this._hintTimer = 0;

    this.state = STATE.COOK;

    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');

    this._loadOrder();
  }

  _loadOrder() {
    // 根据进度选难度
    const maxDiff = Math.min(5, 1 + Math.floor(this.dishesServed / 2));
    const available = ORDERS.filter((o) => o.difficulty <= maxDiff);
    this.currentOrder = available[Math.floor(Math.random() * available.length)];

    this.cookProgress = 0;
    this.tossCount = 0;
    this.bestTossHeight = 0;
    this.foodItems = [];

    // 创建食材物理对象
    const ings = this.currentOrder.ingredients;
    ings.forEach((id, i) => {
      const ing = INGREDIENTS.find((ii) => ii.id === id);
      const offsetX = (i - (ings.length - 1) / 2) * 28;
      const food = new FoodItem(ing, this.wokX + offsetX, this.wokY - 5);
      food.baseX = offsetX;
      this.foodItems.push(food);
    });

    this.fireIntensity = 0.4;
    this.wokX = this.wokBaseX;
    this.wokTargetX = this.wokBaseX;
    this.prevWokX = this.wokBaseX;

    // 更新 UI
    this._updateOrderUI();
    this._updateProgressBar();
    this._updateHUD();
  }

  // 颠锅！
  _tossFood(force) {
    const clampedForce = Math.min(20, force);

    for (const food of this.foodItems) {
      food.vy = -(clampedForce * 2.2 + Math.random() * 4);
      food.vx = (Math.random() - 0.5) * clampedForce * 0.6;
      food.rotVel = (Math.random() - 0.5) * 0.5;
      food.isFlying = true;
      food.settled = false;
      food.flipped = false;
    }

    // 进度增加
    const progressGain = Math.min(10, clampedForce * 0.4);
    this.cookProgress = Math.min(100, this.cookProgress + progressGain);
    this.score += Math.floor(clampedForce * 3);
    this.tossCount++;

    // 特效
    this.particles.emitOilSplash(this.wokX, this.wokY, clampedForce * 0.08);
    this.audio.playSizzle();
    this.shakeIntensity = Math.min(8, clampedForce * 0.4);
    this.fireIntensity = Math.min(1.8, 0.5 + clampedForce * 0.08);

    // 隐藏提示
    this._hintVisible = false;

    // 弹出评价
    if (clampedForce > 12) {
      this.popups.push(new ScorePopup('🔥 完美颠锅!', this.wokX, this.wokY - 120, '#FFD700', 26));
      this.audio.playPerfect();
      this.particles.emitSparks(this.wokX, this.wokY - 30, 8);
    } else if (clampedForce > 7) {
      this.popups.push(new ScorePopup('好!', this.wokX, this.wokY - 100, '#87CEEB', 22));
    }

    this._updateProgressBar();
    this._updateHUD();
  }

  // 出餐
  _serveDish() {
    this.state = STATE.SERVE;
    this._serveTimer = 0;
    this._servePhase = 0;

    // 计算星级
    if (this.tossCount >= 15 && this.cookProgress >= 100) {
      this.stars = 3;
    } else if (this.tossCount >= 8) {
      this.stars = 2;
    } else {
      this.stars = 1;
    }

    const dishScore = Math.floor(this.currentOrder.baseScore * (0.5 + this.stars * 0.5));
    this.score += dishScore;
    this.totalScore += this.score;
    this.dishesServed++;

    // 特效
    this.audio.playServe();
    this.particles.emitCelebration(this.W / 2, this.H / 2);
    this.shakeIntensity = 10;

    this.popups.push(new ScorePopup(`+${dishScore}`, this.W / 2, 300, '#FFD700', 36));
  }

  // 游戏结束
  _gameOver() {
    this.state = STATE.RESULT;
    this.audio.playGameOver();

    // 选择成品图
    let dishImage, gradeText;
    if (this.stars >= 3) {
      dishImage = 'assets/dishes/dish_premium.png';
      gradeText = 'S';
    } else if (this.stars >= 2) {
      dishImage = 'assets/dishes/dish_classic.png';
      gradeText = 'A';
    } else {
      dishImage = 'assets/dishes/dish_poor.png';
      gradeText = 'B';
    }

    // 总评（基于总分）
    if (this.totalScore >= 2000) gradeText = 'S';
    else if (this.totalScore >= 1200) gradeText = 'A';
    else if (this.totalScore >= 600) gradeText = 'B';
    else gradeText = 'C';

    // 更新结果界面
    document.getElementById('dish-image').src = dishImage;
    document.getElementById('dish-name').textContent =
      this.currentOrder ? this.currentOrder.name : '炒粉';
    document.getElementById('final-score').textContent = this.totalScore;
    document.getElementById('dishes-count').textContent = `完成 ${this.dishesServed} 道菜`;
    document.getElementById('toss-count').textContent = `颠锅 ${this.tossCount} 次`;
    document.getElementById('grade').textContent = gradeText;
    document.getElementById('grade').className = `grade grade-${gradeText.toLowerCase()}`;

    // 星星
    const starsEl = document.getElementById('result-stars');
    starsEl.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const star = document.createElement('span');
      star.className = `result-star ${i < this.stars ? 'star-on' : 'star-off'}`;
      star.textContent = '⭐';
      star.style.animationDelay = `${i * 0.2}s`;
      starsEl.appendChild(star);
    }

    document.getElementById('hud').classList.add('hidden');

    setTimeout(() => {
      document.getElementById('result-screen').classList.remove('hidden');
      document.getElementById('result-screen').classList.add('fade-in');
    }, 300);
  }

  // ==================== 主循环 ====================

  update(timestamp) {
    const dt = Math.min(3, (timestamp - this.lastTimestamp) / 16.67) || 1;
    this.lastTimestamp = timestamp;
    this.frameCount++;

    // 更新粒子
    this.particles.update();
    this.popups = this.popups.filter((p) => p.update());

    // 屏幕震动衰减
    if (this.shakeIntensity > 0) {
      this.shakeX = (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeY = (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity *= 0.85;
      if (this.shakeIntensity < 0.3) {
        this.shakeIntensity = 0;
        this.shakeX = 0;
        this.shakeY = 0;
      }
    }

    if (this.state === STATE.COOK) {
      this._updateCook(dt);
    } else if (this.state === STATE.SERVE) {
      this._updateServe(dt);
    }
  }

  _updateCook(dt) {
    // 锅的物理
    this.prevWokVelocity = this.wokVelocity;
    this.prevWokX = this.wokX;

    const clampedTarget = Math.max(90, Math.min(this.W - 90, this.wokTargetX));

    if (this.isDragging) {
      this.wokX += (clampedTarget - this.wokX) * 0.25;
    } else {
      // 没拖拽时缓慢回中
      this.wokX += (this.wokBaseX - this.wokX) * 0.03;
    }

    this.wokVelocity = this.wokX - this.prevWokX;

    // 锅的轻微上下颠动
    this.wokY = this.wokBaseY + Math.sin(this.frameCount * 0.03) * 1.5;

    // 手的倾斜角度
    this.handAngle = this.wokVelocity * 0.015;

    // 颠锅冷却
    if (this.tossCooldown > 0) this.tossCooldown -= dt;

    // 检测颠锅（加速度突变 = 急速变向）
    const acceleration = this.wokVelocity - this.prevWokVelocity;
    if (
      Math.abs(acceleration) > 1.2 &&
      this.tossCooldown <= 0 &&
      this.isDragging
    ) {
      const force = Math.min(20, Math.abs(acceleration) * 2.5);
      if (force > 2.5) {
        this._tossFood(force);
        this.tossCooldown = 10;
      }
    }

    // 食材物理
    for (const food of this.foodItems) {
      food.update(this.wokX, this.wokY, this.wokRX);

      // 追踪飞行高度
      if (food.isFlying && !food.flipped && food.y < this.wokY - 80) {
        food.flipped = true;
        const height = this.wokY - food.y;
        if (height > this.bestTossHeight) this.bestTossHeight = height;
      }
    }

    // 火焰粒子
    if (this.frameCount % 2 === 0) {
      this.particles.emitFire(
        this.wokX,
        this.wokY + this.wokRY + 8,
        this.wokRX * 1.4,
        this.fireIntensity
      );
    }

    // 蒸汽
    if (this.frameCount % 6 === 0 && this.fireIntensity > 0.3) {
      this.particles.emitSteam(
        this.wokX,
        this.wokY - this.wokRY * 0.8,
        this.wokRX * 0.6
      );
    }

    // 火焰强度衰减
    this.fireIntensity = Math.max(0.35, this.fireIntensity * 0.995);

    // 计时器
    this._timerAccum += dt;
    if (this._timerAccum >= 60) {
      this._timerAccum -= 60;
      this.timer--;
      this._updateTimer();
      if (this.timer <= 5 && this.timer > 0) this.audio.playTick();
      if (this.timer <= 0) {
        // 如果还在做菜，强制出餐
        if (this.cookProgress > 0) {
          this._serveDish();
        } else {
          this._gameOver();
        }
      }
    }

    // 检查进度满
    if (this.cookProgress >= 100) {
      this._serveDish();
    }

    // 提示动画
    if (this._hintVisible) {
      this._hintTimer += dt;
    }
  }

  _updateServe(dt) {
    this._serveTimer += dt;
    if (this._serveTimer > 120) {
      // 出餐动画结束
      if (this.timer > 0) {
        // 还有时间，下一单
        this.state = STATE.COOK;
        this.score = 0;
        this._loadOrder();
      } else {
        this._gameOver();
      }
    }
  }

  // ==================== 渲染 ====================

  render() {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.shakeX, this.shakeY);

    this._drawBackground();

    if (this.state === STATE.COOK || this.state === STATE.SERVE) {
      // 火焰（锅下方）
      this._drawParticleLayer('fire');
      // 锅
      this._drawWok();
      // 食材
      this._drawFoodItems();
      // 手
      this._drawHand();
      // 蒸汽（锅上方）
      this._drawParticleLayer('steam');
      // 其他粒子（油花、火星等）
      this._drawParticleLayer('other');

      // 提示
      if (this._hintVisible && this.state === STATE.COOK) {
        this._drawHint();
      }
    }

    // 弹出文字
    for (const popup of this.popups) popup.draw(ctx);

    ctx.restore();
  }

  _drawBackground() {
    const ctx = this.ctx;
    if (!this._bgGradient) {
      this._bgGradient = ctx.createLinearGradient(0, 0, 0, this.H);
      this._bgGradient.addColorStop(0, '#1A0F0A');
      this._bgGradient.addColorStop(0.4, '#2D1810');
      this._bgGradient.addColorStop(1, '#1A0F0A');
    }
    ctx.fillStyle = this._bgGradient;
    ctx.fillRect(0, 0, this.W, this.H);

    // 暖光晕
    if (this.fireIntensity > 0) {
      const g = ctx.createRadialGradient(
        this.wokX, this.wokY + this.wokRY + 15, 0,
        this.wokX, this.wokY + this.wokRY + 15, 250 * this.fireIntensity
      );
      g.addColorStop(0, `rgba(255,100,20,${0.12 * this.fireIntensity})`);
      g.addColorStop(0.5, `rgba(255,60,0,${0.04 * this.fireIntensity})`);
      g.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.W, this.H);
    }
  }

  _drawWok() {
    const ctx = this.ctx;
    const cx = this.wokX;
    const cy = this.wokY;
    const rx = this.wokRX;
    const ry = this.wokRY;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.handAngle);
    ctx.translate(-cx, -cy);

    // 锅影
    ctx.beginPath();
    ctx.ellipse(cx, cy + 14, rx + 12, ry + 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();

    // 锅体
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    const metalGrad = ctx.createRadialGradient(cx - rx * 0.3, cy - ry * 0.3, 0, cx, cy, rx);
    metalGrad.addColorStop(0, '#6A6A6A');
    metalGrad.addColorStop(0.3, '#4A4A4A');
    metalGrad.addColorStop(0.6, '#383838');
    metalGrad.addColorStop(0.85, '#2A2A2A');
    metalGrad.addColorStop(1, '#1A1A1A');
    ctx.fillStyle = metalGrad;
    ctx.fill();

    // 锅内底
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4, rx * 0.85, ry * 0.72, 0, 0, Math.PI * 2);
    const innerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx * 0.85);
    innerGrad.addColorStop(0, '#2A2218');
    innerGrad.addColorStop(1, '#1A1510');
    ctx.fillStyle = innerGrad;
    ctx.fill();

    // 油光
    ctx.beginPath();
    ctx.ellipse(cx - rx * 0.2, cy - ry * 0.1, rx * 0.3, ry * 0.2, -0.3, 0, Math.PI * 2);
    const shine = ctx.createRadialGradient(cx - rx * 0.2, cy - ry * 0.1, 0, cx - rx * 0.2, cy - ry * 0.1, rx * 0.3);
    shine.addColorStop(0, 'rgba(255,200,100,0.1)');
    shine.addColorStop(1, 'rgba(255,200,100,0)');
    ctx.fillStyle = shine;
    ctx.fill();

    // 锅沿
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(180,170,160,0.35)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.restore();
  }

  _drawFoodItems() {
    const ctx = this.ctx;
    // 根据 Y 排序（远的先画）
    const sorted = [...this.foodItems].sort((a, b) => a.y - b.y);

    for (const food of sorted) {
      ctx.save();
      ctx.translate(food.x, food.y);
      ctx.rotate(food.rotation);

      // 阴影
      ctx.font = `${food.size}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = 0.25;
      ctx.fillText(food.ingredient.emoji, 2, 3);

      // 本体
      ctx.globalAlpha = 1;
      // 飞行中发光
      if (food.isFlying) {
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 12;
      }
      ctx.fillText(food.ingredient.emoji, 0, 0);

      ctx.restore();
    }
  }

  _drawHand() {
    const ctx = this.ctx;
    const cx = this.wokX;
    const cy = this.wokY;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.handAngle);

    // 锅柄
    ctx.fillStyle = '#5C3D2E';
    ctx.strokeStyle = '#4A2D1E';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(this.wokRX - 15, -10, 90, 20, 8);
    ctx.fill();
    ctx.stroke();

    // 锅柄末端金属环
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.roundRect(this.wokRX + 65, -12, 12, 24, 4);
    ctx.fill();

    // 手 ✋ emoji
    ctx.font = '42px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🤚', this.wokRX + 85, 2);

    ctx.restore();
  }

  _drawParticleLayer(type) {
    const ctx = this.ctx;
    const wokY = this.wokY;

    for (const p of this.particles.particles) {
      if (type === 'fire') {
        if (p.y > wokY - 15 && !p.emoji && p.gravity <= 0) p.draw(ctx);
      } else if (type === 'steam') {
        if (p.y < wokY - 15 && p.gravity <= 0 && !p.emoji) p.draw(ctx);
      } else {
        if (p.gravity > 0 || p.emoji) p.draw(ctx);
      }
    }
  }

  _drawHint() {
    const ctx = this.ctx;
    const pulse = Math.sin(this._hintTimer * 0.08) * 0.3 + 0.7;

    ctx.save();
    ctx.globalAlpha = pulse * 0.8;
    ctx.font = 'bold 18px "Noto Sans SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFD700';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 3;

    const text = '👈 左右快速拖动来颠锅！👉';
    ctx.strokeText(text, this.W / 2, this.wokY + this.wokRY + 80);
    ctx.fillText(text, this.W / 2, this.wokY + this.wokRY + 80);

    // 动画箭头
    const arrowOffset = Math.sin(this._hintTimer * 0.12) * 20;
    ctx.font = '28px serif';
    ctx.fillText('👆', this.W / 2 + arrowOffset, this.wokY + this.wokRY + 120);

    ctx.restore();
  }

  // ==================== UI ====================

  _updateOrderUI() {
    const el = document.getElementById('order-card');
    const order = this.currentOrder;
    document.getElementById('order-emoji').textContent = order.emoji;
    document.getElementById('order-name').textContent = order.name;

    const itemsEl = document.getElementById('order-ingredients');
    itemsEl.innerHTML = order.ingredients
      .map((id) => {
        const ing = INGREDIENTS.find((i) => i.id === id);
        return `<span class="order-item">${ing.emoji}</span>`;
      })
      .join('');

    el.classList.remove('hidden');
  }

  _updateProgressBar() {
    const fill = document.getElementById('cook-progress-fill');
    if (fill) {
      fill.style.width = `${this.cookProgress}%`;
      if (this.cookProgress > 80) {
        fill.style.background = 'linear-gradient(90deg, #FFD700, #FF6B35)';
      } else if (this.cookProgress > 50) {
        fill.style.background = 'linear-gradient(90deg, #FFA500, #FFD700)';
      } else {
        fill.style.background = 'linear-gradient(90deg, var(--primary), var(--primary-light))';
      }
    }
    const pctEl = document.getElementById('cook-progress-pct');
    if (pctEl) pctEl.textContent = `${Math.floor(this.cookProgress)}%`;
  }

  _updateHUD() {
    const el = document.getElementById('score-value');
    if (el) el.textContent = this.score;
  }

  _updateTimer() {
    const el = document.getElementById('timer-value');
    if (el) {
      el.textContent = Math.max(0, this.timer);
      if (this.timer <= 10) el.classList.add('timer-warn');
      else el.classList.remove('timer-warn');
    }
  }

  get isPlaying() {
    return this.state === STATE.COOK || this.state === STATE.SERVE;
  }
}
