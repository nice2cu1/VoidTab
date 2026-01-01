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
  <div class="widget-card w-full h-full relative overflow-hidden group bg-white/5 rounded-[18px]">
    <div class="absolute inset-0 backdrop-blur-md border border-white/10 transition-colors"
         :class="isEditMode ? 'bg-white/10' : 'group-hover:bg-white/10'">
    </div>

    <div class="relative z-10 w-full h-full flex flex-col items-center justify-center text-white/80 select-none p-2">

      <div v-if="item.widgetType === 'clock'" class="text-center">
        <div class="text-2xl font-bold font-mono">12:00</div>
        <div class="text-xs opacity-60">PM</div>
      </div>

      <div v-else-if="item.widgetType === 'weather'" class="text-center">
        <div class="text-xl font-bold">24°C</div>
        <div class="text-xs opacity-60">Sunny</div>
      </div>

      <div v-else class="text-center">
        <div class="text-sm font-bold opacity-70">{{ typeLabel }}</div>
        <div class="text-[10px] opacity-40 mt-1">Widget</div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.widget-card {
  container-type: size;
}
</style>