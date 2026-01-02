<script setup lang="ts">
import {ref, computed, onMounted, onUnmounted} from 'vue';
import type {SiteItem} from '../../../core/config/types';
import {Solar} from 'lunar-typescript';
import CalendarDetailModal from './CalendarDetailModal.vue';

defineProps<{ item: SiteItem }>();

// 状态
const now = ref(new Date());
let timer: number;
const showModal = ref(false);

const updateTime = () => {
  now.value = new Date();
};

onMounted(() => {
  timer = setInterval(updateTime, 60000);
});

onUnmounted(() => clearInterval(timer));

// ✅ 新增：辅助函数 - 计算今天是今年的第几天
const getDayOfYear = (date: Date) => {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
};

// ✅ 新增：辅助函数 - 计算今天是今年的第几周 (ISO标准)
const getWeekOfYear = (date: Date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

// === 计算显示数据 ===
const displayData = computed(() => {
  const solar = Solar.fromDate(now.value);
  const lunar = solar.getLunar();
  const jsDate = now.value; // 获取原生 Date 对象用于计算

  return {
    year: solar.getYear(),
    month: solar.getMonth(),
    day: solar.getDay(),
    week: solar.getWeekInChinese(), // 这里返回 "五"
    lunarMonth: lunar.getMonthInChinese() + '月',
    lunarDay: lunar.getDayInChinese(),
    // ✅ 修复报错：使用辅助函数计算
    dayOfYear: getDayOfYear(jsDate),
    weekOfYear: getWeekOfYear(jsDate),

    ganZhiYear: lunar.getYearInGanZhi(),
    shengXiao: lunar.getYearShengXiao()
  };
});
</script>

<template>
  <div class="w-full h-full relative cursor-pointer" @click.stop="showModal = true">
    <div class="w-full h-full rounded-[18px] overflow-hidden flex flex-col bg-white shadow-sm select-none">
      <div class="h-[32%] bg-[#FF5252] flex items-center justify-center">
        <span class="text-white font-medium text-sm tracking-widest opacity-95">
          {{ displayData.year }}年{{ displayData.month }}月
        </span>
      </div>
      <div class="flex-1 flex flex-col items-center justify-center relative">
        <div class="text-[52px] font-bold text-[#333] leading-none -mt-1 font-sans">
          {{ displayData.day }}
        </div>
        <div class="text-[10px] text-gray-400 mt-1 mb-1 transform scale-90">
          第{{ displayData.dayOfYear }}天 第{{ displayData.weekOfYear }}周
        </div>
        <div class="text-xs font-medium text-[#555] flex gap-1.5 pb-1">
          <span>{{ displayData.lunarMonth }}{{ displayData.lunarDay }}</span>
          <span class="text-gray-300">|</span>
          <span>周{{ displayData.week }}</span>
        </div>
      </div>
    </div>
    <Teleport to="body">
      <CalendarDetailModal :show="showModal" @close="showModal = false"/>
    </Teleport>
  </div>
</template>