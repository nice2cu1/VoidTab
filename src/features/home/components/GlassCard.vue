<script setup lang="ts">
import {computed, ref, watch} from "vue";
import {useConfigStore} from "../../../stores/useConfigStore.ts";
import {useStateStore} from "../../../stores/useStateStore.ts";
import {useUiStore} from "../../../stores/ui/useUiStore.ts";
import type {SiteItem, BookmarkDensity} from "../../../core/config/types.ts";
import SiteIcon from "./SiteIcon.vue";

const store = useConfigStore();
const statsStore = useStateStore();
const ui = useUiStore();

const props = defineProps<{
  item: SiteItem;
  isEditMode?: boolean;
  density?: BookmarkDensity;
}>();

const hasLoadError = ref(false);
const isAuto = computed(() => props.item.iconType === "auto" || !props.item.iconType);
const autoIconUrl = computed(() => {
  if (!props.item.url) return '';
  try {
    const domain = new URL(props.item.url).hostname;
    return `https://unavatar.io/${domain}?fallback=https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  } catch (e) {
    return '';
  }
});

watch(() => props.item.url, () => {
  hasLoadError.value = false;
});

const displayText = computed(() => {
  // 如果是文字模式，或者自动获取失败
  if (props.item.iconType === "text" || (isAuto.value && hasLoadError.value)) {
    // 1. 优先使用用户手动输入的 iconValue
    if (props.item.iconValue && props.item.iconValue.length > 0) {
      return props.item.iconValue.substring(0, 4); // 限制4个字
    }

    // 2. 只有标题时，提取文字
    // 移除特殊字符，只保留中文、英文、数字
    const clean = (props.item.title || "").trim().replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, "");

    // 配合 SiteIcon 的自动缩小逻辑，4个字也能放得下
    return clean.substring(0, 4).toUpperCase() || (props.item.title || "A").substring(0, 2);
  }
  return "";
});

const dynamicFontSize = computed(() => {
  const baseSize = Number(store.config.theme.iconSize);
  const len = (displayText.value || "").length;
  if (len >= 4) return baseSize * 0.3;
  if (len === 3) return baseSize * 0.35;
  if (len === 2) return baseSize * 0.42;
  return baseSize * 0.5;
});

const labelH = computed(() => {
  if (!store.config.theme.showIconName) return 0;
  const textSize = Number(store.config.theme.iconTextSize || 12);
  return Math.max(18, Math.ceil(textSize * 1.35 + 6));
});

const handleFallback = () => {
  hasLoadError.value = true;
};
const handleImgLoad = () => {
  hasLoadError.value = false;
};

const handleClick = (e: MouseEvent) => {
  if (props.isEditMode || ui.dragState.isDragging) {
    e.preventDefault();
    e.stopPropagation();
    return;
  }
  statsStore.recordVisit(props.item.id);
};

// ✅ 计算图标容器的宽高（不包含下方文字）
const iconContainerStyle = computed(() => ({
  width: `${store.config.theme.iconSize}px`,
  height: `${store.config.theme.iconSize}px`
}));
</script>

<template>
  <a
      :href="item.url"
      target="_blank"
      @click="handleClick"
      class="group flex flex-col items-center justify-start transition-all duration-200"
      :class="[props.isEditMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer']"
      :style="{ width: '100%', height: '100%' }"
  >
    <div
        class="flex-shrink-0 relative transition-transform duration-200 group-hover:-translate-y-1"
        :style="iconContainerStyle"
    >
      <SiteIcon
          :item="item"
          :size="Number(store.config.theme.iconSize)"
          :radius="Number(store.config.theme.radius)"
          :isAuto="isAuto"
          :autoIconUrl="autoIconUrl"
          :hasError="hasLoadError"
          :text="displayText"
          :textFontSize="dynamicFontSize"
          :density="density"
          @loaded="handleImgLoad"
          @fallback="handleFallback"
      />
    </div>

    <div
        v-if="store.config.theme.showIconName"
        class="w-full flex items-center justify-center px-1 mt-1"
        :style="{ height: labelH + 'px' }"
    >
        <span
            class="w-full truncate text-center leading-tight"
            :style="{
            fontSize: store.config.theme.iconTextSize + 'px',
            color: 'var(--text-primary)',
            textShadow: '0 1px 2px rgba(0,0,0,0.45)'
          }"
        >
          {{ item.title }}
        </span>
    </div>
  </a>
</template>