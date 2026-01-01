<script setup lang="ts">
import {widgetRegistry} from '../../../core/registry/widgets';

defineProps<{ show: boolean }>();
const emit = defineEmits(['close', 'select']);

const select = (type: string) => {
  emit('select', type);
  emit('close');
};
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm"
       @click="$emit('close')">
    <div class="bg-[#1e1e1e] border border-white/10 p-6 rounded-2xl w-[400px] shadow-2xl" @click.stop>
      <h3 class="text-white text-lg font-bold mb-4">添加组件</h3>
      <div class="grid grid-cols-2 gap-3">
        <button
            v-for="w in widgetRegistry"
            :key="w.type"
            class="flex flex-col items-center justify-center p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all"
            @click="select(w.type)"
        >
          <span class="text-white font-medium">{{ w.label }}</span>
          <span class="text-xs text-gray-400 mt-1">{{ w.defaultW }}x{{ w.defaultH }}</span>
        </button>
      </div>
    </div>
  </div>
</template>