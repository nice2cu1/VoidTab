/**
 * 1. 白名单：知名大站，强制使用官方 CDN 原图 (绝对高清)
 */
const PRESET_ICONS: Record<string, string> = {
    // GitHub
    'github.com': 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
    // Bilibili
    'bilibili.com': 'https://s1.hdslb.com/bfs/static/jinkela/long/images/512.png',
    // YouTube
    'youtube.com': 'https://www.youtube.com/s/desktop/10c3080e/img/favicon_144x144.png',
    // 淘宝
    'taobao.com': 'https://img.alicdn.com/tfs/TB1_uT8a5ZX8KJjSgoSXXa.sXXa-128-128.png',
    // 知乎
    'zhihu.com': 'https://static.zhihu.com/heifetz/assets/apple-touch-icon-152.a53ae37b.png',
    // CSDN
    'csdn.net': 'https://g.csdnimg.cn/static/logo/favicon32.ico',
};

/**
 * 判断是否为内网 IP 或 Localhost
 */
function isIpOrLocal(domain: string): boolean {
    return (
        domain === 'localhost' ||
        domain.startsWith('127.') ||
        domain.startsWith('192.168.') ||
        domain.startsWith('10.') ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(domain) || // 172.16.x.x - 172.31.x.x
        /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(domain)   // 其他纯数字 IP
    );
}

/**
 * ✨✨✨ 核心函数：生成图标备选列表 ✨✨✨
 * 返回一个 URL 数组，前端 Hook 会按顺序尝试加载，直到成功
 */
export function getIconCandidates(rawUrl: string): string[] {
    if (!rawUrl) return [];

    try {
        // 1. 补全协议，防止 new URL 报错
        const href = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
        const urlObj = new URL(href);
        const domain = urlObj.hostname;
        const rootDomain = domain.replace(/^www\./, ''); // 移除 www 以匹配白名单

        // 2. 优先级最高：检查白名单 (Preset)
        // 如果在白名单里，直接返回这一个，不浪费时间请求别的
        if (PRESET_ICONS[domain]) return [PRESET_ICONS[domain]];
        if (PRESET_ICONS[rootDomain]) return [PRESET_ICONS[rootDomain]];

        // 3. 场景 A：内网 IP 或 Localhost
        // 以前你返回 ''，现在我们尝试去获取根目录的 favicon
        if (isIpOrLocal(domain)) {
            return [`${urlObj.origin}/favicon.ico`];
        }

        // 4. 场景 B：公网域名 -> 返回备选队列
        return [
            // 优选: Yandex (你之前的首选，高清)
            `https://favicon.yandex.net/favicon/${domain}?size=120`,

            // 备选 1: DuckDuckGo (覆盖率极高，很多小站能抓到)
            `https://icons.duckduckgo.com/ip3/${domain}.ico`,

            // 备选 2: Google (速度最快，作为兜底)
            `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,

            // 备选 3: 暴力猜测网站根目录 (最后尝试)
            `${urlObj.origin}/favicon.ico`
        ];

    } catch (e) {
        console.warn('URL 解析失败:', rawUrl);
        return [];
    }
}

/**
 * 兼容旧代码的单一导出 (可选)
 * 如果你其他地方还在用 getHighResIconUrl，保留这个函数以免报错
 */
export const getHighResIconUrl = (url: string): string => {
    const candidates = getIconCandidates(url);
    return candidates.length > 0 ? candidates[0] : '';
};