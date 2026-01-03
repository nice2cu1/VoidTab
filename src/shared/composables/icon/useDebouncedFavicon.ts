import {ref, watch, Ref} from 'vue';

export function useDebouncedFavicon(urlRef: Ref<string>, delay = 500) {
    const faviconUrl = ref('');
    const isFetching = ref(false);
    let timer: any = null;

    const getIcon = (url: string) => {
        if (!url) {
            faviconUrl.value = '';
            return;
        }

        isFetching.value = true;

        // 简单的 URL 归一化
        const href = url.startsWith('http') ? url : `https://${url}`;

        try {
            const domain = new URL(href).hostname;
            // 使用 Google Favicon 服务 (稳定且免费)
            faviconUrl.value = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
        } catch (e) {
            faviconUrl.value = '';
        } finally {
            // 模拟一点网络延迟，让 Loading 状态更自然
            setTimeout(() => {
                isFetching.value = false;
            }, 300);
        }
    };

    // 监听 URL 变化
    watch(urlRef, (newUrl) => {
        if (timer) clearTimeout(timer);

        if (!newUrl) {
            faviconUrl.value = '';
            return;
        }

        timer = setTimeout(() => {
            getIcon(newUrl);
        }, delay);
    });

    // 手动刷新方法（用于编辑回显时立即获取）
    const refresh = (immediate = false) => {
        if (immediate) {
            getIcon(urlRef.value);
        } else {
            // 触发 watch
            const temp = urlRef.value;
            urlRef.value = '';
            setTimeout(() => urlRef.value = temp, 0);
        }
    };

    return {
        faviconUrl,
        isFetching,
        refresh
    };
}