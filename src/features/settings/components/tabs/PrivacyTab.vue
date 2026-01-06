<script setup lang="ts">
import {useConfigStore} from '../../../../stores/useConfigStore';
import {PhClockCounterClockwise, PhShieldCheck, PhWarning} from '@phosphor-icons/vue';

const store = useConfigStore();

const toggleHistory = () => {
  store.config.theme.enableHistory = !store.config.theme.enableHistory;
  store.saveConfig();
};
</script>

<template>
  <div class="space-y-8 animate-fade-in">
    <div class="space-y-1">
      <h3 class="text-xl font-bold flex items-center gap-2">
        <PhShieldCheck class="text-[var(--accent-color)]" weight="duotone"/>
        隐私设置
      </h3>
      <p class="text-sm opacity-60">管理数据记录策略与隐私偏好</p>
    </div>

    <div
        class="p-5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between transition-colors hover:border-white/20">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
          <PhClockCounterClockwise size="24" weight="duotone"/>
        </div>
        <div>
          <div class="font-bold text-base">历史记录追踪</div>
          <div class="text-xs opacity-50 mt-1 max-w-[280px] leading-relaxed">
            开启后，系统将记录您的搜索关键词、跳转链接及 AI 对话历史，以便于回溯。
          </div>
        </div>
      </div>

      <button
          @click="toggleHistory"
          class="relative w-12 h-7 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]/50"
          :class="store.config.theme.enableHistory ? 'bg-[var(--accent-color)]' : 'bg-gray-600'"
      >
        <div
            class="absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300"
            :class="store.config.theme.enableHistory ? 'translate-x-5' : 'translate-x-0'"
        ></div>
      </button>
    </div>

    <div
        class="p-5 rounded-xl bg-orange-500/5 border border-orange-500/10 text-blue-400 text-xs leading-relaxed flex gap-4">
      <PhWarning class="shrink-0 mt-0.5 text-blue-500" size="20" weight="duotone"/>
      <div class="space-y-2">
        <p class="font-bold text-blue-500 text-sm">关于数据安全的承诺</p>
        <ul class="list-disc pl-4 space-y-1 opacity-80">
          <li>所有历史记录数据仅存储在您的<strong>本地浏览器 (IndexedDB)</strong> 中。</li>
          <li>除非您主动使用“云端同步”功能，否则数据绝不会上传至任何服务器。</li>
          <li>使用“AI 洞察”功能时，系统仅会将您当前选定的历史片段发送给 AI 接口，分析完成后即刻销毁，不会留存。</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>