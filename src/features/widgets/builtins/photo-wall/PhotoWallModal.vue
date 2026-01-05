<script setup lang="ts">
import {computed, ref, watch, onBeforeUnmount} from 'vue';
import {useDebounceFn} from '@vueuse/core';
import {useConfigStore} from '../../../../stores/useConfigStore';
import {idbSetBlob, idbGetBlob, idbDeleteBlob} from '../../../../core/storage/photoIdb';
import type {PhotoRef} from '../../../../core/config/types';
import {
  PhX, PhPlus, PhTrash, PhStar, PhLinkSimple, PhUploadSimple
} from '@phosphor-icons/vue';

const props = defineProps<{ show: boolean; widgetId: string }>();
const emit = defineEmits(['close']);

const store = useConfigStore();
const saveDebounced = useDebounceFn(() => store.saveConfig?.(), 300);

// ✅ runtime/photo 兜底
if (!store.config.runtime) (store.config as any).runtime = {};
if (!store.config.runtime.photo) store.config.runtime.photo = {widgets: {}};
if (!store.config.runtime.photo.widgets) store.config.runtime.photo.widgets = {};
if (!store.config.runtime.photo.widgets[props.widgetId]) {
  store.config.runtime.photo.widgets[props.widgetId] = {items: [], defaultId: undefined};
}

const state = computed(() => store.config.runtime.photo.widgets[props.widgetId]);

// ----------------------- 预览 URL 管理（避免内存泄漏） -----------------------
const objectUrlMap = new Map<string, string>(); // photoId -> objectURL

async function getPreviewSrc(r: PhotoRef): Promise<string> {
  if (r.source === 'url') return r.url;

  const existed = objectUrlMap.get(r.id);
  if (existed) return existed;

  const blob = await idbGetBlob(r.blobKey);
  if (!blob) return '';
  const url = URL.createObjectURL(blob);
  objectUrlMap.set(r.id, url);
  return url;
}

function revokeAllObjectUrls() {
  for (const url of objectUrlMap.values()) URL.revokeObjectURL(url);
  objectUrlMap.clear();
}

watch(() => props.show, (v) => {
  if (!v) revokeAllObjectUrls();
});

onBeforeUnmount(() => revokeAllObjectUrls());

// ----------------------- 添加 URL -----------------------
const urlInput = ref('');
const urlError = ref('');

function addUrl() {
  const url = urlInput.value.trim();
  if (!url) return;

  try {
    const u = new URL(url);
    if (!/^https?:/.test(u.protocol)) {
      urlError.value = '仅支持 http/https';
      return;
    }
  } catch {
    urlError.value = 'URL 格式不正确';
    return;
  }

  const id = `p_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const item: PhotoRef = {
    id,
    source: 'url',
    url,
    createdAt: Date.now(),
  };

  state.value.items.unshift(item);
  state.value.defaultId ||= item.id;

  urlInput.value = '';
  urlError.value = '';
  saveDebounced();
}

// ----------------------- 本地上传（多选 + 压缩） -----------------------
const fileInputRef = ref<HTMLInputElement | null>(null);
const uploading = ref(false);

async function compressImage(file: File, maxSide = 1920, quality = 0.85): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file;
  if (file.size < 200 * 1024) return file;

  const bitmap = await createImageBitmap(file);
  const w = bitmap.width;
  const h = bitmap.height;

  const scale = Math.min(1, maxSide / Math.max(w, h));
  const tw = Math.round(w * scale);
  const th = Math.round(h * scale);

  const canvas = document.createElement('canvas');
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;

  ctx.drawImage(bitmap, 0, 0, tw, th);

  const outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const blob: Blob = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b || file), outType, outType === 'image/jpeg' ? quality : undefined);
  });

  bitmap.close?.();
  return blob;
}

async function onPickFiles(e: Event) {
  const input = e.target as HTMLInputElement;
  const files = Array.from(input.files || []);
  if (!files.length) return;

  uploading.value = true;
  try {
    for (const f of files) {
      const id = `p_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const blobKey = `${props.widgetId}:${id}`;

      const blob = await compressImage(f);
      await idbSetBlob(blobKey, blob);

      const item: PhotoRef = {
        id,
        source: 'idb',
        blobKey,
        createdAt: Date.now(),
      };

      state.value.items.unshift(item);
      state.value.defaultId ||= item.id;
    }

    saveDebounced();
  } finally {
    uploading.value = false;
    input.value = '';
  }
}

