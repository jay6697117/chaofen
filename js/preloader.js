// 炒粉大师 — 资源预加载模块
// 在页面加载时预加载所有图片资源，避免游戏开始后出现空白延迟

import { preloadAllFoodTextures } from './food3d.js';

// 厨师手纹理缓存（处理后的 CanvasTexture）
let chefHandTextureCache = null;

/**
 * 预加载厨师手的图片并完成 Canvas 抠图处理
 * 返回处理好的 Canvas（后续 Wok3D 直接用）
 */
function preloadChefHand() {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = 'assets/images/chef_hand.png';
    img.onload = () => {
      // 直接在预加载阶段完成像素处理
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        // 计算亮度 — 深色（黑色背景）设为透明
        const brightness = r * 0.299 + g * 0.587 + b * 0.114;
        if (brightness < 35) {
          // 纯黑区域完全透明
          data[i + 3] = 0;
        } else if (brightness < 60) {
          // 过渡区域半透明（平滑边缘）
          const alpha = ((brightness - 35) / 25) * 255;
          data[i + 3] = Math.min(data[i + 3], Math.floor(alpha));
        }
      }

      ctx.putImageData(imageData, 0, 0);
      chefHandTextureCache = canvas;
      resolve(canvas);
    };
    img.onerror = () => {
      console.warn('厨师手图片加载失败');
      resolve(null);
    };
  });
}

/**
 * 获取已预加载的厨师手 Canvas（同步获取）
 */
export function getChefHandCanvas() {
  return chefHandTextureCache;
}

/**
 * 预加载所有游戏资源
 * 返回 Promise，完成后所有图片已加载并处理完毕
 */
export async function preloadAllAssets(onProgress) {
  const tasks = [
    { name: '食材纹理', fn: preloadAllFoodTextures },
    { name: '厨师手图片', fn: preloadChefHand },
  ];

  let completed = 0;
  const total = tasks.length;

  for (const task of tasks) {
    await task.fn();
    completed++;
    if (onProgress) {
      onProgress(completed / total, task.name);
    }
  }
}
