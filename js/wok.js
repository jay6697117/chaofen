// 炒粉大师 — 3D 锅模型 + 颠锅物理

import * as THREE from 'three';
import { getChefHandCanvas } from './preloader.js';

export class Wok3D {
  constructor(scene) {
    this.scene = scene;

    // 锅的尺寸参数
    this.radius = 2.0;
    this.depth = 0.65;
    this.handleLength = 2.4;

    // 颠锅物理状态
    this.tossAngle = 0;        // 当前倾斜角度（绕 X 轴）
    this.tossAngVel = 0;       // 角速度
    this.wokLift = 0;          // 垂直抬起高度
    this.wokLiftVel = 0;       // 垂直速度
    this.isTossing = false;    // 是否在颠锅动画中
    this.leverValue = 0;       // 操作杆当前值

    // 锅的物理限制 — 防止颠出屏幕
    this.maxWokLift = 2.0;     // 锅最大抬起高度（约到屏幕中间）
    this.maxTossAngle = 0.8;   // 锅最大倾斜角度（约 45°）
    this.maxAngVel = 8;        // 角速度上限
    this.maxLiftVel = 7;       // 垂直速度上限

    // 锅的基础 Y 位置
    this.baseY = 1.3;

    // 构建 3D 模型
    this._build();
  }

  _build() {
    // 根组 — 控制整体位置
    this.group = new THREE.Group();
    this.group.position.set(0, this.baseY, 0);

    // 枢轴组 — 以锅把握持点为旋转中心
    // 放在锅把方向（+Z）偏移处
    this.pivot = new THREE.Group();
    this.pivot.position.set(0, 0, this.radius * 0.5);
    this.group.add(this.pivot);

    // 锅体容器 — 相对于枢轴偏移回去
    this.body = new THREE.Group();
    this.body.position.set(0, 0, -this.radius * 0.5);
    this.pivot.add(this.body);

    // === 锅体（LatheGeometry）===
    const profile = [];
    const segments = 24;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const r = t * this.radius;
      const y = -this.depth * (1 - t * t); // 抛物面
      profile.push(new THREE.Vector2(r, y));
    }
    // 锅沿翻边
    profile.push(new THREE.Vector2(this.radius + 0.06, 0.04));

    const wokGeom = new THREE.LatheGeometry(profile, 48);
    const wokMat = new THREE.MeshStandardMaterial({
      color: 0x505050,
      roughness: 0.25,
      metalness: 0.85,
      side: THREE.DoubleSide,
    });
    const wokMesh = new THREE.Mesh(wokGeom, wokMat);
    wokMesh.castShadow = true;
    wokMesh.receiveShadow = true;
    this.body.add(wokMesh);




