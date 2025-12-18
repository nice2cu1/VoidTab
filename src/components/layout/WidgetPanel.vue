<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { PhCaretDoubleDown, PhSquaresFour, PhCpu, PhCloudSun, PhGithubLogo } from '@phosphor-icons/vue';

const isOpen = ref(false);

const togglePanel = () => isOpen.value = !isOpen.value;

// 快捷键支持: Ctrl + / 呼出，Esc 关闭
const handleKeydown = (e: KeyboardEvent) => {
  if (e.ctrlKey && e.key === '/') {
    e.preventDefault();
    togglePanel();
  }
  if (e.key === 'Escape' && isOpen.value) {
    isOpen.value = false;
  }
};

onMounted(() => window.addEventListener('keydown', handleKeydown));
onUnmounted(() => window.removeEventListener('keydown', handleKeydown));
</script>

<template>
  <div class="fixed bottom-0 left-0 w-full z-[9000] flex flex-col items-center pointer-events-none">

    <div
        class="pointer-events-auto mb-3 cursor-pointer group transition-all duration-500 ease-out transform"
        @click="togglePanel"
        :class="isOpen ? 'translate-y-[150%] opacity-0' : 'translate-y-0 opacity-100'"
    >
      <div class="flex flex-col items-center gap-2">
        <span class="font-tech text-[9px] font-bold opacity-0 group-hover:opacity-60 transition-opacity tracking-[0.2em] text-[var(--text-primary)]">
          DATA HUD
        </span>
        <div class="w-12 h-1.5 rounded-full bg-[var(--text-primary)] opacity-30
                    group-hover:opacity-100 group-hover:w-24 group-hover:bg-[var(--accent-color)]
                    group-hover:shadow-[0_0_20px_var(--accent-color)]
                    transition-all duration-500 cubic-bezier(0.25, 1, 0.5, 1) backdrop-blur-md"></div>
      </div>
    </div>

    <div
        class="pointer-events-auto w-full max-w-[95%] md:max-w-6xl h-[60vh] apple-glass rounded-t-3xl border-b-0 shadow-[0_-20px_60px_rgba(0,0,0,0.3)]
             transform transition-transform duration-500 cubic-bezier(0.19, 1, 0.22, 1) flex flex-col overflow-hidden"
        :class="isOpen ? 'translate-y-0' : 'translate-y-[110%]'"
        style="background-color: var(--glass-surface);"
    >
      <div class="flex items-center justify-between px-6 py-4 border-b border-[var(--glass-border)] bg-[var(--sidebar-active)] select-none">
        <div class="flex items-center gap-3">
          <div class="p-1.5 rounded bg-[var(--accent-color)] text-white shadow-[0_0_10px_var(--accent-color)]">
            <PhSquaresFour size="16" weight="fill"/>
          </div>
          <span class="font-bold text-xs tracking-wider font-tech opacity-80" style="color: var(--text-primary)">
            SYSTEM DASHBOARD <span class="opacity-30 mx-2">//</span> ONLINE
          </span>
        </div>

        <button @click="isOpen = false" class="p-2 hover:bg-white/10 rounded-full transition-colors group">
          <PhCaretDoubleDown size="20" class="opacity-50 group-hover:opacity-100 group-hover:translate-y-1 transition-all" style="color: var(--accent-color)"/>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-6 md:p-8">

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">

          <div class="border border-dashed border-[var(--glass-border)] rounded-2xl flex flex-col items-center justify-center opacity-40 hover:opacity-80 transition-all min-h-[200px] group bg-[var(--sidebar-active)]">
            <PhGithubLogo size="48" class="mb-3 group-hover:scale-110 transition-transform"/>
            <span class="font-tech text-xs font-bold">MODULE: GITHUB_TRENDS</span>
            <span class="text-[10px] mt-1 opacity-50">Loading Data Stream...</span>
          </div>

          <div class="border border-dashed border-[var(--glass-border)] rounded-2xl flex flex-col items-center justify-center opacity-40 hover:opacity-80 transition-all min-h-[200px] group bg-[var(--sidebar-active)]">
            <PhCloudSun size="48" class="mb-3 group-hover:scale-110 transition-transform"/>
            <span class="font-tech text-xs font-bold">MODULE: WEATHER_STATION</span>
            <span class="text-[10px] mt-1 opacity-50">Connecting Satellite...</span>
          </div>

          <div class="border border-dashed border-[var(--glass-border)] rounded-2xl flex flex-col items-center justify-center opacity-40 hover:opacity-80 transition-all min-h-[200px] group bg-[var(--sidebar-active)]">
            <PhCpu size="48" class="mb-3 group-hover:scale-110 transition-transform animate-pulse"/>
            <span class="font-tech text-xs font-bold">MODULE: SYSTEM_STATS</span>
            <span class="text-[10px] mt-1 opacity-50">Analyzing...</span>
          </div>

        </div>

      </div>
    </div>

  </div>
</template>