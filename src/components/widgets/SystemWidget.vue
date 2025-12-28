<script setup lang="ts">
import {ref, computed, onMounted} from 'vue';
import {useNetwork, useMemory, useFps} from '@vueuse/core';
import {
  PhGlobe,
  PhDesktop,
  PhBroadcast,
  PhActivity
} from '@phosphor-icons/vue';


// 2. 网络状态
const {downlink, rtt} = useNetwork();

// 3. 内存 (Tab Memory)
const {isSupported: memorySupported, memory} = useMemory();

// 4. FPS
const fps = useFps();

// 5. 硬件信息
const cores = navigator.hardwareConcurrency || 'N/A';
const platform = navigator.platform || 'Unknown';
const userAgent = navigator.userAgent;

const browserName = computed(() => {
  if (userAgent.includes("Edg")) return "Edge";
  if (userAgent.includes("Chrome")) return "Chrome";
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("Safari")) return "Safari";
  return "Browser";
});

// 6. IP 地址获取 (✅ 修复版：多源重试 + 超时控制)
const ipInfo = ref({ip: 'Detecting...', loc: ''});
const isLoadingIp = ref(true);

const fetchIpInfo = async () => {
  isLoadingIp.value = true;
  ipInfo.value = {ip: 'Detecting...', loc: ''};

  // 定义多个免费源，按优先级排序
  const sources = [
    {
      // 推荐：无需Key，支持CORS，国内访问较快
      url: 'https://ipwho.is/',
      handler: (d: any) => {
        if (!d.success) throw new Error(d.message);
        return {ip: d.ip, loc: `${d.city}, ${d.country_code}`};
      }
    },
    {
      // 备选：含地理位置
      url: 'https://api.db-ip.com/v2/free/self',
      handler: (d: any) => ({ip: d.ipAddress, loc: `${d.city}, ${d.countryCode}`})
    },
    {
      // 保底：仅IP，速度最快
      url: 'https://api.ipify.org?format=json',
      handler: (d: any) => ({ip: d.ip, loc: 'Location Unavailable'})
    }
  ];

  for (const source of sources) {
    try {
      // 每个源给 3 秒超时时间，避免长时间卡顿
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(source.url, {signal: controller.signal});
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // 格式化并赋值
      ipInfo.value = source.handler(data);
      isLoadingIp.value = false;
      return; // 成功获取，退出循环
    } catch (e) {
      console.warn(`[Network] IP Source failed: ${source.url}`, e);
      // 当前源失败，继续尝试下一个...
    }
  }

  // 所有源都失败
  ipInfo.value = {ip: 'Unavailable', loc: 'Network Error'};
  isLoadingIp.value = false;
};

onMounted(() => {
  fetchIpInfo();
});

// 格式化内存
const formatMem = (v: number) => (v / 1024 / 1024).toFixed(0);

// 计算内存占比
const memPercent = computed(() => {
  if (!memorySupported.value || !memory.value) return 0;
  const {jsHeapSizeLimit, usedJSHeapSize} = memory.value as any;
  if (!jsHeapSizeLimit) return 0;
  return (usedJSHeapSize / jsHeapSizeLimit) * 100;
});

// 网络质量颜色判断
const pingColor = computed(() => {
  if (!rtt.value) return 'text-gray-400';
  if (rtt.value < 100) return 'text-green-400';
  if (rtt.value < 200) return 'text-yellow-400';
  return 'text-red-400';
});
</script>

<template>
  <div
      class="h-full flex flex-col apple-glass rounded-2xl overflow-hidden bg-[var(--sidebar-active)] border border-[var(--glass-border)] text-[var(--text-primary)] font-tech">

    <div class="flex items-center gap-2 px-5 py-3 border-b border-[var(--glass-border)] bg-black/5">
      <PhActivity size="18" weight="fill" class="text-[var(--accent-color)]"/>
      <span class="text-xs font-bold tracking-widest opacity-80">NET_CORE</span>
      <div class="ml-auto flex items-center gap-2">
        <span class="text-[10px] opacity-40">{{ platform }}</span>
        <div class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
      </div>
    </div>

    <div class="flex-1 p-4 flex flex-col gap-3 overflow-y-auto custom-scrollbar">

      <div
          class="p-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 relative overflow-hidden group">
        <div class="absolute -right-4 -top-4 text-blue-500/10 group-hover:text-blue-500/20 transition-colors">
          <PhGlobe size="64" weight="duotone"/>
        </div>

        <div class="relative z-10">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-[10px] font-bold text-blue-400 uppercase">Public IP Address</span>
            <PhBroadcast v-if="isLoadingIp" class="animate-ping text-blue-400" size="8"/>
          </div>
          <div class="text-lg font-bold tracking-wider truncate" :title="ipInfo.ip">
            {{ ipInfo.ip }}
          </div>
          <div class="text-xs opacity-60 flex items-center gap-1 mt-0.5">
            <PhGlobe size="12"/>
            {{ ipInfo.loc || 'Unknown Location' }}
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="p-3 rounded-xl bg-black/5 border border-[var(--glass-border)] flex flex-col justify-between">
          <span class="text-[10px] opacity-50 font-bold">LATENCY (RTT)</span>
          <div class="flex items-end gap-1">
            <span class="text-xl font-bold" :class="pingColor">{{ rtt || '-' }}</span>
            <span class="text-[10px] mb-1 opacity-60">ms</span>
          </div>
        </div>

        <div class="p-3 rounded-xl bg-black/5 border border-[var(--glass-border)] flex flex-col justify-between">
          <span class="text-[10px] opacity-50 font-bold">LINK SPEED</span>
          <div class="flex items-end gap-1">
            <span class="text-xl font-bold text-cyan-400">{{ downlink || '-' }}</span>
            <span class="text-[10px] mb-1 opacity-60">Mbps</span>
          </div>
        </div>
      </div>

      <div class="space-y-2 pt-1">
        <div v-if="memorySupported && memory" class="space-y-1">
          <div class="flex justify-between items-center text-[10px] opacity-70">
            <span>TAB MEMORY</span>
            <span>{{ formatMem((memory as any).usedJSHeapSize) }} / {{
                formatMem((memory as any).jsHeapSizeLimit)
              }} MB</span>
          </div>
          <div class="h-1.5 w-full bg-black/10 rounded-full overflow-hidden">
            <div class="h-full bg-purple-500 transition-all duration-500" :style="{ width: memPercent + '%' }"></div>
          </div>
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-[var(--glass-border)]">
          <div class="flex items-center gap-2">
            <div class="p-1.5 rounded bg-yellow-500/10 text-yellow-500">
              <PhActivity size="14"/>
            </div>
            <div class="flex flex-col">
              <span class="text-[10px] opacity-50 font-bold">FPS</span>
              <span class="text-xs font-bold">{{ fps || 60 }}</span>
            </div>
          </div>

          <div class="h-6 w-[1px] bg-[var(--glass-border)]"></div>

          <div class="flex items-center gap-2">
            <div class="flex flex-col items-end">
              <span class="text-[10px] opacity-50 font-bold">{{ browserName }}</span>
              <span class="text-xs font-bold">{{ cores }} Cores</span>
            </div>
            <div class="p-1.5 rounded bg-gray-500/10 opacity-70">
              <PhDesktop size="14"/>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 0px;
  background: transparent;
}
</style>