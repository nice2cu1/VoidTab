<script setup lang="ts">
import {ref, defineAsyncComponent} from 'vue';

// 异步加载游戏本体
const SnakeGameModal = defineAsyncComponent(() => import('./SnakeGameModal.vue'));

// Props (消除警告)
const props = defineProps<{
  item?: any;
  isEditMode?: boolean;
}>();

const isHovered = ref(false);
const showGame = ref(false);

const handleClick = () => {
  if (props.isEditMode) return;
  showGame.value = true;
};
</script>

<template>
  <div
      class="w-full h-full flex flex-col items-center justify-center cursor-pointer relative overflow-hidden bg-zinc-900 rounded-3xl border border-zinc-700 shadow-lg transition-all hover:border-emerald-500 group"
      @click="handleClick"
      @mouseenter="isHovered = true"
      @mouseleave="isHovered = false"
  >
    <div class="absolute inset-0 opacity-20"
         style="background-image: radial-gradient(#3f3f46 1px, transparent 1px); background-size: 8px 8px;">
    </div>

    <div class="relative w-16 h-16 transition-transform duration-300" :class="{ 'scale-110': isHovered }">
      <div class="absolute left-0 bottom-0 w-4 h-4 bg-emerald-600 rounded-sm"></div>
      <div class="absolute left-4 bottom-0 w-4 h-4 bg-emerald-600 rounded-sm"></div>
      <div class="absolute left-8 bottom-0 w-4 h-4 bg-emerald-600 rounded-sm"></div>
      <div class="absolute left-8 bottom-4 w-4 h-4 bg-emerald-600 rounded-sm"></div>
      <div
          class="absolute left-8 bottom-8 w-4 h-4 bg-emerald-500 rounded-sm shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
      <div
          class="absolute right-0 top-2 w-4 h-4 bg-amber-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.6)]"></div>
    </div>

    <div class="mt-4 font-bold text-zinc-400 font-mono text-xs group-hover:text-emerald-400 transition-colors">
      贪吃蛇
    </div>
  </div>

  <Teleport to="body">
    <SnakeGameModal
        v-if="showGame"
        :show="showGame"
        @close="showGame = false"
    />
  </Teleport>
</template>