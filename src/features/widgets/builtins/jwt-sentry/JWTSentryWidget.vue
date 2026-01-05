<script setup lang="ts">
import {computed, ref, onUnmounted} from 'vue'
import {useTimeAgo, useDebounceFn} from '@vueuse/core'
import type {SiteItem} from '../../../../core/config/types'
import {
  PhShieldCheck, PhShieldWarning, PhFingerprint,
  PhIdentificationCard, PhClockCountdown, PhLockKey
} from '@phosphor-icons/vue'
import JWTSentryModal from './JWTSentryModal.vue'
import {useConfigStore} from '../../../../stores/useConfigStore'

const props = defineProps<{ item: SiteItem; isEditMode: boolean }>()
const store = useConfigStore()

// ✅ runtime/auth 兜底（确保类型必填字段存在）
if (!store.config.runtime) (store.config as any).runtime = {}
if (!store.config.runtime.auth) store.config.runtime.auth = {jwtToken: ''}

// ✅ 防抖保存（关闭/卸载时 flush，避免最后一次丢）
const saveDebounced = useDebounceFn(async () => {
  if (!store.saveConfig) {
    console.warn('[JWTSentry] store.saveConfig is missing. Token will not persist to local file.')
    return
  }
  await store.saveConfig()
}, 300)

onUnmounted(() => {
  // @vueuse/core 的 useDebounceFn 返回的函数带 flush/cancel
  ;(saveDebounced as any).flush?.()
})

const rawToken = computed<string>({
  get: () => store.config.runtime.auth.jwtToken ?? '',
  set: (v) => {
    store.config.runtime.auth.jwtToken = v ?? ''
    saveDebounced()
  },
})

const showModal = ref(false)
const openModal = () => {
  if (props.isEditMode) return
  showModal.value = true
}

// ===== JWT 解码（支持 base64url padding）=====
function b64urlJsonDecode(str: string) {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const padLen = (4 - (base64.length % 4)) % 4
  const padded = base64 + '='.repeat(padLen)
  return JSON.parse(atob(padded))
}

const decoded = computed<null | { header: any; payload: any }>(() => {
  if (!rawToken.value) return null
  try {
    const parts = rawToken.value.split('.')
    if (parts.length !== 3) return null
    return {
      header: b64urlJsonDecode(parts[0]),
      payload: b64urlJsonDecode(parts[1]),
    }
  } catch {
    return null
  }
})

const status = computed<'EMPTY' | 'INVALID' | 'ACTIVE' | 'EXPIRED' | 'NO_EXP'>(() => {
  if (!rawToken.value) return 'EMPTY'
  if (!decoded.value) return 'INVALID'

  const exp = decoded.value.payload?.exp
  if (typeof exp === 'number') {
    const now = Math.floor(Date.now() / 1000)
    return exp > now ? 'ACTIVE' : 'EXPIRED'
  }
  return 'NO_EXP'
})

const timeAgo = useTimeAgo(computed(() => {
  const exp = decoded.value?.payload?.exp
  return typeof exp === 'number' ? exp * 1000 : Date.now()
}))

const layout = computed(() => {
  const w = props.item.w || 1
  const h = props.item.h || 1
  return {
    isMini: w === 1 && h === 1,
    isWide: w >= 2 && h === 1,
    isTall: w === 1 && h >= 2,
    isStandard: w === 2 && h === 2,
    isLarge: w >= 2 && h >= 3
  }
})
</script>

