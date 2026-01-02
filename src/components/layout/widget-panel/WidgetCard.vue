<script setup lang="ts">
import {computed, onMounted, onUnmounted, ref} from 'vue';
import type {SiteItem} from '../../../core/config/types';

const props = defineProps<{
  item: SiteItem;
  isEditMode: boolean;
}>();

// ========== 时钟逻辑 ==========
const timeStr = ref('');
const dateStr = ref('');
const dayStr = ref('');
let timer: number | null = null;

const updateClock = () => {
  const now = new Date();
  // 时间 HH:mm
  timeStr.value = now.toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit', hour12: false});
  // 日期 1月1日
  dateStr.value = now.toLocaleDateString('zh-CN', {month: 'short', day: 'numeric'});
  // 星期
  dayStr.value = now.toLocaleDateString('zh-CN', {weekday: 'long'});
};

// ========== 挂载/销毁 ==========
onMounted(() => {
  // 只有当时钟类型才启动定时器
  if (props.item.widgetType === 'clock') {
    updateClock();
    timer = setInterval(updateClock, 1000);
  }
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});

// 计算显示标题（兜底）
const typeLabel = computed(() => {
  return props.item.widgetType?.toUpperCase() || 'WIDGET';
});
</script>

<template>
  <div class="widget-card w-full h-full relative overflow-hidden group rounded-[18px] select-none">

    <div class="absolute inset-0 bg-white/5 backdrop-blur-md border border-white/10 transition-colors z-0"
         :class="isEditMode ? 'bg-white/10' : 'group-hover:bg-white/10'">
    </div>

    <div class="relative z-10 w-full h-full flex flex-col items-center justify-center text-white/90">

      <div v-if="item.widgetType === 'clock'" class="flex flex-col items-center justify-center w-full h-full">
        <div class="text-4xl font-bold font-mono tracking-wider mb-1" style="font-variant-numeric: tabular-nums;">
          {{ timeStr }}
        </div>
        <div class="flex items-center gap-2 text-xs opacity-60 font-medium tracking-wide">
          <span>{{ dateStr }}</span>
          <span class="w-1 h-1 rounded-full bg-white/40"></span>
          <span>{{ dayStr }}</span>
        </div>
      </div>

      <div v-else-if="item.widgetType === 'calendar'" class="w-full h-full p-4 flex flex-col">
        <div class="text-xs font-bold opacity-50 uppercase mb-2">Calendar</div>
        <div class="flex-1 bg-white/5 rounded-lg flex items-center justify-center text-xs opacity-40">
          (日历组件开发中...)
        </div>
      </div>

      <div v-else-if="item.widgetType === 'weather'" class="flex flex-col items-center">
        <div class="text-3xl mb-1">🌤</div>
        <div class="text-xl font-bold">24°C</div>
        <div class="text-xs opacity-60">晴朗 / 上海</div>
      </div>

      <div v-else class="text-center p-2">
        <div class="text-sm font-bold opacity-70 mb-1">{{ typeLabel }}</div>
        <div class="text-[10px] opacity-40 border border-white/20 px-2 py-1 rounded">
          无渲染逻辑
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.widget-card {
  container-type: size; /* 允许未来做容器查询响应式 */
}
</style>