function pickFiles() {
  fileInputRef.value?.click();
}

// ----------------------- 删除 / 设默认 -----------------------
async function removePhoto(r: PhotoRef) {
  if (r.source === 'idb') {
    await idbDeleteBlob(r.blobKey);
  }

  const obj = objectUrlMap.get(r.id);
  if (obj) {
    URL.revokeObjectURL(obj);
    objectUrlMap.delete(r.id);
  }

  state.value.items = state.value.items.filter((i) => i.id !== r.id);

  if (state.value.defaultId === r.id) {
    state.value.defaultId = state.value.items[0]?.id;
  }

  saveDebounced();
}

function setDefault(id: string) {
  state.value.defaultId = id;
  saveDebounced();
}

// ----------------------- 渲染用：异步拿 src（带并发保护） -----------------------
type Thumb = { id: string; src: string; ref: PhotoRef };
const thumbs = ref<Thumb[]>([]);
let buildToken = 0;

async function rebuildThumbs() {
  const token = ++buildToken;
  const list = state.value.items || [];

  const next: Thumb[] = [];
  for (const r of list) {
    const src = await getPreviewSrc(r);
    if (token !== buildToken) return; // show 变化/列表变化时丢弃旧构建
    next.push({id: r.id, src, ref: r});
  }

  thumbs.value = next;
}

// 用 items 的引用变化更可靠（而不是仅 length）
watch(
    () => [props.show, state.value.items, state.value.defaultId] as const,
    () => {
      if (props.show) rebuildThumbs();
    },
    {immediate: true, deep: true}
);
</script>

