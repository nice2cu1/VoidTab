<script setup lang="ts">
import {ref, onMounted, onUnmounted} from 'vue';
import {
  PhX, PhCrosshair,
  PhShield, PhSnowflake, PhSword, PhRecycle,
  PhPause, PhCrown, PhSkull
} from '@phosphor-icons/vue';

defineProps<{ show: boolean }>();
const emit = defineEmits(['close']);

// ==========================================
// 1. 常量与数值配置 (Balance Config)
// ==========================================
const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 600;
//const TILE_SIZE = 40;

// 颜色定义
const C = {
  PLAYER: '#3b82f6',
  EXP_ORB: '#eab308',
  HP_PACK: '#22c55e',
  PROJECTILE: '#f472b6',
  TEXT: '#ffffff',
  E_BASIC: '#ef4444',
  E_FAST: '#f59e0b',
  E_TANK: '#9333ea',
  E_SHOOTER: '#10b981',
  E_BOSS: '#dc2626'
};

// 难度系数
const MODES = {
  EASY: {label: '简单', hpMult: 0.8, dmgMult: 0.8, xpRate: 1.2, spawnRate: 60},
  NORMAL: {label: '普通', hpMult: 1.0, dmgMult: 1.0, xpRate: 1.0, spawnRate: 40},
  HARD: {label: '困难', hpMult: 1.5, dmgMult: 1.5, xpRate: 0.8, spawnRate: 20},
  ARCADE: {label: '娱乐', hpMult: 1.0, dmgMult: 1.0, xpRate: 1.5, spawnRate: 35}
};
type GameMode = keyof typeof MODES;

// ==========================================
// 2. 实体系统 (Entity System)
// ==========================================

class Entity {
  x: number;
  y: number;
  radius: number;
  color: string;
  markedForDeletion: boolean = false;

  constructor(x: number, y: number, r: number, c: string) {
    this.x = x;
    this.y = y;
    this.radius = r;
    this.color = c;
  }

  collidesWith(other: Entity): boolean {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy) < (this.radius + other.radius);
  }

  // 基础绘制方法，子类可覆盖
  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

class Player extends Entity {
  hp: number = 100;
  maxHp: number = 100;
  speed: number = 4;
  baseDamage: number = 10;
  pickupRadius: number = 60;

  skills: Skill[] = [];
  xp: number = 0;
  level: number = 1;
  nextLevelXp: number = 100;

  inverted: boolean = false; // 娱乐模式 Debuff

  constructor() {
    super(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 12, C.PLAYER);
  }

  move(dx: number, dy: number) {
    if (this.inverted) {
      dx = -dx;
      dy = -dy;
    }
    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      this.x += (dx / len) * this.speed;
      this.y += (dy / len) * this.speed;
    }
    this.x = Math.max(12, Math.min(CANVAS_WIDTH - 12, this.x));
    this.y = Math.max(12, Math.min(CANVAS_HEIGHT - 12, this.y));
  }

  gainXp(amount: number) {
    this.xp += amount;
  }
}

type EnemyType = 'BASIC' | 'FAST' | 'TANK' | 'SHOOTER' | 'BOSS';

class Enemy extends Entity {
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  type: EnemyType;
  xpValue: number;

  constructor(x: number, y: number, stage: number, type: EnemyType, modeMult: any) {
    super(x, y, 10, C.E_BASIC);
    this.type = type;

    // 关卡成长系数
    const stageScaling = 1 + (stage * 0.25);

    switch (type) {
      case 'FAST':
        this.color = C.E_FAST;
        this.radius = 8;
        this.speed = 3.5;
        this.hp = 10 * stageScaling;
        this.damage = 5;
        this.xpValue = 8;
        break;
      case 'TANK':
        this.color = C.E_TANK;
        this.radius = 18;
        this.speed = 1.0;
        this.hp = 50 * stageScaling;
        this.damage = 15;
        this.xpValue = 20;
        break;
      case 'SHOOTER':
        this.color = C.E_SHOOTER;
        this.radius = 10;
        this.speed = 2.0;
        this.hp = 15 * stageScaling;
        this.damage = 8;
        this.xpValue = 12;
        break;
      case 'BOSS':
        this.color = C.E_BOSS;
        this.radius = 45;
        this.speed = 1.5;
        this.hp = 800 * stageScaling;
        this.damage = 30;
        this.xpValue = 500;
        break;
      default: // BASIC
        this.color = C.E_BASIC;
        this.radius = 12;
        this.speed = 2.0;
        this.hp = 20 * stageScaling;
        this.damage = 8;
        this.xpValue = 5;
        break;
    }

    this.hp *= modeMult.hpMult;
    this.damage *= modeMult.dmgMult;
    this.maxHp = this.hp;
  }

