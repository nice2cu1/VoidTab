<script setup lang="ts">
import { ref, inject } from 'vue';
import { useConfigStore } from '../../stores/useConfigStore';
import GlassCard from '../ui/GlassCard.vue';
import ContextMenu from '../ui/ContextMenu.vue';
import { VueDraggable } from 'vue-draggable-plus';
import { PhPlus, PhSquaresFour, PhList } from '@phosphor-icons/vue';

// 确保 Props 定义正确
const props = defineProps<{ activeGroupId: string }>();

const store = useConfigStore();
const { openAddDialog, openEditDialog } = inject('dialog') as any;

// 状态
const menuState = ref({
  show: false,
  x: 0,
  y: 0,
  itemId: '',
  item: null,
  currentGroupId: ''
});

const isManageMode = ref(false);

// 右键处理
const handleContextMenu = (e: MouseEvent, item: any, groupId: string) => {
  e.preventDefault();
  menuState.value = {
    show: true,
    x: e.clientX,
    y: e.clientY,
    itemId: item.id,
    item: item,
    currentGroupId: groupId
  };
};

const handleEdit = () => {
  menuState.value.show = false;
  openEditDialog(menuState.value.currentGroupId, menuState.value.item);
};

const handleDelete = () => {
  menuState.value.show = false;
  if (confirm('确认删除此图标？')) {
    store.removeSite(menuState.value.currentGroupId, menuState.value.itemId);
  }
};

// ✨ 拖拽开始
const onDragStart = (event: any, group: any) => {
  const item = group.items[event.oldIndex];
  if (item) {
    store.setDragState(true, group.id, item);
  }
};

// ✨ 拖拽结束
const onDragEnd = (event: any) => {
  // 坐标检测兜底 (保留此逻辑以处理直接 Drop 的情况)
  const e = event.originalEvent;
  if (e) {
    const clientX = e.clientX || (e.changedTouches ? e.changedTouches[0].clientX : 0);
    const clientY = e.clientY || (e.changedTouches ? e.changedTouches[0].clientY : 0);

    const elements = document.elementsFromPoint(clientX, clientY);
    const dropTarget = elements.find(el => el.closest('.sidebar-drop-zone'));

    if (dropTarget) {
      const btn = dropTarget.closest('.sidebar-drop-zone') as HTMLElement;
      const targetGroupId = btn.dataset.groupId;

      if (targetGroupId && targetGroupId !== props.activeGroupId && store.dragState.item) {
        store.moveSite(props.activeGroupId, targetGroupId, store.dragState.item.id);
      }
    }
  }

  // 延迟清除状态
  setTimeout(() => {
    store.setDragState(false);
  }, 200);
};
</script>

<template>
  <div class="w-full flex flex-col items-center pb-20" @click="menuState.show = false" @contextmenu="menuState.show = false">

    <div class="w-full max-w-[1200px] flex justify-end mb-4 px-4">
      <button
          @click="isManageMode = !isManageMode"
          class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm transition-all border border-white/5"
      >
        <component :is="isManageMode ? PhList : PhSquaresFour" size="16" />
        {{ isManageMode ? '退出整理' : '整理模式' }}
      </button>
    </div>

    <div class="w-full transition-all duration-300" :style="{ maxWidth: store.config.theme.gridMaxWidth + 'px' }">

      <template v-for="group in store.config.layout" :key="group.id">
        <div
            v-show="isManageMode || group.id === activeGroupId || (store.dragState.isDragging && store.dragState.fromGroupId === group.id)"
            class="mb-8 animate-fade-in transition-all duration-300"
            :class="{
            /* 如果它不是当前显示的组，仅仅因为是拖拽源才被迫显示，就把它藏起来不占位置 */
            'fixed opacity-0 pointer-events-none': !isManageMode && group.id !== activeGroupId && store.dragState.isDragging
          }"
        >

          <div v-if="isManageMode" class="px-4 mb-3 text-cyan-400 font-bold tracking-wider text-sm flex items-center gap-2">
            <div class="w-1 h-4 bg-cyan-400 rounded-full"></div>
            {{ group.title }}
          </div>

          <VueDraggable
              v-model="group.items"
              :animation="200"
              group="voidtab-shared-group"
              filter=".ignore-drag"
              class="grid place-items-start transition-all duration-300 px-4 min-h-[100px]"
              :class="{ 'bg-white/5 rounded-xl border border-dashed border-white/10': isManageMode }"
              ghost-class="sortable-ghost"
              @start="(e) => onDragStart(e, group)"
              @end="onDragEnd"
              :style="{
              gap: store.config.theme.gap + 'px',
              gridTemplateColumns: `repeat(auto-fill, minmax(calc(${store.config.theme.iconSize}px + 20px), 1fr))`
            }"
          >
            <div
                v-for="item in group.items"
                :key="item.id"
                class="relative group w-full flex justify-center cursor-grab active:cursor-grabbing"
                @contextmenu.stop="(e) => handleContextMenu(e, item, group.id)"
            >
              <GlassCard :item="item" />
            </div>

            <div
                @click="openAddDialog(group.id)"
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
      </template>

    </div>

    <ContextMenu
        :show="menuState.show"
        :x="menuState.x"
        :y="menuState.y"
        :item-id="menuState.itemId"
        :current-group-id="menuState.currentGroupId"
        @close="menuState.show = false"
        @edit="handleEdit"
        @delete="handleDelete"
    />
  </div>
</template>

<style scoped>
.sortable-ghost {
  @apply opacity-40 bg-cyan-400/20 rounded-xl border border-dashed border-cyan-400;
}
</style>