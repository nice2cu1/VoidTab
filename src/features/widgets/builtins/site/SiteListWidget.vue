<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import type {SiteItem} from '../../../../core/config/types.ts';
import {useConfigStore} from '../../../../stores/useConfigStore';
import {idbGetBlob} from '../../../../core/storage/photoIdb';
import SiteListModal from './SiteListModal.vue';
import {PhStack, PhGear} from '@phosphor-icons/vue';

const props = defineProps<{ item: SiteItem; isEditMode: boolean }>();
const store = useConfigStore();
const showModal = ref(false);

const widgetId = computed(() => String(props.item.id));

// 布局判断
const layout = computed(() => {
  const w = props.item?.w ?? 2;
  const h = props.item?.h ?? 2;
  return {
    isMini: w === 1 && h === 1,
    isSlim: w === 1 && h >= 2,
    isWide: w >= 2 && h === 1,
    isStandard: w === 2 && h === 2,
    isLarge: w >= 2 && h > 2
  };
});

// 数据获取
const runtime = store.config.runtime;
if (!runtime.siteList) runtime.siteList = {groups: {}, widgets: {}};
if (!runtime.siteList.widgets[widgetId.value]) {
  const firstGrp = Object.keys(runtime.siteList.groups)[0];
  runtime.siteList.widgets[widgetId.value] = {groupId: firstGrp || '', defaultSiteId: undefined};
}

const widgetRef = computed(() => runtime.siteList.widgets[widgetId.value]);
const activeGroup = computed(() => runtime.siteList.groups[widgetRef.value.groupId]);

const defaultSite = computed(() => {
  const sid = widgetRef.value.defaultSiteId;
  if (!sid || !activeGroup.value) return null;
  return activeGroup.value.items.find(i => i.id === sid) || null;
});

// 颜色映射 (解决背景太黑的问题)
const themeStyle = computed(() => {
  const color = activeGroup.value?.color || 'slate';

  const map: Record<string, string> = {
    slate: 'bg-[#1e293b] text-white',           // 深空灰 (你的旧默认)
    blue: 'bg-[#2563eb] text-white',           // 科技蓝
    purple: 'bg-[#7c3aed] text-white',           // 罗兰紫
    orange: 'bg-[#ea580c] text-white',           // 活力橙
    green: 'bg-[#059669] text-white',           // 清新绿
    white: 'bg-[#f3f4f6] text-gray-800 border-gray-200', // 极简白 (浅色模式)
  };

  return map[color] || map.slate;
});

// 图标容器背景色 (浅色模式下要深一点，深色模式下要浅一点)
const iconBoxClass = computed(() => {
  const color = activeGroup.value?.color || 'slate';
  if (color === 'white') return 'bg-white shadow-sm border border-black/5 text-black';
  return 'bg-black/20 border border-white/5 text-white';
});

// 处理图标加载
const iconUrl = ref('');
watch(() => defaultSite.value, async (site) => {
  if (site?.iconType === 'upload' && site.iconValue) {
    const blob = await idbGetBlob(site.iconValue);
    if (blob) iconUrl.value = URL.createObjectURL(blob);
  } else {
    iconUrl.value = '';
  }
}, {immediate: true, deep: true});

// 交互逻辑
const handleClick = (e: MouseEvent) => {
  // 1. 如果是编辑模式，或者按住 Shift，打开设置
  if (props.isEditMode || e.shiftKey) {
    showModal.value = true;
    return;
  }
  // 2. 如果是快捷方式，跳转
  if (defaultSite.value) {
    window.open(defaultSite.value.url, '_blank');
  } else {
    // 3. 否则打开弹窗 (文件夹模式)
    showModal.value = true;
  }
};

const previewList = computed(() => activeGroup.value?.items.slice(0, 6) || []);
const itemCount = computed(() => activeGroup.value?.items.length || 0);
</script>

