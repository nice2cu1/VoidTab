<script setup lang="ts">
import {inject, onBeforeUnmount, onMounted, ref, computed} from "vue";
import {VueDraggable} from "vue-draggable-plus";

// Stores
import {useConfigStore} from "../../../stores/useConfigStore.ts";
import {useUiStore} from "../../../stores/ui/useUiStore.ts";
import {useStateStore} from "../../../stores/useStateStore.ts";

// Components
import GlassCard from "./GlassCard.vue";
import WidgetCard from "../../widgets/components/WidgetCard.vue";
import AddCard from "./AddCard.vue";
import GroupHeaderBar from "../../widgets/components/widget-panel/GroupHeaderBar.vue";
import ConfirmDialog from "../../../shared/ui/dialogs/ConfirmDialog.vue";
import {PhTrash, PhX} from "@phosphor-icons/vue";

// Composables
import {useVisibleGroups} from "../composables/useVisibleGroups.ts";

// Types
import type {GroupSortKey} from "../../../core/config/types.ts";
import {getWidgetLabel} from "../../../core/registry/widgets.ts";

type LayoutItem = any;
type LayoutGroup = {
  id: string;
  title: string;
  items: LayoutItem[];
  sortKey?: GroupSortKey;
};

const props = defineProps<{
  activeGroupId: string;
  isEditMode: boolean;
}>();

const store = useConfigStore();
const ui = useUiStore();
const statsStore = useStateStore();

const dialog = inject("dialog") as { openAddDialog: (gid: string) => void } | undefined;
const openAddDialog = (gid: string) => dialog?.openAddDialog?.(gid);

const {visibleGroups} = useVisibleGroups({
  groups: store.config.layout || [],
  isEditMode: () => props.isEditMode,
  activeGroupId: () => props.activeGroupId,
  dragState: ui.dragState,
});

const activeGroupData = computed(() => {
  return (store.config.layout as any[]).find((g) => g.id === props.activeGroupId) as LayoutGroup | undefined;
});

const currentSortKey = computed<GroupSortKey>(() => (activeGroupData.value?.sortKey || "custom") as GroupSortKey);

/** ----------------------------------------------------------------
 * 核心修复区：严格网格系统 (Strict Grid System)
 * ---------------------------------------------------------------- */

const isMobile = ref(false);
let mq: MediaQueryList | null = null;
const MOBILE_COLS = 4; // 移动端固定4列

const gridHostEl = ref<HTMLElement | null>(null);
const gridCols = ref(8); // 动态计算的列数
let ro: ResizeObserver | null = null;

// 计算文字标签预留高度 (为了让 Grid Row Height 包含文字)
const widgetLabelH = computed(() => {
  // 如果图标名称和组件名称都关闭，则不预留高度，纯图标
  if (!store.config.theme.showWidgetName && !store.config.theme.showIconName) return 0;
  const textSize = Number(store.config.theme.iconTextSize || 12);
  return Math.max(18, Math.ceil(textSize * 1.35 + 6));
});

// 核心：计算单个网格单元的基础宽高
// 所有的图标都放在这个 1x1 的单元格里
const cellBaseSize = computed(() => {
  return Number(store.config.theme.iconSize || 72);
});

// 核心：计算行高 (Row Height)
// 行高 = 图标高度 + 文字高度 + 上下缓冲
const gridRowHeight = computed(() => {
  return cellBaseSize.value + widgetLabelH.value + 8;
});

const getWidgetTitle = (item: any) => {
  const raw = (item.title || '').trim();
  if (raw) return raw;
  return getWidgetLabel(item.widgetType);
};

