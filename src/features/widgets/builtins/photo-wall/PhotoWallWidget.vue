<script setup lang="ts">
import {computed, ref, watch, onBeforeUnmount} from 'vue';
import type {SiteItem} from '../../../../core/config/types';
import {useConfigStore} from '../../../../stores/useConfigStore';
import PhotoWallModal from './PhotoWallModal.vue';
import {idbGetBlob} from '../../../../core/storage/photoIdb';
import {PhImageSquare} from '@phosphor-icons/vue';

const props = defineProps<{ item: SiteItem; isEditMode: boolean }>();
const store = useConfigStore();

const widgetId = computed(() => String(props.item.id));
const showModal = ref(false);

// ✅ runtime 兜底
if (!store.config.runtime) (store.config as any).runtime = {};
if (!store.config.runtime.photo) store.config.runtime.photo = {widgets: {}};
if (!store.config.runtime.photo.widgets) store.config.runtime.photo.widgets = {};
if (!store.config.runtime.photo.widgets[widgetId.value]) {
  store.config.runtime.photo.widgets[widgetId.value] = {items: [], defaultId: undefined};
}

const state = computed(() => store.config.runtime.photo.widgets[widgetId.value]);

const activeRef = computed(() => {
  const s = state.value;
  if (!s?.items?.length) return null;
  const def = s.defaultId ? s.items.find(i => i.id === s.defaultId) : null;
  return def ?? s.items[0] ?? null;
});

// 预览 src（url 或 objectURL）
const previewSrc = ref<string>('');
let objectUrlToRevoke: string | null = null;

async function loadPreview() {
  // revoke old
  if (objectUrlToRevoke) {
    URL.revokeObjectURL(objectUrlToRevoke);
    objectUrlToRevoke = null;
  }
  previewSrc.value = '';

  const r = activeRef.value;
  if (!r) return;

  if (r.source === 'url') {
    previewSrc.value = r.url;
    return;
  }

  // idb blob
  const blob = await idbGetBlob(r.blobKey);
  if (!blob) {
    previewSrc.value = '';
    return;
  }
  const url = URL.createObjectURL(blob);
  objectUrlToRevoke = url;
  previewSrc.value = url;
}

watch(activeRef, () => {
  loadPreview();
}, {immediate: true});

onBeforeUnmount(() => {
  if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
});

const openModal = () => {
  if (props.isEditMode) return;
  showModal.value = true;
};

// === 布局判断（和你其他组件一致） ===
 computed(() => {
  const w = props.item.w || 1;
  const h = props.item.h || 1;
  return {
    isMini: w === 1 && h === 1,
    isWide: w >= 2 && h === 1,
    isTall: w === 1 && h >= 2,
    isStandard: w === 2 && h === 2,
    isLarge: w >= 2 && h >= 3
  };
});
</script>

<template>
  <div
      class="w-full h-full relative overflow-hidden rounded-xl border border-white/10 bg-[#0b0f16] group transition-all"
      :class="{ 'cursor-pointer': !isEditMode, 'cursor-move': isEditMode }"
      @click="openModal"
  >
    <!-- 背景 -->
    <div class="absolute inset-0 opacity-30 pointer-events-none bg-gradient-to-br from-white/5 to-transparent"></div>

    <!-- 没有图片 -->
    <div v-if="!previewSrc" class="w-full h-full flex flex-col items-center justify-center text-white/50">
      <PhImageSquare size="30" weight="duotone" class="mb-2"/>
      <div class="text-[10px] tracking-widest">PHOTO WALL</div>
      <div class="text-[10px] opacity-60 mt-1">CLICK TO ADD</div>
    </div>

    <!-- 有图片：默认展示一张 -->
    <div v-else class="absolute inset-0">
      <img
          :src="previewSrc"
          class="w-full h-full object-cover"
          draggable="false"
      />
      <!-- 角标：张数 -->
      <div
          class="absolute right-2 top-2 text-[10px] px-2 py-1 rounded-full bg-black/50 text-white/80 border border-white/10"
      >
        {{ state.items.length }} 张
      </div>
      <!-- 底部渐变遮罩 -->
      <div class="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent"></div>
      <div class="absolute left-3 bottom-2 text-[10px] text-white/80 tracking-widest">
      </div>
    </div>

    <Teleport to="body">
      <PhotoWallModal :show="showModal" :widget-id="widgetId" @close="showModal = false"/>
    </Teleport>
  </div>
</template>
