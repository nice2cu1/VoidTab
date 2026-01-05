<script setup lang="ts">
import {ref, computed} from 'vue';
import {useLocalStorage, useClipboard, useDateFormat} from '@vueuse/core';
import {
  PhX, PhClipboard, PhTrash, PhCheckCircle,
  PhWarningCircle, PhHourglassHigh, PhCode
} from '@phosphor-icons/vue';

defineProps<{ show: boolean }>();
const emit = defineEmits(['close']);

// === 状态 ===
const rawToken = useLocalStorage('voidtab_jwt_token', '');
const activeTab = ref<'header' | 'payload'>('payload');

// === 解析逻辑 ===
const parseJWT = (token: string) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return {header: null, payload: null, valid: false};

    const decodePart = (str: string) => JSON.parse(atob(str.replace(/-/g, '+').replace(/_/g, '/')));

    return {
      header: decodePart(parts[0]),
      payload: decodePart(parts[1]),
      valid: true
    };
  } catch (e) {
    return {header: null, payload: null, valid: false};
  }
};

const decodedData = computed(() => parseJWT(rawToken.value));

// === 倒计时逻辑 ===
const now = ref(Math.floor(Date.now() / 1000));
// 简单的定时器更新 UI
setInterval(() => {
  now.value = Math.floor(Date.now() / 1000);
}, 1000);

const expiryInfo = computed(() => {
  const exp = decodedData.value.payload?.exp;
  if (!exp) return {status: 'NO_EXP', percent: 100, text: 'No Expiration'};

  const iat = decodedData.value.payload?.iat || (exp - 3600); // 默认假设1小时前签发
  const totalDuration = exp - iat;
  const timeLeft = exp - now.value;

  if (timeLeft <= 0) return {status: 'EXPIRED', percent: 0, text: 'EXPIRED'};

  const percent = Math.max(0, Math.min(100, (timeLeft / totalDuration) * 100));

  // 格式化剩余时间
  const h = Math.floor(timeLeft / 3600);
  const m = Math.floor((timeLeft % 3600) / 60);
  const s = timeLeft % 60;

  return {
    status: 'ACTIVE',
    percent,
    text: `${h}h ${m}m ${s}s Remaining`
  };
});

// === 操作 ===
const {copy, copied} = useClipboard();
const pasteFromClipboard = async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (text) rawToken.value = text.trim();
  } catch (e) {
    console.error(e);
  }
};

// === 简单的高亮 (不依赖大库) ===
const syntaxHighlight = (json: any) => {
  if (!json) return '';
  let str = JSON.stringify(json, null, 2);
  str = str.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');
  return str.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
    let cls = 'text-purple-400'; // number
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = 'text-cyan-400 font-bold'; // key
      } else {
        cls = 'text-green-400'; // string
      }
    } else if (/true|false/.test(match)) {
      cls = 'text-blue-400'; // boolean
    } else if (/null/.test(match)) {
      cls = 'text-gray-500'; // null
    }
    return `<span class="${cls}">${match}</span>`;
  });
};
</script>