    // === 锅沿高光环 ===
    const rimGeom = new THREE.TorusGeometry(this.radius + 0.03, 0.025, 6, 48);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.2,
      metalness: 0.9,
    });
    const rimMesh = new THREE.Mesh(rimGeom, rimMat);
    rimMesh.rotation.x = Math.PI / 2;
    rimMesh.position.y = 0.02;
    this.body.add(rimMesh);

    // === 锅把（朝 +Z 方向 → 朝向玩家）===
    const handleGeom = new THREE.CylinderGeometry(0.1, 0.14, this.handleLength, 8);
    const handleMat = new THREE.MeshStandardMaterial({
      color: 0x5c3d2e,
      roughness: 0.7,
      metalness: 0.1,
    });
    const handleMesh = new THREE.Mesh(handleGeom, handleMat);
    // 旋转使圆柱沿 Z 轴方向
    handleMesh.rotation.x = Math.PI / 2;
    handleMesh.position.set(0, -0.05, this.radius + this.handleLength / 2 - 0.15);
    handleMesh.castShadow = true;
    this.body.add(handleMesh);

    // === 锅把末端金属环 ===
    const endRingGeom = new THREE.TorusGeometry(0.16, 0.035, 8, 16);
    const endRingMat = new THREE.MeshStandardMaterial({
      color: 0x777777,
      roughness: 0.3,
      metalness: 0.8,
    });
    const endRing = new THREE.Mesh(endRingGeom, endRingMat);
    endRing.position.set(0, -0.05, this.radius + this.handleLength - 0.25);
    this.body.add(endRing);

    // === 厨师的手（握住锅把）===
    this._buildChefHand();

    // === 油光反射 ===
    const shineGeom = new THREE.CircleGeometry(this.radius * 0.35, 16);
    const shineMat = new THREE.MeshBasicMaterial({
      color: 0xffcc66,
      transparent: true,
      opacity: 0.05,
    });
    const shine = new THREE.Mesh(shineGeom, shineMat);
    shine.rotation.x = -Math.PI / 2;
    shine.position.set(-0.3, -this.depth * 0.3, -0.2);
    this.body.add(shine);

    this.scene.add(this.group);
  }

  // 构建厨师的手（优先使用预加载缓存，避免异步延迟）
  _buildChefHand() {
    const cachedCanvas = getChefHandCanvas();
    if (cachedCanvas) {
      // 预加载已完成 — 同步创建 Mesh，零延迟
      this._createChefHandMesh(cachedCanvas);
    } else {
      // 回退：预加载未完成时使用异步加载
      const loader = new THREE.TextureLoader();
      loader.load('assets/images/chef_hand.png', (texture) => {
        const img = texture.image;
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const brightness = r * 0.299 + g * 0.587 + b * 0.114;
          if (brightness < 35) {
            data[i + 3] = 0;
          } else if (brightness < 60) {
            const alpha = ((brightness - 35) / 25) * 255;
            data[i + 3] = Math.min(data[i + 3], Math.floor(alpha));
          }
        }

        ctx.putImageData(imageData, 0, 0);
        this._createChefHandMesh(canvas);
      });
    }
  }

  // 从处理后的 Canvas 创建厨师手 Mesh（共用逻辑）
  _createChefHandMesh(canvas) {
    const processedTexture = new THREE.CanvasTexture(canvas);
    processedTexture.needsUpdate = true;

    const handWidth = 1.2;
    const handHeight = 1.35;
    const planeGeom = new THREE.PlaneGeometry(handWidth, handHeight);
    const planeMat = new THREE.MeshBasicMaterial({
      map: processedTexture,
      transparent: true,
      alphaTest: 0.1,
      side: THREE.DoubleSide,
      depthWrite: true,
    });

    const handMesh = new THREE.Mesh(planeGeom, planeMat);

    // 旋转平面使其水平放置（面朝上）
    handMesh.rotation.x = -Math.PI / 2;
    // 翻转 180° — 让袖口朝向玩家（+Z），手指朝向锅（-Z）
    handMesh.rotation.z = Math.PI;

    // 放置在锅把中后段位置
    const handleGripZ = this.radius + this.handleLength * 0.55;
    handMesh.position.set(0, 0.12, handleGripZ + 0.15);

    this.body.add(handMesh);
    this.chefHand = handMesh;
  }

  // 操作杆实时控制（非颠锅状态下跟随操作杆）
  setLeverValue(value) {
    this.leverValue = value;
    if (!this.isTossing) {
      this.tossAngle = value * 0.2;
      this.wokLift = value * 0.25;
    }
  }

  // 触发颠锅！
  toss(force) {
    const f = Math.min(1, Math.max(0, force));
    this.isTossing = true;
    // 给一个向上的角速度冲量，但限制最大值防止连续点击叠加过高
    this.tossAngVel = Math.min(this.tossAngVel + f * 6, this.maxAngVel);
    // 给一个向上的位移速度，同样限制上限
    this.wokLiftVel = Math.min(this.wokLiftVel + f * 5, this.maxLiftVel);
    return f;
  }

  // 每帧更新
  update(dt) {
    if (this.isTossing) {
      // 弹簧阻尼系统 — 角度回到 0
      const springK = 15;
      const damping = 5;

      const angAcc = -springK * this.tossAngle - damping * this.tossAngVel;
      this.tossAngVel += angAcc * dt;
      this.tossAngle += this.tossAngVel * dt;

      // 垂直位移 — 重力 + 弹簧
      this.wokLiftVel -= 12 * dt; // 重力
      this.wokLift += this.wokLiftVel * dt;

      // 限制锅的最大抬起高度 — 确保锅始终在屏幕内
      if (this.wokLift > this.maxWokLift) {
        this.wokLift = this.maxWokLift;
        // 碰到天花板后速度反弹衰减，模拟弹性碰撞
        this.wokLiftVel = -Math.abs(this.wokLiftVel) * 0.3;
      }

      // 限制锅的最大倾斜角度 — 不让锅翻过头
      if (Math.abs(this.tossAngle) > this.maxTossAngle) {
        this.tossAngle = Math.sign(this.tossAngle) * this.maxTossAngle;
        this.tossAngVel *= -0.3; // 角度碰壁反弹
      }

      // 地面碰撞
      if (this.wokLift < 0) {
        this.wokLift = 0;
        this.wokLiftVel = Math.abs(this.wokLiftVel) * 0.15;
      }

      // 检查是否稳定
      if (
        Math.abs(this.tossAngVel) < 0.03 &&
        Math.abs(this.tossAngle) < 0.015 &&
        this.wokLift < 0.01 &&
        Math.abs(this.wokLiftVel) < 0.05
      ) {
        this.isTossing = false;
        this.tossAngle = 0;
        this.tossAngVel = 0;
        this.wokLift = 0;
        this.wokLiftVel = 0;
      }
    }

    // 应用到 3D 模型
    this.pivot.rotation.x = this.tossAngle;
    this.group.position.y = this.baseY + this.wokLift;

    // 微弱呼吸感
    this.group.position.y += Math.sin(Date.now() * 0.0008) * 0.015;
  }

  // 获取锅中心世界坐标
  getWorldCenter() {
    const pos = new THREE.Vector3();
    this.body.getWorldPosition(pos);
    return pos;
  }

  // 获取当前角速度
  getAngularVelocity() {
    return this.tossAngVel;
  }

  // 获取锅面高度（给定局部径向距离 r）
  getSurfaceLocalY(r) {
    const t = Math.min(1, r / this.radius);
    return -this.depth * (1 - t * t);
  }
}
