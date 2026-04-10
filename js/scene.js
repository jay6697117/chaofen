// 炒粉大师 — Three.js 场景管理器

import * as THREE from 'three';

export class SceneManager {
  constructor(container) {
    this.container = container;

    // 渲染器
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);

    // 场景
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a0f0a);

    // 摄像机 — 45° 俯视角，锅把朝向玩家
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 100);
    this.camera.position.set(0, 8, 8);
    this.camera.lookAt(0, 0.5, 0);

    // 摄像机震动
    this._shakeIntensity = 0;
    this._shakeOffset = new THREE.Vector3();
    this._cameraBasePos = this.camera.position.clone();

    // 灯光
    this._setupLights();

    // 环境（台面、灶台）
    this._setupEnvironment();

    // 窗口缩放
    window.addEventListener('resize', () => this.resize());
  }

  _setupLights() {
    // 环境光
    const ambient = new THREE.AmbientLight(0x442211, 1.5);
    this.scene.add(ambient);

    // 灶火点光源（在锅下方）— 强度可动态调节
    this.fireLight = new THREE.PointLight(0xff6633, 3, 12);
    this.fireLight.position.set(0, 0.5, 0);
    this.scene.add(this.fireLight);

    // 顶部聚光灯（照亮锅面）
    const spot = new THREE.SpotLight(0xffeecc, 5, 25, Math.PI / 5, 0.4);
    spot.position.set(2, 12, 4);
    spot.target.position.set(0, 0, 0);
    spot.castShadow = true;
    spot.shadow.mapSize.set(1024, 1024);
    this.scene.add(spot);
    this.scene.add(spot.target);

    // 后侧补光
    const backLight = new THREE.DirectionalLight(0xffaa66, 0.4);
    backLight.position.set(-3, 5, -3);
    this.scene.add(backLight);
  }

  _setupEnvironment() {
    // 台面 — 深色木纹
    const tableGeom = new THREE.PlaneGeometry(24, 24);
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x1c1008,
      roughness: 0.85,
      metalness: 0.05,
    });
    const table = new THREE.Mesh(tableGeom, tableMat);
    table.rotation.x = -Math.PI / 2;
    table.position.y = -0.3;
    table.receiveShadow = true;
    this.scene.add(table);

    // 灶台 — 圆形金属
    const stoveGeom = new THREE.CylinderGeometry(2.2, 2.5, 0.5, 32);
    const stoveMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.5,
      metalness: 0.6,
    });
    const stove = new THREE.Mesh(stoveGeom, stoveMat);
    stove.position.y = 0;
    stove.receiveShadow = true;
    this.scene.add(stove);

    // 灶口发光环
    const ringGeom = new THREE.TorusGeometry(1.6, 0.06, 8, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.26;
    this.scene.add(ring);

    // 灶内发光（模拟内部火焰光）
    const innerGlowGeom = new THREE.CircleGeometry(1.5, 32);
    const innerGlowMat = new THREE.MeshBasicMaterial({
      color: 0xff3300,
      transparent: true,
      opacity: 0.15,
    });
    const innerGlow = new THREE.Mesh(innerGlowGeom, innerGlowMat);
    innerGlow.rotation.x = -Math.PI / 2;
    innerGlow.position.y = 0.27;
    this.scene.add(innerGlow);
  }

  // 窗口缩放适配
  resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  // 渲染一帧
  render() {
    // 应用摄像机震动
    if (this._shakeIntensity > 0) {
      this._shakeOffset.set(
        (Math.random() - 0.5) * this._shakeIntensity,
        (Math.random() - 0.5) * this._shakeIntensity * 0.5,
        (Math.random() - 0.5) * this._shakeIntensity * 0.3
      );
      this.camera.position.copy(this._cameraBasePos).add(this._shakeOffset);
      this._shakeIntensity *= 0.88;
      if (this._shakeIntensity < 0.01) {
        this._shakeIntensity = 0;
        this.camera.position.copy(this._cameraBasePos);
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  // 触发摄像机震动
  shake(intensity) {
    this._shakeIntensity = Math.min(0.5, intensity);
  }

  // 设置灶火灯光强度
  setFireIntensity(intensity) {
    this.fireLight.intensity = 2 + intensity * 4;
  }
}
