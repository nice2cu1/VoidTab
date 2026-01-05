// src/core/registry/widgets.ts
import {defineAsyncComponent} from 'vue';

/**
 * 组件元数据接口定义（唯一来源）
 */
export interface WidgetMeta {
    type: string;
    label: string;
    description: string;
    defaultW: number;
    defaultH: number;

    /**
     * 组件分类：
     * time: 时间日期
     * system: 系统监控
     * tool: 效率工具
     * game: 游戏
     */
    category: 'time' | 'system' | 'tool' | 'game' | string;

    /** ✅ 组件本体：异步加载（WidgetCard 直接用它渲染） */
    component: ReturnType<typeof defineAsyncComponent>;
}

/**
 * ✅ 组件注册表（唯一来源）
 * 新增组件：只需要在这里加一条记录
 */
export const widgetRegistry: WidgetMeta[] = [
    {
        type: 'clock',
        label: '数字时钟',
        description: '极简风格的数字时钟，支持 1x1 到 4x2 的自适应排版及翻页动效。',
        defaultW: 2,
        defaultH: 2,
        category: 'time',
        component: defineAsyncComponent(() => import('../../features/widgets/builtins/clock/ClockWidget.vue')),
    },
    {
        type: 'calendar',
        label: '日历',
        description: '展示详细的公历与农历信息，支持点击查看月份大图及节假日详情。',
        defaultW: 2,
        defaultH: 2,
        category: 'time',
        component: defineAsyncComponent(() => import('../../features/widgets/builtins/calendar/CalendarWidget.vue')),
    },
    {
        type: 'weather',
        label: '实时天气',
        description: '自动获取当前城市气象数据，包含气温、风力及未来趋势预览。',
        defaultW: 2,
        defaultH: 2,
        category: 'system',
        component: defineAsyncComponent(() => import('../../features/widgets/builtins/weather/WeatherWidget.vue')),
    },
    {
        type: 'system_monitor',
        label: '系统监控',
        description: '实时显示网络延迟、IP地址及系统资源占用情况。',
        defaultW: 2,
        defaultH: 2,
        category: 'system',
        component: defineAsyncComponent(() => import('../../features/widgets/builtins/system-monitor/SystemMonitorWidget.vue')),
    },
    {
        type: 'github_trending',
        label: 'GitHub 热榜',
        description: '实时追踪本周最热门的开源项目趋势。',
        defaultW: 2,
        defaultH: 4,
        category: 'tool',
        component: defineAsyncComponent(() => import('../../features/widgets/builtins/github-trending/GitHubTrendingWidget.vue')),
    },
    {
        type: 'salary',
        label: '存钱罐',
        description: '存钱罐。',
        defaultW: 2,
        defaultH: 4,
        category: 'tool',
        component: defineAsyncComponent(() => import('../../features/widgets/builtins/salary/SalaryWidget.vue')),
    },
    {
        type: 'holiday',
        label: '节假日信息',
        description: '节假日信息。',
        defaultW: 2,
        defaultH: 4,
        category: 'tool',
        component: defineAsyncComponent(() => import('../../features/widgets/builtins/holiday/HolidayWidget.vue')),
    },
    {
        type: 'wooden_fish',
        label: '敲木鱼',
        description: '敲木鱼',
        defaultW: 2,
        defaultH: 4,
        category: 'game',
        component: defineAsyncComponent(() => import('../../features/widgets/builtins/wooden-fish/WoodenFishWidget.vue')),
    },
    {
        type: 'stock_ticker',
        label: '摸鱼看板',
        description: '不打开交易软件，悄悄瞥一眼大盘或自选股。',
        defaultW: 2,
        defaultH: 4,
        category: 'tool',
        component: defineAsyncComponent(() => import('../../features/widgets/builtins/stock-ticker/StockTickerWidget.vue')),
    },
    {
        type: 'terminal_buffer',
        label: '夜幕笔记',
        description: '轻量级笔记应用，让记录更舒适、更专注。',
        defaultW: 2,
        defaultH: 2,
        category: 'tool',
        component: defineAsyncComponent(() => import('../../features/widgets/builtins/terminal-buffer/TerminalWidget.vue')),
    },
    {
        type: 'jwt_sentry',
        label: 'JWT解析',
        description: '专为后端开发者打造的本地化 Token 调试终端。',
        defaultW: 2,
        defaultH: 2,
        category: 'tool',
        component: defineAsyncComponent(() => import('../../features/widgets/builtins/jwt-sentry/JWTSentryWidget.vue')),
    },
    {
        type: 'cron',
        label: 'Cron 在线表达式',
        description: '为 Spring Boot 开发者设计的定时任务指挥台',
        defaultW: 2,
        defaultH: 2,
        category: 'tool',
        component: defineAsyncComponent(() => import('../../features/widgets/builtins/cron/CronWidget.vue')),
    },
    {
        type: 'photo_wall',
        label: '照片组件',
        description: '支持 URL / 本地多图上传，默认展示一张，点击进入管理。',
        defaultW: 2,
        defaultH: 2,
        category: 'tool',
        component: defineAsyncComponent(() => import('../../features/widgets/builtins/photo-wall/PhotoWallWidget.vue')),
    },

];

/** ✅ 高效查找：type -> meta */
export const widgetRegistryMap: Record<string, WidgetMeta> = Object.fromEntries(
    widgetRegistry.map((w) => [w.type, w])
) as Record<string, WidgetMeta>;

/** ✅ 获取 meta */
export function getWidgetMeta(type?: string) {
    if (!type) return undefined;
    return widgetRegistryMap[type];
}

/** ✅ 获取显示名（中文 label 优先，没收录则退回 type） */
export function getWidgetLabel(type?: string) {
    return getWidgetMeta(type)?.label || type || '组件';
}
