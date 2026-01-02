<script setup lang="ts">
import {ref, computed, defineAsyncComponent} from 'vue';
import {useNow} from '@vueuse/core';
import type {SiteItem} from '../../../../core/config/types';
import {
  PhConfetti, PhCalendarStar, PhBalloon, PhAirplaneTilt, PhTreePalm, PhMoonStars, PhSunHorizon, PhTimer
} from '@phosphor-icons/vue';

const HolidayDetailModal = defineAsyncComponent(() => import('./HolidayDetailModal.vue'));

const props = defineProps<{ item: SiteItem; isEditMode: boolean }>();
const showModal = ref(false);
const now = useNow();

// === 2026年节假日数据 (模拟数据，可替换为 API) ===
// status: 0-未开始, 1-进行中, 2-已结束
const allHolidays = [
  {name: '元旦', date: '2026-01-01', days: 3, icon: PhConfetti, color: 'text-yellow-500'},
  {name: '春节', date: '2026-02-17', days: 7, icon: PhBalloon, color: 'text-red-500'},
  {name: '清明', date: '2026-04-05', days: 3, icon: PhTreePalm, color: 'text-green-500'},
  {name: '劳动节', date: '2026-05-01', days: 5, icon: PhAirplaneTilt, color: 'text-blue-500'},
  {name: '端午', date: '2026-06-19', days: 3, icon: PhSunHorizon, color: 'text-orange-500'},
  {name: '中秋', date: '2026-09-25', days: 3, icon: PhMoonStars, color: 'text-indigo-500'},
  {name: '国庆', date: '2026-10-01', days: 7, icon: PhConfetti, color: 'text-rose-500'},
];

// === 计算逻辑 ===
const upcomingList = computed(() => {
  const today = now.value;
  return allHolidays.map(h => {
    const hDate = new Date(h.date);
    const diff = hDate.getTime() - today.getTime();
    const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return {...h, daysLeft};
  }).filter(h => h.daysLeft >= 0) // 只保留未来的
      .sort((a, b) => a.daysLeft - b.daysLeft); // 按时间排序
});

const nextHoliday = computed(() => upcomingList.value[0] || {name: '明年见', daysLeft: 0, icon: PhCalendarStar});

// === 布局判断 ===
const layout = computed(() => {
  const w = props.item.w || 2;
  const h = props.item.h || 2;
  return {
    is1x1: w === 1 && h === 1,
    is1x2: w === 1 && h >= 2,
    is2x1: w >= 2 && h === 1,
    is2x2: w === 2 && h === 2,
    is2x4: w >= 2 && h >= 3
  };
});
</script>

