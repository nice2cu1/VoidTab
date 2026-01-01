<script setup lang="ts">
import {computed, inject, onMounted, onUnmounted, ref} from 'vue';
import {useConfigStore} from '../../../stores/useConfigStore.ts';
import {useUiStore} from '../../../stores/useUiStore.ts';
import {useDeleteConfirm} from '../../../composables/useDeleteConfirm';

// 组件
import ContextMenuPanel from './ContextMenuPanel.vue';
import WidgetMarketplaceModal from '../../layout/widget-panel/WidgetMarketplaceModal.vue';
import ConfirmDialog from '../dialogs/ConfirmDialog.vue';
import {PhTrash} from '@phosphor-icons/vue';

const store = useConfigStore();
const ui = useUiStore();
const del = useDeleteConfirm();
console.log(del)
const dialog = inject('dialog') as { openAddDialog: (gid: string) => void } | undefined;

// 菜单容器 Ref
const menuRef = ref<HTMLElement | null>(null);

const emit = defineEmits<{
  (e: 'edit'): void;
}>();

const showWidgetModal = ref(false);

// ========== 删除弹窗状态 ==========
type DeleteTarget =
    | { type: 'site' | 'widget'; groupId: string; siteId: string; title?: string } // ✅ 扩展支持 widget
    | { type: 'group'; groupId: string; title?: string }
    | null;

const showDeleteModal = ref(false);
const deleteTarget = ref<DeleteTarget>(null);

// ✅ 核心修复：处理删除请求
const openDeleteModal = () => {
  if (!ui.contextMenu?.show) return;

  const {type, groupId, item} = ui.contextMenu;

  // 1. 处理图标(site) 和 组件(widget)
  if (type === 'site' || type === 'widget') {
    deleteTarget.value = {
      type: type,
      groupId: groupId,
      siteId: item?.id,
      title: item?.title || (type === 'widget' ? item?.widgetType : '未命名')
    };
    showDeleteModal.value = true; // ✅ 显式打开本地弹窗
  }
  // 2. 处理分组
  else if (type === 'group') {
    deleteTarget.value = {
      type: 'group',
      groupId: item?.id,
      title: item?.title
    };
    showDeleteModal.value = true; // ✅ 显式打开本地弹窗
  }

  ui.closeContextMenu();
};

// ✅ 核心修复：确认删除
const confirmDelete = () => {
  if (!deleteTarget.value) {
    showDeleteModal.value = false;
    return;
  }

  if (deleteTarget.value.type === 'site' || deleteTarget.value.type === 'widget') {
    // Store 中的 removeSite 本质是移除 group.items 里的条目，所以对 widget 也通用
    store.removeSite(deleteTarget.value.groupId, deleteTarget.value.siteId);
  } else if (deleteTarget.value.type === 'group') {
    store.removeGroup(deleteTarget.value.groupId);
  }

  showDeleteModal.value = false;
  deleteTarget.value = null;
};

const cancelDelete = () => {
  showDeleteModal.value = false;
  deleteTarget.value = null;
};

// ========== 菜单样式 ==========
const menuStyle = computed(() => {
  const isDark = store.config.theme.mode === 'dark';
  let top = ui.contextMenu.y;
  let left = ui.contextMenu.x;

  return {
    top: top + 'px',
    left: left + 'px',
    backgroundColor: isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
    color: isDark ? '#fff' : '#333',
    backdropFilter: 'blur(12px)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
  };
});

const currentGroupName = computed(() => {
  if (!ui.contextMenu.groupId) return '';
  const g = store.config.layout.find((group: any) => group.id === ui.contextMenu.groupId);
  return g ? g.title : '';
});

// --- 事件处理 ---

const moveTo = (targetGroupId: string) => {
  if (targetGroupId === ui.contextMenu.groupId) return;
  if (ui.contextMenu.type === 'site' && ui.contextMenu.item) {
    store.moveSite(ui.contextMenu.groupId, targetGroupId, ui.contextMenu.item.id);
  }
  ui.closeContextMenu();
};

const handleAddSite = () => {
  if (dialog && ui.contextMenu.groupId) {
    dialog.openAddDialog(ui.contextMenu.groupId);
  }
  ui.closeContextMenu();
};

const handleAddWidgetRequest = () => {
  ui.closeContextMenu();
  showWidgetModal.value = true;
};

const handleConfirmAddWidget = (type: string) => {
  if (ui.contextMenu.groupId) {
    store.addWidget(ui.contextMenu.groupId, type);
  }
};

const handleResize = (w: number, h: number) => {
  if (ui.contextMenu.item && ui.contextMenu.groupId) {
    store.updateItemSize(ui.contextMenu.groupId, ui.contextMenu.item.id, w, h);
  }
  ui.closeContextMenu();
};

// 动态标题
const deleteTitle = computed(() => '确认删除？');
const deleteMessage = computed(() => {
  const t = deleteTarget.value?.type === 'group' ? '分组' : (deleteTarget.value?.type === 'widget' ? '组件' : '图标');
  return ['删除后无法恢复，', `确定要移除这个${t}吗？`];
});

// 点击外部关闭
// 修改参数类型为 Event，以兼容 resize 和 mousedown
const handleClickOutside = (event: Event) => {
  if (!ui.contextMenu.show) return;

  // resize 事件通常直接关闭，或者其 target 是 Window 不是 Node
  // 所以我们需要判断 target 是否真的是一个 DOM 节点
  const target = event.target;

  if (menuRef.value && target instanceof Node && menuRef.value.contains(target)) {
    return;
  }

  ui.closeContextMenu();
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    // 优先关闭弹窗，再关闭菜单
    if (showDeleteModal.value) {
      showDeleteModal.value = false;
      return;
    }
    ui.closeContextMenu();
  }
};

onMounted(() => {
  window.addEventListener('resize', handleClickOutside);
  window.addEventListener('mousedown', handleClickOutside);
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleClickOutside);
  window.removeEventListener('mousedown', handleClickOutside);
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <div ref="menuRef" class="fixed z-[9999]" :style="{ pointerEvents: ui.contextMenu.show ? 'auto' : 'none' }">
    <ContextMenuPanel
        :show="ui.contextMenu.show"
        :styleObj="menuStyle"
        :menuType="ui.contextMenu.type"
        :groups="store.config.layout"
        :currentGroupId="ui.contextMenu.groupId"
        :currentGroupName="currentGroupName"
        @edit="() => { emit('edit'); ui.closeContextMenu(); }"
        @move="moveTo"
        @delete="openDeleteModal"
        @resize="handleResize"
        @addSite="handleAddSite"
        @addWidget="handleAddWidgetRequest"
    />
  </div>

  <WidgetMarketplaceModal
      :show="showWidgetModal"
      @close="showWidgetModal = false"
      @select="handleConfirmAddWidget"
  />

  <ConfirmDialog
      :show="showDeleteModal"
      :title="deleteTitle"
      :message="deleteMessage"
      confirmText="确认删除"
      cancelText="取消"
      :danger="true"
      @cancel="cancelDelete"
      @confirm="confirmDelete"
  >
    <template #icon>
      <PhTrash :size="32" weight="duotone"/>
    </template>
  </ConfirmDialog>
</template>