<script setup lang="ts">
import {useNow} from '@vueuse/core';
import {PhX, PhCalendarBlank, PhClockCountdown, PhCheckCircle} from '@phosphor-icons/vue';

const props = defineProps<{
  show: boolean;
  holidays: any[];
}>();

const emit = defineEmits(['close']);
const now = useNow();

// 判断状态
const getStatus = (dateStr: string) => {
  const target = new Date(dateStr).getTime();
  const today = now.value.getTime();
  const oneDay = 24 * 60 * 60 * 1000;

  if (target < today - oneDay) return 'passed'; // 已过
  if (target - today < 0) return 'ing'; // 进行中
  return 'future';
};

const nextIndex = props.holidays.findIndex(h => getStatus(h.date) === 'future');
</script>

<template>
  <Transition name="modal-scale">
    <div v-if="show" class="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" @click="emit('close')"></div>

      <div
          class="relative bg-[#f8fafc] w-[380px] max-h-[80vh] rounded-[32px] shadow-2xl flex flex-col overflow-hidden border border-white">

        <div
            class="h-32 bg-gradient-to-b from-sky-200 to-[#f8fafc] relative shrink-0 p-6 flex flex-col justify-end overflow-hidden">
          <button
              @click="emit('close')"
              class="absolute top-4 right-4 z-50 p-2 bg-black/5 hover:bg-black/10 rounded-full transition-colors cursor-pointer"
          >
            <PhX size="18" class="text-slate-600"/>
          </button>

          <div class="relative z-10">
            <div class="flex items-center gap-2 text-indigo-600 mb-1 opacity-80">
              <PhCalendarBlank weight="fill"/>
              <span class="text-xs font-bold tracking-widest uppercase">2026 Holiday Schedule</span>
            </div>
            <h2 class="text-2xl font-black text-slate-800">放假安排表</h2>
          </div>

          <div
              class="absolute right-[-20px] top-[-20px] w-40 h-40 bg-white/40 rounded-full blur-3xl pointer-events-none"></div>
        </div>

        <div class="flex-1 overflow-y-auto p-6 pt-2 custom-scrollbar">
          <div class="relative pl-4 space-y-6">
            <div class="absolute left-[27px] top-4 bottom-4 w-[2px] bg-slate-200"></div>

            <div v-for="(h, idx) in holidays" :key="h.name" class="relative z-10 group">

              <div
                  class="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-4 border-[#f8fafc] flex items-center justify-center transition-all"
                  :class="[
                  getStatus(h.date) === 'passed' ? 'bg-slate-300' :
                  idx === nextIndex ? 'bg-indigo-500 scale-125 shadow-indigo-300 shadow-lg' : 'bg-sky-300'
                ]"
              >
                <PhCheckCircle v-if="getStatus(h.date) === 'passed'" class="text-white text-[10px]" weight="bold"/>
                <PhClockCountdown v-else-if="idx === nextIndex" class="text-white text-[12px]" weight="bold"/>
              </div>

              <div
                  class="ml-10 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
                  :class="getStatus(h.date) === 'passed' ? 'opacity-50 grayscale' : ''"
              >
                <div class="flex justify-between items-start mb-2">
                  <div class="flex items-center gap-2">
                    <component :is="h.icon" weight="duotone" class="text-lg" :class="h.color"/>
                    <span class="font-bold text-slate-700 text-lg">{{ h.name }}</span>
                  </div>
                  <span class="text-xs font-bold px-2 py-1 rounded-lg"
                        :class="h.days >= 5 ? 'bg-rose-100 text-rose-600' : 'bg-sky-100 text-sky-600'">
                    休 {{ h.days }} 天
                  </span>
                </div>

                <div class="flex justify-between items-center text-xs text-slate-400 font-medium">
                  <span>{{ h.date }}</span>
                  <span v-if="getStatus(h.date) === 'future'">
                    还有 <span class="text-indigo-500 font-bold text-sm">
                      {{ Math.ceil((new Date(h.date).getTime() - now.getTime()) / (86400000)) }}
                    </span> 天
                  </span>
                  <span v-else>已结束</span>
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
.modal-scale-enter-active, .modal-scale-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-scale-enter-from, .modal-scale-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 4px;
}
</style>