// 炒粉大师 — 核心游戏逻辑与状态机重写

import { INGREDIENTS, ORDERS, GAME, COLORS } from './data.js';
import { SceneManager } from './scene.js';
import { Wok3D } from './wok.js';
import { FoodSystem } from './food3d.js';
import { FireSystem } from './fire3d.js';
import { LeverControl } from './lever.js';

// 游戏状态枚举
const GameState = {
  INIT: 0,
  IDLE: 1,
  COOKING: 2,
  SEASONING: 3,
  FINISH_DISH: 4,
  GAME_OVER: 5
};

export class GameManager {
  constructor(audio) {
    this.audio = audio;
    
    // UI 元素引用
    this.ui = {
      score: document.getElementById('score'),
      timer: document.getElementById('timer'),
      cookingUI: document.getElementById('cooking-ui'),
      orderInfo: document.getElementById('order-info'),
      orderName: document.getElementById('order-name'),
      orderIngredients: document.getElementById('order-ingredients'),
      stirProgress: document.getElementById('stir-progress'),
      progressBar: document.querySelector('.progress-bar-fill'),
      seasoningUI: document.getElementById('seasoning-ui'),
      seasoningCanvas: document.getElementById('seasoning-canvas'),
      seasoningHint: document.getElementById('seasoning-hint'),
      feedbackText: document.getElementById('feedback-text'),
      comboText: document.getElementById('combo-text'),
      menuScreen: document.getElementById('menu-screen'),
      resultScreen: document.getElementById('result-screen'),
      finalScore: document.getElementById('final-score'),
      dishesServed: document.getElementById('dishes-served'),
      maxCombo: document.getElementById('max-combo'),
      dishModal: document.getElementById('dish-modal'),
      dishImg: document.getElementById('dish-img'),
      dishName: document.getElementById('dish-name'),
      dishStars: document.getElementById('dish-stars')
    };
    
    // 调料小游戏 Canvas
    this.seasonCtx = this.ui.seasoningCanvas ? this.ui.seasoningCanvas.getContext('2d') : null;
    
    // 初始化 3D 渲染组件
    const container = document.getElementById('game-container');
    this.scene = new SceneManager(container);
    this.wok = new Wok3D(this.scene.scene);
    this.foodSystem = new FoodSystem(this.scene.scene);
    this.fireSystem = new FireSystem(this.scene.scene);
    this.fireSystem.setBasePosition(this.wok.getWorldCenter());

    // 初始化操作杆
    this.lever = new LeverControl(document.getElementById('game-wrapper') || document.body);
    
    // 同步操作杆与物理锅
    this.lever.onChange((val) => {
      this.wok.setLeverValue(val);
      this.fireSystem.setIntensity(0.3 + val * 0.7); // 火力随操作杆增大
      if (this.audio && val > 0.1 && !this.wok.isTossing && this.state === GameState.COOKING) {
        this.audio.playSizzle(val);
      } else if (this.audio) {
        this.audio.stopSizzle();
      }
    });

    this.lever.onToss((force) => {
      if (this.state === GameState.COOKING) {
        this._handleToss(force);
      }
    });

    // 绑定调料区域全局点击事件（全屏可点，提升体验）
    if (this.ui.seasoningUI) {
      const triggerSeasoning = (e) => {
        if (e && e.cancelable) e.preventDefault(); // 防止双重触发和缩放
        this.handleSeasoningClick();
      };
      this.ui.seasoningUI.addEventListener('mousedown', triggerSeasoning);
      this.ui.seasoningUI.addEventListener('touchstart', triggerSeasoning, { passive: false });
    }
    
    this.state = GameState.INIT;
    
    // 动画循环参数
    this.lastTime = performance.now();
    this.animationId = null;

    // 开始游戏循环
    this._loop();
  }

  // --- 核心循环 ---
  _loop() {
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1); // 限制最大增量
    this.lastTime = now;

    // 更新 3D 物理
    this.wok.update(dt);
    this.foodSystem.update(dt, this.wok.getWorldCenter());
    this.fireSystem.update(dt, this.wok.getWorldCenter());
    
    // 同步火焰光源与火焰系统的强度
    this.scene.setFireIntensity(this.fireSystem.intensity);
    
    // 渲染 3D 场景
    this.scene.render();

    // 更新业务逻辑逻辑
    this._updateLogic(dt);