  update(target: Player, game: GameEngine) {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    if (this.type === 'SHOOTER') {
      if (dist > 250) {
        this.x += Math.cos(angle) * this.speed;
        this.y += Math.sin(angle) * this.speed;
      } else if (Math.random() < 0.015) { // 射击频率
        game.spawnProjectile(this.x, this.y, Math.cos(angle) * 4, Math.sin(angle) * 4, this.damage, '#ef4444', 1, 60, true);
      }
    } else {
      this.x += Math.cos(angle) * this.speed;
      this.y += Math.sin(angle) * this.speed;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.color;
    if (this.type === 'BOSS') {
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }
    super.draw(ctx);
  }
}

class Projectile extends Entity {
  vx: number;
  vy: number;
  damage: number;
  pierce: number;
  duration: number;
  isEnemy: boolean;

  constructor(x: number, y: number, vx: number, vy: number, dmg: number, color: string, pierce = 1, dur = 120, enemy = false) {
    super(x, y, enemy ? 5 : 4, color);
    this.vx = vx;
    this.vy = vy;
    this.damage = dmg;
    this.pierce = pierce;
    this.duration = dur;
    this.isEnemy = enemy;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.duration--;
    if (this.duration <= 0 || this.x < 0 || this.x > CANVAS_WIDTH || this.y < 0 || this.y > CANVAS_HEIGHT) this.markedForDeletion = true;
  }
}

class DropItem extends Entity {
  value: number;
  type: 'XP' | 'BUFF' | 'DEBUFF';
  effectId?: string;

  constructor(x: number, y: number, type: 'XP' | 'BUFF' | 'DEBUFF', value = 0, effectId?: string) {
    super(x, y, 6, type === 'XP' ? C.EXP_ORB : (type === 'DEBUFF' ? '#a855f7' : '#22d3ee'));
    this.type = type;
    this.value = value;
    this.effectId = effectId;
  }
}

// 炮台实体 (独立定义，不放在 GameEngine 内部)
class TurretEntity extends Entity {
  timer = 0;
  level: number;
  damage: number;
  life = 600;

  constructor(x: number, y: number, lvl: number, dmg: number) {
    super(x, y, 15, '#94a3b8');
    this.level = lvl;
    this.damage = dmg;
  }

  // 注意：这里需要 GameEngine 类型，为了解耦暂时用 any 或在下方定义
  update(game: any) {
    this.life--;
    if (this.life <= 0) this.markedForDeletion = true;
    this.timer++;
    if (this.timer > Math.max(10, 40 - this.level * 2)) {
      this.timer = 0;
      const t = game.getClosestEnemy(this);
      if (t) {
        const a = Math.atan2(t.y - this.y, t.x - this.x);
        game.spawnProjectile(this.x, this.y, Math.cos(a) * 6, Math.sin(a) * 6, this.damage, '#cbd5e1', 1);
      }
    }
  }
}

// ==========================================
// 3. 技能与物品系统 (Strategy Pattern)
// ==========================================

abstract class Skill {
  name: string;
  desc: string;
  icon: any;
  level: number = 1;
  maxLevel: number = 5;
  cooldown: number = 60;
  timer: number = 0;
  baseDmgPercent: number = 1.0;

  constructor(n: string, d: string, i: any) {
    this.name = n;
    this.desc = d;
    this.icon = i;
  }

  abstract fire(game: GameEngine, p: Player): void;

  abstract getUpgradeDesc(): string;

  update(g: GameEngine, p: Player) {
    if (this.timer > 0) this.timer--;
    else {
      this.fire(g, p);
      this.timer = this.cooldown;
    }
  }

  upgrade() {
    this.level++;
    if (this.level <= 5) this.applyMechanicUpgrade();
    else this.baseDmgPercent += 0.2; // 巅峰等级加伤
  }

