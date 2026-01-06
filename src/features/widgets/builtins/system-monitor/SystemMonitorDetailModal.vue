<script setup lang="ts">
import {computed, onMounted, ref} from 'vue';
import {
  PhX,
  PhGlobe,
  PhCpu,
  PhWifiHigh,
  PhActivity,
  PhHardDrives,
  PhDesktop,
  PhBatteryFull,
  PhClock,
  PhMonitor,
  PhBrowsers
} from '@phosphor-icons/vue';
import type {SystemStats} from '../../../../core/system/systemStats';

const props = defineProps<{ show: boolean; stats: SystemStats | null }>();
const emit = defineEmits(['close']);

// ---------------- 数据处理 ----------------

// 网络
const pingText = computed(() => {
  const v = props.stats?.latencyMs ?? props.stats?.net.rttMs;
  return typeof v === 'number' ? `${v} ms` : '--';
});

const netType = computed(() => props.stats?.net.effectiveType?.toUpperCase() ?? 'WIFI');
const downlink = computed(() => props.stats?.net.downlinkMbps ? `${props.stats.net.downlinkMbps} Mbps` : '--');

// 内存
const memoryInfo = computed(() => {
  const m = props.stats?.memory;
  if (!m) return {text: '-- / --', percent: 0};

  // 系统级数据
  if (typeof m.totalMB === 'number' && typeof m.availableMB === 'number') {
    const used = m.totalMB - m.availableMB;
    const pct = m.usedPercent ?? Math.round((used / m.totalMB) * 100);
    return {
      text: `${(used / 1024).toFixed(1)}GB / ${(m.totalMB / 1024).toFixed(1)}GB`,
      percent: pct
    };
  }

  // 浏览器级数据
  if (typeof m.jsHeapUsedMB === 'number' && typeof m.jsHeapLimitMB === 'number') {
    const pct = Math.round((m.jsHeapUsedMB / m.jsHeapLimitMB) * 100);
    return {
      text: `${m.jsHeapUsedMB}MB / ${m.jsHeapLimitMB}MB`,
      percent: pct
    };
  }

  return {text: 'N/A', percent: 0};
});

// 浏览器/系统名称简化，防止文字过长
const browserName = computed(() => {
  const ua = props.stats?.browser.ua ?? '';
  if (ua.includes('Edg/')) return 'Edge Browser';
  if (ua.includes('Chrome/')) return 'Chrome';
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('Safari/')) return 'Safari';
  return 'Browser';
});

