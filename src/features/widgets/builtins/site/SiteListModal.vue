<script setup lang="ts">
import {computed, ref, reactive, watch} from 'vue';
import {useConfigStore} from '../../../../stores/useConfigStore';
import {idbSetBlob} from '../../../../core/storage/photoIdb';
import type {SiteListEntry} from '../../../../core/config/types';
import {
  PhX, PhPlus, PhTrash, PhStar, PhPencilSimple,
  PhUploadSimple, PhLink, PhTextT, PhMagicWand, PhFolder, PhPalette
} from '@phosphor-icons/vue';

const props = defineProps<{ show: boolean; widgetId: string }>();
const emit = defineEmits(['close']);

const store = useConfigStore();
const runtime = store.config.runtime;

// 1. 数据初始化
if (!runtime.siteList) runtime.siteList = {groups: {}, widgets: {}};
if (!runtime.siteList.widgets[props.widgetId]) {
  const firstGroupId = Object.keys(runtime.siteList.groups)[0] || 'default_group';
  if (!runtime.siteList.groups[firstGroupId]) {
    runtime.siteList.groups[firstGroupId] = {id: firstGroupId, name: '默认清单', color: 'slate', items: []};
  }
  runtime.siteList.widgets[props.widgetId] = {groupId: firstGroupId, defaultSiteId: undefined};
}

const groups = computed(() => runtime.siteList.groups);
const widgetRef = computed(() => runtime.siteList.widgets[props.widgetId]);
const currentViewingGroupId = ref<string>(widgetRef.value.groupId);

// 监听 Widget 引用变化
watch(() => widgetRef.value.groupId, (val) => {
  if (val) currentViewingGroupId.value = val;
}, {immediate: true});

const activeGroup = computed(() => groups.value[currentViewingGroupId.value]);

// 2. 状态
const isEditing = ref(false);
const editingId = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const isRenamingGroup = ref(false);

const form = reactive<SiteListEntry>({
  id: '', title: '', desc: '', url: '',
  iconType: 'text', iconValue: '', enableFx: false, fxType: 'ripple'
});

// 3. 颜色主题定义
const themeColors = [
  {label: '深空灰', value: 'slate', bg: 'bg-slate-700'},
  {label: '科技蓝', value: 'blue', bg: 'bg-blue-600'},
  {label: '罗兰紫', value: 'purple', bg: 'bg-purple-600'},
  {label: '活力橙', value: 'orange', bg: 'bg-orange-500'},
  {label: '清新绿', value: 'green', bg: 'bg-emerald-500'},
  {label: '极简白', value: 'white', bg: 'bg-gray-100'}, // 浅色主题
];

// 4. 方法
function bindGroup(groupId: string) {
  currentViewingGroupId.value = groupId;
  widgetRef.value.groupId = groupId;
  const targetGroup = groups.value[groupId];
  const exists = targetGroup.items.find(i => i.id === widgetRef.value.defaultSiteId);
  if (!exists) widgetRef.value.defaultSiteId = undefined;
  store.saveConfig();
}

function createGroup() {
  const id = `group_${Date.now()}`;
  runtime.siteList.groups[id] = {id, name: '新建清单', color: 'slate', items: []};
  bindGroup(id);
}

function deleteGroup(groupId: string) {
  const ids = Object.keys(groups.value);
  if (ids.length <= 1) return alert('至少保留一个清单');
  delete runtime.siteList.groups[groupId];
  if (currentViewingGroupId.value === groupId) {
    const nextId = Object.keys(runtime.siteList.groups)[0];
    bindGroup(nextId);
  }
  store.saveConfig();
}

function updateGroupColor(color: string) {
  if (activeGroup.value) {
    activeGroup.value.color = color;
    store.saveConfig();
  }
}

// ... 站点 CRUD 逻辑保持不变 ...
function resetForm() {
  editingId.value = null;
  isEditing.value = false;
  Object.assign(form, {
    id: '',
    title: '',
    desc: '',
    url: '',
    iconType: 'text',
    iconValue: '',
    enableFx: false,
    fxType: 'ripple'
  });
}