  abstract applyMechanicUpgrade(): void;

  getDamage(p: Player): number {
    return p.baseDamage * this.baseDmgPercent;
  }
}

// --- 技能实现 ---
class Arrow extends Skill {
  count = 1;

  constructor() {
    super('量子飞箭', '向最近敌人发射飞箭', PhCrosshair);
    this.cooldown = 40;
  }

  fire(g: GameEngine, p: Player) {
    const t = g.getClosestEnemy(p);
    for (let i = 0; i < this.count; i++) {
      let angle = t ? Math.atan2(t.y - p.y, t.x - p.x) : Math.random() * Math.PI * 2;
      angle += (i - (this.count - 1) / 2) * 0.2;
      g.spawnProjectile(p.x, p.y, Math.cos(angle) * 8, Math.sin(angle) * 8, this.getDamage(p), C.PROJECTILE, 1 + Math.floor(this.level / 2));
    }
  }

  applyMechanicUpgrade() {
    this.count++;
  }

  getUpgradeDesc() {
    return this.level < 5 ? '数量 +1' : '伤害 +20%';
  }
}

class Shield extends Skill {
  orbs = 1;

  constructor() {
    super('轨道护盾', '环绕自身的能量球', PhShield);
  }

  update(g: GameEngine, p: Player) {
    const r = 70;
    for (let i = 0; i < this.orbs; i++) {
      const angle = (Date.now() / 1000 * 2) + (Math.PI * 2 / this.orbs) * i;
      const x = p.x + Math.cos(angle) * r;
      const y = p.y + Math.sin(angle) * r;
      g.ctx.fillStyle = '#60a5fa';
      g.ctx.beginPath();
      g.ctx.arc(x, y, 8, 0, Math.PI * 2);
      g.ctx.fill();
      g.enemies.forEach(e => {
        if ((e.x - x) ** 2 + (e.y - y) ** 2 < (e.radius + 8) ** 2) g.damageEnemy(e, this.getDamage(p) * 0.1);
      });
    }
  }

  fire() {
  }

  applyMechanicUpgrade() {
    this.orbs++;
  }

  getUpgradeDesc() {
    return this.level < 5 ? '数量 +1' : '伤害 +20%';
  }
}

class Turret extends Skill {
  constructor() {
    super('自动炮台', '放置炮台自动攻击', PhRecycle);
    this.cooldown = 300;
  }

  fire(g: GameEngine, p: Player) {
    g.addEntity(new TurretEntity(p.x, p.y, this.level, this.getDamage(p)));
  }

  applyMechanicUpgrade() {
    this.cooldown -= 30;
  }

  getUpgradeDesc() {
    return this.level < 5 ? '冷却 -10%' : '伤害 +20%';
  }
}

class Laser extends Skill {
  constructor() {
    super('聚焦激光', '贯穿全屏', PhSword);
    this.baseDmgPercent = 3;
  }

  fire(g: GameEngine, p: Player) {
    const t = g.getClosestEnemy(p);
    if (!t) return;
    const a = Math.atan2(t.y - p.y, t.x - p.x);
    g.addVFX('LASER', p.x, p.y, p.x + Math.cos(a) * 1000, p.y + Math.sin(a) * 1000, '#ef4444');
    g.enemies.forEach(e => g.damageEnemy(e, this.getDamage(p)));
  }

  applyMechanicUpgrade() {
    this.cooldown -= 10;
  }

  getUpgradeDesc() {
    return '冷却降低'
  }
}

class Frost extends Skill {
  constructor() {
    super('冰霜新星', '冻结敌人', PhSnowflake);
    this.cooldown = 150;
  }

  fire(g: GameEngine, p: Player) {
    g.addVFX('NOVA', p.x, p.y, 150, 0, '#38bdf8');
    g.enemies.forEach(e => {
      if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 < 150 ** 2) {
        g.damageEnemy(e, this.getDamage(p));
        e.speed *= 0.2;
      }
    })
  }

  applyMechanicUpgrade() {
    this.baseDmgPercent += 0.5;
  }

  getUpgradeDesc() {
    return '伤害大幅提升'
  }
}