const osName = computed(() => {
  const ua = props.stats?.browser.ua ?? '';
  if (ua.includes('Win')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone')) return 'iOS';
  return 'System';
});

const screenInfo = computed(() => {
  if (typeof window === 'undefined') return 'N/A';
  // 简化显示，去除小数位
  return `${window.screen.width}×${window.screen.height}`;
});

const batteryLevel = ref('检测中...');
onMounted(async () => {
  if ('getBattery' in navigator) {
    try {
      const b = await (navigator as any).getBattery();
      batteryLevel.value = `${Math.round(b.level * 100)}%`;
    } catch {
      batteryLevel.value = 'N/A';
    }
  } else {
    batteryLevel.value = 'N/A';
  }
});

const uptime = computed(() => {
  const sec = Math.floor(performance.now() / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  // 紧凑显示
  if (h > 0) return `${h}h ${m}m`;
  return `${m} mins`;
});

</script>

<template>
  <Transition name="fade">
    <div v-if="show" class="fixed inset-0 z-[99999] flex items-center justify-center p-4">

      <div class="absolute inset-0 bg-[#000000]/80 backdrop-blur-md" @click="emit('close')"></div>

      <div
          class="relative w-full max-w-[850px] bg-[#0a0a0a] border border-[#333] rounded-[24px] shadow-2xl flex flex-col md:flex-row overflow-hidden">

        <button
            @click="emit('close')"
            class="absolute top-4 right-4 z-20 p-2 text-gray-500 hover:text-white transition-colors bg-black/20 hover:bg-white/10 rounded-full"
        >
          <PhX size="20"/>
        </button>

        <div
            class="w-full md:w-[240px] bg-[#111111] p-6 flex flex-col border-b md:border-b-0 md:border-r border-[#222]">

          <div class="flex flex-col items-center mt-4 mb-8">
            <div
                class="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(79,70,229,0.3)]">
              <PhActivity size="32" class="text-white"/>
            </div>
            <h2 class="text-lg font-bold text-gray-100">系统监控</h2>
            <p class="text-xs text-gray-500 mt-1">System Monitor</p>
          </div>

          <div class="space-y-3 mt-auto mb-4">
            <div class="bg-[#1a1a1a] border border-[#333] rounded-xl p-3 flex items-center gap-3">
              <div class="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                <PhDesktop size="18"/>
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-[10px] text-gray-500 uppercase font-bold">OS</div>
                <div class="text-sm font-medium text-gray-200 truncate">{{ osName }}</div>
              </div>
            </div>
            <div class="bg-[#1a1a1a] border border-[#333] rounded-xl p-3 flex items-center gap-3">
              <div class="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                <PhBrowsers size="18"/>
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-[10px] text-gray-500 uppercase font-bold">Browser</div>
                <div class="text-sm font-medium text-gray-200 truncate">{{ browserName }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex-1 bg-[#0a0a0a] p-6 md:p-8 overflow-y-auto max-h-[80vh]">

          <div class="flex items-center gap-2 mb-6">
            <div class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
            <span class="text-xs font-bold text-gray-500 uppercase tracking-widest">Real-time Dashboard</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div
                class="bg-[#141414] rounded-2xl p-5 border border-[#262626] hover:border-[#404040] transition-colors group">
              <div class="flex items-center gap-2 mb-5">
                <PhWifiHigh size="20" class="text-blue-500"/>
                <span class="text-sm font-bold text-gray-200">网络连接</span>
              </div>

              <div class="space-y-4">
                <div class="flex justify-between items-center">
                  <span class="text-xs text-gray-500">延迟 (RTT)</span>
                  <span class="text-sm font-mono font-bold text-green-400">{{ pingText }}</span>
                </div>
                <div class="w-full h-[1px] bg-[#222]"></div>
                <div class="flex justify-between items-center">
                  <span class="text-xs text-gray-500">下行速度</span>
                  <span class="text-sm font-mono text-gray-300">{{ downlink }}</span>
                </div>
                <div class="w-full h-[1px] bg-[#222]"></div>
                <div class="flex justify-between items-center">
                  <span class="text-xs text-gray-500">连接类型</span>
                  <span class="text-xs font-bold text-gray-400 bg-[#222] px-2 py-1 rounded">{{ netType }}</span>
                </div>
              </div>
            </div>

            <div class="bg-[#141414] rounded-2xl p-5 border border-[#262626] hover:border-[#404040] transition-colors">
              <div class="flex items-center gap-2 mb-5">
                <PhCpu size="20" class="text-purple-500"/>
                <span class="text-sm font-bold text-gray-200">资源占用</span>
              </div>

              <div class="space-y-4">
                <div class="flex justify-between items-center">
                  <span class="text-xs text-gray-500">逻辑核心</span>
                  <span class="text-sm font-mono text-gray-300">{{ props.stats?.cpu.logicalCores ?? '-' }} Cores</span>
                </div>

                <div>
                  <div class="flex justify-between text-xs mb-2">
                    <span class="text-gray-500">内存使用率</span>
                    <span class="text-gray-300 font-mono">{{ memoryInfo.percent }}%</span>
                  </div>
                  <div class="h-1.5 w-full bg-[#222] rounded-full overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-500"
                         :style="{width: memoryInfo.percent + '%'}"></div>
                  </div>
                  <div class="text-[10px] text-gray-600 mt-2 font-mono text-right truncate">
                    {{ memoryInfo.text }}
                  </div>
                </div>
              </div>
            </div>

            <div
                class="col-span-1 md:col-span-2 bg-[#141414] rounded-2xl p-5 border border-[#262626] hover:border-[#404040] transition-colors">
              <div class="flex items-center gap-2 mb-4">
                <PhHardDrives size="20" class="text-orange-500"/>
                <span class="text-sm font-bold text-gray-200">硬件与环境</span>
              </div>

              <div class="grid grid-cols-3 gap-4">
                <div class="bg-[#1a1a1a] rounded-xl p-3 border border-[#2a2a2a]">
                  <div class="flex items-center gap-2 text-gray-500 mb-1">
                    <PhMonitor size="14"/>
                    <span class="text-[10px] font-bold uppercase">屏幕</span>
                  </div>
                  <div class="text-sm font-mono text-gray-200 truncate" :title="screenInfo">{{ screenInfo }}</div>
                </div>

                <div class="bg-[#1a1a1a] rounded-xl p-3 border border-[#2a2a2a]">
                  <div class="flex items-center gap-2 text-gray-500 mb-1">
                    <PhBatteryFull size="14"/>
                    <span class="text-[10px] font-bold uppercase">电池</span>
                  </div>
                  <div class="text-sm font-mono text-gray-200 truncate">{{ batteryLevel }}</div>
                </div>

                <div class="bg-[#1a1a1a] rounded-xl p-3 border border-[#2a2a2a]">
                  <div class="flex items-center gap-2 text-gray-500 mb-1">
                    <PhClock size="14"/>
                    <span class="text-[10px] font-bold uppercase">会话</span>
                  </div>
                  <div class="text-sm font-mono text-gray-200 truncate">{{ uptime }}</div>
                </div>
              </div>
            </div>

            <div
                class="col-span-1 md:col-span-2 bg-[#111] rounded-xl p-4 border border-[#222] flex items-center justify-between gap-4 mt-2">
              <div class="flex items-center gap-3 overflow-hidden">
                <div class="p-2 bg-gray-800 rounded-full text-gray-400 shrink-0">
                  <PhGlobe size="18"/>
                </div>
                <div class="min-w-0">
                  <div class="text-[10px] text-gray-600 uppercase font-bold tracking-wider">Public IP</div>
                  <div class="text-sm font-mono text-gray-300 truncate">
                    {{ stats?.geo?.ip || '127.0.0.1' }}
                    <span class="text-gray-600 mx-1">/</span>
                    {{ stats?.geo?.city || 'Local' }}
                  </div>
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
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>