<template>
  <div class="w-full h-full relative group rounded-[18px] overflow-hidden" @click.stop="handleClick">

    <div v-if="defaultSite"
         class="w-full h-full transition-all hover:scale-[1.02] active:scale-95 cursor-pointer relative"
         :class="[
           themeStyle,
           layout.isMini ? 'flex flex-col items-center justify-center p-1' : '',
           layout.isSlim ? 'flex flex-col items-center justify-start p-4 gap-3' : '',
           layout.isWide ? 'flex items-center justify-start p-4 gap-4' : '',
           layout.isStandard ? 'flex flex-col items-center justify-center p-4 gap-2' : '',
           layout.isLarge ? 'flex flex-col items-center justify-center p-6 gap-4' : ''
         ]">

      <div class="relative flex items-center justify-center overflow-hidden rounded-2xl shadow-lg"
           :class="[
             iconBoxClass,
             layout.isMini ? 'w-10 h-10 mb-1' : '',
             layout.isSlim || layout.isWide ? 'w-12 h-12 shrink-0' : '',
             layout.isStandard ? 'w-16 h-16' : '',
             layout.isLarge ? 'w-20 h-20' : ''
           ]">
        <img v-if="defaultSite.iconType === 'upload' && iconUrl" :src="iconUrl" class="w-full h-full object-cover"/>
        <img v-else-if="defaultSite.iconType === 'image'" :src="defaultSite.iconValue"
             class="w-full h-full object-cover"/>
        <span v-else :class="[layout.isStandard || layout.isLarge ? 'text-3xl' : 'text-xl']"
              class="font-bold uppercase">{{ defaultSite.iconValue }}</span>

        <div v-if="defaultSite.enableFx"
             class="absolute top-1 right-1 w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></div>
      </div>

      <div class="text-center min-w-0 flex-1" :class="{ 'text-left': layout.isWide }">
        <div class="font-bold opacity-90 truncate leading-tight"
             :class="[layout.isMini ? 'text-[10px]' : 'text-sm', layout.isLarge ? 'text-base' : '']">
          {{ defaultSite.title }}
        </div>
        <div v-if="!layout.isMini && defaultSite.desc" class="text-xs opacity-50 truncate mt-0.5">
          {{ defaultSite.desc }}
        </div>
      </div>

      <button @click.stop="showModal = true"
              class="absolute top-2 right-2 p-1.5 rounded-lg transition opacity-0 group-hover:opacity-100 z-20"
              :class="activeGroup?.color === 'white' ? 'bg-black/10 hover:bg-black/20 text-black' : 'bg-black/30 hover:bg-white/20 text-white'">
        <PhGear size="14" weight="bold"/>
      </button>
    </div>


    <div v-else
         class="w-full h-full cursor-pointer group transition border border-white/5 relative"
         :class="[
            themeStyle,
            layout.isLarge ? 'p-4' : 'flex flex-col items-center justify-center'
         ]">

      <div
          class="absolute -top-4 -right-4 w-16 h-16 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition pointer-events-none"
          :class="activeGroup?.color === 'white' ? 'bg-black/5' : 'bg-white/10'"></div>

      <template v-if="!layout.isLarge">
        <div class="mb-2 p-1.5 rounded-lg grid gap-1.5"
             :class="[
               activeGroup?.color === 'white' ? 'bg-black/5' : 'bg-black/20',
               layout.isMini ? 'grid-cols-2' : '',
               layout.isSlim ? 'grid-cols-2' : '',
               layout.isWide ? 'grid-cols-4' : '',
               layout.isStandard ? 'grid-cols-3' : ''
             ]">
          <div v-for="i in (layout.isMini ? 4 : layout.isSlim ? 6 : layout.isWide ? 8 : 9)" :key="i"
               class="rounded-full transition-colors duration-300"
               :class="[
                 layout.isStandard ? 'w-2 h-2' : 'w-1.5 h-1.5',
                 activeGroup?.items[i-1] ? (activeGroup?.color==='white'?'bg-blue-500':'bg-white/80') : (activeGroup?.color==='white'?'bg-black/10':'bg-white/10')
               ]"></div>
        </div>

        <div class="text-xs font-bold opacity-80 truncate max-w-[80%]">
          {{ activeGroup?.name || '空清单' }}
        </div>
        <div class="text-[10px] opacity-50 mt-0.5">
          {{ itemCount ? `${itemCount} 个站点` : '点击添加' }}
        </div>
      </template>

      <template v-else>
        <div class="flex items-center justify-between mb-3 pb-2 border-b"
             :class="activeGroup?.color === 'white' ? 'border-black/5' : 'border-white/10'">
          <div class="flex items-center gap-2 opacity-80">
            <PhStack size="18" weight="duotone"/>
            <span class="font-bold text-sm truncate">{{ activeGroup?.name || '导航列表' }}</span>
          </div>
          <span class="text-xs opacity-50 px-2 py-0.5 rounded-full font-mono"
                :class="activeGroup?.color === 'white' ? 'bg-black/5' : 'bg-white/10'">{{ itemCount }}</span>
        </div>

        <div class="space-y-2 relative z-10">
          <div v-for="(item) in previewList" :key="item.id"
               class="flex items-center gap-2 text-xs opacity-60 group/item hover:opacity-100 transition">
            <div class="w-1.5 h-1.5 rounded-full transition"
                 :class="activeGroup?.color === 'white' ? 'bg-blue-500' : 'bg-white'"></div>
            <span class="truncate flex-1">{{ item.title }}</span>
          </div>

          <div v-if="itemCount > 6" class="text-[10px] opacity-50 pt-1 pl-3.5">
            + 还有 {{ itemCount - 6 }} 个...
          </div>

          <div v-if="itemCount === 0" class="text-xs opacity-50 py-8 text-center flex flex-col items-center gap-2">
            <PhStack size="24" class="opacity-20"/>
            点击添加站点
          </div>
        </div>
      </template>

      <button @click.stop="showModal = true"
              class="absolute top-2 right-2 p-1.5 rounded-lg transition opacity-0 group-hover:opacity-100 z-20"
              :class="activeGroup?.color === 'white' ? 'bg-black/10 hover:bg-black/20 text-black' : 'bg-black/30 hover:bg-white/20 text-white'">
        <PhGear size="14" weight="bold"/>
      </button>
    </div>

    <Teleport to="body">
      <SiteListModal :show="showModal" :widget-id="widgetId" @close="showModal = false"/>
    </Teleport>
  </div>
</template>