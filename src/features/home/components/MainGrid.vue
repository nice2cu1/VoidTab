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
import {useGridLayout} from "../composables/useGridLayout.ts";
import {useVisibleGroups} from "../composables/useVisibleGroups.ts";

// Types
import type {GroupSortKey} from "../../../core/config/types.ts";

type LayoutItem = any; // 你项目里 site/widget 混合，这里用 any 最稳
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

const {gridStyle, itemContainerStyle} = useGridLayout(store.config.theme);

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

/** ✅ 移动端判定 */
const isMobile = ref(false);
let mq: MediaQueryList | null = null;

/** 移动端固定列数 */
const MOBILE_COLS = 4;

const gridHostEl = ref<HTMLElement | null>(null);
const gridCols = ref(12);
const gridCell = ref(96);
let ro: ResizeObserver | null = null;

function calcLabelReserve() {
  const showName = !!store.config.theme.showIconName;
  const textSize = Number(store.config.theme.iconTextSize || 12);
  if (!showName) return 0;
  return Math.max(18, Math.ceil(textSize * 1.35 + 6));
}

function recalcGrid() {
  const el = gridHostEl.value;
  if (!el) return;

  const gap = Number(store.config.theme.gap || 12);
  const width = el.clientWidth;
  if (width <= 0) return;

  if (isMobile.value) {
    gridCols.value = MOBILE_COLS;
    gridCell.value = Math.floor((width - gap * (MOBILE_COLS - 1)) / MOBILE_COLS);
    return;
  }

  const iconSize = Number(store.config.theme.iconSize || 72);
  const labelH = calcLabelReserve();
  const innerPad = 8;
  const minCell = Math.max(iconSize + 6, iconSize + labelH + innerPad);

  const DESKTOP_CHOICES = [12, 11, 10];
  for (const colsTry of DESKTOP_CHOICES) {
    const cellTry = Math.floor((width - gap * (colsTry - 1)) / colsTry);
    if (cellTry >= minCell) {
      gridCols.value = colsTry;
      gridCell.value = cellTry;
      return;
    }
  }

  const fit = Math.max(4, Math.floor((width + gap) / (minCell + gap)));
  const cell = Math.floor((width - gap * (fit - 1)) / fit);
  gridCols.value = fit;
  gridCell.value = cell;
}

const onMqChange = () => {
  isMobile.value = !!mq?.matches;
  recalcGrid();
};

onMounted(() => {
  mq = window.matchMedia("(max-width: 767px)");
  onMqChange();
  mq.addEventListener?.("change", onMqChange);

  recalcGrid();
  ro = new ResizeObserver(() => recalcGrid());
  if (gridHostEl.value) ro.observe(gridHostEl.value);
});

onBeforeUnmount(() => {
  mq?.removeEventListener?.("change", onMqChange);
  ro?.disconnect();
  ro = null;
});

/** ✅ 样式 */
const densityStyle = computed(() => {
  const mode = store.config.theme.density || "normal";
  const baseGap = Number(store.config.theme.gap || 12);

  const style: any = {
    ...gridStyle.value,
    gridAutoFlow: "dense",
    alignItems: "stretch",
    width: "100%",
    minWidth: 0,
    gridAutoRows: `${gridCell.value}px`,
    gridTemplateColumns: `repeat(${gridCols.value}, ${gridCell.value}px)`,
  };

  if (isMobile.value) style.gap = `${Math.max(10, Math.floor(baseGap * 0.8))}px`;
  else if (mode === "compact") style.gap = `${Math.max(8, Math.floor(baseGap * 0.6))}px`;
  else if (mode === "comfortable") style.gap = `${Math.floor(baseGap * 1.2)}px`;
  else style.gap = `${baseGap}px`;

  return style;
});

const densityItemClass = computed(() => `density-mode-${store.config.theme.density || "normal"}`);

const getItemStyle = (item: any) => {
  const isWidget = item.kind === "widget";

  if (!isWidget) {
    return {
      ...itemContainerStyle.value,
      minWidth: 0,
      minHeight: 0,
      gridColumn: `span 1`,
      gridRow: `span 1`,
    };
  }

  const w = Number(item.w || 1);
  const h = Number(item.h || 1);
  const spanW = isMobile.value ? Math.min(w, MOBILE_COLS) : Math.min(w, gridCols.value);
  const spanH = Math.max(1, h);

  return {
    ...itemContainerStyle.value,
    minWidth: 0,
    minHeight: 0,
    gridColumn: `span ${spanW}`,
    gridRow: `span ${spanH}`,
  };
};

