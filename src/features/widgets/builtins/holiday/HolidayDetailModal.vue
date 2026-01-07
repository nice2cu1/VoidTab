<script setup lang="ts">
import {computed} from 'vue';
import {useNow, useDateFormat} from '@vueuse/core';
import {PhX, PhCalendarBlank, PhCheckCircle, PhHourglass} from '@phosphor-icons/vue';

// 定义接口，确保类型安全
interface Holiday {
  name: string;
  date: string; // YYYY-MM-DD
  days?: number;
  icon?: any;
  color?: string;
}

const props = defineProps<{
  show: boolean;
  holidays: Holiday[];
}>();

const emit = defineEmits(['close']);
const now = useNow();
const currentYear = new Date().getFullYear();

// === 1. 精准天数映射 (中国法定节假日规则) ===
const getStandardDuration = (name: string, originalDays?: number) => {
  // 如果父组件传了有效天数(>1)，优先用父组件的；否则用默认规则
  if (originalDays && originalDays > 1) return originalDays;

  if (name.includes('春节') || name.includes('国庆')) return 7;
  if (name.includes('劳动')) return 5;
  if (name.includes('元旦') || name.includes('清明') || name.includes('端午') || name.includes('中秋')) return 3;
  return 1;
};

// === 2. 过滤当前年份 + 数据增强 ===
const currentYearHolidays = computed(() => {
  return props.holidays
      .filter(h => h.date.startsWith(String(currentYear))) // 只取当年
      .map(h => ({
        ...h,
        days: getStandardDuration(h.name, h.days) // 修正天数
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
});

// === 状态判断逻辑 ===
const getStatus = (dateStr: string) => {
  const target = new Date(dateStr).setHours(0, 0, 0, 0);
  const today = now.value.setHours(0, 0, 0, 0);

  if (target < today) return 'passed'; // 过去了
  if (target === today) return 'ing';  // 就是今天
  return 'future'; // 未来
};

// 计算下一个待过的节日索引
const nextIndex = computed(() =>
    currentYearHolidays.value.findIndex(h => getStatus(h.date) !== 'passed')
);

// 倒计时计算
const getDaysLeft = (dateStr: string) => {
  const target = new Date(dateStr).getTime();
  const today = now.value.getTime();
  const diff = target - today;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};
</script>

<template>
  <Transition name="modal-scale">
    <div v-if="show" class="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" @click="emit('close')"></div>

      <div
          class="relative w-[380px] max-h-[85vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl transition-all"
          style="background-color: var(--settings-surface); border: 1px solid var(--settings-border);"
      >
        <div
            class="h-32 relative shrink-0 p-6 flex flex-col justify-end overflow-hidden"
            style="background: linear-gradient(135deg, var(--settings-panel) 0%, var(--settings-surface) 100%);"
        >
          <div
              class="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_top_right,_var(--accent-color),_transparent_70%)]"></div>

          <button
              @click="emit('close')"
              class="absolute top-4 right-4 z-50 p-2 rounded-full transition-colors hover:bg-[var(--settings-border)]"
              style="color: var(--settings-text-secondary);"
          >
            <PhX size="18"/>
          </button>

          <div class="relative z-10">
            <div class="flex items-center gap-2 mb-1 opacity-80" style="color: var(--accent-color);">
              <PhCalendarBlank weight="fill"/>
              <span class="text-xs font-bold tracking-widest uppercase">{{ currentYear }} Schedule</span>
            </div>
            <h2 class="text-2xl font-black tracking-tight" style="color: var(--settings-text);">
              放假安排
            </h2>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto p-6 pt-2 custom-scroll">
          <div class="relative pl-4 space-y-6">
            <div class="absolute left-[27px] top-4 bottom-4 w-[2px]"
                 style="background-color: var(--settings-border);"></div>

            <div v-for="(h, idx) in currentYearHolidays" :key="h.name" class="relative z-10 group">

              <div
                  class="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-4 flex items-center justify-center transition-all z-20"
                  :style="{
                    borderColor: 'var(--settings-surface)',
                    backgroundColor: getStatus(h.date) === 'passed' ? 'var(--settings-border)' : (idx === nextIndex ? 'var(--accent-color)' : 'var(--settings-input-bg)')
                  }"
                  :class="{ 'scale-110 shadow-lg': idx === nextIndex }"
              >
                <PhCheckCircle v-if="getStatus(h.date) === 'passed'" class="text-white text-[10px]" weight="bold"/>
                <PhHourglass v-else-if="idx === nextIndex" class="text-white text-[10px]" weight="bold"/>
                <div v-else class="w-1.5 h-1.5 rounded-full"
                     style="background-color: var(--settings-text-secondary);"></div>
              </div>

              <div
                  class="ml-10 p-4 rounded-2xl border transition-all"
                  :style="{
                    backgroundColor: 'var(--settings-input-bg)',
                    borderColor: 'var(--settings-border)',
                    opacity: getStatus(h.date) === 'passed' ? 0.5 : 1
                  }"
                  :class="idx === nextIndex ? 'shadow-md border-[var(--accent-color)]/30' : 'hover:shadow-sm'"
              >
                <div class="flex justify-between items-start mb-2">
                  <div class="flex items-center gap-2">
                    <component
                        :is="h.icon"
                        weight="duotone"
                        class="text-lg"
                        :class="h.color ? h.color : 'text-[var(--accent-color)]'"
                    />
                    <span class="font-bold text-lg" style="color: var(--settings-text);">{{ h.name }}</span>
                  </div>

                  <span
                      class="text-xs font-bold px-2 py-1 rounded-lg border"
                      :class="h.days >= 5 ? 'text-rose-500 bg-rose-500/10 border-rose-500/20' : 'text-sky-500 bg-sky-500/10 border-sky-500/20'"
                  >
                    休 {{ h.days }} 天
                  </span>
                </div>

                <div class="flex justify-between items-center text-xs font-medium"
                     style="color: var(--settings-text-secondary);">
                  <span>{{ useDateFormat(h.date, 'MM月DD日').value }}</span>

                  <span v-if="getStatus(h.date) === 'future'">
                    还有 <span class="font-bold text-base mx-0.5"
                               style="color: var(--accent-color);">{{ getDaysLeft(h.date) }}</span> 天
                  </span>
                  <span v-else-if="getStatus(h.date) === 'ing'" class="text-emerald-500 font-bold">
                    假期中 🎉
                  </span>
                  <span v-else>已结束</span>
                </div>
              </div>
            </div>

            <div v-if="currentYearHolidays.length === 0" class="py-8 text-center text-xs opacity-50">
              暂无 {{ currentYear }} 年假期数据
            </div>

          </div>
        </div>

      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-scale-enter-active, .modal-scale-leave-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-scale-enter-from, .modal-scale-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--settings-border);
  border-radius: 4px;
}
</style>