<template>
  <div
      class="w-full h-full relative overflow-hidden bg-[#050a14] border border-[#00f3ff]/20 group font-mono text-[#00f3ff] transition-all hover:border-[#00f3ff]/50 hover:shadow-[0_0_20px_rgba(0,243,255,0.15)]"
      :class="{
      'cursor-pointer': !isEditMode,
      'cursor-move': isEditMode,
      'border-red-500/40 text-red-400': status === 'EXPIRED' || status === 'INVALID',
      'border-gray-700 text-gray-500': status === 'EMPTY'
    }"
      @click="openModal"
  >
    <div class="absolute inset-0 z-0 pointer-events-none holo-grid opacity-20"></div>

    <div v-if="status === 'EMPTY'"
         class="relative z-10 w-full h-full flex flex-col items-center justify-center p-2 opacity-60">
      <PhFingerprint size="24" class="mb-1"/>
      <span class="text-[10px]">NO TOKEN</span>
    </div>

    <div v-else-if="status === 'INVALID'"
         class="relative z-10 w-full h-full flex flex-col items-center justify-center p-2 text-red-500">
      <PhShieldWarning size="24" class="mb-1 animate-pulse"/>
      <span class="text-[10px] font-bold">INVALID</span>
    </div>

    <div v-else-if="layout.isMini" class="relative z-10 w-full h-full flex flex-col items-center justify-center p-2">
      <PhShieldCheck v-if="status === 'ACTIVE'" size="24" weight="duotone" class="text-green-400 mb-1"/>
      <PhLockKey v-else size="24" weight="duotone" class="text-red-400 mb-1"/>
      <div class="text-[10px] font-bold tracking-wider">{{ status }}</div>
    </div>

    <div v-else-if="layout.isWide" class="relative z-10 w-full h-full flex items-center justify-between px-4">
      <div class="flex items-center gap-3">
        <div class="p-2 rounded bg-opacity-10" :class="status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'">
          <PhIdentificationCard size="24" weight="duotone"/>
        </div>
        <div class="flex flex-col">
          <span class="text-xs font-bold">{{ decoded?.payload?.sub || 'UNKNOWN' }}</span>
          <span class="text-[10px] opacity-60">ID / SUBJECT</span>
        </div>
      </div>
      <div class="text-[10px] px-2 py-0.5 border rounded"
           :class="status === 'ACTIVE' ? 'border-green-500 text-green-400' : 'border-red-500 text-red-400'">
        {{ status }}
      </div>
    </div>

    <div v-else-if="layout.isStandard" class="relative z-10 w-full h-full flex flex-col p-4 justify-between">
      <div class="flex justify-between items-start">
        <span class="text-[10px] opacity-50 tracking-[0.2em]">SENTRY//AUTH</span>
        <div class="w-2 h-2 rounded-full animate-ping"
             :class="status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'"></div>
      </div>

      <div class="flex flex-col items-center my-auto">
        <div class="text-3xl font-bold mb-1 opacity-90">
          {{ (decoded?.payload?.sub ? String(decoded.payload.sub).substring(0, 8) : 'USER') }}
        </div>
        <div class="text-xs opacity-50 flex items-center gap-1">
          <PhClockCountdown/>
          {{ status === 'EXPIRED' ? 'EXPIRED' : 'VALID UNTIL' }}
        </div>
        <div class="text-xs font-mono mt-1" :class="status === 'ACTIVE' ? 'text-green-400' : 'text-red-400'">
          {{ timeAgo }}
        </div>
      </div>

      <div class="h-1 w-full bg-gray-800 rounded-full overflow-hidden mt-2">
        <div class="h-full w-full transition-all duration-1000"
             :class="status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'"
             :style="{ width: status === 'ACTIVE' ? '100%' : '0%' }"></div>
      </div>
    </div>

    <div v-else class="relative z-10 w-full h-full flex flex-col p-4">
      <div class="flex justify-between items-center mb-4 border-b border-current border-opacity-20 pb-2">
        <span class="text-xs font-bold flex items-center gap-2">
          <PhShieldCheck weight="fill"/>
          JWT SENTRY
        </span>
        <span class="text-[10px] px-2 py-0.5 rounded bg-white/5">{{ status }}</span>
      </div>

      <div class="flex-1 overflow-hidden space-y-3 text-xs">
        <div class="flex flex-col">
          <span class="opacity-40 text-[10px]">SUBJECT (SUB)</span>
          <span class="font-bold truncate">{{ decoded?.payload?.sub || 'N/A' }}</span>
        </div>
        <div class="flex flex-col">
          <span class="opacity-40 text-[10px]">ISSUER (ISS)</span>
          <span class="truncate">{{ decoded?.payload?.iss || 'N/A' }}</span>
        </div>
        <div class="flex flex-col">
          <span class="opacity-40 text-[10px]">ROLES/SCOPE</span>
          <span class="truncate">
            {{ decoded?.payload?.roles || decoded?.payload?.scope || decoded?.payload?.authorities || 'N/A' }}
          </span>
        </div>
      </div>

      <div class="mt-auto pt-3 border-t border-current border-opacity-20 flex justify-between text-[10px] opacity-60">
        <span>ALG: {{ decoded?.header?.alg || 'HS256' }}</span>
        <span>SECURE CONNECTION</span>
      </div>
    </div>

    <Teleport to="body">
      <JWTSentryModal :show="showModal" @close="showModal = false"/>
    </Teleport>
  </div>
</template>

<style scoped>
.holo-grid {
  background-image: linear-gradient(rgba(0, 243, 255, 0.05) 1px, transparent 1px),
  linear-gradient(90deg, rgba(0, 243, 255, 0.05) 1px, transparent 1px);
  background-size: 20px 20px;
}
</style>
