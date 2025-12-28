<script setup lang="ts">
import {ref, onMounted, computed, watch} from 'vue';
import {useGeolocation} from '@vueuse/core';
import {Solar} from 'lunar-javascript';
import {
  PhCloudSun, PhSun, PhCloud, PhCloudRain, PhSnowflake, PhLightning,
  PhDrop, PhWind, PhMapPin, PhSpinner, PhArrowCounterClockwise
} from '@phosphor-icons/vue';

// ================= 配置区域 =================
const CACHE_KEY = 'voidtab_weather_cache_v2'; // 升级Key版本以强制刷新旧缓存
const CACHE_DURATION = 4 * 60 * 60 * 1000;    // 4小时
// ===========================================

// 状态管理
const isLoading = ref(true);
const errorMsg = ref('');
const weatherNow = ref<any>(null);
const weatherDaily = ref<any>(null);
const locationInfo = ref<string>('定位中...');
const lunarData = ref<any>(null);

// 获取地理位置
const {coords, error: geoError} = useGeolocation();

// 图标映射
const weatherCodeMap: Record<number, { icon: any, label: string, color: string }> = {
  0: {icon: PhSun, label: '晴', color: '#f59e0b'},
  1: {icon: PhCloudSun, label: '多云', color: '#fbbf24'},
  2: {icon: PhCloudSun, label: '多云', color: '#fbbf24'},
  3: {icon: PhCloud, label: '阴', color: '#9ca3af'},
  45: {icon: PhCloud, label: '雾', color: '#9ca3af'},
  48: {icon: PhCloud, label: '雾', color: '#9ca3af'},
  51: {icon: PhCloudRain, label: '小雨', color: '#3b82f6'},
  53: {icon: PhCloudRain, label: '中雨', color: '#2563eb'},
  55: {icon: PhCloudRain, label: '大雨', color: '#1d4ed8'},
  61: {icon: PhCloudRain, label: '小雨', color: '#3b82f6'},
  63: {icon: PhCloudRain, label: '中雨', color: '#2563eb'},
  65: {icon: PhCloudRain, label: '大雨', color: '#1d4ed8'},
  71: {icon: PhSnowflake, label: '小雪', color: '#93c5fd'},
  73: {icon: PhSnowflake, label: '中雪', color: '#60a5fa'},
  75: {icon: PhSnowflake, label: '大雪', color: '#3b82f6'},
  80: {icon: PhCloudRain, label: '阵雨', color: '#3b82f6'},
  81: {icon: PhCloudRain, label: '强阵雨', color: '#2563eb'},
  82: {icon: PhCloudRain, label: '暴雨', color: '#1e3a8a'},
  95: {icon: PhLightning, label: '雷雨', color: '#7c3aed'},
  96: {icon: PhLightning, label: '雷伴冰雹', color: '#7c3aed'},
  99: {icon: PhLightning, label: '雷伴冰雹', color: '#7c3aed'},
};

const getWeatherInfo = (code: number) => weatherCodeMap[code] || {
  icon: PhCloudSun, label: '未知', color: 'currentColor'
};

// 手动强制刷新（清除缓存）
const forceRefresh = () => {
  localStorage.removeItem(CACHE_KEY);
  weatherNow.value = null; // 重置状态
  fetchData(true);
};

