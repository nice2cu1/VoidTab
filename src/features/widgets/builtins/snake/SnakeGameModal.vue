<script setup lang="ts">
import {ref, onUnmounted, nextTick, watch, onMounted} from 'vue';
import {
  PhX, PhTrophy, PhLightning, PhSkull, PhArrowUUpLeft, PhGameController,
  PhTimer, PhScissors, PhArrowsLeftRight, PhArrowsDownUp, PhSun, PhMoon,
  PhVibrate, PhSpinner, PhDrop, PhTrendUp, PhInfo, PhTarget, PhPause
} from '@phosphor-icons/vue';

// === Props & Emits ===
const props = defineProps<{ show: boolean }>();
const emit = defineEmits(['close']);

// ==========================================
// 1. 系统配置
// ==========================================
const CELL_SIZE = 24;
const GRID_W = 34; // 816px
const GRID_H = 20; // 480px

// --- 游戏模式 ---
const MODES = {
  EASY: {
    id: 'EASY',
    label: '简单',
    speed: 250,
    color: '#10b981',
    tailwind: 'emerald',
    arcade: false,
    desc: '速度缓慢，轻松休闲'
  },
  NORMAL: {
    id: 'NORMAL',
    label: '普通',
    speed: 180,
    color: '#3b82f6',
    tailwind: 'blue',
    arcade: false,
    desc: '经典速度，考验反应'
  },
  HARD: {
    id: 'HARD',
    label: '困难',
    speed: 110,
    color: '#ef4444',
    tailwind: 'red',
    arcade: false,
    desc: '极速挑战，手速极限'
  },
  ARCADE: {
    id: 'ARCADE',
    label: '娱乐',
    speed: 180,
    color: '#d946ef',
    tailwind: 'fuchsia',
    arcade: true,
    desc: '随机道具，混乱乐趣'
  }
};
type ModeKey = keyof typeof MODES;

// --- 道具定义 ---
type GameContext = SnakeGame;

interface PowerUpDef {
  id: string;
  name: string;
  desc: string;
  icon: any;
  color: string;
  duration: number;
  rarity: number;
  onActivate: (game: GameContext) => void;
  onDeactivate: (game: GameContext) => void;
  skinColor?: string;
}

