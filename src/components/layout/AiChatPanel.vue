<script setup lang="ts">
import {ref, computed, onMounted, nextTick, watch} from 'vue';
import {useConfigStore} from '../../stores/useConfigStore';
import {useAiStore} from '../../stores/useAiStores.ts';
import {
  PhPaperPlaneRight, PhPlus, PhTrash, PhX, PhDownloadSimple,
  PhChatCircleText, PhRobot, PhUser, PhCopy,
} from '@phosphor-icons/vue';

// Markdown libraries (动态导入以优化性能)
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css'; // 代码高亮样式

 defineProps<{ isOpen: boolean }>();
const emit = defineEmits(['close']);

const configStore = useConfigStore();
const aiStore = useAiStore();

const userInput = ref('');
const isSending = ref(false);
const messagesContainer = ref<HTMLElement | null>(null);
const mdRenderer = ref<MarkdownIt | null>(null);

// 初始化 Markdown 渲染器
onMounted(async () => {
  aiStore.loadHistory();
  if (aiStore.sessions.length === 0) {
    aiStore.createSession();
  }

  mdRenderer.value = new MarkdownIt({
    html: false,
    linkify: true,
    typographer: true,
    highlight: function (str, lang) {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return `<pre class="hljs"><code>${hljs.highlight(str, {
            language: lang,
            ignoreIllegals: true
          }).value}</code></pre>`;
        } catch (__) {
        }
      }
      return `<pre class="hljs"><code>${mdRenderer.value?.utils.escapeHtml(str)}</code></pre>`;
    }
  });
});

const currentSession = computed(() =>
    aiStore.sessions.find(s => s.id === aiStore.currentSessionId)
);

// 滚动到底部
const scrollToBottom = async () => {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

// 监听会话切换或消息增加，自动滚动
watch(() => currentSession.value?.messages.length, scrollToBottom);
watch(() => aiStore.currentSessionId, scrollToBottom);

// 调用 DeepSeek API
const sendMessage = async () => {
  const text = userInput.value.trim();
  const apiKey = configStore.config.ai.apiKey;

  if (!text) return;
  if (!apiKey) {
    alert('请先在右侧设置中输入 DeepSeek API Key');
    return;
  }

  // 1. 用户消息上屏
  if (!currentSession.value) aiStore.createSession();
  aiStore.addMessage(aiStore.currentSessionId, 'user', text);
  userInput.value = '';
  isSending.value = true;
  await scrollToBottom();

  // 2. 准备上下文
  const history = currentSession.value!.messages
      .slice(-configStore.config.ai.maxHistory) // 仅携带最近N条
      .map(m => ({role: m.role, content: m.content}));

  // 3. AI 消息占位
  const aiMsg = aiStore.addMessage(aiStore.currentSessionId, 'assistant', '');
  const aiMsgId = aiMsg!.id;
  let fullContent = '';

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: configStore.config.ai.model || 'deepseek-chat',
        messages: [
          {role: "system", content: "You are a helpful assistant in a browser new tab dashboard."},
          ...history
        ],
        stream: true // 流式输出
      })
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);

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
            const content = data.choices[0]?.delta?.content || '';
            fullContent += content;
            // 实时更新 Store
            aiStore.updateMessageContent(aiStore.currentSessionId, aiMsgId, fullContent, 'loading');
            // 简单防抖滚动，避免性能损耗太高
            if (fullContent.length % 5 === 0) scrollToBottom();
          } catch (e) {
            console.warn('Parse stream error', e);
          }
        }
      }
    }
    // 完成
    aiStore.updateMessageContent(aiStore.currentSessionId, aiMsgId, fullContent, 'done');

  } catch (e: any) {
    aiStore.updateMessageContent(aiStore.currentSessionId, aiMsgId, `Error: ${e.message}`, 'error');
  } finally {
    isSending.value = false;
    scrollToBottom();
  }
};

// 渲染 Markdown
const renderMd = (text: string) => {
  if (!mdRenderer.value) return text;
  return mdRenderer.value.render(text);
};

// 复制功能
const copyText = (text: string) => {
  navigator.clipboard.writeText(text);
};
</script>