const fetchData = async (force = false) => {
  // --- 1. 尝试读取缓存 ---
  if (!force) {
    try {
      const cachedStr = localStorage.getItem(CACHE_KEY);
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        // 校验数据完整性 (防止旧缓存导致白屏)
        if (cached && cached.weatherNow && cached.weatherDaily && cached.lunarData) {
          const now = Date.now();
          if (now - cached.timestamp < CACHE_DURATION) {
            console.log('[Weather] 命中本地缓存');
            weatherNow.value = cached.weatherNow;
            weatherDaily.value = cached.weatherDaily;
            locationInfo.value = cached.locationInfo;
            lunarData.value = cached.lunarData;
            isLoading.value = false;
            return;
          }
        }
      }
    } catch (e) {
      console.warn('缓存读取失败，将重新请求');
      localStorage.removeItem(CACHE_KEY);
    }
  }

  // --- 2. 无缓存，发起请求 ---
  const lat = coords.value.latitude;
  const lon = coords.value.longitude;

  if (lat === Infinity || lon === Infinity || lat === 0 || lon === 0) {
    if (geoError.value) {
      errorMsg.value = "请允许位置权限";
      isLoading.value = false;
    }
    return;
  }

  try {
    isLoading.value = true;
    errorMsg.value = '';

    // A. 获取地名
    let locName = `Lat:${lat.toFixed(1)}`;
    try {
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&accept-language=zh`);
      const geoData = await geoRes.json();
      if (geoData && geoData.address) {
        locName = geoData.address.district || geoData.address.city || geoData.address.state || '未知位置';
      }
    } catch (e) {
      console.warn('Geo API Error');
    }
    locationInfo.value = locName;

    // B. 获取天气 (Open-Meteo)
    const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`);
    if (!weatherRes.ok) throw new Error('天气接口异常');
    const weatherJson = await weatherRes.json();

    // C. 黄历
    const now = new Date();
    const solar = Solar.fromDate(now);
    const lunar = solar.getLunar();
    const lunarObj = {
      dateStr: `${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
      ganZhi: `${lunar.getYearInGanZhi()}年`,
      yi: lunar.getDayYi().join(' '),
    };

    // 更新状态
    weatherNow.value = weatherJson.current;
    weatherDaily.value = weatherJson.daily;
    lunarData.value = lunarObj;

    // 写入缓存
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      locationInfo: locName,
      weatherNow: weatherJson.current,
      weatherDaily: weatherJson.daily,
      lunarData: lunarObj
    }));

  } catch (e: any) {
    errorMsg.value = '网络超时，请重试';
    console.error(e);
  } finally {
    isLoading.value = false;
  }
};

const advice = computed(() => {
  if (!weatherNow.value) return '';
  const temp = weatherNow.value.temperature_2m;
  if (temp < 10) return '❄️ 天冷，注意保暖';
  if (temp < 26) return '👕 气温舒适';
  return '☀️ 天气炎热';
});

const dailyForecast = computed(() => {
  if (!weatherDaily.value || !weatherDaily.value.time) return [];
  // 映射未来数据
  return weatherDaily.value.time.slice(1, 8).map((time: string, index: number) => {
    // 保护性读取，防止数组越界
    const code = weatherDaily.value.weather_code[index + 1] ?? 0;
    const max = weatherDaily.value.temperature_2m_max[index + 1] ?? 0;
    const min = weatherDaily.value.temperature_2m_min[index + 1] ?? 0;
    const date = new Date(time);
    return {
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      week: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()],
      ...getWeatherInfo(code),
      max: Math.round(max),
      min: Math.round(min),
    };
  });
});

onMounted(() => {
  const stopWatcher = watch(coords, (newCoords) => {
    if (newCoords.latitude !== Infinity && newCoords.latitude !== 0) {
      fetchData(false);
      stopWatcher();
    }
  }, {immediate: true});
});
</script>

<template>
  <div
      class="apple-glass rounded-2xl p-5 flex flex-col h-full relative overflow-hidden group select-none transition-all hover:bg-[var(--sidebar-active)] text-[var(--text-primary)]">

    <button @click.stop="forceRefresh"
            class="absolute top-2 right-2 p-1.5 rounded-full bg-black/10 hover:bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity z-20"
            title="强制刷新">
      <PhArrowCounterClockwise size="14"/>
    </button>

    <div v-if="isLoading"
         class="absolute inset-0 flex flex-col items-center justify-center bg-[var(--glass-surface)] z-10 backdrop-blur-sm">
      <PhSpinner size="32" class="animate-spin text-[var(--accent-color)] mb-3"/>
      <span class="text-xs font-bold opacity-60">加载气象数据...</span>
    </div>

    <template v-else-if="lunarData && weatherNow && weatherNow.temperature_2m !== undefined">
      <div class="flex justify-between items-start mb-4">
        <div class="flex items-center gap-1">
          <PhMapPin size="16" weight="fill" class="text-[var(--accent-color)]"/>
          <span class="text-sm font-bold tracking-wide truncate max-w-[140px]" :title="locationInfo">
            {{ locationInfo }}
          </span>
        </div>
        <div class="text-right">
          <div class="text-sm font-bold font-tech text-[var(--accent-color)]">{{ lunarData.dateStr }}</div>
          <div class="text-[10px] opacity-60 mt-0.5">{{ lunarData.ganZhi }}</div>
        </div>
      </div>

      <div class="flex items-center justify-between mb-6 px-2">
        <div class="flex items-center gap-4">
          <component :is="getWeatherInfo(weatherNow.weather_code).icon" size="64" weight="duotone"
                     :style="{ color: getWeatherInfo(weatherNow.weather_code).color }"/>
          <div>
            <div class="text-5xl font-bold font-tech leading-none">
              {{ Math.round(weatherNow.temperature_2m) }}°
            </div>
            <div class="text-sm font-bold opacity-80 mt-1 pl-1">
              {{ getWeatherInfo(weatherNow.weather_code).label }}
            </div>
          </div>
        </div>
        <div class="flex flex-col gap-2 text-xs font-bold opacity-60">
          <div class="flex items-center gap-2">
            <PhDrop size="14" weight="bold"/>
            {{ weatherNow.relative_humidity_2m }}%
          </div>
          <div class="flex items-center gap-2">
            <PhWind size="14" weight="bold"/>
            {{ weatherNow.wind_speed_10m }}km/h
          </div>
        </div>
      </div>

      <div class="bg-[var(--sidebar-active)] rounded-xl p-3 mb-4 border border-[var(--glass-border)]">
        <div class="text-xs font-bold text-[var(--text-primary)] leading-relaxed">{{ advice }}</div>
        <div class="mt-2 pt-2 border-t border-[var(--glass-border)] flex gap-2 overflow-hidden text-[10px]">
          <span class="text-green-600 font-bold whitespace-nowrap truncate">宜: {{ lunarData.yi }}</span>
        </div>
      </div>

      <div class="flex-1 w-full overflow-x-auto no-scrollbar pb-4 min-h-[100px]">
        <div class="flex gap-4 min-w-max px-2">
          <div v-for="day in dailyForecast" :key="day.date"
               class="flex flex-col items-center gap-1 min-w-[50px] p-2 rounded-xl hover:bg-[var(--sidebar-active)] transition-colors">
            <span class="text-[10px] opacity-60 font-bold">{{ day.week }}</span>
            <component :is="day.icon" size="24" weight="duotone" :style="{ color: day.color }"/>
            <div class="flex flex-col items-center text-xs font-bold font-tech mt-1">
              <span>{{ day.max }}°</span>
              <span class="opacity-40 text-[10px]">{{ day.min }}°</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-10">
      <p class="text-xs opacity-60 mb-2">{{ errorMsg || '暂无天气数据' }}</p>
      <button @click="forceRefresh"
              class="px-4 py-2 bg-[var(--accent-color)] text-white rounded-lg text-xs font-bold shadow-lg hover:brightness-110">
        重试
      </button>
    </div>
  </div>
</template>