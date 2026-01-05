<script setup lang="ts">
import {computed, ref} from 'vue';
import { useConfigStore } from '../../../../stores/useConfigStore';
import type {SiteItem} from '../../../../core/config/types';
import {PhTerminalWindow, PhCopy} from '@phosphor-icons/vue';
// 1. 引入弹窗组件 (假设在同级目录)
import TerminalModal from './TerminalModal.vue';

const props = defineProps<{ item: SiteItem; isEditMode: boolean }>();

// === 数据持久化 ===
// 与 Modal 使用相同的 key，实现数据实时同步
const store = useConfigStore();
const content = computed<string>({
  get: () => store.config.runtime.terminal.buffer,
  set: (v) => (store.config.runtime.terminal.buffer = v),
});

// === 弹窗状态控制 ===
const showModal = ref(false);

const openModal = () => {
  // 如果是编辑模式（调整布局中），则不触发弹窗
  if (props.isEditMode) return;
  showModal.value = true;
};

// === 布局判断 ===
const layout = computed(() => {
  const w = props.item.w || 1;
  const h = props.item.h || 1;
  return {
    isMini: w === 1 && h === 1,
    isWide: w >= 2 && h === 1,
    isTall: w === 1 && h >= 2,
    isStandard: w === 2 && h === 2,
    isLarge: w >= 2 && h >= 3
  };
});

// === 内容处理 ===
const lineCount = computed(() => content.value.split('\n').length);
const charCount = computed(() => content.value.length);

const previewLines = computed(() => {
  return content.value
      .split('\n')
      .filter(line => line.trim() !== '')
      .slice(0, layout.value.isLarge ? 10 : 5);
});

// 一键复制功能
const copyToClipboard = async (e: MouseEvent) => {
  if (props.isEditMode) return;
  e.stopPropagation(); // 阻止冒泡，防止触发打开弹窗
  try {
    await navigator.clipboard.writeText(content.value);
  } catch (err) {
    console.error('Failed to copy', err);
  }
};
</script>

<template>
  <div
      class="w-full h-full relative overflow-hidden bg-[#0a0a0a] border border-[#33ff00]/20 group font-mono text-[#33ff00] transition-colors hover:border-[#33ff00]/40"
      :class="{ 'cursor-pointer': !isEditMode, 'cursor-move': isEditMode }"
      @click="openModal"
  >

    <div class="absolute inset-0 z-0 pointer-events-none crt-overlay opacity-30"></div>
    <div
        class="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_center,_transparent_0%,_#000000_120%)]"></div>

    <div v-if="layout.isMini" class="relative z-10 w-full h-full flex flex-col items-center justify-center p-2">
      <PhTerminalWindow size="24" weight="duotone" class="mb-1 animate-pulse"/>
      <div class="text-[10px] opacity-60">BUF</div>
      <div class="text-xs font-bold">{{ charCount > 999 ? '999+' : charCount }}</div>
    </div>

    <div v-else-if="layout.isWide" class="relative z-10 w-full h-full flex flex-col justify-center px-4 py-2">
      <div class="flex items-center justify-between text-[10px] opacity-50 mb-1 border-b border-[#33ff00]/20 pb-1">
        <span>TERMINAL://BUFFER</span>
        <span>{{ lineCount }} LN</span>
      </div>
      <div class="text-xs truncate opacity-80">
        <span class="mr-2">></span>{{ content || 'Waiting for input...' }}
      </div>
    </div>

    <div v-else class="relative z-10 w-full h-full flex flex-col p-3">
      <div class="flex items-center justify-between text-[10px] opacity-50 mb-2 shrink-0 select-none">
        <div class="flex items-center gap-1">
          <div class="w-2 h-2 bg-[#33ff00] rounded-full animate-pulse"></div>
          <span>IDLE</span>
        </div>
        <div class="flex gap-2">
          <button @click="copyToClipboard" class="hover:text-white transition-colors" title="Copy All">
            <PhCopy size="12"/>
          </button>
          <span>{{ (content.length / 1024).toFixed(1) }} KB</span>
        </div>
      </div>

      <div
          class="flex-1 overflow-hidden text-xs leading-relaxed opacity-80 break-all whitespace-pre-wrap pointer-events-none">
        <template v-if="content">
          <div v-for="(line, index) in previewLines" :key="index" class="flex">
            <span class="mr-2 opacity-30 select-none">{{ index + 1 }}</span>
            <span>{{ line }}</span>
          </div>
          <div v-if="previewLines.length < lineCount" class="opacity-40 mt-1">...</div>
        </template>
        <div v-else class="h-full flex items-center justify-center opacity-30 italic">
          >_ System Ready<br>Click to Initialize
        </div>
      </div>

      <div class="mt-auto pt-2 border-t border-[#33ff00]/10 text-[10px] opacity-40 flex justify-between">
        <span>MODE: INSERT</span>
        <span class="animate-pulse">_</span>
      </div>
    </div>

    <Teleport to="body">
      <TerminalModal :show="showModal" @close="showModal = false"/>
    </Teleport>
  </div>
</template>

<style scoped>
/* CRT 扫描线特效 */
.crt-overlay {
  background: linear-gradient(
      rgba(18, 16, 16, 0) 50%,
      rgba(0, 0, 0, 0.25) 50%
  ), linear-gradient(
      90deg,
      rgba(255, 0, 0, 0.06),
      rgba(0, 255, 0, 0.02),
      rgba(0, 0, 255, 0.06)
  );
  background-size: 100% 2px, 3px 100%;
}

/* 字体发光 */
.text-\[\#33ff00\] {
  text-shadow: 0 0 5px rgba(51, 255, 0, 0.4);
}
</style>