// 炒粉大师 — 3D 食材系统（真实食材版）

import * as THREE from 'three';

// 纹理缓存
const textureCache = new Map();

// 所有食材的真实图片映射
const FOOD_IMAGES = {
  'noodles': 'assets/images/food_noodles.png',
  'beef': 'assets/images/food_beef.png',
  'egg': 'assets/images/food_egg.png',
  'onion': 'assets/images/food_onion.png',
  'chili': 'assets/images/food_chili.png',
  'shrimp': 'assets/images/food_shrimp.jpg',
  'vegetable': 'assets/images/food_vegetable.jpg',
  'mushroom': 'assets/images/food_mushroom.png',
};

// 每种食材在锅中的份数 — 要足够多才像真正在炒菜
const FOOD_COUNTS = {
  'noodles': 12,   // 河粉是主食，要最多
  'beef': 8,
  'egg': 7,
  'onion': 7,
  'chili': 7,
  'shrimp': 7,
  'vegetable': 8,
  'mushroom': 7,
};

// 每种食材的 Sprite 大小范围 [最小, 最大] — 加大尺寸铺满锅面
const FOOD_SCALES = {
  'noodles': [0.7, 0.95],
  'beef': [0.5, 0.7],
  'egg': [0.5, 0.7],
  'onion': [0.45, 0.65],
  'chili': [0.45, 0.6],
  'shrimp': [0.5, 0.68],
  'vegetable': [0.55, 0.75],
  'mushroom': [0.45, 0.65],
};

/**
 * 加载食材纹理 — 去除棋盘格/白色背景
 * 图片实际是 JPEG（无透明通道），需要手动抠背景
 * 棋盘格特征：灰白交替 (约 #CCCCCC 和 #FFFFFF)
 */
