<script setup lang="ts">
import {ref, defineAsyncComponent} from 'vue';

// 异步加载游戏大组件
const SurvivorGameModal = defineAsyncComponent(() => import('./SurvivorGameModal.vue'));

const props = defineProps<{
  item?: any;
  isEditMode?: boolean;
}>();

const showGame = ref(false);
const isHovered = ref(false);

const handleClick = () => {
  if (props.isEditMode) return;
  showGame.value = true;
};
</script>

<template>
  <div
      class="w-full h-full flex flex-col items-center justify-center cursor-pointer relative overflow-hidden bg-slate-900 rounded-3xl border border-slate-700 shadow-lg transition-all group hover:border-red-500 hover:shadow-red-900/50"
      @click="handleClick"
      @mouseenter="isHovered = true"
      @mouseleave="isHovered = false"
  >
    <div class="absolute inset-0 opacity-20"
         style="background-image: radial-gradient(#94a3b8 1px, transparent 1px); background-size: 16px 16px;">
    </div>

    <div class="relative w-16 h-16 transition-transform duration-300" :class="{ 'scale-110': isHovered }">
      <div class="absolute inset-0 m-auto w-4 h-4 bg-blue-500 rounded-full shadow-[0_0_15px_#3b82f6] z-10"></div>

      <div class="absolute inset-0 animate-spin-slow">
        <div
            class="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-yellow-400 rounded-full shadow-[0_0_10px_#facc15]"></div>
        <div
            class="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-yellow-400 rounded-full shadow-[0_0_10px_#facc15]"></div>
      </div>

      <div class="absolute top-0 right-0 w-3 h-3 bg-red-500 rotate-45 animate-pulse"></div>
      <div class="absolute bottom-2 left-0 w-3 h-3 bg-red-500 rotate-12 animate-pulse delay-75"></div>
      <div class="absolute top-1/2 -right-4 w-3 h-3 bg-red-500 rotate-12 animate-bounce delay-150"></div>
    </div>

    <div class="mt-4 font-bold text-slate-400 font-mono text-xs group-hover:text-red-400 transition-colors">
      SURVIVOR
    </div>
  </div>

  <Teleport to="body">
    <SurvivorGameModal
        v-if="showGame"
        :show="showGame"
        @close="showGame = false"
    />
  </Teleport>
</template>

<style scoped>
.animate-spin-slow {
  animation: spin 3s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>