// 物品策略
const ITEMS: Record<string, { name: string, apply: (g: GameEngine) => void }> = {
  HEAL: {name: '急救包', apply: (g) => g.player.hp = Math.min(g.player.maxHp, g.player.hp + 30)},
  MAXHP: {
    name: '能量核心', apply: (g) => {
      g.player.maxHp += 20;
      g.player.hp += 20;
    }
  },
  NUKE: {name: '核弹', apply: (g) => g.enemies.forEach(e => g.damageEnemy(e, 9999))},
  INVERT: {
    name: '醉酒', apply: (g) => {
      g.player.inverted = true;
      setTimeout(() => g.player.inverted = false, 5000);
    }
  }
};

// ==========================================
// 4. 游戏引擎 (Core Engine)
// ==========================================

class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  player: Player;
  enemies: Enemy[] = [];
  projectiles: Projectile[] = [];
  items: DropItem[] = [];
  otherEntities: TurretEntity[] = []; // ✅ 修复：定义了其他实体数组

  mode: GameMode;
  modeCfg: any;
  frameCount = 0;
  score = 0;
  timeSurvived = 0;

  stage = 1;
  enemiesKilledInStage = 0;
  bossActive = false;
  stageTarget = 20;

  vfx: { type: string, x: number, y: number, tx?: number, ty?: number, life: number, color?: string, val?: any }[] = [];
  isGameOver = false;
  isVictory = false;

  constructor(cvs: HTMLCanvasElement, m: GameMode) {
    this.canvas = cvs;
    this.ctx = cvs.getContext('2d')!;
    this.mode = m;
    this.modeCfg = MODES[m];
    this.player = new Player();
  }

  update() {
    this.frameCount++;
    this.timeSurvived++;

    // 刷怪
    if (!this.bossActive) {
      const rate = Math.max(10, this.modeCfg.spawnRate - (this.stage * 5));
      if (this.frameCount % rate === 0) this.spawnEnemy();
    }

    this.player.skills.forEach(s => s.update(this, this.player));

    this.projectiles.forEach(p => {
      p.update();
      if (p.isEnemy) {
        if (p.collidesWith(this.player)) {
          this.player.hp -= p.damage;
          p.markedForDeletion = true;
        }
      } else {
        this.enemies.forEach(e => {
          if (!p.markedForDeletion && p.collidesWith(e)) {
            this.damageEnemy(e, p.damage);
            p.pierce--;
            if (p.pierce <= 0) p.markedForDeletion = true;
          }
        });
      }
    });

    this.enemies.forEach(e => {
      e.update(this.player, this);
      if (e.collidesWith(this.player)) this.player.hp -= 0.2;
    });

    // ✅ 修复：更新其他实体（如炮台）
    this.otherEntities.forEach(t => t.update(this));

    this.items.forEach(i => {
      const dist = Math.sqrt((i.x - this.player.x) ** 2 + (i.y - this.player.y) ** 2);
      if (dist < this.player.pickupRadius) {
        i.x += (this.player.x - i.x) * 0.15;
        i.y += (this.player.y - i.y) * 0.15;
        if (dist < this.player.radius + 10) this.collectItem(i);
      }
    });

    this.enemies = this.enemies.filter(e => !e.markedForDeletion);
    this.projectiles = this.projectiles.filter(p => !p.markedForDeletion);
    this.items = this.items.filter(i => !i.markedForDeletion);
    this.otherEntities = this.otherEntities.filter(e => !e.markedForDeletion);

    if (this.player.hp <= 0) this.isGameOver = true;
  }

  spawnEnemy() {
    let x, y;
    if (Math.random() < 0.5) {
      x = Math.random() < 0.5 ? -30 : CANVAS_WIDTH + 30;
      y = Math.random() * CANVAS_HEIGHT;
    } else {
      x = Math.random() * CANVAS_WIDTH;
      y = Math.random() < 0.5 ? -30 : CANVAS_HEIGHT + 30;
    }

    const rand = Math.random();
    let type: EnemyType = 'BASIC';
    if (this.stage >= 2 && rand > 0.8) type = 'FAST';
    if (this.stage >= 3 && rand > 0.9) type = 'TANK';
    if (this.stage >= 4 && rand > 0.7) type = 'SHOOTER';

    this.enemies.push(new Enemy(x, y, this.stage, type, this.modeCfg));
  }

  spawnBoss() {
    this.bossActive = true;
    this.enemies = []; // 清场
    this.enemies.push(new Enemy(CANVAS_WIDTH / 2, -100, this.stage, 'BOSS', this.modeCfg));
  }

  spawnProjectile(x: number, y: number, vx: number, vy: number, dmg: number, color: string, pierce = 1, dur = 120, enemy = false) {
    this.projectiles.push(new Projectile(x, y, vx, vy, dmg, color, pierce, dur, enemy));
  }

  damageEnemy(e: Enemy, dmg: number) {
    e.hp -= dmg;
    this.addVFX('TEXT', e.x, e.y, 0, 0, '#fff', Math.floor(dmg));

    if (e.hp <= 0 && !e.markedForDeletion) {
      e.markedForDeletion = true;
      this.score += e.xpValue;

      if (e.type === 'BOSS') {
        this.handleBossKill();
      } else {
        this.items.push(new DropItem(e.x, e.y, 'XP', e.xpValue));
        this.enemiesKilledInStage++;
        if (!this.bossActive && this.enemiesKilledInStage >= this.stageTarget) this.spawnBoss();
      }
    }
  }

  handleBossKill() {
    this.bossActive = false;
    this.stage++;
    this.enemiesKilledInStage = 0;
    this.stageTarget = 20 + (this.stage * 15);
    this.player.hp = this.player.maxHp;
    if (this.stage > 5) this.isVictory = true;
  }

  collectItem(item: DropItem) {
    item.markedForDeletion = true;
    if (item.type === 'XP') this.player.gainXp(item.value);
    else if (item.type === 'DEBUFF' && item.effectId) ITEMS[item.effectId].apply(this);
  }

  // ✅ 修复：添加 addEntity 方法
  addEntity(e: any) {
    this.otherEntities.push(e);
  }

  getClosestEnemy(source: { x: number, y: number }): Enemy | null {
    let t: Enemy | null = null, min = Infinity;
    this.enemies.forEach(e => {
      const d = (e.x - source.x) ** 2 + (e.y - source.y) ** 2;
      if (d < min) {
        min = d;
        t = e;
      }
    });
    return t;
  }

  // ✅ 修复：定义 addVFX 和 drawVFX
  addVFX(type: string, x: number, y: number, tx = 0, ty = 0, c = '#fff', val = 0) {
    this.vfx.push({type, x, y, tx, ty, color: c, val, life: 20});
  }

  drawVFX() {
    this.ctx.save();
    this.vfx = this.vfx.filter(v => v.life > 0);
    this.vfx.forEach(v => {
      v.life--;
      if (v.type === 'TEXT') {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '12px bold sans-serif';
        this.ctx.fillText(v.val, v.x, v.y - (20 - v.life));
      } else if (v.type === 'LIGHTNING' || v.type === 'LASER') {
        this.ctx.strokeStyle = v.color!;
        this.ctx.lineWidth = v.life / 4;
        this.ctx.beginPath();
        this.ctx.moveTo(v.x, v.y);
        this.ctx.lineTo(v.tx!, v.ty!);
        this.ctx.stroke();
      } else if (v.type === 'NOVA') {
        this.ctx.strokeStyle = v.color!;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(v.x, v.y, v.tx! * (1 - v.life / 20), 0, Math.PI * 2);
        this.ctx.stroke();
      }
    });
    this.ctx.restore();
  }

  // ✅ 修复：draw 方法调用所有实体的 draw
  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 实体绘制
    this.items.forEach(i => i.draw(ctx));
    this.otherEntities.forEach(t => t.draw(ctx)); // 炮台
    this.enemies.forEach(e => e.draw(ctx));
    this.projectiles.forEach(p => p.draw(ctx));
    this.player.draw(ctx);

    this.drawVFX();
  }
}

