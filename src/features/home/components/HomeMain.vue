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
  isEditMode: boolean; // 接收父组件传入的编辑状态
  sidebarPos: 'left' | 'right';
}>();

// 定义事件，用于通知父组件
const emit = defineEmits<{
  (e: 'openSettings'): void;
  (e: 'update:isEditMode', val: boolean): void; // 双向绑定更新状态
}>();

const store = useConfigStore();
console.log(store)
const ui = useUiStore();

const mainPaddingClass = computed(() => {
  if (props.isFocusMode) return '';
  if (props.sidebarPos === 'left') return 'md:pl-28';
  return 'md:pr-28';
});

// 处理主区域空白处的右键点击
const handleGlobalContextMenu = (e: MouseEvent) => {
  e.preventDefault();
  if (props.isFocusMode) return;
  // 呼出“空白处”菜单
  ui.openContextMenu(e, null, 'blank', props.activeGroupId);
};

// 点击背景退出编辑模式
const handleBackgroundClick = () => {
  if (props.isEditMode) {
    emit('update:isEditMode', false);
  }
};
</script>

<template>
  <main
      data-main-scroll="1"
      :data-wheel-allow="isEditMode ? 'true' : null"
      class="flex-1 w-full h-full relative overflow-x-hidden transition-all duration-300 overflow-y-auto no-scrollbar"
      :class="[mainPaddingClass]"
      @contextmenu="handleGlobalContextMenu"
      @click="handleBackgroundClick"
  >
    <transition name="fade">
      <div
          v-if="!isFocusMode"
          :class="isFocusMode ? 'scale-110 translate-y-[16vh]' : ''"
          class="transition-all duration-500 w-full flex flex-col items-center pt-10 md:pt-12 pb-2 shrink-0"
      >
        <TimeWidget class="scale-[0.78] md:scale-[0.82] origin-top"/>
      </div>
    </transition>

    <transition name="fade">
      <div
          class="sticky top-0 z-30 w-full flex justify-center pt-2 pb-2 transition-all duration-300 pointer-events-none"
          :class="isFocusMode ? 'translate-y-[16vh]' : ''"
      >
        <div class="pointer-events-auto w-full flex justify-center px-4">
          <SearchBar @openSettings="emit('openSettings')"/>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div
          v-if="!isFocusMode"
          class="w-full px-4 md:px-12 pt-4 pb-16 min-h-[450px]"
          @contextmenu.stop="handleGlobalContextMenu"
      >
        <MainGrid :activeGroupId="activeGroupId" :isEditMode="isEditMode"/>
      </div>
    </transition>
  </main>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
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