const POWERUP_REGISTRY: Record<string, PowerUpDef> = {
  GROW_BIG: {
    id: 'GROW_BIG', name: '暴饮暴食', desc: '长度 +3', icon: PhTrendUp, color: '#f59e0b', duration: 0, rarity: 8,
    onActivate: (g) => g.growTail(3), onDeactivate: () => {
    }
  },
  DIET: {
    id: 'DIET', name: '极速瘦身', desc: '长度减半', icon: PhScissors, color: '#ef4444', duration: 0, rarity: 5,
    onActivate: (g) => g.cutTail(), onDeactivate: () => {
    }
  },
  SPEED_BOOST: {
    id: 'SPEED_BOOST',
    name: '氮气加速',
    desc: '速度提升',
    icon: PhLightning,
    color: '#3b82f6',
    duration: 5000,
    rarity: 6,
    onActivate: (g) => g.speedMultiplier = 0.7,
    onDeactivate: (g) => g.speedMultiplier = 1
  },
  SLUGGISH: {
    id: 'SLUGGISH', name: '老牛拉车', desc: '速度减慢', icon: PhTimer, color: '#6366f1', duration: 8000, rarity: 6,
    onActivate: (g) => g.speedMultiplier = 1.5,
    onDeactivate: (g) => g.speedMultiplier = 1
  },
  INVERT_X: {
    id: 'INVERT_X',
    name: '左右互搏',
    desc: '左右反向',
    icon: PhArrowsLeftRight,
    color: '#ec4899',
    duration: 6000,
    rarity: 4,
    onActivate: (g) => g.flags.invertX = true,
    onDeactivate: (g) => g.flags.invertX = false
  },
  INVERT_Y: {
    id: 'INVERT_Y',
    name: '天翻地覆',
    desc: '上下反向',
    icon: PhArrowsDownUp,
    color: '#be185d',
    duration: 6000,
    rarity: 4,
    onActivate: (g) => g.flags.invertY = true,
    onDeactivate: (g) => g.flags.invertY = false
  },
  BLIND: {
    id: 'BLIND', name: '夜盲症', desc: '视野变暗', icon: PhMoon, color: '#52525b', duration: 5000, rarity: 3,
    onActivate: (g) => g.flags.screenDark = true, onDeactivate: (g) => g.flags.screenDark = false
  },
  FLASHBANG: {
    id: 'FLASHBANG', name: '致盲闪光', desc: '高亮曝光', icon: PhSun, color: '#fcd34d', duration: 3000, rarity: 3,
    onActivate: (g) => g.flags.screenBright = true, onDeactivate: (g) => g.flags.screenBright = false
  },
  EARTHQUAKE: {
    id: 'EARTHQUAKE', name: '大地震', desc: '屏幕震动', icon: PhVibrate, color: '#8b5cf6', duration: 4000, rarity: 4,
    onActivate: (g) => g.flags.screenShake = true, onDeactivate: (g) => g.flags.screenShake = false
  },
  DIZZY: {
    id: 'DIZZY', name: '醉酒模式', desc: '画面模糊', icon: PhSpinner, color: '#14b8a6', duration: 6000, rarity: 4,
    onActivate: (g) => g.flags.screenBlur = true, onDeactivate: (g) => g.flags.screenBlur = false
  },
  PINKY: {
    id: 'PINKY', name: '粉红诱惑', desc: '粉色皮肤', icon: PhDrop, color: '#ff00ff', duration: 10000, rarity: 5,
    skinColor: '#ff69b4', onActivate: () => {
    }, onDeactivate: () => {
    }
  }
};

type PowerUpId = keyof typeof POWERUP_REGISTRY;

interface ActivePowerUp {
  id: PowerUpId;
  startTime: number;
  endTime: number;
}

interface MapItem {
  x: number;
  y: number;
  type: 'FOOD' | PowerUpId;
  expires?: number;
  birthTime?: number;
}

const COLORS = {
  BG: '#000000',
  GRID: '#1f1f22',
  FOOD: '#f59e0b',
};

// ==========================================
// 2. Game Core Engine
// ==========================================
type Point = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

class SnakeGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  snake: Point[] = [];
  items: MapItem[] = [];
  direction: Direction = 'RIGHT';
  nextDirection: Direction[] = [];
  score: number = 0;
  highScore: number = parseInt(localStorage.getItem('snake_highscore') || '0');
  state: 'MENU' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' = 'MENU';

  currentMode: ModeKey = 'NORMAL';
  baseSpeed: number = 150;
  speedMultiplier: number = 1;

  activeBuffs: ActivePowerUp[] = [];
  stats: Record<string, number> = {};

  flags = {
    invertX: false, invertY: false, screenShake: false,
    screenBlur: false, screenDark: false, screenBright: false
  };

  lastTime: number = 0;
  timer: number = 0;
  spawnTimer: number = 0;
  animationFrameId: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.reset();
    this.state = 'MENU';
    this.draw();
  }

  reset() {
    const startX = Math.floor(GRID_W / 2);
    const startY = Math.floor(GRID_H / 2);
    this.snake = [
      {x: startX, y: startY},
      {x: startX - 1, y: startY},
      {x: startX - 2, y: startY}
    ];
    this.direction = 'RIGHT';
    this.nextDirection = [];
    this.score = 0;
    this.activeBuffs = [];
    this.items = [];
    this.stats = {};
    this.speedMultiplier = 1;
    this.flags = {
      invertX: false, invertY: false, screenShake: false,
      screenBlur: false, screenDark: false, screenBright: false
    };
    this.baseSpeed = MODES[this.currentMode].speed;
    this.spawnTimer = 0;
    this.spawnItem('FOOD');
  }

  spawnItem(forceType?: 'FOOD' | PowerUpId) {
    let type: 'FOOD' | PowerUpId = 'FOOD';
    if (forceType) {
      type = forceType;
    } else {
      const totalRarity = Object.values(POWERUP_REGISTRY).reduce((sum, def) => sum + def.rarity, 0);
      let rand = Math.random() * totalRarity;
      for (const key in POWERUP_REGISTRY) {
        rand -= POWERUP_REGISTRY[key].rarity;
        if (rand <= 0) {
          type = key as PowerUpId;
          break;
        }
      }
    }

    let valid = false;
    let attempts = 0;
    while (!valid && attempts < 100) {
      const x = Math.floor(Math.random() * GRID_W);
      const y = Math.floor(Math.random() * GRID_H);
      if (!this.isOccupied(x, y)) {
        this.items.push({
          x, y, type,
          expires: type === 'FOOD' ? undefined : Date.now() + 15000,
          birthTime: Date.now()
        });
        valid = true;
      }
      attempts++;
    }
  }

  isOccupied(x: number, y: number) {
    return this.snake.some(s => s.x === x && s.y === y) ||
        this.items.some(i => i.x === x && i.y === y);
  }

  handleInput(key: string) {
    if (this.state === 'PAUSED') return;

    let rawDir: Direction | null = null;
    if (['ArrowUp', 'w', 'W'].includes(key)) rawDir = 'UP';
    if (['ArrowDown', 's', 'S'].includes(key)) rawDir = 'DOWN';
    if (['ArrowLeft', 'a', 'A'].includes(key)) rawDir = 'LEFT';
    if (['ArrowRight', 'd', 'D'].includes(key)) rawDir = 'RIGHT';

    if (rawDir) {
      let finalDir = rawDir;
      if (this.flags.invertX) {
        if (rawDir === 'LEFT') finalDir = 'RIGHT'; else if (rawDir === 'RIGHT') finalDir = 'LEFT';
      }
      if (this.flags.invertY) {
        if (rawDir === 'UP') finalDir = 'DOWN'; else if (rawDir === 'DOWN') finalDir = 'UP';
      }

      const lastDir = this.nextDirection.length > 0 ? this.nextDirection[this.nextDirection.length - 1] : this.direction;
      if (
          (finalDir === 'UP' && lastDir !== 'DOWN') ||
          (finalDir === 'DOWN' && lastDir !== 'UP') ||
          (finalDir === 'LEFT' && lastDir !== 'RIGHT') ||
          (finalDir === 'RIGHT' && lastDir !== 'LEFT')
      ) {
        if (this.nextDirection.length < 2) this.nextDirection.push(finalDir);
      }
    }
  }

  update(deltaTime: number) {
    if (this.state !== 'PLAYING') return;

    // Pause Logic handled in loop

    const now = Date.now();

    // 1. Buff & Item Management
    for (let i = this.activeBuffs.length - 1; i >= 0; i--) {
      const buff = this.activeBuffs[i];
      if (now > buff.endTime) {
        POWERUP_REGISTRY[buff.id].onDeactivate(this);
        this.activeBuffs.splice(i, 1);
      }
    }
    this.items = this.items.filter(i => i.type === 'FOOD' || (i.expires && now < i.expires));
    if (!this.items.some(i => i.type === 'FOOD')) this.spawnItem('FOOD');

    // 2. Arcade Spawning
    if (MODES[this.currentMode].arcade) {
      this.spawnTimer += deltaTime;
      const powerUpCount = this.items.filter(i => i.type !== 'FOOD').length;
      if (this.spawnTimer > 3000) {
        this.spawnTimer = 0;
        if (powerUpCount < 3 && Math.random() < 0.6) this.spawnItem();
      }
    }

    // 3. Move Timer
    this.timer += deltaTime;
    const realSpeed = Math.max(30, this.baseSpeed * this.speedMultiplier);
    if (this.timer < realSpeed) return;
    this.timer = 0;

    // 4. Move Logic
    if (this.nextDirection.length > 0) this.direction = this.nextDirection.shift()!;
    const head = {...this.snake[0]};
    switch (this.direction) {
      case 'UP':
        head.y--;
        break;
      case 'DOWN':
        head.y++;
        break;
      case 'LEFT':
        head.x--;
        break;
      case 'RIGHT':
        head.x++;
        break;
    }

    if (head.x < 0 || head.x >= GRID_W || head.y < 0 || head.y >= GRID_H ||
        this.snake.some(s => s.x === head.x && s.y === head.y)) {
      this.gameOver();
      return;
    }

    this.snake.unshift(head);

    const itemIndex = this.items.findIndex(i => i.x === head.x && i.y === head.y);
    if (itemIndex !== -1) {
      const item = this.items[itemIndex];
      this.items.splice(itemIndex, 1);

      if (item.type === 'FOOD') {
        this.score += 10;
        if (!MODES[this.currentMode].arcade) this.baseSpeed = Math.max(50, this.baseSpeed - 2);
        this.spawnItem('FOOD');
      } else {
        this.activatePowerUp(item.type as PowerUpId);
        this.snake.pop();
      }
    } else {
      this.snake.pop();
    }
  }

  activatePowerUp(id: PowerUpId) {
    const def = POWERUP_REGISTRY[id];
    this.stats[id] = (this.stats[id] || 0) + 1;
    def.onActivate(this);
    if (def.duration > 0) {
      const existing = this.activeBuffs.find(b => b.id === id);
      if (existing) existing.endTime = Date.now() + def.duration;
      else this.activeBuffs.push({id, startTime: Date.now(), endTime: Date.now() + def.duration});
    }
  }

  growTail(amount: number) {
    const tail = this.snake[this.snake.length - 1];
    for (let i = 0; i < amount; i++) this.snake.push({...tail});
  }

  cutTail() {
    if (this.snake.length > 3) {
      const newLen = Math.max(3, Math.floor(this.snake.length / 2));
      this.snake.splice(newLen);
    }
  }

  draw() {
    this.ctx.fillStyle = COLORS.BG;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw Grid
    this.ctx.strokeStyle = COLORS.GRID;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    for (let x = 0; x <= GRID_W; x++) this.ctx.moveTo(x * CELL_SIZE, 0), this.ctx.lineTo(x * CELL_SIZE, GRID_H * CELL_SIZE);
    for (let y = 0; y <= GRID_H; y++) this.ctx.moveTo(0, y * CELL_SIZE), this.ctx.lineTo(GRID_W * CELL_SIZE, y * CELL_SIZE);
    this.ctx.stroke();

    // Items
    this.items.forEach(item => {
      const cx = item.x * CELL_SIZE + CELL_SIZE / 2;
      const cy = item.y * CELL_SIZE + CELL_SIZE / 2;

      if (item.expires && item.expires - Date.now() < 3000) {
        if (Math.floor(Date.now() / 200) % 2 === 0) return; // Flash
      }

      if (item.type === 'FOOD') {
        this.ctx.fillStyle = COLORS.FOOD;
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = COLORS.FOOD;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, CELL_SIZE / 2 - 3, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        const def = POWERUP_REGISTRY[item.type as PowerUpId];
        this.ctx.fillStyle = def.color;
        this.ctx.shadowBlur = 12;
        this.ctx.shadowColor = def.color;
        this.ctx.beginPath();
        this.ctx.moveTo(cx, cy - CELL_SIZE / 2 + 2);
        this.ctx.lineTo(cx + CELL_SIZE / 2 - 2, cy);
        this.ctx.lineTo(cx, cy + CELL_SIZE / 2 - 2);
        this.ctx.lineTo(cx - CELL_SIZE / 2 + 2, cy);
        this.ctx.fill();
      }
      this.ctx.shadowBlur = 0;
    });

    // Snake
    let snakeColor = MODES[this.currentMode].color;
    const skinBuff = this.activeBuffs.find(b => POWERUP_REGISTRY[b.id].skinColor);
    if (skinBuff) snakeColor = POWERUP_REGISTRY[skinBuff.id].skinColor!;

    this.snake.forEach((seg, index) => {
      this.ctx.fillStyle = snakeColor;
      if (index === 0) {
        this.ctx.filter = 'brightness(1.3)';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = snakeColor;
      } else {
        this.ctx.filter = 'none';
        this.ctx.shadowBlur = 0;
      }
      this.ctx.fillRect(seg.x * CELL_SIZE + 1, seg.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
      this.ctx.filter = 'none';
      this.ctx.shadowBlur = 0;
      if (index === 0) {
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(seg.x * CELL_SIZE + 6, seg.y * CELL_SIZE + 6, CELL_SIZE / 3, CELL_SIZE / 3);
      }
    });
  }

  loop = (timestamp: number) => {
    if (!this.isRunning) return;
    const deltaTime = timestamp - this.lastTime;
    this.lastTime = timestamp;

    // 只有在 PLAYING 状态下才更新物理逻辑，但始终绘制画面
    if (this.state === 'PLAYING') {
      this.update(deltaTime);
    }

    this.draw();
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  public isRunning = false;

  start(mode: ModeKey) {
    this.currentMode = mode;
    this.reset();
    this.state = 'PLAYING';
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  togglePause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.lastTime = performance.now(); // 重置时间防止跳帧
    }
  }

  backToMenu() {
    this.state = 'MENU';
    this.draw();
  }

  gameOver() {
    this.state = 'GAMEOVER';
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('snake_highscore', this.score.toString());
    }
  }

  stop() {
    this.isRunning = false;
    cancelAnimationFrame(this.animationFrameId);
  }
}

