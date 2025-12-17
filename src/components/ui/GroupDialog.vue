<script setup lang="ts">
import { ref, watch } from 'vue';
import { PhX } from '@phosphor-icons/vue';
import * as PhIcons from '@phosphor-icons/vue';

const props = defineProps<{ show: boolean; isEdit: boolean; initialData?: any; }>();
const emit = defineEmits(['close', 'submit']);
const formData = ref({ title: '', icon: 'Folder' });
const icons = ['Folder', 'Briefcase', 'House', 'Star', 'Heart', 'Coffee', 'Code', 'Terminal', 'GameController', 'MusicNotes', 'Image', 'VideoCamera', 'ShoppingCart', 'Airplane', 'Bug', 'Cpu', 'Lightning'];

watch(() => props.show, (val) => {
  if (val) {
    if (props.isEdit && props.initialData) { formData.value = { title: props.initialData.title, icon: props.initialData.icon }; }
    else { formData.value = { title: '', icon: 'Folder' }; }
  }
});

const handleSubmit = () => { if (!formData.value.title) return alert("请输入名称"); emit('submit', { ...formData.value }); emit('close'); };
</script>

<template>
  <Transition name="scale">
    <div v-if="show" class="fixed inset-0 z-[105] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" @click="$emit('close')"></div>

      <div class="relative w-full max-w-sm rounded-2xl shadow-2xl p-6 flex flex-col gap-6"
           style="background-color: var(--modal-bg); color: var(--modal-text); border: 1px solid var(--modal-border);">

        <div class="flex justify-between items-center">
          <h3 class="text-xl font-bold">{{ isEdit ? '编辑分类' : '新建分类' }}</h3>
          <button @click="$emit('close')" class="p-2 hover:bg-black/10 rounded-full transition-colors" style="color: var(--modal-text)"><PhX size="20"/></button>
        </div>

        <div class="space-y-4">
          <div class="space-y-1">
            <label class="text-xs font-bold opacity-60 uppercase ml-1">分类名称</label>
            <input v-model="formData.title" type="text" placeholder="例如：工作..."
                   class="w-full rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[var(--accent-color)] transition-all"
                   style="background-color: var(--modal-input-bg); color: var(--modal-text);">
          </div>

          <div class="space-y-2">
            <label class="text-xs font-bold opacity-60 uppercase ml-1">图标</label>
            <div class="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto p-1 custom-scroll">
              <button v-for="icon in icons" :key="icon" @click="formData.icon = icon"
                      class="aspect-square rounded-xl flex items-center justify-center transition-all hover:bg-black/5"
                      :class="formData.icon === icon ? 'bg-[var(--accent-color)] text-white shadow-lg' : 'opacity-70'"
                      :style="{ color: formData.icon === icon ? 'white' : 'var(--modal-text)' }">
                <component :is="(PhIcons as any)['Ph' + icon]" size="24" weight="duotone" />
              </button>
            </div>
          </div>
        </div>

        <button @click="handleSubmit" class="w-full py-3 rounded-xl bg-[var(--accent-color)] text-white font-bold text-sm shadow-lg hover:brightness-110 active:scale-95 transition-all">保存</button>
      </div>
    </div>
  </Transition>
</template>
<style scoped>.scale-enter-active, .scale-leave-active { transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); }.scale-enter-from, .scale-leave-to { opacity: 0; transform: scale(0.95); }</style>