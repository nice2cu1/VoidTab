<script setup lang="ts">
import {computed} from 'vue';
import {useConfigStore} from '../../../stores/useConfigStore.ts';
import {useUiStore} from '../../../stores/ui/useUiStore.ts';

import TimeWidget from '../../widgets/builtins/clock/TimeWidget.vue';
import SearchBar from '../../widgets/builtins/search/SearchBar.vue';
import MainGrid from './MainGrid.vue';

const props = defineProps<{
  isFocusMode: boolean;
  activeGroupId: string;
  isEditMode: boolean;
  sidebarPos: 'left' | 'right';
}>();

const emit = defineEmits<{
  (e: 'openSettings'): void;
  (e: 'update:isEditMode', val: boolean): void;
}>();

const store = useConfigStore();
const ui = useUiStore();

// 1. 核心布局优化：动态计算顶部间距
// HomeMain.vue

const mainContainerClass = computed(() => {
  const base = 'flex flex-col w-full h-full transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]';

  // 侧边栏留白 (仅普通模式)
  let paddingX = '';
  if (!props.isFocusMode) {
    paddingX = props.sidebarPos === 'left' ? 'md:pl-28' : 'md:pr-28';
  }

  if (props.isFocusMode) {
    // 调整策略：加大顶部间距，将内容进一步下压
    // 无时间：之前是 38vh，现在改为 45vh (接近屏幕中心)
    // 有时间：之前是 22vh，现在改为 30vh
    const topSpacing = store.config.theme.showTime ? 'pt-[20vh]' : 'pt-[25vh]';

    return `${base} justify-start ${topSpacing} items-center ${paddingX}`;
  } else {
    // 普通模式：在这里补回原本在 App.vue 中的 padding
    return `${base} justify-start pt-24 md:pt-14 ${paddingX}`;
  }
});
// 2. 搜索框容器
const searchWrapperClass = computed(() => {
  const base = 'w-full flex justify-center px-4 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]';

  if (props.isFocusMode) {
    // 专注模式：放大，增加沉浸感
    return `${base} relative z-30 mb-8 scale-110`;
  }
  // 普通模式：正常大小，吸顶
  return `${base} sticky top-0 z-30 pb-2`;
});

const handleGlobalContextMenu = (e: MouseEvent) => {
  e.preventDefault();
  if (props.isFocusMode) return;
  ui.openContextMenu(e, null, 'blank', props.activeGroupId);
};

const handleBackgroundClick = () => {
  if (props.isEditMode) emit('update:isEditMode', false);
};
</script>

<template>
  <main
      data-main-scroll="1"
      :data-wheel-allow="isEditMode ? 'true' : null"
      class="flex-1 relative overflow-x-hidden overflow-y-auto no-scrollbar"
      :class="mainContainerClass"
      @contextmenu="handleGlobalContextMenu"
      @click="handleBackgroundClick"
  >

    <transition name="fade-slide">
      <div
          v-if="store.config.theme.showTime"
          class="w-full flex flex-col items-center shrink-0 mb-6 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
          :class="isFocusMode ? 'scale-110' : 'scale-[0.85] origin-bottom'"
      >
        <TimeWidget/>
      </div>
    </transition>

    <div :class="searchWrapperClass">
      <div class="w-full flex justify-center pointer-events-auto max-w-[680px]">
        <SearchBar @openSettings="emit('openSettings')"/>
      </div>
    </div>

    <div
        class="w-full px-4 md:px-12 pb-16 min-h-[450px] transition-all duration-500 ease-out origin-top"
        :class="isFocusMode ? 'opacity-0 translate-y-10 pointer-events-none scale-95 blur-sm' : 'opacity-100 translate-y-0 scale-100 blur-0'"
        @contextmenu.stop="handleGlobalContextMenu"
    >
      <MainGrid v-if="!isFocusMode" :activeGroupId="activeGroupId" :isEditMode="isEditMode"/>
    </div>

  </main>
</template>

<style scoped>
/* 优化的淡入淡出+位移 */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  max-height: 200px;
  opacity: 1;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  max-height: 0;
  margin-bottom: 0;
  transform: scale(0.9);
}

.no-scrollbar {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.no-scrollbar::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}
</style>