<template>
  <div class="w-full h-full relative cursor-pointer group" @click="!isEditMode && (showModal = true)">

    <div
        class="w-full h-full rounded-[22px] overflow-hidden relative text-slate-700 transition-all duration-300 border border-white/40 shadow-sm hover:shadow-md select-none bg-gradient-to-br from-sky-100 via-indigo-50 to-white"
    >
      <div class="absolute inset-0 bg-white/20 backdrop-blur-[1px]"></div>

      <div v-if="layout.is1x1" class="relative w-full h-full flex flex-col items-center justify-center p-2">
        <component :is="nextHoliday.icon" weight="duotone" class="mb-1 text-2xl" :class="nextHoliday.color"/>
        <div class="text-[10px] opacity-60 font-bold">距离{{ nextHoliday.name }}</div>
        <div class="text-2xl font-black text-slate-800 leading-none">{{ nextHoliday.daysLeft }}</div>
        <div class="text-[9px] opacity-40">天</div>
      </div>

      <div v-else-if="layout.is1x2" class="relative w-full h-full flex flex-col p-3 gap-2">
        <div class="text-xs font-bold opacity-50 text-center mb-1">近期假期</div>
        <div v-for="(h, i) in upcomingList.slice(0, 3)" :key="h.name"
             class="flex-1 bg-white/50 rounded-xl flex flex-col items-center justify-center border border-white/30"
             :class="i===0 ? 'bg-white/80 shadow-sm' : ''">
          <div class="flex items-center gap-1">
            <component :is="h.icon" weight="fill" class="text-[10px]" :class="h.color"/>
            <span class="text-xs font-bold">{{ h.name }}</span>
          </div>
          <div class="text-[10px]">
            还有 <span class="font-black" :class="i===0 ? 'text-blue-500' : ''">{{ h.daysLeft }}</span> 天
          </div>
        </div>
      </div>

      <div v-else-if="layout.is2x1" class="relative w-full h-full flex items-center justify-between px-5">
        <div class="flex flex-col">
          <div class="flex items-center gap-1.5 text-xs font-bold opacity-70 mb-0.5">
            <PhCalendarStar weight="fill" class="text-indigo-400"/>
            下一个假期
          </div>
          <div class="text-lg font-black text-slate-800 flex items-center gap-2">
            {{ nextHoliday.name }}
            <span class="text-[10px] bg-white/60 px-1.5 py-0.5 rounded-md font-normal text-slate-500">
              放{{ nextHoliday.days }}天
            </span>
          </div>
        </div>
        <div class="flex flex-col items-end">
          <div class="text-3xl font-black text-indigo-500 leading-none">{{ nextHoliday.daysLeft }}</div>
          <div class="text-[10px] opacity-50 font-bold mr-0.5">Days Left</div>
        </div>
      </div>

      <div v-else-if="layout.is2x2" class="relative w-full h-full p-4 flex flex-col">
        <div class="flex-1 flex flex-col justify-center items-center relative">
          <component :is="nextHoliday.icon" weight="duotone"
                     class="absolute text-8xl opacity-10 -right-4 -top-2 rotate-12"/>
          <div class="text-xs font-bold opacity-60 uppercase tracking-widest mb-1">Next Holiday</div>
          <div class="text-5xl font-black text-indigo-600 tracking-tighter">{{ nextHoliday.daysLeft }}</div>
          <div class="flex items-center gap-2 mt-1">
            <span class="font-bold text-slate-700">{{ nextHoliday.name }}</span>
            <span class="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 rounded font-bold">休{{
                nextHoliday.days
              }}天</span>
          </div>
        </div>

        <div class="h-[1px] w-full bg-slate-200/50 my-2"></div>
        <div class="flex justify-between px-1">
          <div v-for="h in upcomingList.slice(1, 3)" :key="h.name" class="flex items-center gap-1.5 opacity-70">
            <component :is="h.icon" weight="fill" class="text-[10px]" :class="h.color"/>
            <span class="text-[10px] font-medium">{{ h.name }} {{ h.daysLeft }}天</span>
          </div>
        </div>
      </div>

      <div v-else class="relative w-full h-full p-5 flex flex-col">
        <div class="flex justify-between items-start mb-4">
          <div>
            <div class="text-sm font-bold opacity-50">嘿，打工人</div>
            <div class="text-xl font-bold text-slate-800">再坚持一下！💪</div>
          </div>
          <div class="bg-white/60 p-2 rounded-xl backdrop-blur-sm">
            <PhTimer class="text-indigo-500 animate-spin-slow" size="24" weight="duotone"/>
          </div>
        </div>

        <div class="bg-white/40 rounded-2xl p-4 flex items-center gap-4 border border-white/40 mb-3">
          <div
              class="bg-indigo-500 text-white w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 shadow-lg shadow-indigo-200">
            <span class="text-xs font-bold opacity-80">还有</span>
            <span class="text-lg font-black leading-none">{{ nextHoliday.daysLeft }}</span>
          </div>
          <div>
            <div class="font-bold text-lg text-slate-800">{{ nextHoliday.name }}</div>
            <div class="text-xs opacity-60">{{ nextHoliday.date }} · 连休 {{ nextHoliday.days }} 天</div>
          </div>
        </div>

        <div class="flex-1 overflow-hidden flex flex-col gap-2">
          <div class="text-[10px] font-bold opacity-40 uppercase tracking-widest pl-1">Upcoming</div>
          <div v-for="h in upcomingList.slice(1, 4)" :key="h.name"
               class="flex items-center justify-between p-2 rounded-lg hover:bg-white/30 transition-colors">
            <div class="flex items-center gap-2">
              <component :is="h.icon" weight="duotone" :class="h.color"/>
              <span class="text-xs font-bold">{{ h.name }}</span>
            </div>
            <div class="text-xs opacity-60">{{ h.daysLeft }}天后</div>
          </div>
        </div>
      </div>

    </div>

    <Teleport to="body">
      <HolidayDetailModal
          v-if="showModal"
          :show="showModal"
          :holidays="allHolidays"
          @close="showModal = false"
      />
    </Teleport>
  </div>
</template>

<style scoped>
.animate-spin-slow {
  animation: spin 8s linear infinite;
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