<script setup lang="ts">
import {computed, defineAsyncComponent, onMounted, ref} from 'vue';
import {useTheme} from './composables/useTheme';
import {useConfigStore} from './stores/useConfigStore';
import {useUiStore} from './stores/useUiStore';
import {PhSpinner} from '@phosphor-icons/vue';

// 组件引入
import CustomCursor from './components/ui/CustomCursor.vue';
import SideBar from './components/layout/SideBar.vue';
import ContextMenu from './components/ui/context-menu/ContextMenu.vue';
import WallpaperLayer from './components/layout/WallpaperLayer.vue';
import TopActions from './components/layout/TopActions.vue';
import HomeMain from './components/layout/HomeMain.vue';
import MobileGroupNav from './components/layout/MobileGroupNav.vue';
import DeleteConfirmHost from './components/ui/DeleteConfirmHost.vue';

// 异步组件
const SettingsModal = defineAsyncComponent(() => import('./components/settings/SettingsModal.vue'));
const WidgetPanel = defineAsyncComponent(() => import('./components/layout/WidgetPanel.vue'));
const SiteDialog = defineAsyncComponent(() => import('./components/ui/dialogs/SiteDialog.vue'));
const GroupDialog = defineAsyncComponent(() => import('./components/ui/dialogs/GroupDialog.vue'));
const AiChatPanel = defineAsyncComponent(() => import('./components/layout/AiChatPanel.vue'));

// Hook 初始化
const store = useConfigStore();
const ui = useUiStore();
useTheme(); // 初始化主题监听

// 状态
const showAiPanel = ref(false);
const showSettings = ref(false);
const showWidgetModal = ref(false);
const activeGroupId = ref('');
const isGlobalEditMode = ref(false);

const isFocusMode = computed({
  get: () => store.config.focusMode,
  set: (val: boolean) => {
    store.config.focusMode = val;
    store.saveConfig();
  }
});

const showGreeting = computed(() => {
  const widget = store.config.widgets.find((w: any) => w.id === 'greeting');
  return widget ? widget.visible : true;
});

const toggleSidebarPos = () => {
  store.config.theme.sidebarPos = store.config.theme.sidebarPos === 'left' ? 'right' : 'left';
};

// Dialogs 逻辑 (如果你没有抽离 hook，这里保持原样即可，为了代码整洁我简化了展示)
import {useDialogs} from './composables/useDialogs';

const dialogLogic = useDialogs(store, ui);

onMounted(async () => {
  await store.loadConfig();
  if (store.config.layout.length > 0) activeGroupId.value = store.config.layout[0].id;
  // 强制一次主题类名同步，防止初始闪烁
  document.documentElement.classList.toggle('light', store.config.theme.mode === 'light');
  document.documentElement.classList.toggle('dark', store.config.theme.mode === 'dark');
});
</script>

<template>
  <div v-if="!store.isLoaded" class="fixed inset-0 flex items-center justify-center bg-[#121212] text-white z-[9999]">
    <div class="flex flex-col items-center gap-4">
      <PhSpinner size="40" class="animate-spin text-[var(--accent-color)]"/>
      <span class="font-mono tracking-widest text-xs opacity-70 animate-pulse">SYSTEM INITIALIZING...</span>
    </div>
  </div>

  <div
      v-else
      class="h-screen w-full relative overflow-hidden font-sans"
      :class="[
        { 'cursor-none': store.config.theme.customCursor }
      ]"
      @click="ui.closeContextMenu()"
      @contextmenu="ui.closeContextMenu()"
      style="color: var(--text-primary);"
  >
    <WallpaperLayer
        :wallpaper="store.config.theme.wallpaper"
        :blur="store.config.theme.blur"
        :opacity="store.config.theme.opacity"
    />

    <div
        class="relative z-10 w-full h-full flex flex-col transition-all duration-500"
        :class="store.config.theme.sidebarPos === 'right' ? 'flex-row-reverse' : 'flex-row'"
    >

      <div class="absolute top-0 left-0 right-0 z-50 pointer-events-none">
        <TopActions
            class="pointer-events-auto"
            :sidebarPos="store.config.theme.sidebarPos"
            :isFocusMode="isFocusMode"
            :isEditMode="isGlobalEditMode"
            @toggleSidebarPos="toggleSidebarPos"
            @toggleEdit="isGlobalEditMode = !isGlobalEditMode"
            @openWidgets="showWidgetModal = true"
            @toggleFocus="isFocusMode = !isFocusMode"
            @toggleAi="showAiPanel = true"
        />
      </div>

      <SideBar
          class="hidden md:flex z-40"
          :activeGroupId="activeGroupId"
          :isFocusMode="isFocusMode"
          @update:activeGroupId="id => (activeGroupId = id)"
          @openSettings="showSettings = true"
          @openGroupDialog="dialogLogic.openAddGroupDialog"
      />

      <HomeMain
          class="flex-1 z-30"
          :isFocusMode="isFocusMode"
          :activeGroupId="activeGroupId"
          :isEditMode="isGlobalEditMode"
          :showGreeting="showGreeting"
          :sidebarPos="store.config.theme.sidebarPos"
          @openSettings="showSettings = true"
      />
    </div>

    <div class="fixed inset-0 z-[60] pointer-events-none">
      <CustomCursor class="pointer-events-auto"/>
    </div>

    <MobileGroupNav
        class="z-[70]"
        :show="!isFocusMode"
        :groups="store.config.layout"
        :activeGroupId="activeGroupId"
        @update:activeGroupId="id => (activeGroupId = id)"
        @openSettings="showSettings = true"
    />

    <Transition name="slide-fade">
      <AiChatPanel
          v-if="showAiPanel"
          class="z-[80]"
          :isOpen="showAiPanel"
          @close="showAiPanel = false"
      />
    </Transition>

    <div class="relative z-[100]">
      <SettingsModal :show="showSettings" @close="showSettings = false"/>
      <WidgetPanel :isOpen="showWidgetModal" @close="showWidgetModal = false"/>

      <SiteDialog
          :show="dialogLogic.siteDialog.show"
          :isEdit="dialogLogic.siteDialog.isEdit"
          :initialData="dialogLogic.siteDialog.initialData"
          @close="dialogLogic.siteDialog.show = false"
          @submit="dialogLogic.onSiteSubmit"
      />

      <GroupDialog
          :show="dialogLogic.groupDialog.show"
          :isEdit="dialogLogic.groupDialog.isEdit"
          :initialData="dialogLogic.groupDialog.initialData"
          @close="dialogLogic.groupDialog.show = false"
          @submit="dialogLogic.onGroupSubmit"
      />

      <DeleteConfirmHost/>
    </div>

    <ContextMenu @edit="dialogLogic.handleContextMenuEdit" class="z-[999]"/>
  </div>
</template>

<style scoped>
/* 保持你的滚动条样式 */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>