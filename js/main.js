// 炒粉大师 — 入口文件

import { Game } from './game.js';

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

  // 按钮事件
  document.getElementById('start-btn').addEventListener('click', () => game.start());
  document.getElementById('restart-btn').addEventListener('click', () => game.start());

  // 音效开关
  document.getElementById('sound-toggle').addEventListener('click', () => {
    const enabled = game.audio.toggle();
    document.getElementById('sound-toggle').textContent = enabled ? '🔊' : '🔇';
  });

  // 游戏主循环
  function gameLoop(timestamp) {
    game.update(timestamp);
    game.render();
    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
});