// 核心：动态计算列数
function recalcGrid() {
  const el = gridHostEl.value;
  if (!el) return;

  const width = el.clientWidth;
  if (width <= 0) return;

  const gap = Number(store.config.theme.gap || 20);

  // 1. 移动端
  if (isMobile.value) {
    gridCols.value = MOBILE_COLS;
    return;
  }

  // 2. 桌面端：限制最大列数 (例如最多14列，防止在大宽屏上太散)
  const MAX_COLS_DESKTOP = 14;

  // 单元格最小宽度 = 图标大小 + 缓冲
  const minCellWidth = cellBaseSize.value + 10;

  // 计算当前宽度能放下多少列
  let cols = Math.floor((width + gap) / (minCellWidth + gap));

  // 限制范围：最少4列，最多 MAX_COLS_DESKTOP 列
  cols = Math.max(4, Math.min(cols, MAX_COLS_DESKTOP));

  gridCols.value = cols;
}

const onMqChange = () => {
  isMobile.value = !!mq?.matches;
  recalcGrid();
};

onMounted(() => {
  mq = window.matchMedia("(max-width: 767px)");
  onMqChange();
  mq.addEventListener?.("change", onMqChange);

  ro = new ResizeObserver(() => {
    requestAnimationFrame(() => recalcGrid());
  });
  if (gridHostEl.value) ro.observe(gridHostEl.value);
});

onBeforeUnmount(() => {
  mq?.removeEventListener?.("change", onMqChange);
  ro?.disconnect();
  ro = null;
});

/** 样式生成：网格容器样式 */
const densityStyle = computed(() => {
  const gap = Number(store.config.theme.gap || 20);

  return {
    display: 'grid',
    // 列宽：自动平分
    gridTemplateColumns: `repeat(${gridCols.value}, 1fr)`,
    // 行高：固定
    gridAutoRows: `${gridRowHeight.value}px`,
    gap: `${gap}px`,
    width: '100%',
    minWidth: 0,
    // 居中对齐所有单元格内容
    justifyItems: "center",
    alignItems: "start",
    gridAutoFlow: "dense",
    paddingBottom: "40px"
  };
});

const densityItemClass = computed(() => `density-mode-${store.config.theme.density || "normal"}`);

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const MAX_W = 4;
const MAX_H = 4;

// 核心：计算每个 Item (图标/组件) 跨越的列数和行数
const getItemStyle = (item: any) => {
  const isWidget = item.kind === "widget";

  // 普通图标：强制 1x1
  if (!isWidget) {
    return {
      gridColumn: `span 1`,
      gridRow: `span 1`,
      width: '100%',
      height: '100%',
      // 确保图标在格子里居中
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start'
    };
  }

  // 组件：根据配置跨越 w x h
  const wRaw = Number(item.w || 2);
  const hRaw = Number(item.h || 2);
  const w = clamp(wRaw, 1, MAX_W);
  const h = clamp(hRaw, 1, MAX_H);

  // 移动端特殊处理：如果组件宽度超过总列数，强制缩减
  const spanW = isMobile.value
      ? Math.min(w, MOBILE_COLS)
      : Math.min(w, gridCols.value);

  return {
    gridColumn: `span ${spanW}`,
    gridRow: `span ${h}`,
    width: '100%',
    height: '100%'
  };
};

const widgetNameMode = (item: any) => {
  if (!store.config.theme.showWidgetName) return 'none';
  if (item.kind !== 'widget') return 'none';
  const h = Math.max(1, Number(item.h || 1));
  if (h === 1) return 'overlay';
  return 'below';
};

/** ------------------------------
 * 排序与拖拽逻辑 (保持不变)
 * ------------------------------ */
const getSortKey = (group: LayoutGroup): GroupSortKey => (group.sortKey || "custom") as GroupSortKey;

const getDisplayItems = (group: LayoutGroup): LayoutItem[] => {
  const key = getSortKey(group);
  if (key === "custom") return group.items;
  const items = [...group.items];
  if (key === "name") {
    return items.sort((a, b) => (a.title || "").localeCompare(b.title || "", "zh-CN"));
  }
  if (key === "lastVisited") {
    return items.sort((a, b) => {
      const timeA = statsStore.getLastVisited(a.id);
      const timeB = statsStore.getLastVisited(b.id);
      if (timeB !== timeA) return timeB - timeA;
      return (a.title || "").localeCompare(b.title || "", "zh-CN");
    });
  }
  return items;
};

