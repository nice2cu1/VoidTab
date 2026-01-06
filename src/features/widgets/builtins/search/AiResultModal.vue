<script setup lang="ts">
import {ref, watch, onUnmounted} from 'vue';
import {PhRobot, PhX} from '@phosphor-icons/vue';

const props = defineProps<{ show: boolean; query: string }>();
const emit = defineEmits(['close']);

const displayedText = ref('');
const isTyping = ref(false);
let typingInterval: any = null;

// 模拟回答库
const mockAnswers = [
  "根据您的查询，建议优先检查 VoidTab 的核心配置文件 `src/core/config`。",
  "这是一个很好的问题。基于 Vue 3 生态，推荐结合 Pinia 进行状态管理。",
  "正在为您检索... 看起来您正在寻找关于 Grid Layout 的文档。CSS Grid 提供了强大的二维布局能力。",
];

const startTyping = () => {
  displayedText.value = '';
  isTyping.value = true;
  const fullText = `[AI 分析: "${props.query}"]\n\n` +
      mockAnswers[Math.floor(Math.random() * mockAnswers.length)] +
      "\n\n(注: 这是前端模拟的打字机效果，尚未接入真实 API)";

  let i = 0;
  clearInterval(typingInterval);
  typingInterval = setInterval(() => {
    if (i < fullText.length) {
      displayedText.value += fullText.charAt(i);
      i++;
    } else {
      clearInterval(typingInterval);
      isTyping.value = false;
    }
  }, 30);
};

watch(() => props.show, (val) => {
  if (val) startTyping();
  else {
    clearInterval(typingInterval);
    displayedText.value = '';
  }
});

onUnmounted(() => clearInterval(typingInterval));
</script>

<template>
  <Transition name="fade">
    <div v-if="show" class="fixed inset-0 z-[999] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="emit('close')"></div>
      <div
          class="relative w-full max-w-2xl bg-[#1e1e1e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col min-h-[300px]">

        <div class="h-12 border-b border-white/10 flex items-center justify-between px-4 bg-white/5">
          <div class="flex items-center gap-2 text-purple-400">
            <PhRobot size="20" weight="duotone"/>
            <span class="font-bold text-xs tracking-wider">AI ASSISTANT</span>
          </div>
          <button @click="emit('close')" class="text-white/40 hover:text-white transition">
            <PhX size="18"/>
          </button>
        </div>

        <div class="p-6 font-mono text-sm leading-relaxed text-gray-300">
          <div class="whitespace-pre-wrap">{{ displayedText }}<span v-if="isTyping"
                                                                    class="animate-pulse inline-block w-2 h-4 bg-purple-500 ml-1 align-middle"></span>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>