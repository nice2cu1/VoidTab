<script setup lang="ts">
import {ref, computed, onMounted, defineAsyncComponent} from 'vue';
import {useNow} from '@vueuse/core';
import type {SiteItem} from '../../../../core/config/types.ts';
import {
   PhCalendarHeart, PhTrendUp, PhPiggyBank, PhSparkle
} from '@phosphor-icons/vue';

// 异步加载弹窗
const SalaryDetailModal = defineAsyncComponent(() => import('./SalaryDetailModal.vue'));

const props = defineProps<{ item: SiteItem; isEditMode: boolean }>();

// === 核心状态 ===
const showModal = ref(false);
const now = useNow(); // 实时时间

// 默认配置 (如果没有设置过)
const config = ref({
  baseSalary: 10000,
  payDay: 15, // 每月15号
  currency: '¥'
});

// 从 item.data 或 localStorage 读取配置
const CACHE_KEY = `widget_salary_${props.item.id}`;
const loadConfig = () => {
  const saved = localStorage.getItem(CACHE_KEY);
  if (saved) config.value = JSON.parse(saved);
};

onMounted(loadConfig);

// === 核心计算逻辑 ===
const calculation = computed(() => {
  const currentYear = now.value.getFullYear();
  const currentMonth = now.value.getMonth(); // 0-11
  const currentDay = now.value.getDate();
  const {payDay, baseSalary} = config.value;

  // 1. 计算下一次发薪日
  let targetYear = currentYear;
  let targetMonth = currentMonth;

  // 如果今天已经过了发薪日，或者是发薪日当天但为了展示效果算下个月(可选，这里假设当天显示0天)
  if (currentDay > payDay) {
    targetMonth++;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear++;
    }
  }

  const nextPayDate = new Date(targetYear, targetMonth, payDay);

  // 2. 计算倒计时 (天数)
  const diffTime = nextPayDate.getTime() - now.value.getTime();
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // 3. 计算今年累计 (简单估算：已过月份 * 月薪)
  // 如果当前日期大于发薪日，说明本月工资已拿
  const monthsPaid = currentDay >= payDay ? currentMonth + 1 : currentMonth;
  const ytdTotal = monthsPaid * baseSalary;

  // 4. 发薪进度 (本月进度)
  // 简化算法：假设周期是上月发薪日到本月发薪日
  const prevPayMonth = targetMonth - 1;
  const prevPayDate = new Date(targetYear, prevPayMonth, payDay);
  const totalPeriod = nextPayDate.getTime() - prevPayDate.getTime();
  const elapsed = now.value.getTime() - prevPayDate.getTime();
  const progress = Math.min(100, Math.max(0, (elapsed / totalPeriod) * 100));

  return {
    nextPayDate,
    daysLeft: daysLeft < 0 ? 0 : daysLeft,
    ytdTotal,
    progress,
    isPayDay: daysLeft === 0
  };
});

// === 布局判断 ===
const layout = computed(() => {
  const w = props.item.w || 2;
  const h = props.item.h || 2;
  return {
    isMini: w === 1 && h === 1,
    isWide: w >= 2 && h === 1,
    isSquare: w === 2 && h === 2,
    isTall: h >= 3
  };
});

// 保存配置回调
const handleSave = (newConfig: any) => {
  config.value = newConfig;
  localStorage.setItem(CACHE_KEY, JSON.stringify(newConfig));
};
</script>