// ==========================================
// 6. Vue Component Logic
// ==========================================

const canvasRef = ref<HTMLCanvasElement | null>(null);
let game: GameEngine | null = null;
let animId: number;

const gameState = ref<'MENU' | 'DRAFT' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'>('MENU');
const hud = ref({hp: 100, maxHp: 100, xp: 0, nextXp: 100, lvl: 1, stage: 1, boss: false});
const draftCards = ref<Skill[]>([]);
const rerolls = ref(3);

const allSkills = [new Arrow(), new Shield(), new Turret(), new Laser(), new Frost()];

const keys = {w: false, a: false, s: false, d: false};
const handleKey = (e: KeyboardEvent, isDown: boolean) => {
  const k = e.key.toLowerCase();
  if (k in keys) keys[k as keyof typeof keys] = isDown;
  if (isDown && e.key === 'Escape') handleEsc();
};

const handleEsc = () => {
  if (gameState.value === 'PLAYING') gameState.value = 'PAUSED';
  else if (gameState.value === 'PAUSED') gameState.value = 'MENU';
  else if (gameState.value === 'MENU') emit('close');
};

const loop = () => {
  if (!game) return;
  if (gameState.value === 'PLAYING') {
    let dx = 0, dy = 0;
    if (keys.w) dy -= 1;
    if (keys.s) dy += 1;
    if (keys.a) dx -= 1;
    if (keys.d) dx += 1;
    game.player.move(dx, dy);

    game.update();

    if (game.player.xp >= game.player.nextLevelXp) {
      game.player.xp -= game.player.nextLevelXp;
      game.player.level++;
      game.player.nextLevelXp = game.player.level * 100;
      triggerDraft();
    }

    hud.value = {
      hp: Math.floor(game.player.hp), maxHp: game.player.maxHp,
      xp: Math.floor(game.player.xp), nextXp: game.player.nextLevelXp,
      lvl: game.player.level, stage: game.stage, boss: game.bossActive
    };

    if (game.isGameOver || game.isVictory) gameState.value = 'GAMEOVER';
  }

  game.draw(game.ctx);
  animId = requestAnimationFrame(loop);
};

