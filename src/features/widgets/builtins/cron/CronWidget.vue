<script setup lang="ts">
import {computed, ref, onMounted, onUnmounted, watch} from 'vue';
import type {SiteItem} from '../../../../core/config/types';
import {PhGear, PhGraph, PhTimer} from '@phosphor-icons/vue';
import CronModal from './CronModal.vue';
import parser from 'cron-parser';
import {useDebounceFn} from '@vueuse/core';

const props = defineProps<{ item: SiteItem; isEditMode: boolean }>();

import {useConfigStore} from '../../../../stores/useConfigStore';

const store = useConfigStore();

const saveDebounced = useDebounceFn(() => store.saveConfig?.(), 300);

// ✅ runtime/cron 兜底
if (!store.config.runtime) (store.config as any).runtime = {};
if (!store.config.runtime.cron) {
  store.config.runtime.cron = { expr: '* * * * * ?', theme: 'pure-white' };
} else {
  // 旧数据兼容：如果以前存的 cron 没有 theme，补上
  store.config.runtime.cron.theme ||= 'pure-white';
  store.config.runtime.cron.expr ||= '* * * * * ?';
}

// ===== Quartz -> cron-parser 可解析 =====
function normalizeQuartz(expr: string) {
  const parts = (expr || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';

  // Quartz: sec min hour dom mon dow [year]
  if (parts.length === 6 || parts.length === 7) {
    // '?' 处理：cron-parser 不认 '?'
    // 规则：Quartz 里 dom/dow 互斥，'?' 表示“不指定”
    // 这里把 '?' 换成 '*'，让 parser 能算“下一次”
    const dom = parts[3];
    const dow = parts[5];
    if (dom === '?' && dow !== '?') parts[3] = '*';
    if (dow === '?' && dom !== '?') parts[5] = '*';
    if (dom === '?' && dow === '?') {
      parts[3] = '*';
      parts[5] = '*';
    }

    // cron-parser 一般不处理 year → 去掉第7段
    if (parts.length === 7) parts.pop();

    return parts.join(' ');
  }

  // 5 段标准 cron：min hour dom mon dow
  // 如果用户写了 '?'，也替换掉
  return parts.map(p => (p === '?' ? '*' : p)).join(' ');
}

// ===== cron-parser 兼容封装 =====
function parseCron(expr: string, opts?: any) {
  const mod: any = parser as any;
  const fn =
      mod.parseExpression ||
      mod.parse ||
      mod.default?.parseExpression ||
      mod.default?.parse;

  if (!fn) throw new Error('cron-parser parse function not found');
  return fn(expr, opts);
}

const cronExpression = computed<string>({
  get: () => store.config.runtime.cron.expr ?? '* * * * * ?',
  set: (v) => {
    store.config.runtime.cron.expr = v ?? '';
    saveDebounced();
  },
});

const showModal = ref(false);
const nextRunTime = ref('');
const timeToNext = ref('');

// === 真实 Cron 计算 ===
const calculateNextRun = () => {
  try {
    const expr = normalizeQuartz(cronExpression.value);
    if (!expr) throw new Error('empty expr');

    const interval = parseCron(expr);
    const next = interval.next().toDate();
    const now = new Date();

    nextRunTime.value = next.toLocaleTimeString('zh-CN', {hour12: false});

    const diff = Math.max(0, next.getTime() - now.getTime());

    if (diff > 86400000) {
      const d = Math.floor(diff / 86400000);
      timeToNext.value = `> ${d} DAYS`;
    } else {
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      timeToNext.value = `${h.toString().padStart(2, '0')}:${m
          .toString()
          .padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
  } catch {
    nextRunTime.value = 'ERROR';
    timeToNext.value = '--:--:--';
  }
};

let timer: number | undefined;
onMounted(() => {
  calculateNextRun();
  timer = window.setInterval(calculateNextRun, 1000);
});
onUnmounted(() => {
  if (timer) clearInterval(timer);
});

// 监听表达式变化，立即重算
watch(cronExpression, calculateNextRun);

const openModal = () => {
  if (props.isEditMode) return;
  showModal.value = true;
};

// === 布局判断 ===
const layout = computed(() => {
  const w = props.item.w || 1;
  const h = props.item.h || 1;
  return {
    isMini: w === 1 && h === 1,
    isWide: w >= 2 && h === 1,
    isTall: w === 1 && h >= 2,
    isStandard: w === 2 && h === 2,
    isLarge: w >= 2 && h >= 3,
  };
});
</script>

<template>
  <div
      class="w-full h-full relative overflow-hidden bg-[#1a1205] border border-amber-500/30 group font-mono text-amber-500 transition-all hover:border-amber-500/60 hover:shadow-[0_0_15px_rgba(245,158,11,0.2)]"
      :class="{ 'cursor-pointer': !isEditMode, 'cursor-move': isEditMode }"
      @click="openModal"
  >
    <div class="absolute inset-0 z-0 pointer-events-none crt-scanlines opacity-20"></div>
    <div
        class="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,#000000_120%)]"></div>

    <div v-if="layout.isMini" class="relative z-10 w-full h-full flex flex-col items-center justify-center p-2">
      <div class="relative">
        <PhTimer size="24" weight="duotone" class="mb-1 text-amber-400 animate-pulse"/>
      </div>
      <div class="text-[10px] opacity-60">NEXT RUN</div>
      <div class="text-xs font-bold">{{ timeToNext }}</div>
    </div>

    <div v-else-if="layout.isWide" class="relative z-10 w-full h-full flex items-center justify-between px-4">
      <div class="flex flex-col gap-1 overflow-hidden">
        <span class="text-[10px] opacity-50 tracking-widest">CRON EXPRESSION</span>
        <span class="text-sm font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 truncate">
          {{ cronExpression }}
        </span>
      </div>
      <div class="text-right flex-shrink-0 ml-4">
        <div class="text-[10px] opacity-50">T-MINUS</div>
        <div class="text-lg font-bold tabular-nums">{{ timeToNext }}</div>
      </div>
    </div>

    <div v-else-if="layout.isStandard" class="relative z-10 w-full h-full flex flex-col p-4">
      <div class="flex justify-between items-start mb-2">
        <div class="flex items-center gap-2">
          <PhGear size="16" weight="fill" class="animate-spin-slow"/>
          <span class="text-xs font-bold tracking-widest">CHRONOS</span>
        </div>
        <span
            class="text-[10px] bg-amber-900/40 px-1.5 py-0.5 rounded text-amber-300 border border-amber-700">ACTIVE</span>
      </div>

      <div class="flex-1 flex flex-col justify-center items-center text-center">
        <div class="text-xl font-bold tracking-tight mb-2 text-amber-400 drop-shadow-md break-all">
          {{ cronExpression }}
        </div>
        <div class="text-[10px] opacity-60">System Scheduler</div>
      </div>

      <div class="mt-auto">
        <div class="flex justify-between text-[10px] opacity-50 mb-1">
          <span>NEXT EXECUTION</span>
          <span>{{ nextRunTime }}</span>
        </div>
        <div class="h-1.5 w-full bg-amber-900/30 rounded-full overflow-hidden">
          <div class="h-full bg-amber-500 animate-pulse origin-left w-full"></div>
        </div>
      </div>
    </div>

    <div v-else class="relative z-10 w-full h-full flex flex-col p-5">
      <div class="flex justify-between items-center mb-4 border-b border-amber-500/20 pb-2">
        <h3 class="font-bold flex items-center gap-2 text-amber-400">
          <PhGraph size="18" weight="duotone"/>
          TIMELINE MONITOR
        </h3>
        <div class="text-xs font-mono opacity-70">{{ cronExpression }}</div>
      </div>

      <div class="flex-1 flex flex-col justify-center items-center">
        <div class="text-4xl font-bold text-amber-200 tabular-nums tracking-widest">{{ timeToNext }}</div>
        <div class="text-xs opacity-50 mt-2 uppercase tracking-[0.2em]">Time Until Execution</div>
      </div>

      <div class="mt-auto flex justify-between items-end">
        <div class="text-xs">
          <div class="opacity-50">NEXT RUN AT</div>
          <div class="font-bold text-amber-300">{{ nextRunTime }}</div>
        </div>
        <div class="text-[10px] opacity-30">AUTO-SYNC ENABLED</div>
      </div>
    </div>

    <Teleport to="body">
      <CronModal :show="showModal" @close="showModal = false"/>
    </Teleport>
  </div>
</template>

<style scoped>
.crt-scanlines {
  background: linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0),
      rgba(255, 255, 255, 0) 50%,
      rgba(0, 0, 0, 0.2) 50%,
      rgba(0, 0, 0, 0.2)
  );
  background-size: 100% 4px;
}

.animate-spin-slow {
  animation: spin 10s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
