// 炒粉大师 — 入口文件

import { GameManager } from './game.js';
import { AudioManager } from './audio.js';
import { MusicPlayer } from './music-player.js';
import { preloadAllAssets } from './preloader.js';

window.addEventListener('DOMContentLoaded', () => {
  // DOM 元素防抖绑定
  const startBtn = document.getElementById('start-btn');
  const startBtnText = startBtn.querySelector('.btn-text');
  const restartBtn = document.getElementById('restart-btn');
  const howToPlayBtn = document.getElementById('how-to-play-btn');
  const howToModal = document.getElementById('how-to-modal');
  const closeHowToBtn = document.getElementById('close-how-to');

  // ===== 预加载所有游戏资源 =====
  // 按钮在加载完成前显示加载状态
  startBtn.disabled = true;
  startBtnText.textContent = '加载中...';
  startBtn.classList.add('loading');

  preloadAllAssets((progress, taskName) => {
    // 更新按钮文字显示加载进度
    const pct = Math.floor(progress * 100);
    startBtnText.textContent = pct < 100 ? `加载中 ${pct}%` : '开始炒粉';
  }).then(() => {
    // 所有资源加载完成 — 激活按钮
    startBtn.disabled = false;
    startBtnText.textContent = '开始炒粉';
    startBtn.classList.remove('loading');
  }).catch((err) => {
    console.warn('资源预加载部分失败:', err);
    // 即使有失败也允许开始游戏（回退到按需加载）
    startBtn.disabled = false;
    startBtnText.textContent = '开始炒粉';
    startBtn.classList.remove('loading');
  });

  // 预加载菜品展示图（dish modal 用）
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
    return img;
  });

  // 由于 iOS 限制，需要在第一次用户交互时初始化 AudioContext
  let audioEngine = null;
  let gameManager = null;
  
  // 确保音乐在播放的辅助函数
  function ensureMusicPlaying() {
    if (musicPlayer && !musicPlayer.isPlaying) {
      musicPlayer.play();
    }
  }

  const backBtn = document.getElementById('back-btn');

  function initGame() {
    if (!audioEngine) {
      try {
        audioEngine = new AudioManager();
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

  // 返回首页按钮
  backBtn.addEventListener('click', () => {
    if (gameManager) {
      gameManager.backToMenu();
    }
  });

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
