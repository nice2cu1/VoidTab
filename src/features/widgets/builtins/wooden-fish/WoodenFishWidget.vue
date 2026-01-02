<script setup lang="ts">
import { ref, computed, onBeforeUnmount, watch } from 'vue';
import { useLocalStorage, useIntervalFn } from '@vueuse/core';
import type { SiteItem } from '../../../../core/config/types';
import {
  PhHandsPraying, PhSpeakerHigh, PhSpeakerSlash,
  PhLightning, PhSparkle
} from '@phosphor-icons/vue';

const props = defineProps<{ item: SiteItem; isEditMode: boolean }>();

// === 状态管理 ===
// 功德数 (持久化)
const meritCount = useLocalStorage(`widget_merit_${props.item.id}`, 0);
// 音效开关
const soundEnabled = useLocalStorage(`widget_merit_sound_${props.item.id}`, true);
// 自动挂机开关 (仅 2x4)
const isAutoMode = ref(false);

// 动画状态
const isAnimate = ref(false);
const floatingTexts = ref<{ id: number; x: number; y: number; text: string }[]>([]);
let textIdCounter = 0;

// === 布局判断 ===
const layout = computed(() => {
  const w = props.item.w || 1;
  const h = props.item.h || 1;
  return {
    isMini: w === 1 && h === 1,       // 1x1
    isWide: w >= 2 && h === 1,        // 2x1
    isTall: w === 1 && h >= 2,        // 1x2
    isStandard: w === 2 && h === 2,   // 2x2
    isLarge: w >= 2 && h >= 3         // 2x4 (此处宽容度设为高度>=3即视为大)
  };
});

// === 声音合成 (Web Audio API) ===
// 模拟真实的木鱼“笃”声
const playWoodSound = () => {
  if (!soundEnabled.value) return;
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // 木鱼的频率通常在 800Hz - 1200Hz 之间，且有快速衰减
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {
    console.error('Audio play failed', e);
  }
};

// === 核心交互：敲击 ===
const knock = (e?: MouseEvent) => {
  if (props.isEditMode) return;

  // 1. 数据增加
  meritCount.value++;

  // 2. 播放声音
  playWoodSound();

  // 3. 震动反馈 (仅移动端)
  if (navigator.vibrate) navigator.vibrate(50);

  // 4. 木鱼缩放动画
  isAnimate.value = true;
  setTimeout(() => isAnimate.value = false, 100);

  // 5. 飘字动画
  // 如果是自动模式，为了性能，不每次都飘字，或者只在组件中心飘
  const x = e ? e.offsetX : (Math.random() * 50 + 25); // 随机位置或点击位置
  const y = e ? e.offsetY : 50;

  const id = textIdCounter++;
  floatingTexts.value.push({ id, x, y, text: '功德 +1' });

  // 1秒后移除飘字元素
  setTimeout(() => {
    floatingTexts.value = floatingTexts.value.filter(t => t.id !== id);
  }, 800);
};

// === 自动挂机逻辑 (2x4) ===
const { pause, resume } = useIntervalFn(() => {
  knock();
}, 800); // 0.8秒敲一次

watch(isAutoMode, (val) => {
  if (val) resume();
  else pause();
});

// 组件卸载时停止
onBeforeUnmount(() => pause());
</script>

