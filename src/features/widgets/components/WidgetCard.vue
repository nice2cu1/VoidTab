<script setup lang="ts">
import {computed} from 'vue';
import type {SiteItem} from '../../../core/config/types.ts';
import {getWidgetMeta} from '../../../core/registry/widgets.ts';

const props = defineProps<{
  item: SiteItem;
  isEditMode: boolean;
}>();

/** ✅ 从 registry 获取组件（不再维护一份 widgetMap） */
const currentWidget = computed(() => {
  return getWidgetMeta(props.item.widgetType)?.component || null;
});

const typeLabel = computed(() => props.item.widgetType?.toUpperCase() || 'WIDGET');
</script>

<template>
  <div class="widget-card w-full h-full relative overflow-hidden group rounded-[18px] select-none bg-[#121212]">
    <div
        class="absolute inset-0 bg-white/5 backdrop-blur-md border border-white/10 z-0 transition-opacity"
        :class="isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'"
    />

    <div class="relative z-10 w-full h-full">
      <component
          v-if="currentWidget"
          :is="currentWidget"
          :item="item"
          :is-edit-mode="isEditMode"
      />

      <div v-else class="w-full h-full flex flex-col items-center justify-center text-white/90">
        <div class="text-sm font-bold opacity-70 mb-1">{{ typeLabel }}</div>
        <div class="text-[10px] opacity-40 border border-white/20 px-2 py-1 rounded">未实现</div>
      </div>
    </div>

    <div
        v-if="isEditMode"
        class="absolute inset-0 z-20 pointer-events-none border-2 border-[var(--accent-color)]/30 rounded-[18px]"
    />
  </div>
</template>