function editItem(item: SiteListEntry) {
  editingId.value = item.id;
  isEditing.value = true;
  Object.assign(form, JSON.parse(JSON.stringify(item)));
}

async function handleFileUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const blobKey = `sl_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  await idbSetBlob(blobKey, file);
  form.iconType = 'upload';
  form.iconValue = blobKey;
}

function saveItem() {
  if (!form.title || !form.url) return;
  const newItem: SiteListEntry = {...form, id: editingId.value || `site_${Date.now()}`};
  if (newItem.iconType === 'text' && !newItem.iconValue) newItem.iconValue = newItem.title.substring(0, 2).toUpperCase();

  const list = [...activeGroup.value.items];
  if (editingId.value) {
    const idx = list.findIndex(i => i.id === editingId.value);
    if (idx > -1) list[idx] = newItem;
  } else {
    list.push(newItem);
  }
  activeGroup.value.items = list;
  store.saveConfig();
  resetForm();
}

function deleteItem(id: string) {
  activeGroup.value.items = activeGroup.value.items.filter(i => i.id !== id);
  if (widgetRef.value.defaultSiteId === id) widgetRef.value.defaultSiteId = undefined;
  store.saveConfig();
  resetForm();
}

function toggleDefault(siteId: string) {
  if (currentViewingGroupId.value !== widgetRef.value.groupId) bindGroup(currentViewingGroupId.value);
  widgetRef.value.defaultSiteId = (widgetRef.value.defaultSiteId === siteId) ? undefined : siteId;
  store.saveConfig();
}

const fxOptions = [
  {label: '水波纹', value: 'ripple'},
  {label: '震动', value: 'shake'},
  {label: '礼花', value: 'confetti'},
];
</script>

<template>
  <Transition name="fade">
    <div v-if="show" class="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" @click="emit('close')"></div>

      <div
          class="relative w-full max-w-5xl h-[80vh] bg-[#121212] border border-[#333] rounded-2xl flex overflow-hidden shadow-2xl">
        <button @click="emit('close')"
                class="absolute top-4 right-4 z-20 p-2 text-gray-500 hover:text-white bg-black/20 hover:bg-white/10 rounded-full transition">
          <PhX size="20"/>
        </button>

        <div class="w-60 bg-[#0a0a0a] border-r border-[#222] flex flex-col">
          <div class="p-4 border-b border-[#222] flex items-center justify-between">
            <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">数据清单</span>
            <button @click="createGroup" class="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded transition"
                    title="新建清单">
              <PhPlus size="16" weight="bold"/>
            </button>
          </div>

          <div class="flex-1 overflow-y-auto p-2 space-y-1">
            <div v-for="grp in groups" :key="grp.id"
                 class="group px-3 py-2.5 rounded-lg text-sm cursor-pointer flex items-center justify-between transition border"
                 :class="currentViewingGroupId === grp.id ? 'bg-[#1a1a1a] border-[#333] text-white' : 'border-transparent text-gray-500 hover:bg-[#111] hover:text-gray-300'"
                 @click="bindGroup(grp.id)"
            >
              <div class="flex items-center gap-2 overflow-hidden">
                <PhFolder size="16" :weight="currentViewingGroupId === grp.id ? 'fill' : 'regular'"
                          :class="{'text-blue-400': currentViewingGroupId === grp.id}"/>

                <input v-if="currentViewingGroupId === grp.id && isRenamingGroup"
                       v-model="grp.name"
                       class="bg-black/50 border border-gray-600 rounded px-1 w-24 text-xs outline-none"
                       @blur="isRenamingGroup = false; store.saveConfig()"
                       @keyup.enter="isRenamingGroup = false; store.saveConfig()"
                       autoFocus
                />
                <span v-else class="truncate">{{ grp.name }}</span>
              </div>

              <div v-if="currentViewingGroupId === grp.id" class="flex items-center gap-1 opacity-100">
                <button @click.stop="isRenamingGroup = true" class="p-1 hover:text-blue-400">
                  <PhPencilSimple/>
                </button>
                <button @click.stop="deleteGroup(grp.id)" class="p-1 hover:text-red-400">
                  <PhTrash/>
                </button>
              </div>
            </div>
          </div>

          <div class="p-4 border-t border-[#222]">
            <div class="flex items-center gap-2 mb-3 text-gray-500 text-xs font-bold uppercase">
              <PhPalette size="14"/>
              主题风格
            </div>
            <div class="grid grid-cols-6 gap-2">
              <button v-for="c in themeColors" :key="c.value"
                      @click="updateGroupColor(c.value)"
                      class="w-6 h-6 rounded-full border transition flex items-center justify-center"
                      :class="[c.bg, activeGroup?.color === c.value ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-100']"
                      :title="c.label">
              </button>
            </div>
          </div>
        </div>

        <div class="w-72 bg-[#121212] border-r border-[#222] flex flex-col">
          <div class="h-14 flex items-center justify-between px-4 border-b border-[#222]">
            <div class="text-sm font-bold text-gray-200 truncate">{{ activeGroup?.name }}</div>
            <button @click="resetForm(); isEditing=true"
                    class="flex items-center gap-1 px-2 py-1 bg-blue-600/10 text-blue-400 border border-blue-600/20 rounded text-xs hover:bg-blue-600 hover:text-white transition">
              <PhPlus size="14" weight="bold"/>
              添加
            </button>
          </div>
          <div class="flex-1 overflow-y-auto p-2 space-y-2">
            <div v-if="!activeGroup?.items?.length" class="text-center mt-10 text-gray-600 text-xs">暂无数据</div>
            <div v-for="item in activeGroup?.items" :key="item.id"
                 class="group p-3 rounded-xl border transition cursor-pointer flex items-center gap-3"
                 :class="editingId === item.id ? 'bg-[#1f1f1f] border-blue-500/30' : 'bg-[#181818] border-[#262626] hover:border-[#404040]'"
                 @click="editItem(item)"
            >
              <div
                  class="w-10 h-10 rounded-lg bg-[#222] flex items-center justify-center text-xs text-gray-400 overflow-hidden shrink-0 border border-[#333]">
                <span v-if="item.iconType === 'text'" class="font-bold text-gray-300">{{ item.iconValue }}</span>
                <img v-else-if="item.iconType === 'image'" :src="item.iconValue" class="w-full h-full object-cover"/>
                <span v-else>FILE</span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-gray-200 truncate">{{ item.title }}</div>
                <div class="text-[10px] text-gray-500 truncate">{{ item.url }}</div>
              </div>
              <button @click.stop="toggleDefault(item.id)" class="p-2 rounded-lg transition"
                      :class="widgetRef.defaultSiteId === item.id ? 'text-yellow-400 bg-yellow-400/10' : 'text-gray-700 hover:text-yellow-400 hover:bg-[#222]'">
                <PhStar size="16" :weight="widgetRef.defaultSiteId === item.id ? 'fill' : 'regular'"/>
              </button>
            </div>
          </div>
        </div>

        <div class="flex-1 bg-[#121212] flex flex-col relative">
          <div v-if="isEditing" class="flex flex-col h-full">
            <div class="h-14 flex items-center px-6 border-b border-[#222] text-sm font-bold text-gray-300">
              {{ editingId ? '编辑项目' : '新增项目' }}
            </div>
            <div class="flex-1 overflow-y-auto p-6 space-y-6">
              <div class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                  <div class="space-y-1.5">
                    <label class="text-[10px] text-gray-500 font-bold uppercase">名称</label>
                    <input v-model="form.title"
                           class="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-blue-500 outline-none transition"/>
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-[10px] text-gray-500 font-bold uppercase">简介</label>
                    <input v-model="form.desc"
                           class="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-blue-500 outline-none transition"/>
                  </div>
                </div>
                <div class="space-y-1.5">
                  <label class="text-[10px] text-gray-500 font-bold uppercase">跳转链接</label>
                  <input v-model="form.url"
                         class="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-blue-500 outline-none transition font-mono"
                         placeholder="https://..."/>
                </div>
              </div>
              <div class="w-full h-[1px] bg-[#222]"></div>
              <div class="space-y-3">
                <label class="text-[10px] text-gray-500 font-bold uppercase">图标样式</label>
                <div class="flex gap-2">
                  <button v-for="t in ['text', 'image', 'upload']" :key="t" @click="form.iconType = t as any"
                          class="px-4 py-2 rounded-lg text-xs border transition flex items-center gap-2 capitalize"
                          :class="form.iconType === t ? 'bg-gray-200 text-black border-gray-200 font-bold' : 'border-[#333] text-gray-400 hover:bg-[#1a1a1a]'">
                    <PhTextT v-if="t==='text'" size="14"/>
                    <PhLink v-if="t==='image'" size="14"/>
                    <PhUploadSimple v-if="t==='upload'" size="14"/>
                    {{ t }}
                  </button>
                </div>
                <div class="bg-[#161616] p-4 rounded-xl border border-[#222]">
                  <div v-if="form.iconType === 'text'" class="flex items-center gap-4">
                    <input v-model="form.iconValue" maxlength="2"
                           class="w-16 h-16 text-2xl text-center bg-[#222] border border-[#333] rounded-xl text-white outline-none focus:border-blue-500 uppercase"/>
                  </div>
                  <div v-else-if="form.iconType === 'image'" class="space-y-2">
                    <input v-model="form.iconValue"
                           class="w-full bg-[#222] border border-[#333] rounded-lg px-3 py-2 text-xs text-gray-300 outline-none"
                           placeholder="图片 URL..."/>
                    <div v-if="form.iconValue" class="w-12 h-12 rounded-lg border border-[#333] overflow-hidden"><img
                        :src="form.iconValue" class="w-full h-full object-cover"/></div>
                  </div>
                  <div v-else class="flex items-center gap-4">
                    <button @click="fileInput?.click()"
                            class="px-3 py-1.5 bg-[#222] border border-[#333] rounded text-xs text-gray-300 hover:bg-[#333]">
                      选择文件
                    </button>
                    <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleFileUpload"/>
                  </div>
                </div>
              </div>
              <div
                  class="bg-gradient-to-br from-purple-900/10 to-transparent p-4 rounded-xl border border-purple-500/10 space-y-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2 text-purple-400">
                    <PhMagicWand weight="duotone"/>
                    <span class="text-sm font-bold">交互特效</span></div>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" v-model="form.enableFx" class="sr-only peer">
                    <div
                        class="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
                <div v-if="form.enableFx" class="flex gap-2">
                  <button v-for="opt in fxOptions" :key="opt.value" @click="form.fxType = opt.value"
                          class="flex-1 py-1.5 text-xs rounded border transition"
                          :class="form.fxType === opt.value ? 'bg-purple-500 text-white border-purple-500' : 'border-[#333] text-gray-500 hover:bg-[#222]'">
                    {{ opt.label }}
                  </button>
                </div>
              </div>

            </div>
            <div class="p-4 border-t border-[#222] flex gap-3 bg-[#0a0a0a]">
              <button v-if="editingId" @click="deleteItem(editingId)"
                      class="px-4 py-2 bg-[#1a1a1a] border border-[#333] text-red-400 rounded-lg hover:bg-red-900/20 transition">
                删除
              </button>
              <div class="flex-1"></div>
              <button @click="resetForm" class="px-4 py-2 text-gray-500 hover:text-white text-sm">取消</button>
              <button @click="saveItem"
                      class="px-6 py-2 bg-gray-100 text-black font-bold rounded-lg hover:bg-white transition">保存
              </button>
            </div>
          </div>
          <div v-else class="flex-1 flex flex-col items-center justify-center text-gray-600 select-none">
            <div class="w-20 h-20 rounded-full bg-[#161616] flex items-center justify-center mb-4">
              <PhPencilSimple size="32" weight="duotone"/>
            </div>
            <p class="text-sm">选择项目进行编辑</p>
          </div>
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

::-webkit-scrollbar {
  width: 4px;
}

::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 2px;
}

::-webkit-scrollbar-track {
  background: transparent;
}
</style>