/** ------------------------------
 * ✅ 排序逻辑：只影响“显示”，不破坏原数组
 * ------------------------------ */
const getSortKey = (group: LayoutGroup): GroupSortKey => (group.sortKey || "custom") as GroupSortKey;

const getDisplayItems = (group: LayoutGroup): LayoutItem[] => {
  const key = getSortKey(group);

  // ✅ custom 返回原引用（拖拽需要）
  if (key === "custom") return group.items;

  // 其他排序返回拷贝（只展示）
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

/** ✅ 显式 modelValue / update:modelValue（解决 TS 的 modelValue 缺失 & ref 当数组的问题） */
const modelValueOf = (group: LayoutGroup) => {
  return props.isEditMode ? group.items : getDisplayItems(group);
};

const updateModelValue = (group: LayoutGroup, val: LayoutItem[]) => {
  if (props.isEditMode) {
    group.items = val;
    store.saveConfig();
    return;
  }

  // 浏览模式：仅 custom 才允许写回
  if (getSortKey(group) === "custom") {
    group.items = val;
    store.saveConfig();
  }
};

/** 浏览模式：阻断跨组拖拽 */
const viewOnlyGroup = (gid: string) => ({
  name: `voidtab-view-only-${gid}`,
  pull: false,
  put: false,
});

/** 拖拽事件 */
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

/** 右键菜单 */
const handleBlankContextMenu = (e: MouseEvent, groupId: string) => {
  ui.openContextMenu(e, null, "blank", groupId);
};
const handleItemContextMenu = (e: MouseEvent, item: any, groupId: string) => {
  const type = item.kind === "widget" ? "widget" : "site";
  ui.openContextMenu(e, item, type, groupId);
};

/** 删除确认 */
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
        class="w-full transition-all duration-300 px-4 overflow-x-hidden"
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
        <div class="transition-all duration-300 mb-8 animate-fade-in">
          <div
              v-if="isEditMode"
              class="px-2 mb-3 text-[var(--accent-color)] font-bold tracking-wider text-sm flex items-center gap-2"
          >
            <div class="w-1 h-4 bg-[var(--accent-color)] rounded-full"></div>
            {{ group.title }}
          </div>

          <!-- ✅ 用 modelValue + update:modelValue（TS 彻底不炸） -->
          <VueDraggable
              :key="(isEditMode ? 'edit-' : 'view-') + group.id + '-' + (group.sortKey || 'custom')"
              :modelValue="modelValueOf(group)"
              @update:modelValue="(val:any) => updateModelValue(group, val)"
              :animation="200"
              :group="isEditMode ? 'voidtab-shared-group' : viewOnlyGroup(group.id)"
              filter=".ignore-drag"
              class="grid items-start content-start min-h-[120px]"
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
                class="site-tile"
                :class="[{ 'arrange-mode': isEditMode }, densityItemClass]"
            >
              <div class="site-wrap relative">
                <div class="content-clipper w-full h-full relative overflow-hidden rounded-[18px]">
                  <WidgetCard
                      v-if="item.kind === 'widget'"
                      :item="item"
                      :isEditMode="isEditMode"
                      @contextmenu.prevent.stop="(e:any) => handleItemContextMenu(e, item, group.id)"
                  />
                  <GlassCard
                      v-else
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

            <!-- Add -->
            <div :style="{ ...itemContainerStyle, minWidth: 0 }" class="site-tile ignore-drag"
                 :class="{ 'arrange-mode': isEditMode }">
              <div class="site-wrap">
                <AddCard
                    class="ignore-drag"
                    :size="Number(store.config.theme.iconSize)"
                    :radius="Number(store.config.theme.radius)"
                    :showName="!!store.config.theme.showIconName"
                    :textSize="Number(store.config.theme.iconTextSize)"
                    @click="openAddDialog(group.id)"
                />
              </div>
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
  min-width: 0;
  min-height: 0;
}

.site-tile:hover {
  transform: translateY(-1px);
}

.site-wrap {
  padding: 0;
  background: transparent;
  border: 1px solid transparent;
  box-shadow: none;
  height: 100%;
  width: 100%;
  min-width: 0;
  min-height: 0;
  overflow: visible;
}

.content-clipper {
  border-radius: 18px;
}

/* iOS 删除按钮样式 */
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
