<script setup lang="ts">
import {computed} from 'vue';
import type {SiteItem} from '../../../core/config/types';

const props = defineProps<{
  item: SiteItem;
  isEditMode: boolean;
}>();

const typeLabel = computed(() => {
  return props.item.widgetType?.toUpperCase() || 'WIDGET';
});
</script>

<template>
  <div class="widget-card w-full h-full relative overflow-hidden group">
    <div class="absolute inset-0 bg-white/5 backdrop-blur-md border border-white/10 rounded-[18px] transition-colors"
         :class="isEditMode ? 'bg-white/10' : 'group-hover:bg-white/10'">
    </div>

    <div class="relative z-10 w-full h-full flex flex-col items-center justify-center text-white/80 select-none p-2">

      <div v-if="item.widgetType === 'clock'" class="text-center">
        <div class="text-2xl font-bold font-mono">12:00</div>
        <div class="text-xs opacity-60">PM</div>
      </div>

      <div v-else class="text-center">
        <div class="text-sm font-bold opacity-70">{{ typeLabel }}</div>
        <div class="text-[10px] opacity-40 mt-1">组件占位符</div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.widget-card {
  /* 确保在 grid 中撑满 */
  container-type: size;
}
</style>