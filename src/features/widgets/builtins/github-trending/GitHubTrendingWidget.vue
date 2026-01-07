<script setup lang="ts">
import {ref, computed, onMounted} from 'vue';
import type {SiteItem} from '../../../../core/config/types.ts';
import {PhStar, PhSpinner, PhGithubLogo, PhClockClockwise} from '@phosphor-icons/vue';
import GithubTrendModal from './GithubTrendModal.vue';

const props = defineProps<{ item: SiteItem }>();
const trends = ref<any[]>([]);
const isLoading = ref(true);
const showModal = ref(false);

const CACHE_KEY = 'void_github_trends_data';
const TIMESTAMP_KEY = 'void_github_trends_ts';
const EXPIRE_TIME = 2 * 60 * 60 * 1000; // 2小时

const fetchTrends = async (force = false) => {
  const now = Date.now();
  const cachedData = localStorage.getItem(CACHE_KEY);
  const lastTs = localStorage.getItem(TIMESTAMP_KEY);

  if (!force && cachedData && lastTs && (now - parseInt(lastTs) < EXPIRE_TIME)) {
    trends.value = JSON.parse(cachedData);
    isLoading.value = false;
    return;
  }

  try {
    isLoading.value = true;
    const res = await fetch(`https://api.github.com/search/repositories?q=created:>2025-12-01&sort=stars&order=desc&per_page=15`);
    const data = await res.json();
    const items = data.items || [];

    trends.value = items;
    localStorage.setItem(CACHE_KEY, JSON.stringify(items));
    localStorage.setItem(TIMESTAMP_KEY, now.toString());
  } catch (e) {
    console.error("GitHub API Error");
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => fetchTrends());

const layout = computed(() => {
  const w = props.item?.w ?? 2;
  const h = props.item?.h ?? 2;
  return {
    isMini: w === 1 && h === 1,
    isLarge: w >= 2 && h >= 2
  };
});
</script>

<template>
  <div
      class="gh-card w-full h-full relative flex flex-col rounded-[22px] overflow-hidden cursor-pointer select-none"
      @click="showModal = true"
  >
    <!-- Header -->
    <div
        v-if="!layout.isMini"
        class="gh-header px-4 py-3 flex items-center justify-between shrink-0"
    >
      <div class="flex items-center gap-2 min-w-0">
        <PhGithubLogo size="16" weight="fill" class="gh-accent shrink-0"/>
        <span class="gh-kicker text-[10px] font-bold tracking-widest uppercase truncate">
          Trending
        </span>
      </div>
      <PhClockClockwise v-if="isLoading" size="12" class="gh-muted animate-spin"/>
    </div>

    <!-- Body -->
    <div class="flex-1 p-3 overflow-hidden flex flex-col justify-center">
      <div v-if="isLoading && trends.length === 0" class="flex justify-center">
        <PhSpinner size="20" class="animate-spin gh-accent"/>
      </div>

      <div v-else-if="layout.isMini" class="flex items-center justify-center">
        <PhGithubLogo size="28" class="gh-icon transition-all"/>
      </div>

      <div v-else class="space-y-2">
        <div
            v-for="repo in trends.slice(0, layout.isLarge ? 3 : 1)"
            :key="repo.id"
            class="gh-row p-2 rounded-xl flex justify-between items-center"
        >
          <span class="gh-title text-xs font-bold truncate max-w-[140px] transition-colors">
            {{ repo.name }}
          </span>

          <div class="flex items-center gap-1 text-[10px] font-mono gh-star shrink-0">
            <PhStar weight="fill" size="10"/>
            {{
              repo.stargazers_count > 1000
                  ? (repo.stargazers_count / 1000).toFixed(1) + 'k'
                  : repo.stargazers_count
            }}
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <GithubTrendModal
          v-if="showModal"
          :show="showModal"
          :initialTrends="trends"
          @close="showModal = false"
          @refresh="() => fetchTrends(true)"
      />
    </Teleport>
  </div>
</template>

<style scoped>
/* ---------------------------
   ✅ 统一：跟随全局变量
   - 深色/浅色自动切换
   - 不用 bg-white/xx 这类透明写法
--------------------------- */

.gh-card {
  background: var(--settings-panel); /* ✅ 不透明 */
  border: 1px solid var(--settings-border-soft);
  box-shadow: var(--settings-shadow-soft);
  color: var(--settings-text);
  transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease;
}

.gh-card:hover {
  transform: translateY(-1px);
  border-color: rgba(var(--accent-color-rgb), 0.22);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.22);
}

/* Header 区：用更浅/更深一点的面板色分层 */
.gh-header {
  border-bottom: 1px solid var(--settings-border-soft);
  background: color-mix(in srgb, var(--settings-panel) 88%, var(--settings-surface));
}

/* 文本 */
.gh-kicker {
  color: var(--settings-text-secondary);
}

.gh-muted {
  color: color-mix(in srgb, var(--settings-text) 42%, transparent);
}

.gh-accent {
  color: var(--accent-color);
}

/* mini icon */
.gh-icon {
  color: color-mix(in srgb, var(--settings-text) 16%, transparent);
}

.gh-card:hover .gh-icon {
  color: color-mix(in srgb, var(--settings-text) 55%, transparent);
}

/* 列表行：不透明小卡片 */
.gh-row {
  background: color-mix(in srgb, var(--settings-panel) 92%, var(--settings-surface));
  border: 1px solid var(--settings-border-soft);
  transition: background .18s ease, border-color .18s ease;
}

.gh-row:hover {
  background: color-mix(in srgb, var(--settings-panel) 86%, var(--settings-surface));
  border-color: rgba(var(--accent-color-rgb), 0.18);
}

.gh-title {
  color: color-mix(in srgb, var(--settings-text) 92%, transparent);
}

.gh-row:hover .gh-title {
  color: color-mix(in srgb, var(--accent-color) 92%, var(--settings-text));
}

/* star */
.gh-star {
  color: #fbbf24; /* amber-400 */
}

/* Light mode 下阴影别太黑（更柔和） */
:global(html.light) .gh-card:hover {
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.12);
}
</style>