const canFreeReorder = (group: LayoutGroup) => !props.isEditMode && getSortKey(group) === "custom";

const modelValueOf = (group: LayoutGroup) => {
  return props.isEditMode ? group.items : getDisplayItems(group);
};

const updateModelValue = (group: LayoutGroup, val: LayoutItem[]) => {
  if (props.isEditMode) {
    group.items = val;
    store.saveConfig();
    return;
  }
  if (getSortKey(group) === "custom") {
    group.items = val;
    store.saveConfig();
  }
};

const viewOnlyGroup = (gid: string) => ({
  name: `voidtab-view-only-${gid}`,
  pull: false,
  put: false,
});

const onDragStart = (event: any, group: LayoutGroup) => {
  const arr = modelValueOf(group);
  const item = arr?.[event.oldIndex];
  if (item) ui.setDragState(true, group.id, item);
};
const onDragEnd = () => {
  requestAnimationFrame(() => {
    setTimeout(() => ui.setDragState(false), 200);
  });
};

const handleBlankContextMenu = (e: MouseEvent, groupId: string) => {
  ui.openContextMenu(e, null, "blank", groupId);
};
const handleItemContextMenu = (e: MouseEvent, item: any, groupId: string) => {
  const type = item.kind === "widget" ? "widget" : "site";
  ui.openContextMenu(e, item, type, groupId);
};

const deleteDialogOpen = ref(false);
const deleteTarget = ref<{ groupId: string; siteId: string } | null>(null);

const askDelete = (groupId: string, siteId: string) => {
  deleteTarget.value = {groupId, siteId};
  deleteDialogOpen.value = true;
};

const confirmDelete = () => {
  if (!deleteTarget.value) return;
  store.removeSite(deleteTarget.value.groupId, deleteTarget.value.siteId);
  deleteDialogOpen.value = false;
  deleteTarget.value = null;
};
</script>

