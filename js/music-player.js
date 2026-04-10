// 音乐播放器模块 — 右上角悬浮唱片式播放器（可展开控制面板）

export class MusicPlayer {
  constructor() {
    this.audio = new Audio('assets/audio/musics/lemon.mp3');
    this.audio.loop = true;
    this.audio.volume = 0.35;
    this.isPlaying = false;
    this.isExpanded = false;
    this.hasInteracted = false;

    this._createDOM();
    this._bindEvents();
    this._tryAutoPlay();
  }

  // 创建播放器 DOM 结构
  _createDOM() {
    const wrapper = document.createElement('div');
    wrapper.id = 'music-player';
    wrapper.innerHTML = `
      <!-- 收起状态：唱片入口 -->
      <div class="mp-trigger">
        <div class="mp-disc-wrapper">
          <div class="mp-disc">
            <div class="mp-disc-groove"></div>
            <div class="mp-disc-groove mp-disc-groove-2"></div>
            <div class="mp-disc-groove mp-disc-groove-3"></div>
            <div class="mp-disc-label">
              <span class="mp-note">♪</span>
            </div>
          </div>
          <div class="mp-needle"></div>
        </div>
        <div class="mp-info">
          <div class="mp-song-name">Lemon</div>
          <div class="mp-artist">米津玄師</div>
        </div>
        <div class="mp-progress-ring">
          <svg viewBox="0 0 44 44">
            <circle class="mp-ring-bg" cx="22" cy="22" r="20" />
            <circle class="mp-ring-fill" cx="22" cy="22" r="20" />
          </svg>
        </div>
      </div>

      <!-- 展开面板 -->
      <div class="mp-panel">
        <div class="mp-panel-header">
          <div class="mp-panel-disc-wrapper">
            <div class="mp-panel-disc">
              <div class="mp-disc-groove"></div>
              <div class="mp-disc-groove mp-disc-groove-2"></div>
              <div class="mp-disc-groove mp-disc-groove-3"></div>
              <div class="mp-disc-label">
                <span class="mp-note">♪</span>
              </div>
            </div>
          </div>
          <div class="mp-panel-info">
            <div class="mp-panel-song">Lemon</div>
            <div class="mp-panel-artist">米津玄師</div>
          </div>
          <button class="mp-close-btn" title="收起">✕</button>
        </div>

        <!-- 播放进度条 -->
        <div class="mp-progress-bar">
          <div class="mp-progress-track">
            <div class="mp-progress-filled"></div>
            <div class="mp-progress-thumb"></div>
          </div>
          <div class="mp-time-row">
            <span class="mp-time-current">0:00</span>
            <span class="mp-time-total">0:00</span>
          </div>
        </div>

        <!-- 控制区 -->
        <div class="mp-controls">
          <button class="mp-play-btn" title="播放/暂停">
            <span class="mp-play-icon">▶</span>
          </button>
          <div class="mp-volume-section">
            <button class="mp-vol-icon-btn" title="静音切换">
              <span class="mp-vol-icon">🔊</span>
            </button>
            <div class="mp-volume-slider-wrapper">
              <input type="range" class="mp-volume-slider" min="0" max="100" value="35" />
              <div class="mp-volume-track">
                <div class="mp-volume-filled"></div>
              </div>
            </div>
            <span class="mp-volume-value">35</span>
          </div>
        </div>
      </div>
    `;
    const gameWrapper = document.getElementById('game-wrapper') || document.body;
    gameWrapper.appendChild(wrapper);

    // 缓存 DOM 引用
    this.el = wrapper;
    this.trigger = wrapper.querySelector('.mp-trigger');
    this.panel = wrapper.querySelector('.mp-panel');
    this.ringFill = wrapper.querySelector('.mp-ring-fill');

    // 面板内元素
    this.playBtn = wrapper.querySelector('.mp-play-btn');
    this.playIcon = wrapper.querySelector('.mp-play-icon');
    this.volIconBtn = wrapper.querySelector('.mp-vol-icon-btn');
    this.volIcon = wrapper.querySelector('.mp-vol-icon');
    this.volumeSlider = wrapper.querySelector('.mp-volume-slider');
    this.volumeFilled = wrapper.querySelector('.mp-volume-filled');
    this.volumeValue = wrapper.querySelector('.mp-volume-value');
    this.closeBtn = wrapper.querySelector('.mp-close-btn');
    this.progressTrack = wrapper.querySelector('.mp-progress-track');
    this.progressFilled = wrapper.querySelector('.mp-progress-filled');
    this.progressThumb = wrapper.querySelector('.mp-progress-thumb');
    this.timeCurrent = wrapper.querySelector('.mp-time-current');
    this.timeTotal = wrapper.querySelector('.mp-time-total');

    // 计算进度环的总周长
    this.circumference = 2 * Math.PI * 20;
    this.ringFill.style.strokeDasharray = this.circumference;
    this.ringFill.style.strokeDashoffset = this.circumference;

    // 初始化音量滑块视觉
    this._updateVolumeVisual(35);
  }

