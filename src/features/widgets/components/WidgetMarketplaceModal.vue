<script setup lang="ts">
import {ref, computed} from 'vue';
import {widgetRegistry} from '../../../core/registry/widgets.ts';
import {
  PhX,
  PhMagnifyingGlass,
  PhLayout,
  PhClock,
  PhCloudSun,
  PhCalendar,
  PhGameController,
} from '@phosphor-icons/vue';

defineProps<{ show: boolean }>();
const emit = defineEmits(['close', 'select']);

const searchQuery = ref('');
const activeCategory = ref('all');

/** ✅ 分类图标映射（只维护一次） */
const categoryIconMap: Record<string, any> = {
  all: PhLayout,
  time: PhClock,
  system: PhCloudSun,
  tool: PhCalendar,
  game: PhGameController,
};

/** ✅ 分类名称映射（只维护一次） */
const categoryLabelMap: Record<string, string> = {
  all: '全部',
  time: '时间日期',
  system: '系统监控',
  tool: '效率工具',
  game: '游戏工具',
};

/** ✅ 分类列表自动生成：registry 里出现过的分类才显示 */
const categories = computed(() => {
  const set = new Set<string>(widgetRegistry.map((w) => w.category).filter(Boolean));
  const ordered = ['time', 'system', 'tool', 'game']; // 你希望的排序

  const out: Array<{ id: string; label: string; icon: any }> = [
    {id: 'all', label: categoryLabelMap.all, icon: categoryIconMap.all},
  ];

  for (const id of ordered) {
    if (set.has(id)) out.push({id, label: categoryLabelMap[id] || id, icon: categoryIconMap[id] || PhLayout});
  }

  // 如果未来你加了新 category（不在 ordered 里），也能自动出现
  for (const id of Array.from(set)) {
    if (id === 'all') continue;
    if (ordered.includes(id)) continue;
    out.push({id, label: categoryLabelMap[id] || id, icon: categoryIconMap[id] || PhLayout});
  }

  return out;
});

/** ✅ 搜索 + 分类筛选 */
const filteredWidgets = computed(() => {
  const search = searchQuery.value.trim().toLowerCase();

  return widgetRegistry.filter((w) => {
    const matchesCategory = activeCategory.value === 'all' || w.category === activeCategory.value;

    if (!search) return matchesCategory;

    // 搜索范围：label / description / type 都可搜
    const haystack = `${w.label} ${w.description} ${w.type}`.toLowerCase();
    const matchesSearch = haystack.includes(search);

    return matchesCategory && matchesSearch;
  });
});

const select = (type: string) => {
  emit('select', type);
  emit('close');
};
</script>

<template>
  <Transition name="modal">
    <div v-if="show" class="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-md" @click="$emit('close')"></div>

      <div
          class="relative bg-[#1a1a1a] border border-white/10 rounded-[28px] w-[800px] h-[550px] shadow-2xl flex overflow-hidden flex-col md:flex-row transform transition-all"
          @click.stop
      >
        <!-- Left: Categories -->
        <div class="w-full md:w-48 bg-white/5 border-r border-white/5 p-6 flex flex-col gap-2">
          <div class="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-4 px-2">分类查询</div>

          <button
              v-for="cat in categories"
              :key="cat.id"
              @click="activeCategory = cat.id"
              class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium"
              :class="[
              activeCategory === cat.id
                ? 'bg-[var(--accent-color)] text-white shadow-lg shadow-[var(--accent-color)]/20'
                : 'text-white/60 hover:bg-white/5 hover:text-white'
            ]"
          >
            <component :is="cat.icon" :size="18"/>
            {{ cat.label }}
          </button>
        </div>

        <!-- Right: List -->
        <div class="flex-1 flex flex-col min-w-0 bg-[#121212]/50">
          <div class="p-6 border-b border-white/5 flex items-center justify-between gap-4">
            <div class="relative flex-1">
              <PhMagnifyingGlass :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"/>
              <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="搜索组件..."
                  class="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[var(--accent-color)]/50 transition-all"
              />
            </div>

            <button
                @click="$emit('close')"
                class="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-full transition-all"
            >
              <PhX :size="20"/>
            </button>
          </div>

          <div class="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <button
                  v-for="widget in filteredWidgets"
                  :key="widget.type"
                  @click="select(widget.type)"
                  class="group relative flex flex-col p-5 bg-white/5 hover:bg-white/[0.08] rounded-2xl border border-white/5 hover:border-[var(--accent-color)]/30 transition-all text-left overflow-hidden"
              >
                <div
                    class="absolute -right-4 -top-4 w-24 h-24 bg-[var(--accent-color)]/5 rounded-full blur-2xl group-hover:bg-[var(--accent-color)]/10 transition-all"
                ></div>

                <div class="flex items-start justify-between mb-4">
                  <div
                      class="p-3 rounded-2xl bg-[var(--accent-color)]/10 text-[var(--accent-color)] group-hover:scale-110 transition-transform duration-300"
                  >
                    <PhLayout :size="24" weight="duotone"/>
                  </div>

                  <div
                      class="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] font-mono text-white/40 group-hover:text-[var(--accent-color)] group-hover:border-[var(--accent-color)]/30 transition-all uppercase"
                  >
                    {{ widget.defaultW }} x {{ widget.defaultH }} Grid
                  </div>
                </div>

                <h4 class="text-white font-bold text-lg mb-1.5 group-hover:text-[var(--accent-color)] transition-colors">
                  {{ widget.label }}
                </h4>
                <p class="text-xs text-white/40 leading-relaxed line-clamp-2">{{ widget.description }}</p>

                <div
                    class="mt-4 flex items-center gap-1.5 text-[10px] font-bold text-[var(--accent-color)] opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <span>立即添加</span>
                  <div class="w-1 h-1 rounded-full bg-current"></div>
                </div>
              </button>
            </div>

            <div v-if="filteredWidgets.length === 0"
                 class="h-full flex flex-col items-center justify-center opacity-20">
              <PhLayout :size="48" weight="thin"/>
              <p class="mt-2 text-sm">没有找到相关组件</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(20px);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
