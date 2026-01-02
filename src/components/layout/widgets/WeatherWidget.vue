<script setup lang="ts">
import type { SiteItem } from '../../../core/config/types';

defineProps<{ item: SiteItem }>();
</script>

<template>
  <div class="flex flex-col items-center justify-center w-full h-full">
    <div class="text-3xl mb-1">🌤</div>
    <div class="text-xl font-bold">24°C</div>
    <div class="text-xs opacity-60">晴朗 / 上海</div>
  </div>
</template>