// ==========================================
// 3. Vue Integration
// ==========================================
const canvasRef = ref<HTMLCanvasElement | null>(null);
let game: SnakeGame | null = null;

const currentScore = ref(0);
const currentHighScore = ref(0);
const currentState = ref('MENU');
const lastMode = ref<ModeKey>('NORMAL');
const activeBuffs = ref<ActivePowerUp[]>([]);
const screenFlags = ref<any>({});
const currentModeKey = ref<ModeKey>('NORMAL');

const syncState = () => {
  if (game) {
    currentScore.value = game.score;
    currentHighScore.value = game.highScore;
    currentState.value = game.state;
    activeBuffs.value = [...game.activeBuffs];
    screenFlags.value = {...game.flags};
    currentModeKey.value = game.currentMode;
    requestAnimationFrame(syncState);
  }
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (!props.show) return;

  // ESC: 游戏中 -> 暂停 -> 菜单 -> 关闭
  if (e.key === 'Escape') {
    e.preventDefault();
    if (!game) return;

    if (game.state === 'PLAYING') {
      game.togglePause();
    } else if (game.state === 'PAUSED') {
      game.backToMenu();
    } else {
      emit('close');
    }
    return;
  }

  // 空格键: 暂停/继续
  if (e.key === ' ' && game?.state !== 'MENU' && game?.state !== 'GAMEOVER') {
    e.preventDefault();
    game?.togglePause();
    return;
  }

  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();

  if (!game) return;
  if (game.state === 'PLAYING') {
    game.handleInput(e.key);
  } else if (e.key === 'Enter') {
    if (game.state === 'MENU' || game.state === 'GAMEOVER') {
      handleStartGame(lastMode.value);
    }
  }
};

