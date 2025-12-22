<script setup lang="ts">
import { ref, inject, computed } from 'vue';
import { useConfigStore } from '../../stores/useConfigStore';
import GlassCard from '../ui/GlassCard.vue';
import ContextMenu from '../ui/ContextMenu.vue';
// ✅ 1. 只保留 vue-draggable-plus
import { VueDraggable } from 'vue-draggable-plus';
import { PhPlus } from '@phosphor-icons/vue';

// 接收当前激活的组 ID
const props = defineProps<{ activeGroupId: string }>();
const store = useConfigStore();

const { openAddDialog, openEditDialog } = inject('dialog') as any;

// 右键菜单状态
const menuState = ref({ show: false, x: 0, y: 0, itemId: '', item: null });

// ✅ 2. 核心：计算当前组的数据，支持双向绑定 (get/set)
// 这样当拖拽发生时，会自动调用 store 更新顺序
const currentGroupItems = computed({
  get: () => {
    const group = store.config.layout.find((g: any) => g.id === props.activeGroupId);
    return group ? group.items : [];
  },
  set: (newVal) => {
    store.reorderItems(props.activeGroupId, newVal);
  }
});

// 处理右键点击
const handleContextMenu = (e: MouseEvent, item: any) => {
  e.preventDefault();
  menuState.value = {
    show: true,
    x: e.clientX,
    y: e.clientY,
    itemId: item.id,
    item: item
  };
};

const handleEdit = () => {
  menuState.value.show = false;
  openEditDialog(props.activeGroupId, menuState.value.item);
};

const handleDelete = () => {
  menuState.value.show = false;
  if (confirm('确认删除此图标？')) {
    store.removeSite(props.activeGroupId, menuState.value.itemId);
  }
};
</script>

<template>
  <div class="w-full flex justify-center pb-20" @click="menuState.show = false" @contextmenu="menuState.show = false">

    <div class="w-full transition-all duration-300" :style="{ maxWidth: store.config.theme.gridMaxWidth + 'px' }">

      <VueDraggable
          v-model="currentGroupItems"
          :animation="200"
          filter=".ignore-drag"
          class="grid place-items-start transition-all duration-300 animate-fade-in"
          :style="{
          gap: store.config.theme.gap + 'px',
          gridTemplateColumns: `repeat(auto-fill, minmax(calc(${store.config.theme.iconSize}px + 20px), 1fr))`
        }"
      >

        <div
            v-for="item in currentGroupItems"
            :key="item.id"
            class="relative group w-full flex justify-center cursor-grab active:cursor-grabbing"
            @contextmenu.stop="(e) => handleContextMenu(e, item)"
        >
          <GlassCard :item="item" />
        </div>

        <div
            @click="openAddDialog(activeGroupId)"
            class="ignore-drag flex flex-col items-center gap-2 cursor-pointer group hover:-translate-y-1 transition-transform w-full"
        >
          <div
              class="add-card flex items-center justify-center transition-all group-hover:shadow-lg group-hover:brightness-110"
              :style="{
              width: store.config.theme.iconSize + 'px',
              height: store.config.theme.iconSize + 'px',
              borderRadius: store.config.theme.radius + 'px',
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: '1px dashed rgba(255,255,255,0.2)'
            }"
          >
            <PhPlus size="32" weight="light" class="text-gray-400 group-hover:text-white transition-colors"/>
          </div>

          <span v-if="store.config.theme.showIconName"
                class="font-bold text-center leading-tight opacity-50 group-hover:opacity-100 transition-opacity"
                :style="{ fontSize: store.config.theme.iconTextSize + 'px', color: 'var(--text-primary)' }">
            添加
          </span>
        </div>

      </VueDraggable>

    </div>

    <ContextMenu
        :show="menuState.show"
        :x="menuState.x"
        :y="menuState.y"
        @close="menuState.show = false"
        @edit="handleEdit"
        @delete="handleDelete"
    />
  </div>
</template>

<style scoped>
/* 拖拽时的幽灵样式 (占位符) */
.sortable-ghost {
  opacity: 0.4;
  background: rgba(34, 211, 238, 0.1);
  border-radius: 16px;
}

/* 正在被拖拽的元素 */
.sortable-drag {
  cursor: grabbing;
  opacity: 1;
  scale: 1.05;
  z-index: 50;
}
</style>