function loadFoodTexture(ingId) {
  if (textureCache.has(ingId)) return textureCache.get(ingId);

  const imgPath = FOOD_IMAGES[ingId];
  if (!imgPath) return null;

  const texture = new THREE.Texture();
  texture.colorSpace = THREE.SRGBColorSpace;

  const img = new Image();
  img.src = imgPath;
  img.onload = () => {
    const size = 512; // 统一尺寸提升性能
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // 居中绘制
    const scale = size / Math.max(img.width, img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.drawImage(img, (size - dw) / 2, (size - dh) / 2, dw, dh);

    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;

    // 检测角落是否已透明（图片自带 Alpha）
    let transparentCornerCount = 0;
    const testCorners = [[0,0],[size-1,0],[0,size-1],[size-1,size-1]];
    for (const [cx, cy] of testCorners) {
      if (data[((cy * size + cx) * 4) + 3] < 128) transparentCornerCount++;
    }

    if (transparentCornerCount >= 3) {
      // 图片自带透明通道，仅清理 canvas 空白区
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] === 0 && data[i+1] === 0 && data[i+2] === 0 && data[i+3] === 0) {
          data[i+3] = 0;
        }
      }
    } else {
      // 使用 Flood Fill 从角落扩展来检测背景区域
      const bgMask = new Uint8Array(size * size); // 0=未知, 1=背景

      // 判断一个像素是否"像背景"
      // 棋盘格特征：灰色(~205,205,205) 和 白色(~255,255,255) 交替
      const isBgColor = (idx) => {
        const r = data[idx], g = data[idx+1], b = data[idx+2];
        // 纯黑（canvas 未绘制区域）
        if (r === 0 && g === 0 && b === 0) return true;
        // 棋盘格检测：RGB 各通道差值很小（接近灰度），且亮度较高
        const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
        const brightness = (r + g + b) / 3;
        // 灰色格子 brightness≈205, 白色格子 brightness≈255
        return maxDiff <= 8 && brightness > 180;
      };

      // BFS Flood Fill 从角落和边缘开始
      const queue = [];
      // 种子点：四角 + 沿四边每隔一段距离取点
      const seedPoints = [
        [0, 0], [size-1, 0], [0, size-1], [size-1, size-1],
      ];
      // 四边每隔 16 像素添加种子点
      for (let i = 0; i < size; i += 16) {
        seedPoints.push([i, 0], [i, size-1], [0, i], [size-1, i]);
      }

      for (const [sx, sy] of seedPoints) {
        const si = sy * size + sx;
        const sIdx = si * 4;
        if (bgMask[si] === 0 && isBgColor(sIdx)) {
          bgMask[si] = 1;
          queue.push(si);
        }
      }

      // BFS 扩展 — 8 方向（含对角线），只要目标像素是背景色就扩展
      // 不用 colorClose，因为棋盘格灰白交替差值≈50，用颜色相近判断会阻断
      const dirs = [
        -1, 1, -size, size,                     // 上下左右
        -size - 1, -size + 1, size - 1, size + 1  // 对角线
      ];
      while (queue.length > 0) {
        const ci = queue.shift();
        const cx = ci % size;
        const cy = (ci / size) | 0;

        for (const d of dirs) {
          const ni = ci + d;
          if (ni < 0 || ni >= size * size) continue;
          const nx = ni % size;
          const ny = (ni / size) | 0;
          // 防止边界回绕：相邻像素的 x/y 坐标差不能超过 1
          if (Math.abs(nx - cx) > 1 || Math.abs(ny - cy) > 1) continue;
          if (bgMask[ni] !== 0) continue;

          const nIdx = ni * 4;
          if (isBgColor(nIdx)) {
            bgMask[ni] = 1;
            queue.push(ni);
          }
        }
      }

      // 应用背景 mask
      for (let i = 0; i < size * size; i++) {
        const idx = i * 4;
        if (bgMask[i] === 1) {
          data[idx + 3] = 0; // 背景 — 完全透明
        } else if (data[idx] === 0 && data[idx+1] === 0 && data[idx+2] === 0) {
          data[idx + 3] = 0; // canvas 未绘制区域
        }
      }

      // 边缘羽化：背景和食材交界处渐变
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const i = y * size + x;
          if (bgMask[i] === 1) continue; // 已是背景
          const idx = i * 4;
          if (data[idx + 3] === 0) continue; // 已是透明

          // 检查 3 像素内是否有背景
          let minDist = 4;
          for (let dy = -3; dy <= 3 && minDist > 1; dy++) {
            for (let dx = -3; dx <= 3 && minDist > 1; dx++) {
              const nx = x + dx, ny = y + dy;
              if (nx < 0 || nx >= size || ny < 0 || ny >= size) continue;
              if (bgMask[ny * size + nx] === 1) {
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < minDist) minDist = dist;
              }
            }
          }
          if (minDist <= 3) {
            data[idx + 3] = Math.floor(data[idx + 3] * (minDist / 3));
          }
        }
      }
    }




    ctx.putImageData(imageData, 0, 0);
    texture.image = canvas;
    texture.needsUpdate = true;
  };

  textureCache.set(ingId, texture);
  return texture;
}

/**
 * 边缘羽化 — 让透明区域与食材的交界更平滑
 */
function edgeFeather(data, w, h, radius) {
  // 简单的从透明边缘向内渐变
  const alpha = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    alpha[i] = data[i * 4 + 3];
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (alpha[idx] === 0) continue; // 已经透明的跳过

      // 检查周围是否有透明像素
      let minDist = radius + 1;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          if (alpha[ny * w + nx] === 0) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDist) minDist = dist;
          }
        }
      }

      // 如果靠近透明边缘，做渐变
      if (minDist <= radius) {
        const factor = minDist / radius;
        data[idx * 4 + 3] = Math.floor(data[idx * 4 + 3] * factor);
      }
    }
  }
}

// 单个食材对象
class FoodItem {
  constructor(ingredient, sprite, scaleVal) {
    this.ingredient = ingredient;
    this.sprite = sprite;

    // 物理状态
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;

    // 锅内的基准位置
    this.baseAngle = 0;
    this.baseR = 0;

    this.isFlying = false;
    this.settled = true;
    this.flipped = false;

    // 旋转速度
    this.rotSpeed = 0;

    // 基准大小
    this.baseScale = scaleVal;
  }
}

