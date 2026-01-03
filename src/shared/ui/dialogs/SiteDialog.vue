<script setup lang="ts">
import {ref, computed, watch} from 'vue';
// 引入你之前的 UI 组件 (请确保文件名一致)
import SiteDialogForm from './SiteDialogForm.vue';
// 引入刚才创建的 Hook
import {useDebouncedFavicon} from '../../composables/icon/useDebouncedFavicon';
// 引入工具函数
import {getSmartInitials} from '../../utils/initials';
import {getSiteNameFromUrl} from '../../utils/url.ts';

// 类型定义
type IconMode = 'auto' | 'text' | 'icon';

type SiteForm = {
  title: string;
  url: string;
  bgColor: string;
  iconType: IconMode;
  iconValue: string;
};

const props = defineProps<{
  show: boolean;
  isEdit: boolean;
  // 如果是编辑模式，父组件会传入这个数据
  initialData?: Partial<SiteForm> & { id?: string };
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', payload: SiteForm): void;
}>();

// 预设颜色列表
const colors = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981',
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef',
  '#f43f5e', '#1f2937', '#4b5563', '#000000', '#ffffff'
] as const;

// 表单状态
const formData = ref<SiteForm>({
  title: '',
  url: '',
  bgColor: '#3b82f6',
  iconType: 'auto',
  iconValue: ''
});

const activeTab = ref<IconMode>('auto');

// === 1. Favicon 自动获取逻辑 ===
// 创建一个计算属性供 hook 监听
const urlRef = computed(() => formData.value.url);
// 使用 Hook
const {faviconUrl, isFetching, refresh} = useDebouncedFavicon(urlRef, 600);

// === 2. 弹窗打开时的初始化逻辑 ===
watch(
    () => props.show,
    (isShow) => {
      if (!isShow) return;

      if (props.isEdit && props.initialData) {
        // 编辑模式：回填数据
        formData.value = {
          title: props.initialData.title || '',
          url: props.initialData.url || '',
          bgColor: props.initialData.bgColor || '#3b82f6',
          iconType: (props.initialData.iconType as IconMode) || 'auto',
          iconValue: props.initialData.iconValue || ''
        };
        activeTab.value = formData.value.iconType;
        // 立即触发一次图标获取
        refresh(true);
      } else {
        // 添加模式：重置数据
        // 随机给一个背景色，增加趣味性
        const randomColor = colors[Math.floor(Math.random() * (colors.length - 2))]; // 避开黑白
        formData.value = {
          title: '',
          url: '',
          bgColor: randomColor,
          iconType: 'auto',
          iconValue: ''
        };
        activeTab.value = 'auto';
        // 确保 favicon 清空
        refresh(true);
      }
    }
);

// === 3. 核心：智能识别逻辑 ===
const handleUrlBlur = () => {
  // 如果没有 URL，什么都不做
  if (!formData.value.url) return;

  // A. 自动补全标题 (仅当标题为空时)
  if (!formData.value.title) {
    // ✅ 调用 url.ts 中的智能提取函数
    const smartName = getSiteNameFromUrl(formData.value.url);

    if (smartName) {
      formData.value.title = smartName;

      // B. 如果当前是"文字图标"模式，同时自动生成首字母
      if (activeTab.value === 'text') {
        formData.value.iconValue = getSmartInitials(smartName);
      }
    }
  }
};

// 当用户手动修改标题时，如果是文字模式，也联动更新文字图标
const handleTitleInput = () => {
  if (activeTab.value === 'text' && !props.isEdit) {
    formData.value.iconValue = getSmartInitials(formData.value.title);
  }
};

// === 4. 提交逻辑 ===
const handleSubmit = () => {
  if (!formData.value.title) return; // 简单校验

  // 根据当前选中的 tab 处理最终保存的数据
  let finalIconValue = formData.value.iconValue;

  // 兜底逻辑：如果是文字模式但没字，强制生成
  if (activeTab.value === 'text' && !finalIconValue) {
    finalIconValue = getSmartInitials(formData.value.title);
  }
  // 兜底逻辑：如果是图标模式但没图标，给个地球
  else if (activeTab.value === 'icon' && !finalIconValue) {
    finalIconValue = 'Globe';
  }

  emit('submit', {
    ...formData.value,
    iconType: activeTab.value,
    iconValue: finalIconValue
  });

  emit('close');
};
</script>

<template>
  <SiteDialogForm
      :show="show"
      :isEdit="isEdit"

      :modelValue="formData"
      :activeTab="activeTab"

      :faviconUrl="faviconUrl"
      :isFetchingIcon="isFetching"
      :colors="colors"

      :onUrlBlur="handleUrlBlur"
      :onTitleInput="handleTitleInput"

      @update:modelValue="formData = $event"
      @update:activeTab="activeTab = $event"
      @close="emit('close')"
      @submit="handleSubmit"
  />
</template>