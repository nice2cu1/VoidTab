// src/core/storage/historyIdb.ts
import {openDB, type DBSchema} from 'idb';

interface HistoryLog {
    id?: number;
    type: 'search' | 'goto' | 'ai';
    content: string;
    timestamp: number;
    engineId?: string;
    targetUrl?: string;
}

interface VoidHistoryDB extends DBSchema {
    logs: {
        key: number;
        value: HistoryLog;
        indexes: { 'by-time': number; 'by-content': string };
    };
}

const DB_NAME = 'voidtab_history';
const STORE_NAME = 'logs';

const dbPromise = openDB<VoidHistoryDB>(DB_NAME, 1, {
    upgrade(db) {
        const store = db.createObjectStore(STORE_NAME, {keyPath: 'id', autoIncrement: true});
        store.createIndex('by-time', 'timestamp');
        store.createIndex('by-content', 'content');
    },
});

export const historyService = {
    async add(log: Omit<HistoryLog, 'id'>) {
        const db = await dbPromise;
        return db.add(STORE_NAME, log);
    },

    async getLogs(page = 1, pageSize = 20) {
        const db = await dbPromise;
        const tx = db.transaction(STORE_NAME, 'readonly');
        const index = tx.store.index('by-time');

        // 游标反向遍历 (最新的在前)
        let cursor = await index.openCursor(null, 'prev');

        // 跳过前面的页
        const skip = (page - 1) * pageSize;
        if (skip > 0 && cursor) {
            await cursor.advance(skip);
        }

        const results: HistoryLog[] = [];
        while (cursor && results.length < pageSize) {
            results.push(cursor.value);
            cursor = await cursor.continue();
        }
        return results;
    },

    async getStats() {
        const db = await dbPromise;
        const all = await db.getAll(STORE_NAME);

        // 简单的内存聚合 (如果数据量巨大，建议后端处理或 WebWorker)
        const map = new Map<string, { content: string, count: number, type: string }>();

        for (const log of all) {
            const current = map.get(log.content) || {content: log.content, count: 0, type: log.type};
            current.count++;
            map.set(log.content, current);
        }

        return Array.from(map.values()).sort((a, b) => b.count - a.count);
    },

    async deleteById(id: number) {
        const db = await dbPromise;
        await db.delete(STORE_NAME, id);
    },

    async deleteByContent(content: string) {
        const db = await dbPromise;
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const index = tx.store.index('by-content');

        let cursor = await index.openCursor(IDBKeyRange.only(content));
        while (cursor) {
            await cursor.delete();
            cursor = await cursor.continue();
        }
        await tx.done;
    },

    async clearAll() {
        const db = await dbPromise;
        await db.clear(STORE_NAME);
    }
};