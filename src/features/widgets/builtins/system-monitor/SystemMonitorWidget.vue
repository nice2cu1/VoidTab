<script setup lang="ts">
import {computed, onMounted, ref} from 'vue';
import type {SiteItem} from '../../../../core/config/types.ts';
import {
  PhCpu,
  PhWifiHigh,
  PhBatteryCharging,
  PhBatteryFull,
  PhBatteryWarning,
  PhDesktop,
  PhActivity
} from '@phosphor-icons/vue';
import SystemMonitorDetailModal from './SystemMonitorDetailModal.vue';
import {useSystemStats} from './useSystemStats';

const props = defineProps<{ item: SiteItem }>();
const showModal = ref(false);

// 1. 系统统计 hook
const {stats} = useSystemStats({pingUrl: '/ping'});

// 2. 电池 API (原生 Web API 实现，无需额外依赖)
const battery = ref({level: 1, charging: false, supported: false});
let batteryManager: any = null;

const updateBattery = () => {
  if (batteryManager) {
    battery.value = {
      level: batteryManager.level,
      charging: batteryManager.charging,
      supported: true
    };
  }
};

onMounted(async () => {
  if ('getBattery' in navigator) {
    try {
      batteryManager = await (navigator as any).getBattery();
      updateBattery();
      batteryManager.addEventListener('levelchange', updateBattery);
      batteryManager.addEventListener('chargingchange', updateBattery);
    } catch (e) {
      console.log('Battery API not supported');
    }
  }
});

// 3. 布局判定逻辑
const layout = computed(() => {
  const w = props.item?.w ?? 2;
  const h = props.item?.h ?? 2;
  return {
    isMini: w === 1 && h === 1,          // 1x1
    isSlim: w === 1 && h >= 2,           // 1x2, 1x3...
    isWide: w >= 2 && h === 1,           // 2x1, 3x1...
    isStandard: w === 2 && h === 2,      // 2x2
    isLarge: w >= 2 && h > 2             // 2x4 (大屏模式)
  };
});

// 4. 数据格式化
const pingVal = computed(() => stats.value?.latencyMs ?? stats.value?.net.rttMs ?? 0);
const pingColor = computed(() => {
  if (pingVal.value < 100) return 'text-green-400';
  if (pingVal.value < 300) return 'text-yellow-400';
  return 'text-red-400';
});

const memPercent = computed(() => {
  // 优先取系统内存，降级取 JS 堆内存
  const sys = stats.value?.memory.usedPercent;
  if (typeof sys === 'number') return sys;

  const used = stats.value?.memory.jsHeapUsedMB;
  const limit = stats.value?.memory.jsHeapLimitMB;
  if (used && limit) return Math.min(100, Math.round((used / limit) * 100));
  return 0;
});

const batteryIcon = computed(() => {
  if (battery.value.charging) return PhBatteryCharging;
  if (battery.value.level < 0.2) return PhBatteryWarning;
  return PhBatteryFull;
});
</script>

<template>
  <div
      class="w-full h-full bg-[#121212] rounded-[22px] text-white cursor-pointer transition-transform active:scale-95 border border-white/5 relative overflow-hidden group"
      @click.stop="showModal = true"
  >
    <div
        class="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all"></div>

    <div v-if="layout.isMini" class="w-full h-full flex flex-col items-center justify-center gap-1">
      <PhActivity size="24" :class="pingColor" weight="duotone"/>
      <div class="text-xs font-bold tabular-nums">{{ pingVal }}ms</div>
      <div class="absolute bottom-3 w-8 h-1 bg-white/10 rounded-full overflow-hidden">
        <div class="h-full bg-blue-500" :style="{ width: memPercent + '%' }"></div>
      </div>
    </div>

    <div v-else-if="layout.isSlim" class="w-full h-full flex flex-col justify-between p-3.5">
      <div class="flex flex-col items-center gap-1">
        <PhWifiHigh size="20" :class="pingColor"/>
        <span class="text-xs font-mono opacity-80">{{ pingVal }}</span>
      </div>

      <div class="flex-1 w-full flex items-center justify-center py-2">
        <div class="w-2 h-full bg-white/10 rounded-full relative overflow-hidden flex flex-col justify-end">
          <div class="w-full bg-blue-500 transition-all duration-700" :style="{ height: memPercent + '%' }"></div>
        </div>
      </div>

      <div class="flex flex-col items-center gap-1 text-white/50">
        <component :is="batteryIcon" size="18"/>
        <span class="text-[10px]">{{ Math.round(battery.level * 100) }}%</span>
      </div>
    </div>

    <div v-else-if="layout.isWide" class="w-full h-full flex items-center justify-between px-4 py-2">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
          <PhWifiHigh size="20" :class="pingColor"/>
        </div>
        <div>
          <div class="text-[10px] text-white/40 uppercase font-bold">Latency</div>
          <div class="text-sm font-mono font-bold">{{ pingVal }} ms</div>
        </div>
      </div>

      <div class="h-8 w-[1px] bg-white/10 mx-2"></div>

      <div class="flex-1 max-w-[100px]">
        <div class="flex justify-between text-[10px] mb-1 opacity-60">
          <span>MEM</span>
          <span>{{ memPercent }}%</span>
        </div>
        <div class="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <div class="h-full bg-purple-500" :style="{ width: memPercent + '%' }"></div>
        </div>
      </div>
    </div>

    <div v-else class="w-full h-full p-4 flex flex-col">
      <div class="flex justify-between items-start mb-3">
        <div class="flex items-center gap-2">
          <div class="p-1.5 bg-green-500/20 rounded-lg text-green-400">
            <PhActivity size="18" weight="bold"/>
          </div>
          <span class="text-xs font-bold tracking-wider text-white/80">SYSTEM</span>
        </div>
        <div class="text-xs font-mono opacity-50">{{ pingVal }} ms</div>
      </div>

      <div class="flex-1 flex flex-col gap-3">
        <div>
          <div class="flex justify-between text-[10px] text-white/40 font-bold uppercase mb-1.5">
            <div class="flex items-center gap-1">
              <PhCpu size="12"/>
              Memory Load
            </div>
            <span>{{ memPercent }}%</span>
          </div>
          <div class="h-2 w-full bg-white/5 rounded-full overflow-hidden">
            <div class="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-700"
                 :style="{ width: memPercent + '%' }"></div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 mt-auto">
          <div class="bg-white/5 rounded-lg p-2 flex flex-col gap-1">
            <component :is="batteryIcon" size="16" class="text-yellow-400"/>
            <span class="text-[10px] text-white/60">电力 {{ Math.round(battery.level * 100) }}%</span>
          </div>
          <div class="bg-white/5 rounded-lg p-2 flex flex-col gap-1">
            <PhDesktop size="16" class="text-blue-300"/>
            <span class="text-[10px] text-white/60 truncate">{{
                stats?.browser.ua.includes('Win') ? 'Windows' : 'System'
              }}</span>
          </div>
        </div>

        <div v-if="layout.isLarge" class="mt-2 pt-2 border-t border-white/10 space-y-2">
          <div class="text-[10px] text-white/30">NETWORK INFO</div>
          <div class="text-xs flex justify-between">
            <span class="opacity-60">Downlink</span>
            <span class="font-mono">{{ stats?.net.downlinkMbps ?? '-' }} Mbps</span>
          </div>
          <div class="text-xs flex justify-between">
            <span class="opacity-60">Type</span>
            <span>{{ stats?.net.effectiveType ?? '4g' }}</span>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <SystemMonitorDetailModal :show="showModal" :stats="stats" @close="showModal = false"/>
    </Teleport>
  </div>
</template>