<template>
  <div
      v-if="isOpen"
      class="fixed inset-0 z-[100] flex justify-end bg-black/20 backdrop-blur-[2px]"
      @click.self="emit('close')"
  >
    <div
        class="w-full md:w-[800px] h-full bg-[#f5f5f7] dark:bg-[#121212] shadow-2xl flex overflow-hidden border-l border-white/10 transition-transform duration-300"
    >

      <div class="w-64 bg-gray-50 dark:bg-[#1a1a1a] flex flex-col border-r border-gray-200 dark:border-white/5">
        <div class="p-4 border-b border-gray-200 dark:border-white/5 flex items-center justify-between">
          <span class="font-bold text-sm">历史对话</span>
          <button @click="aiStore.createSession()"
                  class="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition">
            <PhPlus size="16"/>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-2 space-y-1">
          <div
              v-for="session in aiStore.sessions"
              :key="session.id"
              @click="aiStore.currentSessionId = session.id"
              class="group p-3 rounded-xl cursor-pointer text-sm transition-all flex items-center justify-between"
              :class="aiStore.currentSessionId === session.id
              ? 'bg-[var(--accent-color)] text-white shadow-md'
              : 'hover:bg-gray-200 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400'"
          >
            <div class="truncate flex-1 pr-2">{{ session.title }}</div>
            <button
                @click.stop="aiStore.deleteSession(session.id)"
                class="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/20 rounded"
            >
              <PhTrash size="14"/>
            </button>
          </div>
        </div>

        <div class="p-4 border-t border-gray-200 dark:border-white/5 space-y-3">
          <div class="space-y-1">
            <label class="text-[10px] uppercase font-bold opacity-50">API Key (DeepSeek)</label>
            <input
                v-model="configStore.config.ai.apiKey"
                @change="configStore.saveConfig()"
                type="password"
                placeholder="sk-..."
                class="w-full bg-gray-200 dark:bg-white/5 rounded px-2 py-1 text-xs outline-none focus:ring-1 ring-[var(--accent-color)]"
            />
          </div>
          <div class="flex gap-2">
            <button @click="aiStore.exportData()"
                    class="flex-1 py-1.5 text-xs bg-gray-200 dark:bg-white/5 rounded flex items-center justify-center gap-1 hover:brightness-95">
              <PhDownloadSimple/>
              导出
            </button>
            <button @click="aiStore.clearHistory()"
                    class="flex-1 py-1.5 text-xs bg-red-500/10 text-red-500 rounded flex items-center justify-center gap-1 hover:bg-red-500/20">
              <PhTrash/>
              清空
            </button>
          </div>
        </div>
      </div>

      <div class="flex-1 flex flex-col relative bg-white dark:bg-[#121212]">
        <div class="h-14 border-b border-gray-100 dark:border-white/5 flex items-center justify-between px-6 shrink-0">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse" v-if="isSending"></div>
            <span class="font-bold">{{ currentSession?.title || '新对话' }}</span>
            <span class="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-white/10 opacity-60">DeepSeek-V3</span>
          </div>
          <button @click="emit('close')" class="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition">
            <PhX size="20"/>
          </button>
        </div>

        <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth">
          <template v-if="currentSession && currentSession.messages.length > 0">
            <div
                v-for="msg in currentSession.messages"
                :key="msg.id"
                class="flex gap-4"
                :class="msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'"
            >
              <div
                  class="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  :class="msg.role === 'user' ? 'bg-gray-200 dark:bg-white/10' : 'bg-[var(--accent-color)] text-white'"
              >
                <component :is="msg.role === 'user' ? PhUser : PhRobot" size="18" weight="fill"/>
              </div>

              <div class="max-w-[85%] group relative">
                <div
                    class="py-3 px-4 rounded-2xl text-sm leading-relaxed shadow-sm overflow-hidden"
                    :class="[
                       msg.role === 'user'
                         ? 'bg-[var(--accent-color)] text-white rounded-tr-sm'
                         : 'bg-gray-50 dark:bg-[#1e1e1e] border border-gray-100 dark:border-white/5 rounded-tl-sm markdown-body'
                     ]"
                >
                  <div v-if="msg.status === 'loading' && !msg.content" class="flex gap-1 py-1">
                    <div class="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></div>
                    <div class="w-1.5 h-1.5 bg-current rounded-full animate-bounce delay-100"></div>
                    <div class="w-1.5 h-1.5 bg-current rounded-full animate-bounce delay-200"></div>
                  </div>

                  <div v-if="msg.role === 'user'">{{ msg.content }}</div>
                  <div v-else v-html="renderMd(msg.content)"></div>
                </div>

                <button
                    @click="copyText(msg.content)"
                    class="absolute top-2 opacity-0 group-hover:opacity-100 transition p-1.5 rounded-lg bg-white/80 dark:bg-black/80 backdrop-blur shadow-sm text-xs"
                    :class="msg.role === 'user' ? '-left-8' : '-right-8'"
                    title="复制原始内容"
                >
                  <PhCopy/>
                </button>
              </div>
            </div>
          </template>

          <div v-else class="h-full flex flex-col items-center justify-center opacity-40 gap-4">
            <PhChatCircleText size="64" weight="thin"/>
            <p>开始一个新的对话...</p>
          </div>
        </div>

        <div class="p-4 md:p-6 bg-white dark:bg-[#121212]">
          <div
              class="relative rounded-2xl bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 focus-within:ring-2 focus-within:ring-[var(--accent-color)] transition-all">
             <textarea
                 v-model="userInput"
                 @keydown.enter.prevent="!isSending && sendMessage()"
                 placeholder="输入消息... (Enter 发送)"
                 class="w-full bg-transparent p-4 min-h-[50px] max-h-[150px] resize-none outline-none text-sm"
                 rows="1"
             ></textarea>
            <button
                @click="sendMessage"
                :disabled="!userInput.trim() || isSending"
                class="absolute right-2 bottom-2 p-2 rounded-xl bg-[var(--accent-color)] text-white disabled:opacity-50 disabled:cursor-not-allowed transition hover:brightness-110"
            >
              <PhPaperPlaneRight weight="fill"/>
            </button>
          </div>
          <div class="text-[10px] text-center mt-2 opacity-40">
            AI Generate content may be inaccurate.
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style>
/* Markdown 样式微调 (配合 highlight.js) */
.markdown-body pre {
  background: #282c34;
  color: #abb2bf;
  padding: 1em;
  border-radius: 8px;
  overflow-x: auto;
  margin: 0.5em 0;
}

.markdown-body code {
  font-family: 'Fira Code', monospace;
  font-size: 0.9em;
}

.markdown-body p {
  margin-bottom: 0.5em;
}

.markdown-body ul, .markdown-body ol {
  padding-left: 1.2em;
  margin-bottom: 0.5em;
}
</style>