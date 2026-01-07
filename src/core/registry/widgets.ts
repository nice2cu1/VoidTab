import {defineAsyncComponent} from 'vue';
import {
    PhClock, PhCalendarBlank, PhCloudSun, PhCpu, PhGithubLogo,
    PhPiggyBank, PhConfetti, PhHandFist, PhTrendUp, PhTerminalWindow,
    PhShieldCheck, PhTimer, PhImages, PhGlobe, PhDrop, PhBowlFood, PhCheckSquare
} from '@phosphor-icons/vue';

/**
 * 组件元数据接口定义
 */
export interface WidgetMeta {
    type: string;
    label: string;
    description: string;
    defaultW: number;
    defaultH: number;
    category: 'time' | 'system' | 'tool' | 'game' | string;
    component: ReturnType<typeof defineAsyncComponent>;

    // ✅ 新增视觉配置
    icon: any; // Phosphor Icon 组件
    color: string; // Tailwind 渐变色类名 (e.g. 'from-blue-500 to-cyan-500')
}

/**
 * 组件注册表
 */
export const widgetRegistry: WidgetMeta[] = [
    {
        type: 'clock',
        label: '数字时钟',
        description: '极简风格的数字时钟，支持自适应排版及翻页动效。',
        defaultW: 2,
        defaultH: 2,
        category: 'time',
        component: defineAsyncComponent(() => import('../../features/widgets/builtins/clock/ClockWidget.vue')),
        icon: PhClock,
        color: 'from-gray-700 to-gray-900',
    },
    {
        type: 'calendar',
        label: '日历',
        description: '展示公历与农历信息，支持点击查看节假日详情。',
        defaultW: 2,
        defaultH: 2,
        category: 'time',
        component: defineAsyncComponent(() => import('../../features/widgets/builtins/calendar/CalendarWidget.vue')),
        icon: PhCalendarBlank,
        color: 'from-red-500 to-rose-600',
    },
    {
        type: 'weather',
        label: '实时天气',
        description: '自动获取气象数据，包含气温、风力及未来趋势。',
        defaultW: 2,
        defaultH: 2,
        category: 'life',
        component: defineAsyncComponent(() => import('../../features/widgets/builtins/weather/WeatherWidget.vue')),
        icon: PhCloudSun,
        color: 'from-blue-400 to-sky-500',
    },
    {
        type: 'system_monitor',
        label: '系统监控',
        description: '实时显示网络延迟、IP地址及系统资源占用。',
        defaultW: 2,
        defaultH: 2,
        category: 'system',
        component: defineAsyncComponent(() => import('../../features/widgets/builtins/system-monitor/SystemMonitorWidget.vue')),
        icon: PhCpu,
        color: 'from-emerald-500 to-teal-600',
    },
    {
        type: 'github_trending',
        label: 'GitHub 热榜',
        description: '实时追踪本周最热门的开源项目趋势。',
        defaultW: 4,
        defaultH: 2,
        category: 'tool',
        component: defineAsyncComponent(() => import('../../features/widgets/builtins/github-trending/GitHubTrendingWidget.vue')),
        icon: PhGithubLogo,
        color: 'from-gray-800 to-black',
    },
    {
        type: 'salary',
        label: '存钱罐',
        description: '记录积蓄进度，时刻提醒自己为了什么而奋斗。',
        defaultW: 2,
        defaultH: 2,
        category: 'tool',
        component: defineAsyncComponent(() => import('../../features/widgets/builtins/salary/SalaryWidget.vue')),
        icon: PhPiggyBank,
        color: 'from-amber-400 to-orange-500',
    },
    {
        type: 'holiday',
        label: '节假日',
        description: '下一个假期还有多久？这里有最精准的倒计时。',
        defaultW: 2,
        defaultH: 2,
        category: 'time',
        component: defineAsyncComponent(() => import('../../features/widgets/builtins/holiday/HolidayWidget.vue')),
        icon: PhConfetti,
        color: 'from-pink-500 to-rose-500',
    },
    {
        type: 'wooden_fish',
        label: '电子木鱼',
        description: '积攒赛博功德，敲出宁静致远。',
        defaultW: 2,
        defaultH: 2,
        category: 'game',
        component: defineAsyncComponent(() => import('../../features/widgets/builtins/wooden-fish/WoodenFishWidget.vue')),
        icon: PhHandFist,
        color: 'from-stone-500 to-stone-700',
    },
    {
        type: 'stock_ticker',
        label: '摸鱼看板',
        description: '隐蔽地关注市场动态，不打开交易软件也能看盘。',
        defaultW: 2,
        defaultH: 2,
        category: 'tool',
        component: defineAsyncComponent(() => import('../../features/widgets/builtins/stock-ticker/StockTickerWidget.vue')),
        icon: PhTrendUp,
        color: 'from-red-600 to-red-700',
    },
    {
        type: 'terminal_buffer',
        label: '夜幕笔记',
        description: '极客风格的临时缓冲区，像写代码一样记笔记。',
        defaultW: 4,
        defaultH: 2,
        category: 'tool',
        component: defineAsyncComponent(() => import('../../features/widgets/builtins/terminal-buffer/TerminalWidget.vue')),
        icon: PhTerminalWindow,
        color: 'from-green-600 to-emerald-700',
    },
    {
        type: 'jwt_sentry',
        label: 'JWT 解析',
        description: '本地化 Token 调试终端，开发者的随身瑞士军刀。',
        defaultW: 2,
        defaultH: 2,
        category: 'tool',
        component: defineAsyncComponent(() => import('../../features/widgets/builtins/jwt-sentry/JWTSentryWidget.vue')),
        icon: PhShieldCheck,
        color: 'from-violet-600 to-indigo-600',
    },
    {
        type: 'cron',
        label: 'Cron 助手',
        description: '可视化的 Cron 表达式生成与验证工具。',
        defaultW: 2,
        defaultH: 2,
        category: 'tool',
        component: defineAsyncComponent(() => import('../../features/widgets/builtins/cron/CronWidget.vue')),
        icon: PhTimer,
        color: 'from-orange-500 to-amber-600',
    },
    {
        type: 'photo_wall',
        label: '照片墙',
        description: '留住美好瞬间，支持多图轮播与本地存储。',
        defaultW: 2,
        defaultH: 2,
        category: 'tool',
        component: defineAsyncComponent(() => import('../../features/widgets/builtins/photo-wall/PhotoWallWidget.vue')),
        icon: PhImages,
        color: 'from-indigo-400 to-purple-500',
    },
    {
        type: 'site_list',
        label: '捷径库',
        description: '创建自定义网站列表，或将其变为单个网站的快捷入口。',
        defaultW: 2,
        defaultH: 2,
        category: 'tool',
        component: defineAsyncComponent(() => import('../../features/widgets/builtins/site/SiteListWidget.vue')),
        icon: PhGlobe,
        color: 'from-cyan-500 to-blue-500',
    },
    {
        type: 'water_tracker',
        label: '喝水助手',
        description: '记录每日饮水量，定时提醒补水，保持身体活力。',
        defaultW: 2,
        defaultH: 2,
        category: 'life', // 新分类 key
        component: defineAsyncComponent(() => import('../../features/widgets/builtins/water_tracker/WaterWidget.vue')),
        icon: PhDrop,
        color: 'from-cyan-400 to-blue-500', // 清新的水蓝色
    },
    {
        type: 'food_decider',
        label: '今天吃什么',
        description: '解决选择困难症，随机抽取今日美食灵感。',
        defaultW: 2,
        defaultH: 2,
        category: 'life',
        component: defineAsyncComponent(() => import('../../features/widgets/builtins/food_decider/FoodDeciderWidget.vue')),
        icon: PhBowlFood,
        color: 'from-orange-400 to-red-500', // 增加食欲的暖色
    },
    {
        type: 'habit_tracker',
        label: '习惯打卡',
        description: '量化你的进步，每天坚持一个小目标。',
        defaultW: 2,
        defaultH: 2,
        category: 'life',
        component: defineAsyncComponent(() => import('../../features/widgets/builtins/habit_tracker/HabitWidget.vue')),
        icon: PhCheckSquare,
        color: 'from-emerald-400 to-green-600', // 代表健康的绿色
    },
];

export const widgetRegistryMap: Record<string, WidgetMeta> = Object.fromEntries(
    widgetRegistry.map((w) => [w.type, w])
) as Record<string, WidgetMeta>;

export function getWidgetMeta(type?: string) {
    if (!type) return undefined;
    return widgetRegistryMap[type];
}

export function getWidgetLabel(type?: string) {
    return getWidgetMeta(type)?.label || type || '组件';
}