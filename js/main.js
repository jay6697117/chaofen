// 炒粉大师 — 入口文件

import { GameManager } from './game.js';
import { AudioManager } from './audio.js';
import { MusicPlayer } from './music-player.js';

window.addEventListener('DOMContentLoaded', () => {
  // 预加载由于文件较大 (800KB+) 而可能导致展示时为空白的高清菜品图
  const preloadImages = [
    'assets/images/dish_classic.png',
    'assets/images/dish_beef.png',
    'assets/images/dish_seafood.png',
    'assets/images/dish_spicy.png',
    'assets/images/dish_master.png'
  ];
  preloadImages.forEach(src => {
    const img = new Image();
    img.src = src;
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
    
    gameManager.startGame();
  }

  startBtn.addEventListener('click', initGame);
  restartBtn.addEventListener('click', initGame);

  // 玩法说明 Modal
  howToPlayBtn.addEventListener('click', () => {
    howToModal.classList.remove('hidden');
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
  new MusicPlayer();

  // 添加全局阻止默认拖拽、双击缩放 (移动端友好)
  document.addEventListener('touchmove', function (event) {
    // 允许内容溢出部位滚动，组织默认防缩放
    if (event.scale !== 1) { event.preventDefault(); }
  }, { passive: false });
});
