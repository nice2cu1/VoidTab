<script setup lang="ts">
import {ref, watch, nextTick} from 'vue';
import {useHistoryStore} from '../../../../stores/useHistoryStore';
import {useConfigStore} from '../../../../stores/useConfigStore';
import ConfirmDialog from '../../../../shared/ui/dialogs/ConfirmDialog.vue';
import {
  PhClockCounterClockwise, PhTrendUp, PhBrain, PhX, PhTrash,
  PhMagnifyingGlass, PhArrowSquareOut, PhSparkle, PhWarning, PhCopy, PhCheckCircle
} from '@phosphor-icons/vue';
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({html: true});

const props = defineProps<{ show: boolean }>();
const emit = defineEmits(['close']);

const store = useHistoryStore();
const config = useConfigStore();

const activeTab = ref<'timeline' | 'stats' | 'ai'>('timeline');
const showAiConfirm = ref(false);
const aiAnalysisResult = ref('');
const isAnalyzing = ref(false);
const showCopySuccess = ref(false);

// 监听弹窗打开
watch(() => props.show, (val) => {
  if (val) {
    store.loadLogs(true);
    store.loadStats();
  }
});

// 滚动加载
const onScroll = (e: Event) => {
  const target = e.target as HTMLElement;
  if (target.scrollTop + target.clientHeight >= target.scrollHeight - 50) {
    store.loadLogs();
  }
};

// 复制结果
const copyResult = () => {
  if (!aiAnalysisResult.value) return;
  navigator.clipboard.writeText(aiAnalysisResult.value);
  showCopySuccess.value = true;
  setTimeout(() => showCopySuccess.value = false, 2000);
};

