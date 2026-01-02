// src/core/registry/widgets.ts

export interface WidgetMeta {
    type: string;
    label: string;
    description: string;
    defaultW: number;
    defaultH: number;
}

export const widgetRegistry: WidgetMeta[] = [
    {
        type: 'clock',
        label: '数字时钟',
        description: '显示当前时间和日期',
        defaultW: 2,
        defaultH: 1
    },
    {
        type: 'calendar',
        label: '日历',
        description: '查看当前月份视图',
        defaultW: 2,
        defaultH: 2
    },
    {
        type: 'weather',
        label: '天气信息',
        description: '当前城市的天气状况',
        defaultW: 2,
        defaultH: 2
    }
];