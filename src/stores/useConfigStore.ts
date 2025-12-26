import {defineStore} from 'pinia';
import {ref, watch} from 'vue';
import {storage} from '../utils/storage';
import {parseBookmarkContent} from "../utils/bookmarkImporter"; // 确保路径正确

const CONFIG_KEY = 'voidtab-core-config'; // 存同步配置
const WALLPAPER_KEY = 'voidtab-wallpaper-blob'; // 存本地大图
const LOCAL_MARKER = '_USE_LOCAL_STORAGE_'; // 标记位

// 默认配置
const defaultConfig = {
    layout: [
        {
            id: 'group-1',
            title: '常用工具',
            icon: 'Briefcase',
            items: [
                {id: 'site-1', title: 'GitHub', url: 'https://github.com', icon: 'https://github.com/favicon.ico'},
                {
                    id: 'site-2',
                    title: 'Bilibili',
                    url: 'https://bilibili.com',
                    icon: 'https://www.bilibili.com/favicon.ico'
                },
            ]
        }
    ],
    widgets: [
        {
            id: 'weather',
            name: '天气信息',
            visible: true,
            order: 1,
            colSpan: 1,
            config: {city: 'Shanghai'}
        },
        {
            id: 'github',
            name: 'GitHub 趋势',
            visible: true,
            order: 2,
            colSpan: 2,
            config: {language: 'javascript', since: 'daily'}
        },
        {
            id: 'system',
            name: '系统监控',
            visible: true,
            colSpan: 1,
            order: 3
        },
        {
            id: 'rss',
            name: 'RSS 阅读器',
            visible: true,
            order: 4,
            colSpan: 2,
            config: {
                feeds: [
                    {name: '少数派', url: 'https://sspai.com/feed'},
                    {name: 'V2EX', url: 'https://www.v2ex.com/index.xml'},
                    {name: '36Kr', url: 'https://36kr.com/feed'}
                ]
            }
        },
        {
            id: 'greeting',
            name: '问候语',
            visible: true,
            order: 0,
            colSpan: 1,
            config: {}
        }
    ],
    theme: {
        mode: 'light',
        sidebarPos: 'left',
        showTime: true,
        gridMaxWidth: 1200,
        blur: 20,
        opacity: 0.6,
        wallpaper: '',
        techFont: true,
        breathingLight: true,
        neonGlow: true,
        customCursor: false,
        iconSize: 60,
        radius: 16,
        gap: 24,
        showIconName: true,
        iconTextSize: 12
    },
    searchEngines: [
        {id: 'bing', name: 'Bing', url: 'https://www.bing.com/search?q=', icon: 'MagnifyingGlass'},
        {id: 'google', name: 'Google', url: 'https://www.google.com/search?q=', icon: 'Globe'},
        {id: 'baidu', name: 'Baidu', url: 'https://www.baidu.com/s?wd=', icon: 'PawPrint'}
    ],
    currentEngineId: 'bing'
};