const startGame = (mode: GameMode) => {
  if (!canvasRef.value) return;
  game = new GameEngine(canvasRef.value, mode);
  gameState.value = 'DRAFT';
  rerolls.value = 3;
  generateDraft();
  loop();
};

const triggerDraft = () => {
  generateDraft();
  gameState.value = 'DRAFT';
};

const generateDraft = () => {
  const pool = [...allSkills].sort(() => 0.5 - Math.random());
  draftCards.value = pool.slice(0, 3);
};

const selectSkill = (proto: Skill) => {
  if (!game) return;
  const existing = game.player.skills.find(s => s.name === proto.name);
  if (existing) existing.upgrade();
  else {
    const newSkill = Object.assign(Object.create(Object.getPrototypeOf(proto)), proto);
    newSkill.level = 1;
    game.player.skills.push(newSkill);
  }
  gameState.value = 'PLAYING';
};

const reroll = () => {
  if (rerolls.value > 0) {
    rerolls.value--;
    generateDraft();
  }
};

onMounted(() => {
  window.addEventListener('keydown', e => handleKey(e, true));
  window.addEventListener('keyup', e => handleKey(e, false));
});
onUnmounted(() => {
  cancelAnimationFrame(animId);
});
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm">

    <div
        class="relative w-[1000px] h-[600px] bg-slate-950 rounded-2xl overflow-hidden border-4 border-slate-800 shadow-2xl">
      <canvas ref="canvasRef" width="1000" height="600" class="block"></canvas>

      <div v-if="gameState === 'PLAYING' || gameState === 'PAUSED'" class="absolute inset-0 pointer-events-none p-4">
        <div v-if="hud.boss" class="absolute top-16 left-1/2 -translate-x-1/2 w-1/2">
          <div class="text-red-500 font-bold text-center text-xl mb-1 animate-pulse">☠️ BOSS ☠️</div>
          <div class="h-6 w-full bg-slate-900 border-2 border-red-600 rounded-full overflow-hidden">
            <div class="h-full bg-red-600 w-full"></div>
          </div>
        </div>

        <div class="flex gap-4">
          <div class="bg-slate-900/80 p-3 rounded-lg border border-slate-700 w-64">
            <div class="flex justify-between text-xs text-slate-400 mb-1">
              <span>HP</span> <span>{{ hud.hp }}/{{ hud.maxHp }}</span>
            </div>
            <div class="h-3 bg-slate-800 rounded-full overflow-hidden mb-2">
              <div class="h-full bg-green-500 transition-all" :style="{width: (hud.hp/hud.maxHp*100)+'%'}"></div>
            </div>
            <div class="flex justify-between text-xs text-slate-400 mb-1">
              <span>EXP (Lv.{{ hud.lvl }})</span> <span>{{ hud.xp }}/{{ hud.nextXp }}</span>
            </div>
            <div class="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div class="h-full bg-yellow-400 transition-all" :style="{width: (hud.xp/hud.nextXp*100)+'%'}"></div>
            </div>
          </div>
        </div>

        <div class="absolute top-4 right-4 text-right">
          <div class="text-3xl font-black text-slate-200">STAGE {{ hud.stage }}</div>
          <div class="text-slate-500 text-sm font-mono">击杀敌人召唤BOSS</div>
        </div>
      </div>

      <div v-if="gameState === 'MENU'"
           class="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center z-50">
        <h1 class="text-6xl font-black text-white mb-8 tracking-tighter">虚空幸存者 <span
            class="text-blue-500 text-2xl">v2.0</span></h1>
        <div class="grid grid-cols-2 gap-4 w-[600px]">
          <button v-for="(m, k) in MODES" :key="k" @click="startGame(k)"
                  class="p-6 border-2 border-slate-700 bg-slate-900 hover:border-blue-500 hover:bg-slate-800 rounded-xl transition-all group text-left">
            <div class="text-xl font-bold text-white group-hover:text-blue-400 mb-1">{{ m.label }}</div>
            <div class="text-xs text-slate-500">血量 x{{ m.hpMult }} | 掉率 x{{ m.xpRate }}</div>
          </button>
        </div>
      </div>

      <div v-if="gameState === 'DRAFT'"
           class="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center z-50">
        <h2 class="text-4xl font-bold text-yellow-400 mb-8 animate-bounce">升级! 选择技能</h2>
        <div class="flex gap-6 mb-8">
          <div v-for="s in draftCards" :key="s.name" @click="selectSkill(s)"
               class="w-56 h-72 bg-slate-900 border-2 border-slate-700 hover:border-yellow-400 hover:-translate-y-2 cursor-pointer rounded-xl p-6 flex flex-col items-center justify-between transition-all group">
            <component :is="s.icon" :size="64" weight="duotone"
                       class="text-blue-500 group-hover:text-yellow-400 transition-colors"/>
            <div class="text-center">
              <div class="font-bold text-lg text-white mb-2">{{ s.name }}</div>
              <div class="text-xs text-slate-400 bg-slate-800 p-2 rounded">
                {{ game?.player.skills.find(sk => sk.name === s.name) ? s.getUpgradeDesc() : s.desc }}
              </div>
            </div>
            <div class="text-xs font-mono text-slate-600">
              {{
                game?.player.skills.find(sk => sk.name === s.name) ? `当前等级: ${game?.player.skills.find(sk => sk.name === s.name)?.level}` : '新技能'
              }}
            </div>
          </div>
        </div>
        <button @click="reroll" :disabled="rerolls<=0"
                class="px-6 py-2 bg-slate-800 text-white rounded-full hover:bg-slate-700 disabled:opacity-50">
          刷新列表 (剩余: {{ rerolls }})
        </button>
      </div>

      <div v-if="gameState === 'PAUSED'"
           class="absolute inset-0 bg-black/60 backdrop-blur flex flex-col items-center justify-center z-50">
        <PhPause :size="64" class="text-white mb-4"/>
        <div class="text-2xl font-bold text-white mb-8">已暂停</div>
        <div class="text-slate-400 text-sm">按 ESC 返回菜单</div>
      </div>

      <div v-if="gameState === 'GAMEOVER'"
           class="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50">
        <component :is="game?.isVictory ? PhCrown : PhSkull" :size="80"
                   :class="game?.isVictory?'text-yellow-400':'text-red-500'" class="mb-4"/>
        <h2 class="text-5xl font-black text-white mb-4">{{ game?.isVictory ? '通关胜利!' : '你牺牲了' }}</h2>
        <div class="text-xl text-slate-400 mb-8 font-mono">最终关卡: STAGE {{ game?.stage }}</div>
        <button @click="gameState='MENU'"
                class="px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition">返回主菜单
        </button>
      </div>

      <button @click="emit('close')"
              class="absolute top-4 right-4 z-[100] p-2 bg-red-500/20 hover:bg-red-500 rounded-full text-white transition">
        <PhX size="20"/>
      </button>
    </div>
  </div>
</template>