  // 绑定交互事件
  _bindEvents() {
    // 点击触发区域 → 展开面板
    this.trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      this._togglePanel();
    });

    // 关闭按钮
    this.closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._closePanel();
    });

    // 播放/暂停按钮
    this.playBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.isPlaying) {
        this.pause();
      } else {
        this.play();
      }
    });

    // 音量滑块
    this.volumeSlider.addEventListener('input', (e) => {
      e.stopPropagation();
      const val = parseInt(e.target.value);
      this.audio.volume = val / 100;
      this._updateVolumeVisual(val);
    });

    // 静音切换
    this.volIconBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.audio.volume > 0) {
        this._prevVolume = this.audio.volume;
        this.audio.volume = 0;
        this.volumeSlider.value = 0;
        this._updateVolumeVisual(0);
      } else {
        const restore = this._prevVolume || 0.35;
        this.audio.volume = restore;
        this.volumeSlider.value = Math.round(restore * 100);
        this._updateVolumeVisual(Math.round(restore * 100));
      }
    });

    // 点击进度条跳转
    this.progressTrack.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!this.audio.duration) return;
      const rect = this.progressTrack.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      this.audio.currentTime = ratio * this.audio.duration;
    });

    // 阻止面板内的点击冒泡
    this.panel.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // 进度更新
    this.audio.addEventListener('timeupdate', () => {
      if (this.audio.duration) {
        const progress = this.audio.currentTime / this.audio.duration;
        // 更新收起状态的进度环
        const offset = this.circumference * (1 - progress);
        this.ringFill.style.strokeDashoffset = offset;
        // 更新展开面板的进度条
        this.progressFilled.style.width = `${progress * 100}%`;
        this.progressThumb.style.left = `${progress * 100}%`;
        // 更新时间显示
        this.timeCurrent.textContent = this._formatTime(this.audio.currentTime);
      }
    });

    // 音频元数据加载后显示总时长
    this.audio.addEventListener('loadedmetadata', () => {
      this.timeTotal.textContent = this._formatTime(this.audio.duration);
    });

    // 点击外部关闭面板
    document.addEventListener('click', (e) => {
      if (this.isExpanded && !this.el.contains(e.target)) {
        this._closePanel();
      }
    });

    // 监听全局首次交互，用于触发自动播放
    // 移动端（尤其微信浏览器）需要在真正的用户交互中调用 play()
    const interactionEvents = ['click', 'touchend', 'touchstart', 'pointerdown', 'keydown'];
    const interactionHandler = () => {
      if (!this.hasInteracted) {
        this.hasInteracted = true;
        this.play();
        interactionEvents.forEach(evt => document.removeEventListener(evt, interactionHandler, true));
      }
    };

    // 使用 capture: true 确保即使子元素 stopPropagation 也能捕获到
    interactionEvents.forEach(evt => document.addEventListener(evt, interactionHandler, true));

    // 微信浏览器专用：WeixinJSBridge 就绪后尝试播放
    if (typeof WeixinJSBridge !== 'undefined') {
      this._wxAutoPlay();
    } else {
      document.addEventListener('WeixinJSBridgeReady', () => this._wxAutoPlay(), false);
    }
  }

  // 尝试自动播放
  _tryAutoPlay() {
    const playPromise = this.audio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        this.isPlaying = true;
        this.hasInteracted = true;
        this._updateVisual();
      }).catch(() => {
        // 浏览器阻止了自动播放，等待用户交互
      });
    }
  }

  // 微信浏览器自动播放支持
  _wxAutoPlay() {
    if (this.hasInteracted) return;
    try {
      WeixinJSBridge.invoke('getNetworkType', {}, () => {
        if (!this.hasInteracted) {
          this.hasInteracted = true;
          this.play();
        }
      });
    } catch(e) {
      // WeixinJSBridge 不可用，忽略
    }
  }

  // 播放
  play() {
    this.audio.play().then(() => {
      this.isPlaying = true;
      this._updateVisual();
    }).catch(() => {});
  }

  // 暂停
  pause() {
    this.audio.pause();
    this.isPlaying = false;
    this._updateVisual();
  }

  // 展开/收起面板
  _togglePanel() {
    if (this.isExpanded) {
      this._closePanel();
    } else {
      this._openPanel();
    }
  }

  _openPanel() {
    this.isExpanded = true;
    this.el.classList.add('mp-expanded');
  }

  _closePanel() {
    this.isExpanded = false;
    this.el.classList.remove('mp-expanded');
  }

  // 更新播放/暂停视觉
  _updateVisual() {
    if (this.isPlaying) {
      this.el.classList.add('mp-playing');
      this.el.classList.remove('mp-paused');
      this.playIcon.textContent = '❚❚';
    } else {
      this.el.classList.remove('mp-playing');
      this.el.classList.add('mp-paused');
      this.playIcon.textContent = '▶';
    }
  }

  // 更新音量视觉
  _updateVolumeVisual(val) {
    this.volumeFilled.style.width = `${val}%`;
    this.volumeValue.textContent = val;
    if (val === 0) {
      this.volIcon.textContent = '🔇';
    } else if (val < 40) {
      this.volIcon.textContent = '🔉';
    } else {
      this.volIcon.textContent = '🔊';
    }
  }

  // 时间格式化
  _formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}

// 初始化助手函数
export function initializeMusicPlayer() {
  return new MusicPlayer();
}
