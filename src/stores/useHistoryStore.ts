import {defineStore} from 'pinia';
import {ref} from 'vue';
import {historyService} from '../core/storage/historyIdb';
import {useConfigStore} from './useConfigStore';

export const useHistoryStore = defineStore('history', () => {
    const config = useConfigStore();

    // 状态
    const logs = ref<any[]>([]);
    const stats = ref<any[]>([]);
    const page = ref(1);
    const hasMore = ref(true);
    const isLoading = ref(false);

    // 添加记录 (仅当开启时)
    const addLog = async (type: 'search' | 'goto' | 'ai', content: any, extra = {}) => {
        if (!config.config.theme.enableHistory) return;

        await historyService.add({
            type,
            content,
            timestamp: Date.now(),
            ...extra
        });
    };

    // 加载列表 (分页)
    const loadLogs = async (reset = false) => {
        if (reset) {
            page.value = 1;
            logs.value = [];
            hasMore.value = true;
        }
        if (!hasMore.value || isLoading.value) return;

        isLoading.value = true;
        try {
            const res = await historyService.getLogs(page.value, 20);
            if (res.length < 20) hasMore.value = false;
            logs.value.push(...res);
            page.value++;
        } finally {
            isLoading.value = false;
        }
    };

    // 加载统计
    const loadStats = async () => {
        stats.value = await historyService.getStats();
    };

    // 删除单条
    const removeLog = async (id: number) => {
        // 1. 获取要删除的内容
        const logToDelete = logs.value.find(l => l.id === id);
        if (!logToDelete) return;

        await historyService.deleteById(id);

        // 2. 更新 Logs 视图
        logs.value = logs.value.filter(l => l.id !== id);

        // 3. 同步更新 Stats 视图
        const statItem = stats.value.find(s => s.content === logToDelete.content);
        if (statItem) {
            statItem.count--;
            // 如果计数归零，从统计列表中移除
            if (statItem.count <= 0) {
                stats.value = stats.value.filter(s => s.content !== logToDelete.content);
            } else {
                // 重新排序（可选，但推荐）
                stats.value.sort((a, b) => b.count - a.count);
            }
        }
    };
    // 级联删除
    const removeByContent = async (content: string) => {
        await historyService.deleteByContent(content);
        stats.value = stats.value.filter(s => s.content !== content);
        // 同时更新 logs 视图
        logs.value = logs.value.filter(l => l.content !== content);
    };

    const clearAll = async () => {
        await historyService.clearAll();
        logs.value = [];
        stats.value = [];
    };

    return {
        logs,
        stats,
        isLoading,
        hasMore,
        addLog,
        loadLogs,
        loadStats,
        removeLog,
        removeByContent,
        clearAll
    };
});