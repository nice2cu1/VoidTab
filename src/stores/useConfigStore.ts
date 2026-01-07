import {defineStore} from 'pinia';
import {ref, watch} from 'vue';
import {parseBookmarkContent} from '../shared/utils/bookmarkImporter';
import {SyncScheduler, syncService} from '../core/sync';

import type {Config, Group, SiteItem, WidgetType} from '../core/config/types';
import {defaultConfig} from '../core/config/default';
import {migrateConfig} from '../core/config/migrate';
import {normalizeConfig} from '../core/config/normalize';
import {configRepository} from '../core/config/repository';
import {getWidgetLabel, getWidgetMeta} from '../core/registry/widgets';

// 🎨 颜色生成器
const generateColor = (str: string) => {
    const colors = [
        '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981',
        '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef',
        '#f43f5e', '#0f172a', '#475569', '#059669', '#7c3aed'
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};
const MAX_WIDGET_W = 4; // 最大宽:4
const MAX_WIDGET_H = 4; // 最大高：4

const toInt = (v: any, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : fallback;
};

const clampInt = (v: any, min: number, max: number, fallback: number) => {
    const n = toInt(v, fallback);
    return Math.max(min, Math.min(max, n));
};
export const useConfigStore = defineStore('config', () => {
    const config = ref<Config>(JSON.parse(JSON.stringify(defaultConfig)));
    const isLoaded = ref(false);
    const rssCache = ref<Record<string, any[]>>({});
    const applyingExternal = ref(false);
    const localRevision = ref(0);
    let scheduler: SyncScheduler | null = null;
    const buildSyncPayload = (cfg: any) => {
        const copy = JSON.parse(JSON.stringify(cfg));
        // runtime 不上传
        delete copy.runtime;
        return JSON.stringify(copy);
    };

    const loadConfig = async () => {
        config.value = await configRepository.load();

        // 数据归一化：确保所有 item 都有 kind/w/h 字段，防止布局崩坏
        normalizeLayoutItems();

        isLoaded.value = true;

        if (!scheduler) {
            scheduler = new SyncScheduler({
                getProfile: () => config.value.sync as any,
                getUploadPayload: () => buildSyncPayload(config.value),
                getLocalRevision: () => localRevision.value,

                onRemotePayload: async (remoteText, meta) => {
                    console.log(meta)
                    try {
                        const raw = JSON.parse(remoteText);
                        const next = normalizeConfig(migrateConfig(raw));
                        // 保留本地 runtime
                        next.runtime = config.value.runtime;
                        applyingExternal.value = true;
                        config.value = next;
                        // 远端数据同步回来后，也做一次归一化
                        normalizeLayoutItems();
                        queueMicrotask(() => (applyingExternal.value = false));

                        localRevision.value += 1;
                    } catch (e) {
                        console.warn('远端数据不是有效 JSON，已忽略', e);
                    }
                },

                onSyncMeta: (meta) => {
                    config.value.sync.lastSyncTime = meta.lastSyncTime;
                    if (meta.etag) config.value.sync.lastRemoteEtag = meta.etag;
                    if (meta.mtime) config.value.sync.lastRemoteMtime = meta.mtime;
                    saveConfig();
                },

                onError: (e) => console.warn('AutoSync error:', e)
            });

            scheduler.start();
        }
    };


    const saveConfig = async () => {
        if (!isLoaded.value) return;
        try {
            await configRepository.save(config.value);
        } catch (e) {
            console.error('保存配置失败:', e);
        }
    };

    watch(
        config,
        () => {
            if (!isLoaded.value) return;
            if (applyingExternal.value) return;

            localRevision.value += 1;
            saveConfig();
        },
        {deep: true}
    );


    // --- Actions ---

    const normalizeLayoutItems = () => {
        if (!config.value.layout) return;

        config.value.layout.forEach((group: any) => {
            if (!group.items) group.items = [];

            group.items.forEach((item: any) => {
                // 1) 如果有 widgetType，必须强制为 widget
                if (item.widgetType && item.kind !== "widget") item.kind = "widget";

                // 2) 如果没有 kind，默认 site
                if (!item.kind) item.kind = "site";

                // 3) 站点：永远 1×1（避免站点也被写脏）
                if (item.kind === "site") {
                    item.w = 1;
                    item.h = 1;
                    return;
                }

                // 4) Widget：从 registry 拿默认，再把当前值数字化 + clamp
                if (item.kind === "widget") {
                    const meta = getWidgetMeta(item.widgetType);

                    const defW = meta?.defaultW ?? 2;
                    const defH = meta?.defaultH ?? 2;

                    // 关键：不再用 if (!item.w) 这种“falsy”判断（NaN/字符串/0 会出坑）
                    item.w = clampInt(item.w, 1, MAX_WIDGET_W, defW);
                    item.h = clampInt(item.h, 1, MAX_WIDGET_H, defH);

                    // 5) 默认标题修复：如果 title 为空 / 或 title 等于 widgetType，则覆盖为 label
                    const t = (item.title || "").trim();
                    const type = String(item.widgetType || "").trim();
                    if (!t || (type && t.toLowerCase() === type.toLowerCase())) {
                        item.title = getWidgetLabel(item.widgetType);
                    }
                }
            });
        });
    };


    // 新增：更新 Item 尺寸
    const updateItemSize = (groupId: string, itemId: string, w: number, h: number) => {
        const group = config.value.layout.find((g: any) => g.id === groupId);
        const item = group?.items.find((i: any) => i.id === itemId);
        if (!item) return;

        if (item.kind === "site") {
            item.w = 1;
            item.h = 1;
        } else {
            const meta = getWidgetMeta(item.widgetType);
            const defW = meta?.defaultW ?? 2;
            const defH = meta?.defaultH ?? 2;

            item.w = clampInt(w, 1, MAX_WIDGET_W, defW);
            item.h = clampInt(h, 1, MAX_WIDGET_H, defH);
        }

        saveConfig();
    };


    // 新增：添加组件
    const addWidget = (groupId: string, widgetType: string) => {
        const group = config.value.layout.find((g: any) => g.id === groupId);
        if (!group) return;

        const meta = getWidgetMeta(widgetType);

        const defW = meta?.defaultW ?? 2;
        const defH = meta?.defaultH ?? 2;

        const newWidget: SiteItem = {
            id: `widget-${Date.now()}`,
            kind: "widget",
            widgetType: widgetType as WidgetType,
            title: getWidgetLabel(widgetType),

            // ✅ 强制限制
            w: clampInt(defW, 1, MAX_WIDGET_W, 2),
            h: clampInt(defH, 1, MAX_WIDGET_H, 2),

            url: "",
            icon: "",
        };

        group.items.push(newWidget);
        saveConfig();
    };


    const addGroup = (group: any) => {
        group.id = Date.now().toString();
        group.items = [];
        config.value.layout.push(group);
    };

    const removeGroup = (groupId: string) => {
        config.value.layout = config.value.layout.filter((g: any) => g.id !== groupId);
    };

    const updateGroup = (groupId: string, data: Partial<Group>) => {
        const group = config.value.layout.find((g: any) => g.id === groupId);
        if (group) {
            Object.assign(group, data);
            saveConfig();
        }
    };

    const addSite = (groupId: string, site: any) => {
        const group = config.value.layout.find((g: any) => g.id === groupId);
        if (group) {
            site.id = Date.now().toString();
            // 新增站点默认为 1x1 site
            site.kind = 'site';
            site.w = 1;
            site.h = 1;
            group.items.push(site);
        }
    };

    const updateSite = (groupId: string, siteId: string, data: any) => {
        const group = config.value.layout.find((g: any) => g.id === groupId);
        if (group) {
            const site = group.items.find((s: any) => s.id === siteId);
            if (site) Object.assign(site, data);
        }
    };

    const removeSite = (groupId: string, siteId: string) => {
        const group = config.value.layout.find((g: any) => g.id === groupId);
        if (group) {
            group.items = group.items.filter((s: any) => s.id !== siteId);
        }
    };

    const reorderItems = (groupId: string, newItems: any[]) => {
        const group = config.value.layout.find((g: any) => g.id === groupId);
        if (group) {
            group.items = newItems;
        }
    };

    const moveSite = (fromGroupId: string, toGroupId: string, siteId: string) => {
        const fromGroup = config.value.layout.find((g: any) => g.id === fromGroupId);
        const toGroup = config.value.layout.find((g: any) => g.id === toGroupId);
        if (fromGroup && toGroup) {
            const siteIndex = fromGroup.items.findIndex((s: any) => s.id === siteId);
            if (siteIndex > -1) {
                const [site] = fromGroup.items.splice(siteIndex, 1);
                toGroup.items.push(site);
            }
        }
    };

    const addEngine = (name: string, url: string) => {
        config.value.searchEngines.push({id: Date.now().toString(), name, url, icon: 'Globe'});
    };

    const removeEngine = (id: string) => {
        config.value.searchEngines = config.value.searchEngines.filter((e: any) => e.id !== id);
        if (!config.value.searchEngines.some((e: any) => e.id === config.value.currentEngineId)) {
            config.value.currentEngineId = config.value.searchEngines[0]?.id || 'bing';
        }
    };

    const importBookmarks = (htmlContent: string) => {
        const result = parseBookmarkContent(htmlContent);
        if (result.success && result.groups.length > 0) {
            // 导入时也补全默认值
            result.groups.forEach((g: any) => {
                g.items.forEach((i: any) => {
                    i.kind = 'site';
                    i.w = 1;
                    i.h = 1;
                });
            });
            config.value.layout.push(...result.groups);
            saveConfig();
            return {success: true, groupCount: result.groups.length, count: result.totalCount};
        }
        return {success: false, message: result.message || '导入失败'};
    };

    const setIconFallback = (itemId: string) => {
        for (const group of config.value.layout as any[]) {
            const item = group.items.find((i: any) => i.id === itemId);
            if (item) {
                if (item.iconType === 'text' && item.iconValue && item.iconValue.length >= 2 && item.bgColor && item.bgColor !== '#3b82f6')
                    return;

                console.log(`单个图标修复: ${item.title}`);
                item.iconType = 'text';

                const cleanTitle = (item.title || '').trim().replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');
                if (/[\u4e00-\u9fa5]/.test(cleanTitle)) {
                    item.iconValue = cleanTitle.substring(0, 2);
                } else {
                    item.iconValue = cleanTitle.substring(0, 4).toUpperCase();
                }
                if (!item.iconValue) item.iconValue = item.title.substring(0, 2) || 'A';

                if (!item.bgColor || item.bgColor === '#ffffff' || item.bgColor === '#3b82f6') {
                    item.bgColor = generateColor(item.title || '');
                }
                saveConfig();
                break;
            }
        }
    };

    const testSyncConnection = async (profile?: Config['sync']) => {
        return await syncService.test((profile ?? config.value.sync) as any);
    };

    const uploadBackup = async () => {
        const now = Date.now();
        const backupData = JSON.parse(JSON.stringify(config.value));
        backupData.sync.lastSyncTime = now;

        const res = await syncService.upload(config.value.sync as any, backupData);

        if (res.ok) {
            config.value.sync.lastSyncTime = now;
            if (res.remoteEtag) config.value.sync.lastRemoteEtag = res.remoteEtag;
            if (res.remoteMtime) config.value.sync.lastRemoteMtime = res.remoteMtime;
            saveConfig();
            return {success: true, msg: res.message};
        }
        return {success: false, msg: res.message};
    };

    const downloadBackup = async () => {
        const currentSync = {...config.value.sync};

        const res = await syncService.download(config.value.sync as any);
        if (!res.ok || !res.data) return {success: false, msg: res.message};

        try {
            const parsed = JSON.parse(res.data);
            const next = normalizeConfig(migrateConfig(parsed));
            config.value = next;
            normalizeLayoutItems(); // 恢复备份后归一化

            config.value.sync = {...config.value.sync, ...currentSync};

            if (res.remoteEtag) config.value.sync.lastRemoteEtag = res.remoteEtag;
            if (res.remoteMtime) config.value.sync.lastRemoteMtime = res.remoteMtime;

            saveConfig();
            return {success: true, msg: '数据恢复成功'};
        } catch {
            return {success: false, msg: '云端数据不是有效 JSON'};
        }
    };

    const destroy = () => {
        scheduler?.stop();
        scheduler = null;
    };

    const updateGroupSort = (groupId: string, sortKey: 'custom' | 'name' | 'lastVisited') => {
        const group = config.value.layout.find((g: any) => g.id === groupId);
        if (group) {
            group.sortKey = sortKey;
            saveConfig();
        }
    };

    return {
        config,
        isLoaded,
        loadConfig,
        saveConfig,

        addGroup,
        removeGroup,
        updateGroup,

        addSite,
        updateSite,
        removeSite,
        reorderItems,
        moveSite,
        normalizeLayoutItems, // 导出
        updateItemSize,       // 导出
        addWidget,            // 导出

        addEngine,
        removeEngine,

        importBookmarks,

        rssCache,
        setIconFallback,

        testSyncConnection,
        uploadBackup,
        downloadBackup,

        destroy,
        updateGroupSort
    };
});