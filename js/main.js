// 炒粉大师 — 入口文件

import { GameManager } from './game.js';
import { AudioManager } from './audio.js';
import { MusicPlayer } from './music-player.js';

window.addEventListener('DOMContentLoaded', () => {
  // 预加载菜品高清图（存到全局避免被 GC 释放缓存）
  const preloadImages = [
    'assets/images/dish_classic.jpg',
    'assets/images/dish_beef.jpg',
    'assets/images/dish_seafood.jpg',
    'assets/images/dish_spicy.jpg',
    'assets/images/dish_master.jpg'
  ];
  window.__preloadedDishImages = preloadImages.map(src => {
    const img = new Image();
    img.src = src;
    // 微信浏览器兼容：设置 crossOrigin 避免跨域缓存失效问题
    // img.crossOrigin = 'anonymous'; // 如果是同域资源不需要
    return img;
  });

  // DOM 元素防抖绑定
  const startBtn = document.getElementById('start-btn');
  const restartBtn = document.getElementById('restart-btn');
  const howToPlayBtn = document.getElementById('how-to-play-btn');
  const howToModal = document.getElementById('how-to-modal');
  const closeHowToBtn = document.getElementById('close-how-to');

  // 由于 iOS 限制，需要在第一次用户交互时初始化 AudioContext
  let audioEngine = null;
  let gameManager = null;
  
  // 确保音乐在播放的辅助函数
  function ensureMusicPlaying() {
    if (musicPlayer && !musicPlayer.isPlaying) {
      musicPlayer.play();
    }
  }

  function initGame() {
    if (!audioEngine) {
      try {
        audioEngine = new AudioManager();
        // 如果失败不阻塞游戏
      } catch(e) {
        console.warn('Audio Init Failed:', e);
      }
    }
    
    if (!gameManager) {
      gameManager = new GameManager(audioEngine);
    }
    
    // 点击开始炒粉时，确保音乐在播放
    ensureMusicPlaying();
    
    gameManager.startGame();
  }

  startBtn.addEventListener('click', initGame);
  restartBtn.addEventListener('click', initGame);

  // 玩法说明 Modal
  howToPlayBtn.addEventListener('click', () => {
    howToModal.classList.remove('hidden');
    // 点击玩法说明时，确保音乐在播放
    ensureMusicPlaying();
  });
  
  closeHowToBtn.addEventListener('click', () => {
    howToModal.classList.add('hidden');
  });

  // 设置 Canvas 尺寸适配
  const resizeCanvas = () => {
    const seasoningCanvas = document.getElementById('seasoning-canvas');
    if (seasoningCanvas) {
      seasoningCanvas.width = 300;
      seasoningCanvas.height = 300;
      // 使其在 CSS 缩放下不模糊
      const dpr = window.devicePixelRatio || 1;
      seasoningCanvas.style.width = '100%';
      seasoningCanvas.style.height = '100%';
      // 内部通过 CSS 控制尺寸，此时不用乘以 DPR 修改实际宽高
    }
  };
  
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // 初始化音乐播放器组件
  const musicPlayer = new MusicPlayer();

  // 添加全局阻止默认拖拽、双击缩放 (移动端友好)
  document.addEventListener('touchmove', function (event) {
    // 允许内容溢出部位滚动，组织默认防缩放
    if (event.scale !== 1) { event.preventDefault(); }
  }, { passive: false });
});
