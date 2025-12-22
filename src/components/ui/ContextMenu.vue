<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue';
import {
  PhPencilSimple,
  PhTrash,
  PhFolderNotch,
  PhArrowRight,
  PhCheck
} from '@phosphor-icons/vue';
import { useConfigStore } from '../../stores/useConfigStore';

const store = useConfigStore();

// 这样页面刚加载时，即使父组件传了空值，Vue 也不会报错
const props = withDefaults(defineProps<{
  show: boolean;
  x: number;
  y: number;
  itemId?: string;         // 变更为可选 (?)
  currentGroupId?: string; // 变更为可选 (?)
}>(), {
  itemId: '',
  currentGroupId: ''
});

const emit = defineEmits(['close', 'edit', 'delete']);
const closeMenu = () => emit('close');
const groups = store.config.layout;

// 获取当前组名称
const currentGroupName = computed(() => {
  if (!props.currentGroupId) return '';
  const g = groups.find((group: any) => group.id === props.currentGroupId);
  return g ? g.title : '未知分组';
});

// 移动逻辑
const moveTo = (targetGroupId: string) => {
  if (targetGroupId === props.currentGroupId) return;
  store.moveSite(props.currentGroupId, targetGroupId, props.itemId);
  emit('close');
};

onMounted(() => {
  window.addEventListener('resize', closeMenu);
  window.addEventListener('scroll', closeMenu, true);
  window.addEventListener('click', closeMenu);
});

onUnmounted(() => {
  window.removeEventListener('resize', closeMenu);
  window.removeEventListener('scroll', closeMenu, true);
  window.removeEventListener('click', closeMenu);
});
</script>

<template>
  <Transition name="scale">
    <div
        v-if="show"
        class="fixed z-[9999] min-w-[160px] p-1.5 rounded-xl apple-glass shadow-2xl flex flex-col gap-1 origin-top-left border border-white/10"
        :style="{ top: y + 'px', left: x + 'px' }"
        @click.stop
        @contextmenu.prevent
    >
      <button
          @click="$emit('edit'); closeMenu()"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-all hover:bg-[var(--sidebar-active)] text-[var(--text-primary)] text-left group w-full"
      >
        <PhPencilSimple size="16" class="opacity-70 group-hover:text-[var(--accent-color)]"/>
        编辑信息
      </button>

      <div class="border-t border-white/10 my-1"></div>

      <div class="px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-500 font-bold flex justify-between items-center">
        <span>移动到...</span>
        <span v-if="currentGroupName" class="text-[9px] opacity-50 bg-white/10 px-1.5 py-0.5 rounded">当前: {{ currentGroupName }}</span>
      </div>

      <div class="max-h-[180px] overflow-y-auto custom-scrollbar flex flex-col gap-0.5">
        <div
            v-for="group in groups"
            :key="group.id"
            @click="moveTo(group.id)"
            class="px-3 py-2 rounded-md flex items-center justify-between gap-2 text-xs transition-colors select-none"
            :class="[
            group.id === currentGroupId
              ? 'bg-white/5 text-gray-500 cursor-default'
              : 'hover:bg-[var(--accent-color)]/20 hover:text-[var(--accent-color)] cursor-pointer text-gray-200'
          ]"
        >
          <div class="flex items-center gap-2">
            <PhFolderNotch size="14" :weight="group.id === currentGroupId ? 'fill' : 'regular'" />
            <span class="truncate max-w-[90px]">{{ group.title }}</span>
          </div>

          <div v-if="group.id === currentGroupId">
            <PhCheck size="12" weight="bold" />
          </div>
          <div v-else class="opacity-0 group-hover:opacity-100 transition-opacity">
            <PhArrowRight size="12" weight="bold" />
          </div>
        </div>
      </div>

      <div class="border-t border-white/10 my-1"></div>

      <button
          @click="$emit('delete'); closeMenu()"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-all hover:bg-red-500/10 text-red-500 text-left w-full group"
      >
        <PhTrash size="16" class="group-hover:scale-110 transition-transform"/>
        删除
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.scale-enter-active, .scale-leave-active { transition: opacity 0.15s ease, transform 0.15s cubic-bezier(0.16, 1, 0.3, 1); }
.scale-enter-from, .scale-leave-to { opacity: 0; transform: scale(0.9); }

.apple-glass {
  background: rgba(30, 30, 30, 0.9);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.custom-scrollbar::-webkit-scrollbar { width: 3px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }
</style>