<template>
  <div
      class="w-full h-full relative cursor-pointer select-none overflow-hidden group"
      :class="[
      'bg-[#1a1a1a] text-white', // 基础深色背景
      layout.isLarge ? 'bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a]' : ''
    ]"
      @click="knock"
  >
    <div class="absolute inset-0 opacity-10 pointer-events-none">
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-[radial-gradient(circle,_#ffffff_1px,_transparent_1px)] bg-[length:20px_20px] opacity-20"></div>
    </div>

    <div class="absolute inset-0 pointer-events-none overflow-hidden z-20">
      <transition-group name="float-up">
        <div
            v-for="item in floatingTexts"
            :key="item.id"
            class="absolute text-[10px] font-bold text-yellow-400 whitespace-nowrap"
            :style="{ left: item.x + 'px', top: item.y + 'px' }"
        >
          {{ item.text }}
        </div>
      </transition-group>
    </div>

    <div v-if="layout.isMini || layout.isTall || layout.isWide" class="w-full h-full flex flex-col items-center justify-center relative z-10">
      <div
          class="wooden-fish-shape w-12 h-10 bg-gradient-to-b from-amber-600 to-amber-800 rounded-full relative shadow-lg flex items-center justify-center transition-transform duration-100"
          :class="{ 'scale-90': isAnimate }"
      >
        <div class="w-8 h-1 bg-black/30 rounded-full"></div>
        <div class="absolute -right-1 w-3 h-3 bg-black/40 rounded-full"></div>
      </div>

      <div class="mt-2 text-[10px] opacity-60 font-mono" v-if="!layout.isWide">
        {{ meritCount > 9999 ? (meritCount/10000).toFixed(1) + 'w' : meritCount }}
      </div>

      <div v-if="layout.isWide" class="absolute right-4 flex flex-col items-end">
        <div class="text-xs font-bold text-amber-500">电子木鱼</div>
        <div class="text-[10px] opacity-50">Accumulating...</div>
      </div>
    </div>

    <div v-else-if="layout.isStandard" class="w-full h-full flex flex-col items-center justify-between p-4 z-10 relative">
      <div class="w-full flex justify-between items-center text-xs opacity-50">
        <span>今日功德</span>
        <button @click.stop="soundEnabled = !soundEnabled" class="hover:text-white transition-colors p-1">
          <component :is="soundEnabled ? PhSpeakerHigh : PhSpeakerSlash" />
        </button>
      </div>

      <div
          class="wooden-fish-shape w-24 h-20 bg-gradient-to-b from-amber-700 to-amber-900 rounded-[36px] relative shadow-xl flex items-center justify-center transition-transform duration-75 cursor-active:scale-95 group-active:scale-95"
          :class="{ 'scale-95 brightness-110': isAnimate }"
      >
        <div class="absolute inset-x-4 top-1/2 h-1 bg-black/40 rounded-full"></div>
        <div class="absolute right-0 w-6 h-6 bg-black/50 rounded-full mr-[-4px]"></div>
        <div class="text-amber-200/20 text-4xl font-bold select-none">禅</div>
      </div>

      <div class="text-2xl font-mono font-bold text-amber-400 tracking-wider">
        {{ meritCount }}
      </div>
    </div>

    <div v-else class="w-full h-full p-6 flex flex-col z-10 relative">
      <div class="flex justify-between items-start mb-4">
        <div>
          <h3 class="text-lg font-bold text-amber-500 flex items-center gap-2">
            <PhHandsPraying weight="duotone"/> 赛博积德
          </h3>
          <p class="text-xs opacity-40 mt-1">代码无Bug，发际线不后移</p>
        </div>
        <button
            @click.stop="isAutoMode = !isAutoMode"
            class="px-3 py-1.5 rounded-full text-xs font-bold transition-all border"
            :class="isAutoMode
            ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 animate-pulse'
            : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'"
        >
          {{ isAutoMode ? '自动积德中...' : '开启自动' }}
        </button>
      </div>

      <div class="flex-1 flex items-center justify-center relative">
        <div
            class="wooden-fish-shape w-32 h-24 bg-gradient-to-br from-amber-600 via-amber-800 to-black rounded-[40px] relative shadow-2xl flex items-center justify-center transition-transform duration-75"
            :class="{ 'scale-95': isAnimate }"
        >
          <div class="absolute w-20 h-1 bg-black/40 rounded-full"></div>
          <div class="absolute right-0 w-8 h-8 bg-black/50 rounded-full mr-[-6px]"></div>
          <div
              class="absolute -right-12 -top-12 w-24 h-4 bg-stone-400 rounded-full origin-bottom-left transition-transform duration-75"
              :class="isAnimate ? 'rotate-[30deg] translate-y-4' : '-rotate-[20deg]'"
              style="pointer-events: none;"
          ></div>
        </div>

        <PhSparkle
            v-if="isAutoMode"
            weight="fill"
            class="absolute top-0 right-10 text-yellow-200 animate-bounce"
            size="24"
        />
      </div>

      <div class="mt-4 bg-white/5 rounded-xl p-3 flex justify-between items-center border border-white/5">
        <div class="flex items-center gap-2 text-xs opacity-60">
          <PhLightning weight="fill" :class="isAutoMode ? 'text-yellow-400' : ''"/>
          <span>当前功德</span>
        </div>
        <div class="text-xl font-mono font-bold text-amber-400">
          {{ meritCount }}
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* 飘字动画 */
.float-up-enter-active {
  transition: all 0.8s ease-out;
}
.float-up-enter-from {
  opacity: 1;
  transform: translateY(0) scale(0.5);
}
.float-up-leave-active {
  transition: all 0.8s ease-out;
}
.float-up-leave-to {
  opacity: 0;
  transform: translateY(-40px) scale(1.2);
}

/* 木鱼形状微调 */
.wooden-fish-shape {
  box-shadow:
      inset 2px 2px 10px rgba(255,255,255,0.1),
      inset -5px -5px 15px rgba(0,0,0,0.6),
      0 10px 20px rgba(0,0,0,0.3);
}
</style>