    this.animationId = requestAnimationFrame(() => this._loop());
  }

  _updateLogic(dt) {
    if (this.state === GameState.IDLE) {
      // 待机状态：微弱火焰
      this.fireSystem.setIntensity(0.1);
    } 
    else if (this.state === GameState.COOKING) {
      // 炒菜状态：时间减少
      this.gameTime -= dt;
      if (this.gameTime <= 0) {
        this.gameTime = 0;
        this.gameOver();
      } else {
        this.ui.timer.textContent = Math.ceil(this.gameTime);
      }

      // 如果炒熟度达到一半且未调料过，进入调料阶段（需食材都在锅底，没有飞在空中）
      if (this.stirringPower >= this.currentOrder.stirTarget / 2 && !this.seasoningPhaseDone && !this.foodSystem.hasFlying()) {
        this.enterSeasoningPhase();
      } 
      // 如果满进度且已经调料过了，则出锅
      else if (this.stirringPower >= this.currentOrder.stirTarget && this.seasoningPhaseDone && !this.foodSystem.hasFlying()) {
        this.finishDish();
      } else if (this.audio && this.foodSystem.hasFlying()) {
        this.audio.stopSizzle();
      }
    } 
    else if (this.state === GameState.SEASONING) {
      // 调料小游戏
      this.gameTime -= dt;
      if (this.gameTime <= 0) this.gameTime = 0;
      this.ui.timer.textContent = Math.ceil(this.gameTime);
      
      this.seasoningCurrentRadius -= GAME.SEASON_RING_SPEED * 60 * dt;
      
      if (this.seasoningCurrentRadius < 10) {
        // 缩到底了没点属于 MISS
        this.seasoningHints.push({ text: 'Miss...', type: 'miss' });
        this.processSeasoningStep(0);
      } else if (this.seasonCtx) {
        this._drawSeasoningMiniGame();
      }
    }
  }

  // --- 交互与事件 ---
  
  // 处理颠锅动作
  _handleToss(force) {
    // 物理反馈
    const actualForce = this.wok.toss(force);
    this.foodSystem.toss(actualForce, this.wok.getWorldCenter());
    this.fireSystem.burst(this.wok.getWorldCenter());
    
    if (this.audio) {
      this.audio.playToss(actualForce);
      this.audio.stopSizzle();
    }
    
    // 业务逻辑与得分: 减缓熟成的速度，增强游戏体验
    // 之前是 10 + actualForce * 20 太快了，现在削减一半
    const stirAmount = 3 + actualForce * 8;
    this.stirringPower += stirAmount;
    
    if (this.stirringPower > this.currentOrder.stirTarget) {
      this.stirringPower = this.currentOrder.stirTarget;
    }
    
    // 更新进度条
    const progressPct = (this.stirringPower / this.currentOrder.stirTarget) * 100;
    this.ui.progressBar.style.width = `${progressPct}%`;
    
    if (progressPct > 80 && this.ui.progressBar.className.indexOf('pulsing') === -1) {
       this.ui.progressBar.classList.add('pulsing');
    }
    
    // 震屏效果
    this.scene.shake(actualForce * 0.3);
  }

  handleSeasoningClick() {
    if (this.state !== GameState.SEASONING) return;
    
    const diff = Math.abs(this.seasoningCurrentRadius - GAME.SEASON_TARGET_RADIUS);
    let scoreMultiplier = 0;
    let hintText = '';
    let hintType = '';
    
    if (diff <= GAME.SEASON_PERFECT_RANGE) {
      scoreMultiplier = 1.5;
      hintText = 'Perfect!';
      hintType = 'perfect';
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      if (this.audio) this.audio.playSeasoning('perfect');
    } else if (diff <= GAME.SEASON_GOOD_RANGE) {
      scoreMultiplier = 1.0;
      hintText = 'Good';
      hintType = 'good';
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      if (this.audio) this.audio.playSeasoning('good');
    } else {
      scoreMultiplier = 0.5;
      hintText = 'Bad';
      hintType = 'bad';
      this.combo = 0;
      if (this.audio) this.audio.playSeasoning('bad');
    }
    
    this.seasoningHints.push({ text: hintText, type: hintType });
    this.showFeedback(hintText, hintType);
    this.updateCombo();
    
    // 特效
    this.fireSystem.splashOil(this.wok.getWorldCenter(), scoreMultiplier);
    
    this.processSeasoningStep(scoreMultiplier);
  }

  processSeasoningStep(multiplier) {
    this.seasoningScore += this.currentOrder.baseScore * multiplier;
    this.seasoningStepsDone++;
    
    if (this.seasoningStepsDone >= this.currentOrder.seasonings) {
      // 调料完成，返回继续炒菜！
      this.resumeCookingPhase();
    } else {
      // 下一次调料
      this.seasoningCurrentRadius = 120 + Math.random() * 40;
    }
  }

  // --- 状态流转 ---
  
  startGame() {
    this.score = 0;
    this.gameTime = GAME.GAME_DURATION;
    this.dishesServed = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.lastOrderName = null; // 记录上一道菜，避免连续重复
    
    this.ui.score.textContent = this.score;
    this.ui.timer.textContent = this.gameTime;
    
    this.ui.menuScreen.classList.add('hidden');
    this.ui.resultScreen.classList.add('hidden');
    
    this.updateCombo();
    this.startNewOrder();
  }

  startNewOrder() {
    this.state = GameState.COOKING;
    this.lever.show();
    
    // 随机一个订单（根据上菜数量渐进难度），不能与上一道连续重复
    const maxDifficulty = Math.min(5, 1 + this.dishesServed);
    let availableOrders = ORDERS.filter(o => o.difficulty <= maxDifficulty);
    // 排除上一道菜（至少有2道可选时才排除）
    if (this.lastOrderName && availableOrders.length > 1) {
      availableOrders = availableOrders.filter(o => o.name !== this.lastOrderName);
    }
    this.currentOrder = availableOrders[Math.floor(Math.random() * availableOrders.length)];
    this.lastOrderName = this.currentOrder.name;
    
    // 渲染左上角菜谱
    this.ui.orderName.textContent = `${this.currentOrder.emoji} ${this.currentOrder.name}`;
    this.ui.orderIngredients.innerHTML = '';
    
    const ingredientsData = this.currentOrder.ingredients.map(id => INGREDIENTS.find(i => i.id === id));
    
    ingredientsData.forEach(ing => {
      if (!ing) return;
      const span = document.createElement('span');
      span.className = 'ingredient-icon';
      span.textContent = ing.emoji;
      span.style.color = ing.color;
      this.ui.orderIngredients.appendChild(span);
    });
    
    this.stirringPower = 0;
    this.seasoningPhaseDone = false; // 标记是否已经完成调料
    this.ui.progressBar.style.width = '0%';    
    this.ui.progressBar.classList.remove('pulsing');
    
    this.ui.cookingUI.classList.remove('hidden');
    this.ui.seasoningUI.classList.add('hidden');
    
    // 发送食材到 3D 场景
    this.foodSystem.load(ingredientsData, this.wok.getWorldCenter(), this.wok.radius, this.wok.depth);
  }

  enterSeasoningPhase() {
    this.state = GameState.SEASONING;
    this.lever.hide(); // 隐藏操作杆
    
    this.ui.cookingUI.classList.add('hidden');
    this.ui.seasoningUI.classList.remove('hidden');
    this.ui.seasoningHint.textContent = `需要调料 ${this.currentOrder.seasonings} 次！`;
    
    // 初始化调料系统
    this.seasoningStepsDone = 0;
    this.seasoningScore = 0;
    this.seasoningCurrentRadius = 150;
    this.seasoningHints = [];
  }

  resumeCookingPhase() {
    this.seasoningPhaseDone = true;
    this.state = GameState.COOKING;
    this.lever.show(); // 重新显示操作杆
    
    this.ui.cookingUI.classList.remove('hidden');
    this.ui.seasoningUI.classList.add('hidden');
    
    this.showFeedback('继续翻炒！', 'perfect');
  }

  finishDish() {
    this.state = GameState.FINISH_DISH;
    this.ui.seasoningUI.classList.add('hidden');
    
    // 计分
    let finalScore = Math.floor(this.seasoningScore * (1 + this.combo * 0.1));
    this.score += finalScore;
    this.ui.score.textContent = this.score;
    this.dishesServed++;
    
    if (this.audio) this.audio.playSuccess();
    
    // 增加时间奖励 (+3秒)
    this.gameTime += 3;
    this.showFeedback('+3s', 'perfect');
    
    // 显示 3D 起锅特效
    this.fireSystem.burst(this.wok.getWorldCenter());

    // 弹出成品展示 Modal
    this.showDishModal(this.currentOrder, finalScore);
  }

  showDishModal(order, addScore) {
    // 设置文案和星星
    this.ui.dishName.textContent = order.name;
    // 基于平均调料得分评定星级（旧公式几乎不可能拿高星）
    // 平均倍率：全 Perfect=1.5, 全 Good=1.0, 全 Bad=0.5
    const avgMultiplier = addScore / (order.baseScore * order.seasonings);
    let stars;
    if (avgMultiplier >= 1.3) {
      stars = 3; // 大部分 Perfect
    } else if (avgMultiplier >= 0.85) {
      stars = 2; // 大部分 Good
    } else {
      stars = 1; // 较多 Bad 或 Miss
    }
    this.ui.dishStars.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    
    // 重置图片容器
    this.ui.dishImg.className = 'dish-image'; 
    this.ui.dishImg.style.display = 'block';
    this.ui.dishImg.style.backgroundImage = 'none'; // 清除旧的背景图

    // 映射对应菜品展示图
    const imgMap = {
      '经典炒粉': 'dish_classic.png',
      '牛肉炒粉': 'dish_beef.png',
      '海鲜炒粉': 'dish_seafood.png',
      '麻辣炒粉': 'dish_spicy.png',
      '大师炒粉': 'dish_master.png'
    };
    const imgPath = imgMap[order.name] || 'dish_classic.png';
    
    // 使用 img 标签替代 background-image，提升微信浏览器兼容性
    this.ui.dishImg.innerHTML = '';
    const imgEl = document.createElement('img');
    imgEl.src = `assets/images/${imgPath}`;
    imgEl.alt = order.name;
    imgEl.className = 'dish-image-inner';
    imgEl.draggable = false;
    // 如果图片加载失败，用 emoji 做兜底
    imgEl.onerror = () => {
      imgEl.style.display = 'none';
      this.ui.dishImg.textContent = order.emoji || '🍜';
      this.ui.dishImg.style.fontSize = '80px';
      this.ui.dishImg.style.lineHeight = '240px';
      this.ui.dishImg.style.textAlign = 'center';
    };
    this.ui.dishImg.appendChild(imgEl);

    this.ui.dishModal.classList.remove('hidden');

    // 延迟2秒后自动进入下一道菜
    setTimeout(() => {
      this.ui.dishModal.classList.add('hidden');
      if (this.gameTime > 0) {
        this.startNewOrder();
      } else {
        this.gameOver();
      }
    }, 2000);
  }

  gameOver() {
    this.state = GameState.GAME_OVER;
    this.lever.hide();
    this.ui.cookingUI.classList.add('hidden');
    this.ui.seasoningUI.classList.add('hidden');
    this.ui.resultScreen.classList.remove('hidden');
    this.ui.dishModal.classList.add('hidden');
    
    this.ui.finalScore.textContent = this.score;
    this.ui.dishesServed.textContent = this.dishesServed;
    this.ui.maxCombo.textContent = this.maxCombo;
    
    this.foodSystem.clear(); // 清空锅子
  }

  // --- 辅助绘制层 ---

  _drawSeasoningMiniGame() {
    if (!this.seasonCtx) return;
    const ctx = this.seasonCtx;
    const cw = this.ui.seasoningCanvas.width;
    const ch = this.ui.seasoningCanvas.height;
    const cx = cw / 2;
    const cy = ch / 2;
    
    ctx.clearRect(0, 0, cw, ch);
    
    // 绘制目标圈
    ctx.beginPath();
    ctx.arc(cx, cy, GAME.SEASON_TARGET_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 8]);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // 绘制当前圈
    ctx.beginPath();
    ctx.arc(cx, cy, this.seasoningCurrentRadius, 0, Math.PI * 2);
    
    let color = '#FFF';
    const diff = Math.abs(this.seasoningCurrentRadius - GAME.SEASON_TARGET_RADIUS);
    if (diff <= GAME.SEASON_PERFECT_RANGE) {
      color = '#32CD32'; // Perfect
      ctx.lineWidth = 6;
    } else if (diff <= GAME.SEASON_GOOD_RANGE) {
      color = '#FFA500'; // Good
      ctx.lineWidth = 4;
    } else {
      color = '#FF4500'; // Bad
      ctx.lineWidth = 2;
    }
    
    ctx.strokeStyle = color;
    ctx.stroke();
    
    // 绘制中心按钮指示
    ctx.fillStyle = color;
    ctx.font = 'bold 28px "Noto Sans SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('撒料!', cx, cy);
  }

  showFeedback(text, type) {
    this.ui.feedbackText.textContent = text;
    this.ui.feedbackText.className = 'feedback-text show ' + type;
    
    // 触发重绘以重新开始动画
    void this.ui.feedbackText.offsetWidth;
    
    setTimeout(() => {
      this.ui.feedbackText.classList.remove('show');
    }, 1000);
  }

  updateCombo() {
    if (this.combo >= 2) {
      this.ui.comboText.textContent = `${this.combo}连击!`;
      this.ui.comboText.classList.remove('hidden');
      this.ui.comboText.classList.add('pop');
      setTimeout(() => this.ui.comboText.classList.remove('pop'), 300);
    } else {
      this.ui.comboText.classList.add('hidden');
    }
  }
}