export const useConfigStore = defineStore('config', () => {
    const config = ref<any>(JSON.parse(JSON.stringify(defaultConfig)));
    const isLoaded = ref(false);
    const rssCache = ref<Record<string, any[]>>({}); // 新闻缓存

    // --- Core Logic: Load & Save ---

    // 加载配置
    const loadConfig = async () => {
        const syncedConfig = await storage.get(CONFIG_KEY, null, 'sync');

        if (syncedConfig) {
            // 基础合并
            config.value = {
                ...config.value,
                ...syncedConfig,
                theme: {...config.value.theme, ...syncedConfig.theme}
            };

            // 智能合并 Widgets (保留新代码定义的组件，保留旧数据的配置)
            const storedWidgets = syncedConfig.widgets || defaultConfig.widgets;
            config.value.widgets = defaultConfig.widgets.map((defW: any) => {
                const exists = storedWidgets.find((w: any) => w.id === defW.id);
                if (exists) {
                    if (exists.colSpan === undefined) exists.colSpan = defW.colSpan;
                    return exists;
                }
                return defW;
            });

            // 检查本地大图壁纸
            if (config.value.theme.wallpaper === LOCAL_MARKER) {
                const localWallpaper = await storage.get(WALLPAPER_KEY, '', 'local');
                if (localWallpaper) {
                    config.value.theme.wallpaper = localWallpaper;
                }
            }
        }
        isLoaded.value = true;
    };

    // ✨✨✨ 核心修复：提取 saveConfig 函数 ✨✨✨
    const saveConfig = async () => {
        if (!isLoaded.value) return;

        // 深拷贝副本，用于处理壁纸逻辑，不影响 UI 显示
        const configToSync = JSON.parse(JSON.stringify(config.value));
        const currentWallpaper = configToSync.theme.wallpaper || '';

        // 判断壁纸是否为 Base64
        const isBase64 = currentWallpaper.startsWith('data:image');

        if (isBase64) {
            // A. Base64 存 Local，Sync 存标记位
            await storage.set(WALLPAPER_KEY, currentWallpaper, 'local');
            configToSync.theme.wallpaper = LOCAL_MARKER;
        } else {
            // B. URL 存 Sync，清理 Local
            if (currentWallpaper !== LOCAL_MARKER) {
                await storage.remove(WALLPAPER_KEY, 'local');
            }
        }

        // 保存配置到 Sync
        await storage.set(CONFIG_KEY, configToSync, 'sync');
    };

    // 监听配置变化自动保存
    watch(config, () => {
        saveConfig();
    }, {deep: true});

    // 监听 Chrome 外部存储变化 (多设备同步)
    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.onChanged.addListener((changes, areaName) => {
            if (areaName === 'sync' && changes[CONFIG_KEY]) {
                loadConfig();
            }
            if (areaName === 'local' && changes[WALLPAPER_KEY]) {
                config.value.theme.wallpaper = changes[WALLPAPER_KEY].newValue;
            }
        });
    }

    // --- Actions ---

    const addGroup = (group: any) => {
        group.id = Date.now().toString();
        group.items = [];
        config.value.layout.push(group);
    };

    const removeGroup = (groupId: string) => {
        config.value.layout = config.value.layout.filter((g: any) => g.id !== groupId);
    };

    const updateGroup = (groupId: string, data: any) => {
        const group = config.value.layout.find((g: any) => g.id === groupId);
        if (group) Object.assign(group, data);
    };

    const addSite = (groupId: string, site: any) => {
        const group = config.value.layout.find((g: any) => g.id === groupId);
        if (group) {
            site.id = Date.now().toString();
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
    };

    const toggleWidget = (widgetId: string, isVisible: boolean) => {
        const widget = config.value.widgets.find((w: any) => w.id === widgetId);
        if (widget) widget.visible = isVisible;
    };

    const updateWidgetConfig = (widgetId: string, settings: any) => {
        const widget = config.value.widgets.find((w: any) => w.id === widgetId);
        if (widget) {
            widget.config = {...widget.config, ...settings};
        }
    };

    const addRssFeed = (widgetId: string, name: string, url: string) => {
        const widget = config.value.widgets.find((w: any) => w.id === widgetId);
        if (widget && widget.config && widget.config.feeds) {
            widget.config.feeds.push({name, url});
        }
    };

    const removeRssFeed = (widgetId: string, url: string) => {
        const widget = config.value.widgets.find((w: any) => w.id === widgetId);
        if (widget && widget.config && widget.config.feeds) {
            widget.config.feeds = widget.config.feeds.filter((f: any) => f.url !== url);
        }
    };

    // 状态管理
    const dragState = ref({
        isDragging: false,
        item: null as any,
        fromGroupId: ''
    });

    const setDragState = (isDragging: boolean, fromGroupId: string = '', item: any = null) => {
        dragState.value = {isDragging, fromGroupId, item};
    };

    const contextMenu = ref({
        show: false,
        x: 0,
        y: 0,
        type: 'site' as 'site' | 'group',
        item: null as any,
        groupId: ''
    });

    const openContextMenu = (e: MouseEvent, item: any, type: 'site' | 'group', groupId: string = '') => {
        e.preventDefault();
        e.stopPropagation();
        contextMenu.value = {
            show: true,
            x: e.clientX,
            y: e.clientY,
            type,
            item,
            groupId: groupId || (type === 'group' ? item.id : '')
        };
    };

    const closeContextMenu = () => {
        contextMenu.value.show = false;
    };

    //导入书签功能
    const importBookmarks = (htmlContent: string) => {
        const result = parseBookmarkContent(htmlContent);

        if (result.success && result.groups.length > 0) {
            config.value.layout.push(...result.groups);
            saveConfig(); // 手动触发保存
            return {
                success: true,
                groupCount: result.groups.length,
                count: result.totalCount
            };
        }

        return {
            success: false,
            message: result.message || '导入失败'
        };
    };

    return {
        config,
        isLoaded,
        loadConfig,
        saveConfig,
        // Actions
        addGroup,
        removeGroup,
        updateGroup,
        addSite,
        updateSite,
        removeSite,
        reorderItems,
        moveSite,
        addEngine,
        removeEngine,
        toggleWidget,
        updateWidgetConfig,
        addRssFeed,
        removeRssFeed,
        importBookmarks,
        // State
        setDragState,
        dragState,
        contextMenu,
        openContextMenu,
        closeContextMenu,
        rssCache
    };
});