export class FoodSystem {
  constructor(scene) {
    this.scene = scene;
    this.foods = [];
  }

  /**
   * 加载食材到锅中 — 每种多份，铺满锅面
   */
  load(ingredients, wokCenter, wokRadius, wokDepth) {
    this.clear();
    this.wokRadius = wokRadius;
    this.wokDepth = wokDepth;

    // 收集所有需要生成的食材碎片
    const allPieces = [];
    ingredients.forEach((ing) => {
      const count = FOOD_COUNTS[ing.id] || 3;
      const scaleRange = FOOD_SCALES[ing.id] || [0.35, 0.5];
      for (let j = 0; j < count; j++) {
        allPieces.push({
          ingredient: ing,
          scale: scaleRange[0] + Math.random() * (scaleRange[1] - scaleRange[0]),
        });
      }
    });

    // 打散顺序让不同食材交错
    for (let i = allPieces.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allPieces[i], allPieces[j]] = [allPieces[j], allPieces[i]];
    }

    const totalPieces = allPieces.length;

    allPieces.forEach((piece, i) => {
      const texture = loadFoodTexture(piece.ingredient.id);
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.05,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(material);
      sprite.renderOrder = 1; // 确保食材渲染在锅底油层之上
      const s = piece.scale;
      sprite.scale.set(s, s, s);

      // 随机初始旋转角度
      sprite.material.rotation = Math.random() * Math.PI * 2;

      // 自然分布 — 食材散布在锅底中心区域
      const goldenAngle = 2.399963;
      const angle = i * goldenAngle + Math.random() * 0.5;
      // 食材分布在锅面 55% 范围内
      const maxR = wokRadius * 0.55;
      // 适度分散，中心稍密、外围稍疏
      const r = Math.sqrt((i + 0.5) / totalPieces) * maxR + Math.random() * 0.1;

      const food = new FoodItem(piece.ingredient, sprite, s);
      food.baseAngle = angle;
      food.baseR = r;

      // 初始位置 — 食材层叠堆积在锅底
      const t = r / wokRadius;
      const surfaceY = -wokDepth * (1 - t * t);
      // 随机层叠高度
      food.stackHeight = Math.random() * 0.15;
      sprite.position.set(
        wokCenter.x + Math.cos(angle) * r,
        wokCenter.y + surfaceY + 0.58 + food.stackHeight,
        wokCenter.z + Math.sin(angle) * r
      );

      this.scene.add(sprite);
      this.foods.push(food);
    });
  }

  // 颠锅！
  toss(force, wokCenter) {
    for (const food of this.foods) {
      const fRand = 0.6 + Math.random() * 0.8;
      food.vy = force * 8 * fRand + Math.random() * 2 + 1;
      food.vx = (Math.random() - 0.5) * force * 2;
      // 去掉固定的 -Z 偏移，让食材均匀散开而不是偏向一侧
      food.vz = (Math.random() - 0.5) * force * 1.5;
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
        // 飞行中：重力 + 空气阻力
        food.vy -= 18 * dt;
        food.vx *= 0.995;
        food.vz *= 0.995;

        sp.position.x += food.vx * dt;
        sp.position.y += food.vy * dt;
        sp.position.z += food.vz * dt;

        sp.material.rotation += food.rotSpeed * dt;

        const flyS = food.baseScale * 1.08;
        sp.scale.set(flyS, flyS, flyS);

        if (!food.flipped && food.vy < 0) {
          food.flipped = true;
        }

        // 碰撞检测 — 与锅壁碰撞
        const dx = sp.position.x - wokCenter.x;
        const dz = sp.position.z - wokCenter.z;
        const r = Math.sqrt(dx * dx + dz * dz);

        // 飞行中也施加轻微的回中心力，防止食材偏移
        if (r > this.wokRadius * 0.3) {
          const centerPull = 2.0 * dt;
          food.vx -= (dx / r) * centerPull;
          food.vz -= (dz / r) * centerPull;
        }

        if (r < this.wokRadius * 0.95) {
          const t = r / this.wokRadius;
          const surfaceY = wokCenter.y - this.wokDepth * (1 - t * t) + 0.55;

          if (sp.position.y <= surfaceY) {
            sp.position.y = surfaceY;
            food.vy = Math.abs(food.vy) * 0.2;
            food.vx *= 0.5;
            food.vz *= 0.5;
            food.rotSpeed *= 0.5;

            if (Math.abs(food.vy) < 0.4) {
              food.vy = 0;
              food.vx = 0;
              food.vz = 0;
              food.isFlying = false;
              food.settled = true;
              food.rotSpeed = 0;
              // 记录落点的随机层叠高度
              food.stackHeight = Math.random() * 0.12;
            }
          }
        } else {
          // 超出锅面 — 强力拉回
          const pullAngle = Math.atan2(dz, dx);
          food.vx -= Math.cos(pullAngle) * 12 * dt;
          food.vz -= Math.sin(pullAngle) * 12 * dt;
        }

        if (sp.position.y < -0.2) {
          sp.position.y = wokCenter.y - this.wokDepth + 0.3;
          food.vy = 2;
        }
      } else if (food.settled) {
        // 自然堆积：食材在锅底自然散布，不过于集中也不过于分散
        const dx = sp.position.x - wokCenter.x;
        const dz = sp.position.z - wokCenter.z;
        const r = Math.sqrt(dx * dx + dz * dz);
        // 堆积范围 — 锅面的 50%，食材更集中在中心
        const maxPileR = this.wokRadius * 0.5;

        // 超出堆积范围施加较强的聚拢力
        if (r > maxPileR) {
          const excess = r - maxPileR;
          const pullStrength = excess * 0.12;
          sp.position.x -= (dx / r) * pullStrength;
          sp.position.z -= (dz / r) * pullStrength;
        } else if (r > maxPileR * 0.6) {
          // 范围内也施加微弱的向心力，让食材更聚拢
          const pullStrength = 0.01;
          sp.position.x -= (dx / r) * pullStrength;
          sp.position.z -= (dz / r) * pullStrength;
        }

        // 食材之间的推挤 — 力度更强，让食材自然分散开
        for (const other of this.foods) {
          if (other === food || !other.settled) continue;
          const ox = sp.position.x - other.sprite.position.x;
          const oz = sp.position.z - other.sprite.position.z;
          const dist = Math.sqrt(ox * ox + oz * oz);
          // 推挤距离基于食材实际大小，更大的间距
          const minDist = (food.baseScale + other.baseScale) * 0.28;
          if (dist < minDist && dist > 0.001) {
            const pushForce = (minDist - dist) * 0.06;
            sp.position.x += (ox / dist) * pushForce;
            sp.position.z += (oz / dist) * pushForce;
          }
        }

        // Y 轴跟随锅面曲率 + 层叠高度
        const rNew = Math.sqrt(
          (sp.position.x - wokCenter.x) ** 2 +
          (sp.position.z - wokCenter.z) ** 2
        );
        const t = rNew / this.wokRadius;
        const sizzle = Math.sin(Date.now() * 0.012 + food.baseAngle * 7) * 0.006;
        const targetY = wokCenter.y - this.wokDepth * (1 - t * t) + 0.58 + sizzle + (food.stackHeight || 0);
        sp.position.y += (targetY - sp.position.y) * 0.12;

        // 恢复正常大小
        const s = food.baseScale;
        sp.scale.x += (s - sp.scale.x) * 0.1;
        sp.scale.y += (s - sp.scale.y) * 0.1;
        sp.scale.z += (s - sp.scale.z) * 0.1;
      }
    }
  }

  hasFlying() {
    return this.foods.some((f) => f.isFlying);
  }

  clear() {
    for (const food of this.foods) {
      this.scene.remove(food.sprite);
      food.sprite.material.dispose();
    }
    this.foods = [];
  }
}
