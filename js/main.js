// 炒粉大师 — 入口文件

import { Game } from './game.js';

// 等待 DOM 加载
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  const game = new Game(canvas);

  // 适配屏幕大小
  function resize() {
    const container = document.getElementById('game-wrapper');
    const maxW = window.innerWidth;
    const maxH = window.innerHeight;
    const aspect = 480 / 720;

    let w, h;
    if (maxW / maxH > aspect) {
      h = maxH;
      w = h * aspect;
    } else {
      w = maxW;
      h = w / aspect;
    }

    container.style.width = `${w}px`;
    container.style.height = `${h}px`;
  }

  window.addEventListener('resize', resize);
  resize();

  // 开始按钮
  document.getElementById('start-btn').addEventListener('click', () => {
    game.start();
  });

  // 重来按钮
  document.getElementById('restart-btn').addEventListener('click', () => {
    game.start();
  });

  // 音效开关
  document.getElementById('sound-toggle').addEventListener('click', () => {
    const enabled = game.audio.toggle();
    document.getElementById('sound-toggle').textContent = enabled ? '🔊' : '🔇';
  });

  // 游戏主循环
  let lastTime = 0;
  function gameLoop(timestamp) {
    // 计算 delta time
    if (!lastTime) lastTime = timestamp;

    // 更新游戏
    game.update(timestamp);

    // 渲染
    game.render();

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
});