<template>
  <div class="w-full h-full relative cursor-pointer group" @click="!isEditMode && (showModal = true)">

    <div
        class="w-full h-full rounded-[22px] overflow-hidden relative text-[#5d3a3a] transition-all duration-300 border border-white/20 shadow-sm hover:shadow-md select-none"
        :class="[
        calculation.isPayDay
          ? 'bg-gradient-to-br from-yellow-200 to-orange-100' // 发薪日金灿灿
          : 'bg-gradient-to-br from-rose-100 via-pink-50 to-white' // 平时粉嫩
      ]"
    >

      <PhPiggyBank
          weight="duotone"
          class="absolute -bottom-4 -right-4 text-pink-200/50 rotate-12 transition-transform group-hover:scale-110"
          :size="layout.isMini ? 60 : 120"
      />

      <div v-if="layout.isMini" class="w-full h-full flex flex-col items-center justify-center p-2 text-center">
        <div class="text-[10px] opacity-60 font-bold uppercase tracking-wide">Days Left</div>
        <div class="text-3xl font-black text-rose-500 leading-none my-1">
          {{ calculation.daysLeft }}
        </div>
        <div class="text-[9px] opacity-50 bg-white/40 px-1.5 rounded-full">
          {{ config.currency }}{{ (config.baseSalary / 1000).toFixed(1) }}k
        </div>
      </div>

      <div v-else-if="layout.isWide" class="w-full h-full flex items-center justify-between px-5">
        <div class="flex flex-col">
          <div class="flex items-center gap-1 text-xs opacity-60 font-bold">
            <PhCalendarHeart weight="fill" class="text-rose-400"/>
            下次发薪
          </div>
          <div class="text-2xl font-black text-rose-600">
            {{ calculation.daysLeft }} <span class="text-sm font-bold text-[#5d3a3a]/60">天后</span>
          </div>
        </div>
        <div class="flex flex-col items-end">
          <div class="text-lg font-bold">
            {{ config.currency }}{{ config.baseSalary.toLocaleString() }}
          </div>
          <div class="text-[10px] opacity-50">预计入账</div>
        </div>
      </div>

      <div v-else class="w-full h-full p-5 flex flex-col justify-between relative z-10">
        <div class="flex justify-between items-start">
          <div class="flex items-center gap-2 bg-white/40 px-2 py-1 rounded-lg backdrop-blur-sm">
            <div class="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
            <span class="text-xs font-bold opacity-70">搬砖倒计时</span>
          </div>
          <PhSparkle weight="fill" class="text-yellow-400 animate-bounce" size="20" v-if="calculation.daysLeft <= 3"/>
        </div>

        <div class="flex flex-col items-center justify-center flex-1 py-2">
          <div class="relative">
            <span class="text-6xl font-black text-rose-500 tracking-tighter drop-shadow-sm">
              {{ calculation.daysLeft }}
            </span>
            <span class="absolute -right-6 bottom-3 text-sm font-bold opacity-50">天</span>
          </div>
          <div class="text-sm font-medium opacity-60 mt-1">
            {{ calculation.nextPayDate.getMonth() + 1 }}月{{ calculation.nextPayDate.getDate() }}日 发工资
          </div>
        </div>

        <div class="flex flex-col gap-3">
          <div class="w-full bg-white/30 h-2.5 rounded-full overflow-hidden border border-white/20">
            <div
                class="h-full bg-gradient-to-r from-rose-300 to-rose-500 rounded-full transition-all duration-1000 ease-out relative"
                :style="{ width: `${calculation.progress}%` }"
            >
              <div class="absolute right-0 top-0 bottom-0 w-2 bg-white/30 animate-pulse"></div>
            </div>
          </div>

          <div class="flex justify-between items-center text-xs">
            <div class="flex flex-col">
              <span class="opacity-50 scale-90 origin-left">本月预计</span>
              <span class="font-bold text-rose-600">{{ config.currency }}{{ config.baseSalary.toLocaleString() }}</span>
            </div>
            <div class="h-6 w-[1px] bg-black/5"></div>
            <div class="flex flex-col items-end">
              <span class="opacity-50 scale-90 origin-right">今年累计</span>
              <span class="font-bold flex items-center gap-1">
                <PhTrendUp weight="bold" class="text-green-500"/>
                {{ config.currency }}{{ (calculation.ytdTotal / 10000).toFixed(2) }}w
              </span>
            </div>
          </div>

          <div v-if="layout.isTall" class="mt-2 pt-3 border-t border-black/5 text-center">
            <p class="text-xs text-[#5d3a3a]/70 italic leading-relaxed">
              “打工人的快乐，<br>就是每个月的那一天✨”
            </p>
          </div>
        </div>
      </div>

    </div>

    <Teleport to="body">
      <SalaryDetailModal
          v-if="showModal"
          :show="showModal"
          :config="config"
          :calculation="calculation"
          @close="showModal = false"
          @save="handleSave"
      />
    </Teleport>
  </div>
</template>