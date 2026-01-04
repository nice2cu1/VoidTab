<script setup lang="ts">
import {ref, computed, onMounted, onUnmounted} from 'vue';
import type {SiteItem} from '../../../../core/config/types.ts';
import {Solar} from 'lunar-typescript';
import CalendarDetailModal from './CalendarDetailModal.vue';

const props = defineProps<{ item: SiteItem }>();

const now = ref(new Date());
let timer: number;
const showModal = ref(false);

const updateTime = () => {
  now.value = new Date();
};

onMounted(() => {
  timer = window.setInterval(updateTime, 60000);
});
onUnmounted(() => window.clearInterval(timer));

const getDayOfYear = (date: Date) => {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
};

const getWeekOfYear = (date: Date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};

const displayData = computed(() => {
  const solar = Solar.fromDate(now.value);
  const lunar = solar.getLunar();
  const jsDate = now.value;

  return {
    year: solar.getYear(),
    month: solar.getMonth(),
    day: solar.getDay(),
    week: solar.getWeekInChinese(),
    lunarMonth: lunar.getMonthInChinese() + '月',
    lunarDay: lunar.getDayInChinese(),
    dayOfYear: getDayOfYear(jsDate),
    weekOfYear: getWeekOfYear(jsDate),
  };
});

const layout = computed(() => {
  const w = props.item.w || 2;
  const h = props.item.h || 2;
  const isMini = w === 1 && h === 1;
  const isWide = w >= 2 && h === 1;

  return {
    headerClass: isMini || isWide ? 'h-[28%]' : 'h-[32%]',
    showYear: !isMini,
    headerTextClass: isMini ? 'text-xs' : 'text-sm',
    dayNumClass: isMini ? 'text-4xl mt-1' : isWide ? 'text-4xl' : 'text-[52px] -mt-1',
    showDetailInfo: !isMini && !isWide,
    footerClass: isMini ? 'text-[10px] scale-90 origin-top' : 'text-xs',
    containerClass: isWide ? 'pb-0 justify-center' : 'pb-1 justify-center',
  };
});
</script>

<template>
  <div class="w-full h-full relative cursor-pointer" @click.stop="showModal = true">
    <div class="cal-card w-full h-full rounded-[18px] overflow-hidden flex flex-col select-none">
      <div class="cal-header flex items-center justify-center" :class="layout.headerClass">
        <span class="cal-header-text font-medium tracking-widest whitespace-nowrap" :class="layout.headerTextClass">
          <span v-if="layout.showYear">{{ displayData.year }}年</span>{{ displayData.month }}月
        </span>
      </div>

      <div class="flex-1 flex flex-col items-center relative w-full px-1" :class="layout.containerClass">
        <div class="cal-daynum font-bold leading-none font-sans" :class="layout.dayNumClass">
          {{ displayData.day }}
        </div>

        <div v-if="layout.showDetailInfo" class="cal-sub text-[10px] mt-1 mb-1 transform scale-90 whitespace-nowrap">
          第{{ displayData.dayOfYear }}天 第{{ displayData.weekOfYear }}周
        </div>

        <div
            class="cal-footer font-medium flex gap-1.5 whitespace-nowrap"
            :class="[layout.footerClass, !layout.showDetailInfo ? 'mt-1' : '']"
        >
          <span>{{ displayData.lunarMonth }}{{ displayData.lunarDay }}</span>
          <span v-if="layout.showDetailInfo" class="cal-divider">|</span>
          <span>周{{ displayData.week }}</span>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <CalendarDetailModal :show="showModal" @close="showModal = false"/>
    </Teleport>
  </div>
</template>

<style scoped>
/* =========================================================
   Widget：浅色“正常玻璃”，深色“常规深色背景”
   关键：不要再用 --glass-surface（深色会发白），改用 settings-surface
========================================================= */
.cal-card {
  background: var(--settings-surface);
  border: 1px solid var(--settings-border);
  box-shadow: var(--glass-shadow);
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
}

/* 让卡片内部稍微有层次，不会“白糊一片” */
:global(html.light) .cal-card {
  background: rgba(255, 255, 255, 0.78);
}

/* ✅ 深色：常规深色底（更像你其它深色 widget），不要发白 */
:global(html.dark) .cal-card {
  background: rgba(18, 18, 20, 0.82);
  border-color: rgba(255, 255, 255, 0.10);
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.45);
}

/* Header：浅色更饱满，深色更“压暗” */
.cal-header {
  background: rgba(255, 82, 82, 0.86);
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

:global(html.dark) .cal-header {
  background: rgba(255, 82, 82, 0.22);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

/* Header Text */
.cal-header-text {
  color: rgba(255, 255, 255, 0.96);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
}

:global(html.dark) .cal-header-text {
  color: rgba(255, 255, 255, 0.92);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
}

/* 主数字与文案 */
.cal-daynum {
  color: var(--text-primary);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.16);
}

:global(html.dark) .cal-daynum {
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.55);
}

.cal-sub {
  color: var(--text-tertiary);
}

.cal-footer {
  color: var(--text-secondary);
}

.cal-divider {
  color: rgba(0, 0, 0, 0.10);
}

:global(html.dark) .cal-divider {
  color: rgba(255, 255, 255, 0.18);
}
</style>
