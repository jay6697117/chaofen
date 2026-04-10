// 炒粉大师 — 游戏数据常量

// 食材定义
export const INGREDIENTS = [
  { id: 'noodles', emoji: '🍜', name: '河粉', color: '#F5DEB3' },
  { id: 'beef', emoji: '🥩', name: '牛肉', color: '#8B4513' },
  { id: 'egg', emoji: '🥚', name: '鸡蛋', color: '#FFD700' },
  { id: 'onion', emoji: '🧅', name: '洋葱', color: '#DDA0DD' },
  { id: 'chili', emoji: '🌶️', name: '辣椒', color: '#FF4500' },
  { id: 'shrimp', emoji: '🦐', name: '虾仁', color: '#FF6347' },
  { id: 'vegetable', emoji: '🥬', name: '青菜', color: '#32CD32' },
  { id: 'mushroom', emoji: '🍄', name: '蘑菇', color: '#D2B48C' },
];

// 订单定义（从易到难）
export const ORDERS = [
  {
    name: '经典炒粉',
    emoji: '🥢',
    ingredients: ['noodles', 'egg', 'onion'],
    seasonings: 1,
    difficulty: 1,
    baseScore: 100,
    stirTarget: 80,
  },
  {
    name: '牛肉炒粉',
    emoji: '🥩',
    ingredients: ['noodles', 'beef', 'onion'],
    seasonings: 1,
    difficulty: 2,
    baseScore: 150,
    stirTarget: 100,
  },
  {
    name: '海鲜炒粉',
    emoji: '🦐',
    ingredients: ['noodles', 'shrimp', 'vegetable'],
    seasonings: 2,
    difficulty: 3,
    baseScore: 200,
    stirTarget: 120,
  },
  {
    name: '麻辣炒粉',
    emoji: '🌶️',
    ingredients: ['noodles', 'beef', 'chili', 'onion'],
    seasonings: 2,
    difficulty: 4,
    baseScore: 280,
    stirTarget: 140,
  },
  {
    name: '大师炒粉',
    emoji: '🏆',
    ingredients: ['noodles', 'beef', 'shrimp', 'egg', 'vegetable'],
    seasonings: 3,
    difficulty: 5,
    baseScore: 400,
    stirTarget: 160,
  },
];

// 颜色方案（用于 UI）
export const COLORS = {
  celebration: ['#FF6B35', '#FFD700', '#FF4500', '#32CD32', '#4169E1', '#FF69B4'],
};

// 游戏核心常量
export const GAME = {
  GAME_DURATION: 60,            // 每局秒数
  SEASON_RING_SPEED: 1.2,       // 调料环收缩速度
  SEASON_TARGET_RADIUS: 40,     // 调料目标半径
  SEASON_PERFECT_RANGE: 8,      // 完美判定范围
  SEASON_GOOD_RANGE: 20,        // 良好判定范围
};