const handleStartGame = (mode: ModeKey) => {
  if (game) {
    lastMode.value = mode;
    game.start(mode);
    currentState.value = game.state;
  }
};

const handleBackToMenu = () => {
  game?.backToMenu();
};
const handleResume = () => {
  game?.togglePause();
};

const initGame = async () => {
  await nextTick();
  if (canvasRef.value) {
    if (game) game.stop();
    game = new SnakeGame(canvasRef.value);
    syncState();
    window.addEventListener('keydown', handleKeyDown);
  }
};

watch(() => props.show, (val) => {
  if (val) initGame();
  else {
    game?.stop();
    game = null;
    window.removeEventListener('keydown', handleKeyDown);
  }
});

onMounted(() => {
  if (props.show) initGame();
});
onUnmounted(() => {
  game?.stop();
  window.removeEventListener('keydown', handleKeyDown);
});

// const getBuffProgress = (buff: ActivePowerUp) => {
//   const total = POWERUP_REGISTRY[buff.id].duration;
//   const left = Math.max(0, buff.endTime - Date.now());
//   return (left / total) * 100;
// };

// 计算Canvas大小
const canvasWidth = GRID_W * CELL_SIZE;
const canvasHeight = GRID_H * CELL_SIZE;
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm"
       @click="emit('close')">

    <div class="flex gap-6 items-start" @click.stop>

      <div
          class="w-64 bg-zinc-900 border border-zinc-700 rounded-2xl p-4 shadow-2xl flex flex-col gap-4 animate-in slide-in-from-left duration-500 h-[520px]">

        <div class="flex items-center justify-between border-b border-zinc-700 pb-2 mb-1">
          <div class="text-xs font-bold uppercase tracking-widest text-zinc-400">
            {{ currentModeKey === 'ARCADE' ? '道具图鉴' : '游戏信息' }}
          </div>
          <PhInfo v-if="currentModeKey !== 'ARCADE'" class="text-zinc-500"/>
          <PhGameController v-else class="text-purple-500"/>
        </div>

        <div v-if="currentModeKey === 'ARCADE'" class="flex flex-col gap-2 overflow-y-auto pr-1 scrollbar-thin flex-1">
          <div v-for="(def, key) in POWERUP_REGISTRY" :key="key"
               class="group flex items-center gap-3 p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors border border-transparent hover:border-zinc-700">
            <div class="p-1.5 rounded-md text-white shrink-0 shadow-sm" :style="{ backgroundColor: def.color }">
              <component :is="def.icon" weight="fill" size="16"/>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex justify-between items-center">
                <div class="text-xs font-bold text-zinc-300 group-hover:text-white truncate">{{ def.name }}</div>
                <div class="flex gap-0.5">
                  <div v-for="i in Math.ceil(def.rarity/3)" :key="i" class="w-1 h-1 rounded-full bg-zinc-600"></div>
                </div>
              </div>
              <div class="text-[10px] text-zinc-500 group-hover:text-zinc-400 truncate leading-tight mt-0.5">{{
                  def.desc
                }}
              </div>
            </div>
          </div>
        </div>

        <div v-else class="flex flex-col gap-4 flex-1">
          <div class="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
            <div class="text-xs text-zinc-500 mb-1 uppercase tracking-wider">当前模式</div>
            <div class="text-xl font-bold" :class="`text-${MODES[currentModeKey].tailwind}-400`">
              {{ MODES[currentModeKey].label }}
            </div>
            <div class="text-xs text-zinc-400 mt-1">{{ MODES[currentModeKey].desc }}</div>
          </div>

          <div class="flex-1 flex flex-col justify-center items-center text-zinc-600 gap-2 opacity-50">
            <PhTarget size="48" weight="duotone"/>
            <div class="text-xs text-center">专注于吃掉果实<br>避免撞墙</div>
          </div>
        </div>

        <div v-if="currentModeKey === 'ARCADE' && activeBuffs.length > 0" class="border-t border-zinc-700 pt-3 mt-auto">
          <div class="text-[10px] font-bold uppercase text-zinc-500 mb-2">当前生效</div>
          <div class="flex gap-2 flex-wrap">
            <div v-for="buff in activeBuffs" :key="buff.id"
                 class="p-1.5 rounded bg-zinc-800 border border-zinc-600 text-white animate-pulse"
                 :title="POWERUP_REGISTRY[buff.id].name"
                 :style="{ borderColor: POWERUP_REGISTRY[buff.id].color }">
              <component :is="POWERUP_REGISTRY[buff.id].icon" weight="fill" size="14"/>
            </div>
          </div>
        </div>

      </div>

      <div class="relative bg-zinc-900 p-4 rounded-2xl shadow-2xl border border-zinc-700 transition-all duration-100"
           :class="{
             'animate-shake': screenFlags.screenShake,
             'brightness-150 contrast-125': screenFlags.screenBright,
             'brightness-50 grayscale': screenFlags.screenDark
           }">

        <div class="relative rounded-lg overflow-hidden border-8 border-black bg-black shadow-inner"
             :class="{ 'blur-sm': screenFlags.screenBlur }"
             :style="{ width: canvasWidth + 16 + 'px', height: canvasHeight + 16 + 'px' }">

          <canvas ref="canvasRef" :width="canvasWidth" :height="canvasHeight" class="block"></canvas>

          <div v-if="currentState === 'MENU'"
               class="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm z-10">
            <h1 class="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-purple-500 mb-2 tracking-tighter title-font">
              贪吃蛇</h1>
            <div class="flex items-center gap-2 text-yellow-400 font-mono text-lg mb-10">
              <PhTrophy weight="fill"/>
              <span>最高分: {{ currentHighScore }}</span>
            </div>
            <div class="flex gap-3">
              <button v-for="mode in MODES" :key="mode.id" @click.stop="handleStartGame(mode.id as ModeKey)"
                      class="group relative px-5 py-3 w-28 font-bold rounded-xl transition-all active:scale-95 border-b-4 active:border-b-0 active:translate-y-1 bg-zinc-800 border-zinc-950 text-zinc-400 hover:text-white"
                      :class="[
                  mode.id === 'EASY' ? 'hover:bg-emerald-600 hover:border-emerald-800' : '',
                  mode.id === 'NORMAL' ? 'hover:bg-blue-600 hover:border-blue-800' : '',
                  mode.id === 'HARD' ? 'hover:bg-red-600 hover:border-red-800' : '',
                  mode.id === 'ARCADE' ? 'bg-gradient-to-br from-purple-900 to-pink-900 border-purple-950 text-white hover:brightness-110 w-32' : ''
                ]">
                <div class="flex flex-col items-center">
                  <PhGameController v-if="mode.id === 'ARCADE'" weight="fill" class="mb-1 text-purple-300"/>
                  <span class="text-sm">{{ mode.label }}</span>
                </div>
              </button>
            </div>
          </div>

          <div v-if="currentState === 'GAMEOVER'"
               class="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
            <PhSkull size="64" class="text-zinc-600 mb-4" weight="duotone"/>
            <h2 class="text-5xl font-bold text-white mb-2 font-mono">GAME OVER</h2>
            <div class="text-zinc-400 font-mono text-xl mb-8 flex items-center gap-2">
              得分: <span :class="`text-${MODES[lastMode].tailwind}-400`" class="font-bold text-3xl">{{
                currentScore
              }}</span>
            </div>
            <div class="flex gap-3">
              <button @click.stop="handleBackToMenu"
                      class="px-6 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-white font-bold rounded-lg transition-colors flex items-center gap-2">
                <PhArrowUUpLeft weight="bold"/>
                菜单
              </button>
              <button @click.stop="handleStartGame(lastMode)"
                      class="px-8 py-2.5 bg-white text-black font-bold rounded-lg hover:bg-zinc-200 transition-colors flex items-center gap-2">
                <PhLightning weight="fill" class="text-yellow-600"/>
                重来
              </button>
            </div>
          </div>

          <div v-if="currentState === 'PAUSED'"
               class="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] z-10">
            <PhPause size="64" class="text-white mb-4 animate-pulse" weight="duotone"/>
            <h2 class="text-3xl font-bold text-white mb-8 tracking-widest uppercase">已暂停</h2>
            <div class="flex gap-3">
              <button @click.stop="handleBackToMenu"
                      class="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-lg transition-colors border border-zinc-600">
                退出游戏
              </button>
              <button @click.stop="handleResume"
                      class="px-8 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors shadow-lg">
                继续
              </button>
            </div>
          </div>

          <div v-if="currentState === 'PLAYING' || currentState === 'PAUSED'"
               class="absolute top-4 left-4 right-4 flex justify-between font-mono text-xl font-bold pointer-events-none select-none">
            <div class="flex items-center gap-2" :class="`text-${MODES[lastMode].tailwind}-500`">
              <div class="w-2 h-2 rounded-full animate-pulse bg-current"></div>
              {{ currentScore }}
            </div>
            <div v-if="screenFlags.invertX || screenFlags.invertY"
                 class="text-red-500 text-sm animate-pulse flex items-center gap-1 bg-black/50 px-2 rounded">
              <PhArrowsLeftRight v-if="screenFlags.invertX"/>
              <PhArrowsDownUp v-if="screenFlags.invertY"/>
              方向颠倒
            </div>
          </div>
        </div>

        <div class="flex justify-between items-center px-2 mt-2 text-zinc-500 font-mono text-xs select-none">
          <div class="flex gap-4">
            <span>[WASD] 移动</span>
            <span>[SPACE] 暂停</span>
            <span v-if="currentState === 'PLAYING' || currentState === 'PAUSED'" class="text-yellow-600 font-bold">[ESC] 菜单</span>
            <span v-else class="text-red-600 font-bold hover:text-red-500 cursor-pointer" @click="emit('close')">[ESC] 关闭</span>
          </div>
          <div>VOIDTAB ARCADE</div>
        </div>

        <button @click="emit('close')"
                class="absolute -top-3 -right-3 p-1.5 bg-zinc-800 hover:bg-red-600 border border-zinc-600 hover:border-red-500 rounded-full text-zinc-400 hover:text-white shadow-xl transition-all z-50">
          <PhX size="16" weight="bold"/>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.title-font {
  font-family: 'Arial Black', Impact, sans-serif;
  text-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}

@keyframes shake {
  0% {
    transform: translate(1px, 1px) rotate(0deg);
  }
  10% {
    transform: translate(-1px, -2px) rotate(-1deg);
  }
  20% {
    transform: translate(-3px, 0px) rotate(1deg);
  }
  30% {
    transform: translate(3px, 2px) rotate(0deg);
  }
  40% {
    transform: translate(1px, -1px) rotate(1deg);
  }
  50% {
    transform: translate(-1px, 2px) rotate(-1deg);
  }
  60% {
    transform: translate(-3px, 1px) rotate(0deg);
  }
  70% {
    transform: translate(3px, 1px) rotate(-1deg);
  }
  80% {
    transform: translate(-1px, -1px) rotate(1deg);
  }
  90% {
    transform: translate(1px, 2px) rotate(0deg);
  }
  100% {
    transform: translate(1px, -2px) rotate(-1deg);
  }
}

.animate-shake {
  animation: shake 0.5s cubic-bezier(.36, .07, .19, .97) both infinite;
}

.scrollbar-thin::-webkit-scrollbar {
  width: 4px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: #18181b;
  border-radius: 4px;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background: #3f3f46;
  border-radius: 4px;
}
</style>