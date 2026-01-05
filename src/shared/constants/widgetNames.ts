export const WIDGET_NAME_ZH: Record<string, string> = {
    clock: '时钟',
    weather: '天气',
    calendar: '日历',
    system_monitor: '系统监控',
    github_trending: 'GitHub 热门',
    salary: '薪资',
    holiday: '节假日',
    wooden_fish: '木鱼',
    stock_ticker: '股票行情',
    terminal_buffer: '终端',
    jwt_sentry: 'JWT 哨兵',
    cron: '定时任务',
};

export function getWidgetDisplayName(type?: string) {
    if (!type) return '组件';
    return WIDGET_NAME_ZH[type] || type; // 未收录就原样显示
}
