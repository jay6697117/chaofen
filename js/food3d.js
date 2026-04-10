// 炒粉大师 — 3D 食材系统

import * as THREE from 'three';

// emoji 纹理缓存
const textureCache = new Map();

function createEmojiTexture(emoji) {
  if (textureCache.has(emoji)) return textureCache.get(emoji);

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.font = `${size * 0.72}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, size / 2, size / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  textureCache.set(emoji, texture);
  return texture;
}

// 单个食材对象
class FoodItem {
  constructor(ingredient, sprite) {
    this.ingredient = ingredient;
    this.sprite = sprite;

    // 物理状态（世界坐标）
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;

    // 锅内的基准位置（极坐标偏移）
    this.baseAngle = 0;
    this.baseR = 0;

    this.isFlying = false;
    this.settled = true;
    this.flipped = false;

    // 旋转
    this.rotSpeed = 0;
  }
}

export class FoodSystem {
  constructor(scene) {
    this.scene = scene;
    this.foods = [];
  }

  // 加载一组食材到锅中
  load(ingredients, wokCenter, wokRadius, wokDepth) {
    this.clear();
    this.wokRadius = wokRadius;
    this.wokDepth = wokDepth;

    ingredients.forEach((ing, i) => {
      const texture = createEmojiTexture(ing.emoji);
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(0.9, 0.9, 0.9); // 放大食材

      // 在锅内分散排列
      const angle = (i / ingredients.length) * Math.PI * 2 + Math.random() * 0.5;
      const r = 0.4 + Math.random() * 0.4;

      const food = new FoodItem(ing, sprite);
      food.baseAngle = angle;
      food.baseR = r;

      // 初始位置
      const t = r / wokRadius;
      const surfaceY = -wokDepth * (1 - t * t);
      sprite.position.set(
        wokCenter.x + Math.cos(angle) * r,
        wokCenter.y + surfaceY + 0.45, // 稍微抬高防止穿模
        wokCenter.z + Math.sin(angle) * r
      );

      this.scene.add(sprite);
      this.foods.push(food);
    });
  }

  // 颠锅！给所有食材施加力
  toss(force, wokCenter) {
    for (const food of this.foods) {
      // 优化：微调颠勺力度，让菜飞得稍微高一点，但依然保持在真实视野和屏幕内
      food.vy = force * 8 + Math.random() * 2 + 1; // 适当增加向上加速度
      food.vx = (Math.random() - 0.5) * force * 2;
      food.vz = (Math.random() - 0.5) * force * 1.2 - force * 0.8; // 略向前抛
      food.isFlying = true;
      food.settled = false;
      food.flipped = false;
      food.rotSpeed = (Math.random() - 0.5) * 8;
    }
  }

  // 每帧更新
  update(dt, wokCenter) {
    for (const food of this.foods) {
      const sp = food.sprite;

      if (food.isFlying) {
        // 重力
        food.vy -= 18 * dt;

        // 空气阻力
        food.vx *= 0.995;
        food.vz *= 0.995;

        // 更新位置
        sp.position.x += food.vx * dt;
        sp.position.y += food.vy * dt;
        sp.position.z += food.vz * dt;

        // 旋转（Sprite 的 material.rotation）
        sp.material.rotation += food.rotSpeed * dt;

        // 飞行中发光放大
        sp.scale.set(1.0, 1.0, 1.0);

        // 翻转标记（飞到最高点）
        if (!food.flipped && food.vy < 0) {
          food.flipped = true;
        }

        // 碰撞检测 — 锅面
        const dx = sp.position.x - wokCenter.x;
        const dz = sp.position.z - wokCenter.z;
        const r = Math.sqrt(dx * dx + dz * dz);

        if (r < this.wokRadius * 0.95) {
          const t = r / this.wokRadius;
          const surfaceY = wokCenter.y - this.wokDepth * (1 - t * t) + 0.4; // 调整接触面高度

          if (sp.position.y <= surfaceY) {
            sp.position.y = surfaceY;
            food.vy = Math.abs(food.vy) * 0.2; // 弹跳
            food.vx *= 0.6;
            food.vz *= 0.6;
            food.rotSpeed *= 0.5;

            if (Math.abs(food.vy) < 0.4) {
              food.vy = 0;
              food.vx = 0;
              food.vz = 0;
              food.isFlying = false;
              food.settled = true;
              food.rotSpeed = 0;
            }
          }
        } else {
          // 超出锅边 — 用力拉回（不让食材飞出锅外）
          const pullAngle = Math.atan2(dz, dx);
          food.vx -= Math.cos(pullAngle) * 8 * dt;
          food.vz -= Math.sin(pullAngle) * 8 * dt;
        }

        // 落地保护 — 不让食材穿过台面
        if (sp.position.y < -0.2) {
          sp.position.y = wokCenter.y - this.wokDepth + 0.3;
          food.vy = 2;
        }
      } else if (food.settled) {
        // 已稳定 — 柔和跟随锅的位置
        const wobble = Math.sin(Date.now() * 0.002 + food.baseAngle * 3) * 0.03;
        const angle = food.baseAngle + wobble;
        const r = food.baseR;

        const targetX = wokCenter.x + Math.cos(angle) * r;
        const targetZ = wokCenter.z + Math.sin(angle) * r;
        const t = r / this.wokRadius;
        const targetY = wokCenter.y - this.wokDepth * (1 - t * t) + 0.4;

        sp.position.x += (targetX - sp.position.x) * 0.12;
        sp.position.y += (targetY - sp.position.y) * 0.12;
        sp.position.z += (targetZ - sp.position.z) * 0.12;

        // 恢复正常大小
        sp.scale.lerp(new THREE.Vector3(0.9, 0.9, 0.9), 0.1);
      }
    }
  }

  // 检查是否有食材还在飞行中
  hasFlying() {
    return this.foods.some((f) => f.isFlying);
  }

  // 清空食材
  clear() {
    for (const food of this.foods) {
      this.scene.remove(food.sprite);
      food.sprite.material.dispose();
    }
    this.foods = [];
  }
}
