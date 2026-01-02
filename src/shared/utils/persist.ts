// src/shared/utils/persist.ts
export function loadJson<T>(key: string, fallback: T): T {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    try {
        return JSON.parse(raw) as T;
    } catch (e) {
        console.error(`[persist] Failed to parse "${key}"`, e);
        return fallback;
    }
}

export function saveJson(key: string, value: unknown) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.error(`[persist] Failed to save "${key}"`, e);
    }
}

export function removeKey(key: string) {
    localStorage.removeItem(key);
}