// AI 分析逻辑 (限制字数 + 风格化Prompt)
const startAnalysis = async () => {
  showAiConfirm.value = false;

  const {apiKey, baseUrl, model} = config.config.ai;
  if (!baseUrl || (!apiKey && !baseUrl.includes('localhost'))) {
    alert("请先在设置中配置 AI Key 和 URL");
    return;
  }

  isAnalyzing.value = true;
  aiAnalysisResult.value = '';

  // 采样数据
  const dataSample = store.logs.slice(0, 50).map(l =>
      `${l.type}: ${l.content}`
  ).join('\n');

  // Prompt 限制字数与格式
  const prompt = `分析以下用户的近期操作历史。请用**100字以内**的一段话，精准概括该用户的**核心兴趣**和**当前状态**。风格要**简洁、极客、有洞察力**。使用Markdown加粗关键信息。\n\n数据：\n${dataSample}`;

  try {
    let endpoint = baseUrl.trim().replace(/\/+$/, '');
    if (!endpoint.endsWith('/chat/completions')) endpoint = `${endpoint}/chat/completions`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}`},
      body: JSON.stringify({
        model: model || 'deepseek-chat',
        messages: [{role: "user", content: prompt}],
        stream: true
      })
    });

    if (!response.ok) throw new Error(response.statusText);

    const reader = response.body?.getReader();
    const decoder = new TextDecoder('utf-8');

    while (true) {
      const {done, value} = await reader!.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const data = JSON.parse(line.slice(6));
            aiAnalysisResult.value += data.choices[0]?.delta?.content || '';
            // 滚动到底部
            await nextTick();
            const container = document.getElementById('ai-result-box');
            if (container) container.scrollTop = container.scrollHeight;
          } catch {
          }
        }
      }
    }
  } catch (e: any) {
    aiAnalysisResult.value = `Error: ${e.message}`;
  } finally {
    isAnalyzing.value = false;
  }
};

const tabs = [
  {id: 'timeline', label: '时间轴', icon: PhClockCounterClockwise},
  {id: 'stats', label: '频率', icon: PhTrendUp},
  {id: 'ai', label: 'AI 洞察', icon: PhBrain},
];

const getIcon = (type: string) => {
  if (type === 'search') return PhMagnifyingGlass;
  if (type === 'goto') return PhArrowSquareOut;
  return PhSparkle;
};
</script>

<template>
  <Transition name="fade">
    <div v-if="show" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" @click="emit('close')"></div>

      <div
          class="relative w-full max-w-4xl h-[80vh] bg-[#121212] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-gray-200">

        <div
            class="h-16 border-b border-white/10 flex items-center justify-between px-6 shrink-0 bg-white/5 backdrop-blur-xl z-20">
          <div class="flex gap-1 bg-black/40 p-1 rounded-lg border border-white/5">
            <button v-for="tab in tabs" :key="tab.id"
                    @click="activeTab = tab.id as any"
                    class="px-4 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-all duration-300 relative overflow-hidden group"
                    :class="activeTab === tab.id ? 'text-white' : 'text-white/40 hover:text-white/80'">

              <div v-if="activeTab === tab.id"
                   class="absolute inset-0 bg-gradient-to-r from-[var(--accent-color)] to-purple-600 opacity-80 rounded-md"></div>

              <component :is="tab.icon" size="16" class="relative z-10"/>
              <span class="relative z-10">{{ tab.label }}</span>
            </button>
          </div>
          <button @click="emit('close')"
                  class="p-2 hover:bg-white/10 rounded-full transition text-white/50 hover:text-white">
            <PhX size="20"/>
          </button>
        </div>

        <div class="flex-1 overflow-hidden relative bg-gradient-to-b from-[#121212] to-[#0a0a0a]">

          <div v-if="activeTab === 'timeline'" class="h-full overflow-y-auto p-6 scroll-smooth custom-scroll"
               @scroll="onScroll">
            <div v-if="store.logs.length === 0"
                 class="text-center text-white/30 py-20 flex flex-col items-center gap-2">
              <PhClockCounterClockwise size="48" class="opacity-20"/>
              <span>暂无历史记录</span>
            </div>
            <div class="space-y-3">
              <div v-for="log in store.logs" :key="log.id"
                   class="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all group border border-white/5 hover:border-white/10 hover:translate-x-1">

                <div
                    class="w-10 h-10 rounded-full flex items-center justify-center bg-black/40 text-[var(--accent-color)] ring-1 ring-white/5">
                  <component :is="getIcon(log.type)" size="18"/>
                </div>

                <div class="flex-1 min-w-0">
                  <div class="text-sm font-bold text-gray-200 truncate group-hover:text-white transition-colors">
                    {{ log.content }}
                  </div>
                  <div class="text-xs text-white/30 flex items-center gap-2 mt-0.5">
                    <span>{{ new Date(log.timestamp).toLocaleString() }}</span>
                    <span class="px-1.5 py-0.5 rounded-full bg-white/5 text-[10px] uppercase">{{ log.type }}</span>
                  </div>
                </div>

                <button @click="store.removeLog(log.id)"
                        class="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all transform hover:scale-110">
                  <PhTrash size="18"/>
                </button>
              </div>
              <div v-if="store.isLoading" class="text-center text-xs text-white/30 py-4 animate-pulse">加载更多记录...
              </div>
            </div>
          </div>

          <div v-else-if="activeTab === 'stats'" class="h-full overflow-y-auto p-6 custom-scroll">
            <div v-if="store.stats.length === 0" class="text-center text-white/30 py-20">暂无数据</div>
            <div v-for="(item, idx) in store.stats.slice(0, 50)" :key="item.content" class="mb-5 group">
              <div class="flex justify-between text-sm mb-2 px-1 items-end">
                      <span class="font-bold text-gray-200 flex items-center gap-3 max-w-[70%] truncate">
                         <span
                             class="w-6 h-6 rounded bg-white/5 text-xs flex items-center justify-center font-mono text-white/50 group-hover:text-[var(--accent-color)] group-hover:bg-[var(--accent-color)]/10 transition-colors">{{
                             idx + 1
                           }}</span>
                         {{ item.content }}
                      </span>
                <div class="flex items-center gap-4 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                  <span class="text-[var(--accent-color)] font-mono text-xs font-bold">{{ item.count }} 次</span>
                  <button @click="store.removeByContent(item.content)"
                          class="text-xs text-red-400 hover:text-red-300 hover:underline">删除
                  </button>
                </div>
              </div>
              <div class="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                    class="h-full bg-gradient-to-r from-[var(--accent-color)] to-purple-500 transition-all duration-1000 ease-out"
                    :style="{ width: (item.count / store.stats[0].count * 100) + '%' }"></div>
              </div>
            </div>
          </div>

          <div v-else class="h-full overflow-y-auto p-0 flex flex-col relative custom-scroll">

            <div v-if="!aiAnalysisResult && !isAnalyzing"
                 class="flex-1 flex flex-col items-center justify-center text-center p-8 animate-fade-in">
              <div
                  class="w-20 h-20 rounded-full bg-gradient-to-tr from-[var(--accent-color)] to-purple-600 flex items-center justify-center shadow-[0_0_40px_rgba(var(--accent-rgb),0.3)] mb-6">
                <PhBrain size="40" class="text-white"/>
              </div>
              <h3 class="text-2xl font-bold text-white mb-2 tracking-tight">AI 智能洞察</h3>
              <p class="text-sm text-white/40 mb-8 max-w-sm leading-relaxed">AI
                将深度分析您的搜索历史，为您生成个性化的兴趣画像与时间管理建议。</p>

              <button @click="showAiConfirm = true"
                      class="group px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-all shadow-xl shadow-white/10 flex items-center gap-2">
                <PhSparkle weight="fill" class="text-purple-600 group-hover:animate-spin-slow"/>
                开始分析
              </button>
            </div>

            <div v-if="isAnalyzing" class="flex-1 flex flex-col items-center justify-center p-8">
              <div class="relative">
                <div
                    class="w-12 h-12 border-4 border-white/10 border-t-[var(--accent-color)] rounded-full animate-spin"></div>
                <div class="absolute inset-0 flex items-center justify-center">
                  <PhSparkle size="16" class="text-white/50 animate-pulse"/>
                </div>
              </div>
              <p class="mt-4 text-sm font-mono text-[var(--accent-color)] animate-pulse">ANALYZING DATA STREAMS...</p>
            </div>

            <div v-if="aiAnalysisResult" class="flex-1 p-8">
              <div class="relative max-w-3xl mx-auto">

                <div
                    class="absolute -inset-1 bg-gradient-to-r from-[var(--accent-color)] to-purple-600 rounded-2xl opacity-20 blur"></div>

                <div class="relative bg-[#1a1a1a] rounded-xl border border-white/10 shadow-2xl overflow-hidden">

                  <div class="h-10 bg-black/40 border-b border-white/5 flex items-center justify-between px-4">
                    <div class="flex items-center gap-2">
                      <div class="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                      <div class="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                      <div class="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
                    </div>
                    <button @click="copyResult"
                            class="flex items-center gap-1.5 text-[10px] font-bold text-white/40 hover:text-white transition uppercase tracking-wider">
                      <component :is="showCopySuccess ? PhCheckCircle : PhCopy" size="14"/>
                      {{ showCopySuccess ? 'COPIED' : 'COPY REPORT' }}
                    </button>
                  </div>

                  <div id="ai-result-box" class="p-8 max-h-[60vh] overflow-y-auto custom-scroll">
                    <div class="markdown-body font-sans text-sm leading-7 text-gray-300"
                         v-html="md.render(aiAnalysisResult)"></div>
                    <div class="mt-2 w-2 h-5 bg-[var(--accent-color)] animate-blink inline-block"
                         v-if="isAnalyzing"></div>
                  </div>

                  <div class="h-10 bg-black/40 border-t border-white/5 flex items-center justify-center">
                    <button @click="aiAnalysisResult = ''; isAnalyzing = false"
                            class="text-xs text-[var(--accent-color)] hover:text-white transition flex items-center gap-2">
                      <PhArrowSquareOut/>
                      生成新报告
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>


  </Transition>
  <ConfirmDialog
      :show="showAiConfirm"
      title="隐私提醒"
      :message="['您的历史记录数据将被发送给 AI 服务商进行分析。', '系统本身不会存储分析结果，请确保记录中不包含敏感隐私信息。']"
      confirmText="我已知晓，继续"
      @confirm="startAnalysis"
      @cancel="showAiConfirm = false"
  >
    <template #icon>
      <PhWarning class="text-orange-500" size="32" weight="duotone"/>
    </template>
  </ConfirmDialog>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.custom-scroll::-webkit-scrollbar {
  width: 4px;
}

.custom-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.custom-scroll::-webkit-scrollbar-track {
  background: transparent;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

.animate-blink {
  animation: blink 1s step-end infinite;
}

/* Markdown 样式增强 */
:deep(.markdown-body) {
  font-family: 'Inter', system-ui, sans-serif;
}

:deep(.markdown-body h1), :deep(.markdown-body h2) {
  color: white;
  margin: 1.5em 0 0.8em;
  font-weight: 800;
  font-size: 1.1rem;
  letter-spacing: -0.02em;
}

:deep(.markdown-body p) {
  margin-bottom: 1.2em;
  color: #a1a1aa;
}

:deep(.markdown-body strong) {
  color: var(--accent-color);
  font-weight: 700;
}

:deep(.markdown-body ul) {
  padding-left: 1.2em;
  margin-bottom: 1.2em;
}

:deep(.markdown-body li) {
  margin-bottom: 0.4em;
  color: #d4d4d8;
  position: relative;
}

:deep(.markdown-body li::marker) {
  color: var(--accent-color);
}
</style>