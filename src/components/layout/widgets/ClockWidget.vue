<script setup lang="ts">
import {ref, onMounted, onUnmounted} from 'vue';
import type {SiteItem} from '../../../core/config/types';

// 接收 item 数据
defineProps<{
  item: SiteItem
}>();

const timeStr = ref('');
const dateStr = ref('');
const dayStr = ref('');
let timer: number | null = null;

const updateClock = () => {
  const now = new Date();
  timeStr.value = now.toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit', hour12: false});
  dateStr.value = now.toLocaleDateString('zh-CN', {month: 'short', day: 'numeric'});
  dayStr.value = now.toLocaleDateString('zh-CN', {weekday: 'long'});
};

onMounted(() => {
  updateClock();
  timer = setInterval(updateClock, 1000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<template>
  <div class="flex flex-col items-center justify-center w-full h-full">
    <div class="text-4xl font-bold font-mono tracking-wider mb-1" style="font-variant-numeric: tabular-nums;">
      {{ timeStr }}
    </div>
    <div class="flex items-center gap-2 text-xs opacity-60 font-medium tracking-wide">
      <span>{{ dateStr }}</span>
      <span class="w-1 h-1 rounded-full bg-white/40"></span>
      <span>{{ dayStr }}</span>
    </div>
  </div>
</template>