<template>
  <Transition name="modal-fade">
    <div v-if="show" class="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      <!-- ✅ 遮罩：你要不透明，面板就别透明；背景暗化交给遮罩 -->
      <div class="absolute inset-0 bg-black/75 backdrop-blur-sm" @click="emit('close')"></div>

      <!-- ✅ 面板：纯实色，不透 -->
      <div
          class="relative w-full max-w-5xl h-[85vh] rounded-xl overflow-hidden shadow-2xl"
          style="background-color:#0b0f16; border:1px solid rgba(255,255,255,0.08);"
      >
        <!-- Header：实色 -->
        <div
            class="h-14 px-4 flex items-center justify-between"
            style="background-color:#0f1624; border-bottom:1px solid rgba(255,255,255,0.08);"
        >
          <div class="text-sm font-bold tracking-widest" style="color: rgba(255,255,255,0.9);">
            PHOTO WALL / MANAGER
          </div>
          <button
              class="p-2 rounded"
              style="color: rgba(255,255,255,0.7);"
              @click="emit('close')"
          >
            <PhX size="18"/>
          </button>
        </div>

        <div class="h-[calc(100%-56px)] flex">
          <!-- Left：实色 -->
          <div
              class="w-[360px] p-4 flex flex-col gap-3"
              style="background-color:#0f1624; border-right:1px solid rgba(255,255,255,0.08);"
          >
            <div class="text-xs font-semibold" style="color: rgba(255,255,255,0.75);">添加图片</div>

            <!-- URL：实色卡片 -->
            <div class="rounded-lg p-3" style="background-color:#101b2e; border:1px solid rgba(255,255,255,0.08);">
              <div class="flex items-center gap-2 text-[11px] mb-2" style="color: rgba(255,255,255,0.6);">
                <PhLinkSimple/>
                URL 图片（建议直链）
              </div>

              <div class="flex gap-2">
                <input
                    v-model="urlInput"
                    type="text"
                    placeholder="https://example.com/a.jpg"
                    class="flex-1 px-3 py-2 rounded text-xs outline-none"
                    style="
                    background-color:#0b0f16;
                    border:1px solid rgba(255,255,255,0.10);
                    color: rgba(255,255,255,0.85);
                  "
                />
                <button
                    class="px-3 py-2 rounded text-xs flex items-center gap-1"
                    style="
                    background-color:#17243b;
                    border:1px solid rgba(255,255,255,0.10);
                    color: rgba(255,255,255,0.85);
                  "
                    @click="addUrl"
                >
                  <PhPlus/>
                  添加
                </button>
              </div>

              <div v-if="urlError" class="text-[11px] mt-2" style="color:#f87171;">
                {{ urlError }}
              </div>
            </div>

            <!-- Upload：实色卡片 -->
            <div class="rounded-lg p-3" style="background-color:#101b2e; border:1px solid rgba(255,255,255,0.08);">
              <div class="flex items-center gap-2 text-[11px] mb-2" style="color: rgba(255,255,255,0.6);">
                <PhUploadSimple/>
                本地上传（多选，自动压缩）
              </div>

              <button
                  class="w-full px-3 py-2 rounded text-xs flex items-center justify-center gap-2 disabled:opacity-60"
                  style="
                  background-color:#17243b;
                  border:1px solid rgba(255,255,255,0.10);
                  color: rgba(255,255,255,0.85);
                "
                  :disabled="uploading"
                  @click="pickFiles"
              >
                <span v-if="uploading">上传中...</span>
                <span v-else>选择图片</span>
              </button>

              <input
                  ref="fileInputRef"
                  type="file"
                  accept="image/*"
                  multiple
                  class="hidden"
                  @change="onPickFiles"
              />

              <div class="text-[11px] mt-2" style="color: rgba(255,255,255,0.45);">
                本地图片仅保存在本机 IndexedDB，不参与云同步。
              </div>
            </div>

            <div class="mt-auto text-[11px]" style="color: rgba(255,255,255,0.45);">
              当前：{{ state.items.length }} 张 / 默认：{{ state.defaultId || '无' }}
            </div>
          </div>

          <!-- Right：实色 -->
          <div class="flex-1 p-4 overflow-auto" style="background-color:#0b0f16;">
            <div v-if="!thumbs.length" class="h-full flex items-center justify-center text-sm"
                 style="color: rgba(255,255,255,0.45);">
              暂无图片，左侧添加 URL 或上传本地图片
            </div>

            <div v-else class="grid grid-cols-3 md:grid-cols-4 gap-3">
              <div
                  v-for="t in thumbs"
                  :key="t.id"
                  class="relative group rounded-lg overflow-hidden"
                  style="border:1px solid rgba(255,255,255,0.08); background-color:#0f1624;"
              >
                <img
                    v-if="t.src"
                    :src="t.src"
                    class="w-full h-28 object-cover"
                    draggable="false"
                />
                <div v-else class="w-full h-28 flex items-center justify-center text-xs"
                     style="color: rgba(255,255,255,0.35);">
                  LOAD FAIL
                </div>

                <!-- actions：也不透明（用实色遮罩，而不是 bg-black/35） -->
                <div
                    class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-end gap-2 p-2"
                    style="background-color: rgba(0,0,0,0.55);"
                >
                  <button
                      class="p-1.5 rounded"
                      style="background-color: rgba(15,22,36,0.95); color: rgba(255,255,255,0.85);"
                      @click.stop="setDefault(t.id)"
                      title="设为默认"
                  >
                    <PhStar size="16" :weight="state.defaultId === t.id ? 'fill' : 'regular'"/>
                  </button>
                  <button
                      class="p-1.5 rounded"
                      style="background-color: rgba(15,22,36,0.95); color: rgba(255,255,255,0.85);"
                      @click.stop="removePhoto(t.ref)"
                      title="删除"
                  >
                    <PhTrash size="16"/>
                  </button>
                </div>

                <div
                    v-if="state.defaultId === t.id"
                    class="absolute left-2 top-2 text-[10px] px-2 py-0.5 rounded-full"
                    style="background-color:#2563eb; color:#fff; border:1px solid rgba(255,255,255,0.10);"
                >
                  默认
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* 动画保持 */
.modal-fade-enter-active {
  animation: fade-in 0.18s ease-out;
}

.modal-fade-leave-active {
  animation: fade-out 0.12s ease-in;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: scale(0.98);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes fade-out {
  to {
    opacity: 0;
    transform: scale(0.98);
  }
}
</style>
