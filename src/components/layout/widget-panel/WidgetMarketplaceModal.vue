<script setup lang="ts">
import {widgetRegistry} from '../../../core/registry/widgets'; // 注意路径

defineProps<{ show: boolean }>();
const emit = defineEmits(['close', 'select']);

const select = (type: string) => {
  emit('select', type);
  emit('close');
};
</script>

<template>
  <Transition name="fade">
    <div v-if="show" class="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
         @click="$emit('close')">

      <div class="bg-[#1e1e1e] border border-white/10 p-6 rounded-2xl w-[500px] shadow-2xl transform transition-all"
           @click.stop>
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-white text-xl font-bold tracking-tight">添加组件</h3>
          <button class="text-white/40 hover:text-white transition-colors text-2xl leading-none"
                  @click="$emit('close')">&times;
          </button>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <button
              v-for="widget in widgetRegistry"
              :key="widget.type"
              class="group relative flex flex-col items-start p-4 bg-white/5 hover:bg-white/10 active:scale-[0.98] rounded-xl border border-white/5 hover:border-white/20 transition-all text-left"
              @click="select(widget.type)"
          >
            <div
                class="mb-3 w-8 h-8 rounded-lg bg-[var(--accent-color)]/20 flex items-center justify-center text-[var(--accent-color)]">
              <div class="w-3 h-3 rounded-full bg-current"></div>
            </div>

            <span class="text-white font-medium text-base mb-1">{{ widget.label }}</span>
            <span class="text-xs text-gray-400 leading-relaxed">{{ widget.description }}</span>

            <div class="absolute top-4 right-4 text-[10px] font-mono text-white/20 group-hover:text-white/40">
              {{ widget.defaultW }}x{{ widget.defaultH }}
            </div>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>