<template>
  <Transition name="holo-fade">
    <div v-if="show" class="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/80 backdrop-blur-md" @click="emit('close')"></div>

      <div
          class="relative w-full max-w-5xl h-[80vh] flex flex-col md:flex-row bg-[#050a14] border border-[#00f3ff]/30 rounded-lg shadow-[0_0_50px_rgba(0,243,255,0.1)] overflow-hidden font-mono text-[#00f3ff]">

        <div class="absolute inset-0 pointer-events-none holo-grid opacity-10"></div>
        <div
            class="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-[#00f3ff]/5"></div>

        <div
            class="w-full md:w-[350px] border-b md:border-b-0 md:border-r border-[#00f3ff]/20 flex flex-col z-10 bg-[#050a14]/90">

          <div class="p-4 border-b border-[#00f3ff]/20 flex items-center justify-between">
            <h2 class="text-sm font-bold tracking-widest flex items-center gap-2">
              <PhShieldCheck size="18" weight="fill"/>
              JWT SENTRY
            </h2>
            <button @click="emit('close')" class="hover:text-white transition-colors">
              <PhX size="18"/>
            </button>
          </div>

          <div class="p-4 flex-1 flex flex-col min-h-0">
            <div class="flex justify-between items-center mb-2 text-[10px] opacity-60">
              <span>ENCODED TOKEN</span>
              <div class="flex gap-2">
                <button @click="rawToken = ''" class="hover:text-red-400 flex items-center gap-1">
                  <PhTrash/>
                  CLEAR
                </button>
                <button @click="pasteFromClipboard" class="hover:text-white flex items-center gap-1">
                  <PhClipboard/>
                  PASTE
                </button>
              </div>
            </div>
            <textarea
                v-model="rawToken"
                class="w-full flex-1 bg-[#00f3ff]/5 border border-[#00f3ff]/20 rounded p-3 text-[10px] md:text-xs text-gray-300 resize-none outline-none focus:border-[#00f3ff]/60 transition-colors custom-scrollbar break-all"
                placeholder="Paste Bearer Token here..."
            ></textarea>
          </div>

          <div class="p-4 border-t border-[#00f3ff]/20 relative overflow-hidden">
            <div v-if="expiryInfo.status === 'EXPIRED'"
                 class="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <div
                  class="border-4 border-red-500/50 text-red-500/50 text-4xl font-black rotate-[-15deg] p-4 rounded uppercase tracking-widest stamp-anim">
                Access Denied
              </div>
            </div>

            <div class="relative z-10">
              <div class="flex items-center gap-2 mb-2">
                <PhCheckCircle v-if="expiryInfo.status === 'ACTIVE'" size="20" class="text-green-500" weight="fill"/>
                <PhWarningCircle v-else-if="expiryInfo.status === 'EXPIRED'" size="20" class="text-red-500"
                                 weight="fill"/>
                <PhHourglassHigh v-else size="20" class="text-gray-500"/>
                <span class="font-bold text-lg" :class="{
                   'text-green-400': expiryInfo.status === 'ACTIVE',
                   'text-red-500': expiryInfo.status === 'EXPIRED',
                   'text-gray-500': expiryInfo.status === 'NO_EXP'
                 }">{{ expiryInfo.status }}</span>
              </div>

              <div
                  class="h-10 bg-[#001014] rounded border border-[#00f3ff]/20 relative overflow-hidden flex items-center px-3 mb-2">
                <div
                    class="absolute inset-y-0 left-0 bg-opacity-20 transition-all duration-1000 ease-linear"
                    :class="expiryInfo.status === 'ACTIVE' ? 'bg-[#00f3ff]' : 'bg-red-500'"
                    :style="{ width: expiryInfo.percent + '%' }"
                ></div>
                <div
                    class="absolute inset-y-0 left-0 w-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-30"></div>

                <span class="relative z-10 text-xs font-bold w-full text-center tracking-widest">{{
                    expiryInfo.text
                  }}</span>
              </div>

              <div class="grid grid-cols-2 gap-2 text-[10px] opacity-70">
                <div>ISSUED: {{
                    decodedData.payload?.iat ? useDateFormat(decodedData.payload.iat * 1000, 'HH:mm:ss').value : 'N/A'
                  }}
                </div>
                <div class="text-right">EXP: {{
                    decodedData.payload?.exp ? useDateFormat(decodedData.payload.exp * 1000, 'HH:mm:ss').value : 'N/A'
                  }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex-1 flex flex-col bg-[#050a14]/50 z-10 relative">
          <div class="flex border-b border-[#00f3ff]/20">
            <button
                @click="activeTab = 'payload'"
                class="px-6 py-3 text-xs font-bold tracking-widest hover:bg-[#00f3ff]/5 transition-colors border-b-2"
                :class="activeTab === 'payload' ? 'border-[#00f3ff] text-white' : 'border-transparent text-[#00f3ff]/50'"
            >
              PAYLOAD (DATA)
            </button>
            <button
                @click="activeTab = 'header'"
                class="px-6 py-3 text-xs font-bold tracking-widest hover:bg-[#00f3ff]/5 transition-colors border-b-2"
                :class="activeTab === 'header' ? 'border-[#00f3ff] text-white' : 'border-transparent text-[#00f3ff]/50'"
            >
              HEADER
            </button>
            <div class="ml-auto px-4 flex items-center">
              <button @click="copy(JSON.stringify(decodedData[activeTab], null, 2))"
                      class="text-[10px] flex gap-1 items-center hover:text-white transition-colors">
                <PhCheckCircle v-if="copied"/>
                <span v-else>COPY JSON</span>
              </button>
            </div>
          </div>

          <div class="flex-1 overflow-auto p-6 custom-scrollbar relative group">
            <div v-if="!decodedData.valid"
                 class="absolute inset-0 flex items-center justify-center opacity-30 flex-col">
              <PhCode size="48" class="mb-4"/>
              <span>WAITING FOR VALID TOKEN...</span>
            </div>

            <pre v-else class="text-sm leading-relaxed font-mono"
                 v-html="syntaxHighlight(decodedData[activeTab])"></pre>
          </div>

          <div
              class="h-6 bg-[#00f3ff]/5 border-t border-[#00f3ff]/10 flex items-center justify-between px-4 text-[10px] opacity-50 select-none">
            <span>SECURE DECODE ENVIRONMENT</span>
            <span>V1.0.2</span>
          </div>
        </div>

      </div>
    </div>
  </Transition>
</template>

<style scoped>
.holo-grid {
  background-image: linear-gradient(rgba(0, 243, 255, 0.05) 1px, transparent 1px),
  linear-gradient(90deg, rgba(0, 243, 255, 0.05) 1px, transparent 1px);
  background-size: 30px 30px;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(0, 243, 255, 0.05);
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(0, 243, 255, 0.2);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 243, 255, 0.4);
}

.stamp-anim {
  animation: stamp-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
  opacity: 0;
  transform: scale(2) rotate(-15deg);
}

@keyframes stamp-in {
  to {
    opacity: 1;
    transform: scale(1) rotate(-15deg);
  }
}

.holo-fade-enter-active, .holo-fade-leave-active {
  transition: all 0.3s ease;
}

.holo-fade-enter-from, .holo-fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
  filter: blur(10px);
}
</style>