<template>
  <div class="w-full flex flex-col items-center md:pb-20"
       :style="{ paddingBottom: `calc(env(safe-area-inset-bottom) + 96px)` }">
    <div
        class="w-full transition-all duration-300 px-2 md:px-8 overflow-x-hidden"
        :style="{ maxWidth: isMobile ? '100%' : store.config.theme.gridMaxWidth + 'px' }"
        ref="gridHostEl"
    >
      <GroupHeaderBar
          v-if="!isEditMode && activeGroupData"
          :group-name="activeGroupData.title"
          :count="activeGroupData.items?.length || 0"
          :sort-key="currentSortKey"
          @update:sortKey="(key) => store.updateGroupSort(activeGroupId, key)"
          :key="activeGroupId"
      />

      <template v-for="group in (visibleGroups as any)" :key="group.id">
        <div class="transition-all duration-300 mb-8 animate-fade-in w-full">
          <div
              v-if="isEditMode"
              class="px-2 mb-3 text-[var(--accent-color)] font-bold tracking-wider text-sm flex items-center gap-2"
          >
            <div class="w-1 h-4 bg-[var(--accent-color)] rounded-full"></div>
            {{ group.title }}
          </div>

          <VueDraggable
              :key="(isEditMode ? 'edit-' : 'view-') + group.id + '-' + (group.sortKey || 'custom')"
              :modelValue="modelValueOf(group)"
              @update:modelValue="(val:any) => updateModelValue(group, val)"
              :animation="200"
              :group="isEditMode ? 'voidtab-shared-group' : viewOnlyGroup(group.id)"
              filter=".ignore-drag"
              class="w-full min-h-[120px]"
              :class="[{ 'bg-white/5 rounded-xl border border-dashed border-white/10 p-4': isEditMode }]"
              ghost-class="sortable-ghost"
              @start="(e) => onDragStart(e, group)"
              @end="onDragEnd"
              :style="densityStyle"
              :disabled="!isEditMode && !canFreeReorder(group)"
              @contextmenu.prevent.self="handleBlankContextMenu($event, group.id)"
          >
            <div
                v-for="item in modelValueOf(group)"
                :key="item.id"
                :style="getItemStyle(item)"
                class="site-tile relative"
                :class="[{ 'arrange-mode': isEditMode }, densityItemClass]"
            >
              <div class="site-wrap relative w-full h-full min-w-0 min-h-0"
                   :class="isEditMode ? 'overflow-visible' : 'overflow-visible rounded-[18px]'"
              >
                <div v-if="item.kind === 'widget'" class="w-full h-full overflow-hidden rounded-[18px]">
                  <WidgetCard
                      :item="item"
                      :isEditMode="isEditMode"
                      @contextmenu.prevent.stop="(e:any) => handleItemContextMenu(e, item, group.id)"
                  />
                  <div
                      v-if="widgetNameMode(item) === 'overlay'"
                      class="absolute left-2 right-2 bottom-2 flex justify-center pointer-events-none z-10"
                  >
                    <div
                        class="px-2 py-1 rounded-lg bg-black/35 backdrop-blur text-white/90 text-[11px] leading-none max-w-full truncate">
                      {{ getWidgetTitle(item) }}
                    </div>
                  </div>
                </div>

                <div v-else class="w-full h-full flex flex-col items-center justify-start">
                  <GlassCard
                      :item="item"
                      :isEditMode="isEditMode"
                      :density="store.config.theme.density"
                      @contextmenu.prevent.stop="(e:any) => handleItemContextMenu(e, item, group.id)"
                  />
                </div>

                <button
                    v-if="isEditMode"
                    class="delete-btn-ios ignore-drag"
                    title="删除"
                    @click.stop="askDelete(group.id, item.id)"
                >
                  <PhX size="12" weight="bold"/>
                </button>
              </div>
            </div>

            <div
                :style="{ gridColumn: 'span 1', gridRow: 'span 1' }"
                class="site-tile ignore-drag flex flex-col items-center justify-start"
            >
              <AddCard
                  class="ignore-drag"
                  :size="Number(store.config.theme.iconSize)"
                  :radius="Number(store.config.theme.radius)"
                  :showName="!!store.config.theme.showIconName"
                  :textSize="Number(store.config.theme.iconTextSize)"
                  @click="openAddDialog(group.id)"
              />
            </div>
          </VueDraggable>
        </div>
      </template>
    </div>

    <ConfirmDialog
        :show="deleteDialogOpen"
        title="确认删除？"
        :message="['删除后无法恢复，', '确定要移除这个图标吗？']"
        confirmText="确认删除"
        cancelText="取消"
        :danger="true"
        @cancel="deleteDialogOpen = false"
        @confirm="confirmDelete"
    >
      <template #icon>
        <PhTrash :size="32" weight="duotone"/>
      </template>
    </ConfirmDialog>
  </div>
</template>

<style scoped>
.sortable-ghost {
  opacity: 0.4;
  background: var(--accent-color);
  border-radius: 16px;
  filter: grayscale(100%);
}

.animate-fade-in {
  animation: fadeIn 0.25s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.site-tile {
  transition: transform 120ms ease;
  will-change: transform;
  isolation: isolate;
  /* 确保内容不会溢出格子，除了编辑模式的删除按钮 */
}

.site-tile:hover {
  transform: translateY(-2px);
  z-index: 10;
}

.delete-btn-ios {
  position: absolute;
  top: -8px;
  right: -8px;
  z-index: 50;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: rgba(156, 163, 175, 0.9);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  transition: all 0.2s ease;
}

.delete-btn-ios:hover {
  background-color: #ef4444;
  transform: scale(1.1);
}
</style>