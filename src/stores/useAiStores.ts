// src/stores/useAiStore.ts
import {defineStore} from 'pinia';
import {ref, watch} from 'vue';

export interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    status?: 'loading' | 'error' | 'done';
}

export interface Session {
    id: string;
    title: string;
    updatedAt: number;
    messages: Message[];
}

export const useAiStore = defineStore('ai', () => {
    const sessions = ref<Session[]>([]);
    const currentSessionId = ref<string>('');

    // 初始化加载
    const loadHistory = () => {
        const local = localStorage.getItem('voidtab_ai_history');
        if (local) {
            try {
                sessions.value = JSON.parse(local);
                // 按时间倒序
                sessions.value.sort((a, b) => b.updatedAt - a.updatedAt);
            } catch (e) {
                console.error('AI History load failed', e);
            }
        }
    };

    // 持久化保存
    const saveHistory = () => {
        localStorage.setItem('voidtab_ai_history', JSON.stringify(sessions.value));
    };

    // 监听变化自动保存
    watch(sessions, saveHistory, {deep: true});

    // --- Actions ---

    const createSession = () => {
        const newSession: Session = {
            id: Date.now().toString(),
            title: '新对话',
            updatedAt: Date.now(),
            messages: []
        };
        sessions.value.unshift(newSession);
        currentSessionId.value = newSession.id;
        return newSession.id;
    };

    const deleteSession = (id: string) => {
        sessions.value = sessions.value.filter(s => s.id !== id);
        if (currentSessionId.value === id) {
            currentSessionId.value = sessions.value[0]?.id || '';
        }
    };

    const updateSessionTitle = (id: string, title: string) => {
        const s = sessions.value.find(s => s.id === id);
        if (s) {
            s.title = title;
            s.updatedAt = Date.now();
        }
    };

    const clearHistory = () => {
        if (confirm('确定要清空所有聊天记录吗？无法恢复。')) {
            sessions.value = [];
            currentSessionId.value = '';
        }
    };

    const addMessage = (sessionId: string, role: Message['role'], content: string) => {
        const session = sessions.value.find(s => s.id === sessionId);
        if (!session) return;

        const msg: Message = {
            id: Date.now().toString() + Math.random().toString().slice(2),
            role,
            content,
            timestamp: Date.now(),
            status: role === 'assistant' ? 'loading' : 'done'
        };

        session.messages.push(msg);
        session.updatedAt = Date.now();

        // 自动更新标题（如果是第一条用户消息）
        if (role === 'user' && session.messages.length === 1) {
            session.title = content.slice(0, 20);
        }
        return msg;
    };

    const updateMessageContent = (sessionId: string, msgId: string, content: string, status: Message['status'] = 'done') => {
        const session = sessions.value.find(s => s.id === sessionId);
        if (!session) return;
        const msg = session.messages.find(m => m.id === msgId);
        if (msg) {
            msg.content = content;
            msg.status = status;
        }
    };

    // 导出数据
    const exportData = () => {
        const blob = new Blob([JSON.stringify(sessions.value, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `voidtab-ai-history-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
    };

    return {
        sessions,
        currentSessionId,
        loadHistory,
        createSession,
        deleteSession,
        updateSessionTitle,
        clearHistory,
        addMessage,
        updateMessageContent,
        exportData
    };
});