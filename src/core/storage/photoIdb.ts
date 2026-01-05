// src/core/storage/photoIdb.ts
// 网页 / 插件通用：IndexedDB 存 Blob，不进 config（防止卡 & 防止 sync 爆）

const DB_NAME = 'voidtab_media';
const DB_VERSION = 1;
const STORE_NAME = 'photo_blobs';

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };

        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);

        const req = fn(store);

        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);

        tx.oncomplete = () => db.close();
        tx.onerror = () => {
            try {
                db.close();
            } catch {
            }
            reject(tx.error);
        };
    });
}

export async function idbSetBlob(key: string, blob: Blob): Promise<void> {
    await withStore('readwrite', (s) => s.put(blob, key));
}

export async function idbGetBlob(key: string): Promise<Blob | null> {
    const res = await withStore('readonly', (s) => s.get(key));
    return (res as any) ?? null;
}

export async function idbDeleteBlob(key: string): Promise<void> {
    await withStore('readwrite', (s) => s.delete(key));
}

// 可选：清理某个 widget 的所有 blob（你以后做“删除 widget 清理资源”能用）
export async function idbDeleteByPrefix(prefix: string): Promise<void> {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const cursorReq = store.openCursor();

        cursorReq.onsuccess = () => {
            const cursor = cursorReq.result;
            if (!cursor) return;
            const k = String(cursor.key);
            if (k.startsWith(prefix)) cursor.delete();
            cursor.continue();
        };

        tx.oncomplete = () => {
            db.close();
            resolve();
        };
        tx.onerror = () => {
            try {
                db.close();
            } catch {
            }
            reject(tx.error);
        };
    });
}
