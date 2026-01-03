// src/utils/url.ts
export function getSiteNameFromUrl(urlStr: string): string {
    if (!urlStr) return '';
    try {
        const href = urlStr.startsWith('http') ? urlStr : `https://${urlStr}`;
        const hostname = new URL(href).hostname;
        if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return hostname;

        let cleanHost = hostname.replace(/^www\./, '');
        const compoundSuffixes = ['com.cn', 'net.cn', 'org.cn', 'gov.cn', 'co.uk', 'github.io', 'vercel.app'];
        const suffix = compoundSuffixes.find(s => cleanHost.endsWith(`.${s}`));

        let parts = [];
        if (suffix) {
            const content = cleanHost.substring(0, cleanHost.length - suffix.length - 1);
            parts = content.split('.');
        } else {
            parts = cleanHost.split('.');
            if (parts.length > 1) parts.pop(); // 移除 .com
        }

        const name = parts[parts.length - 1];
        return name ? name.charAt(0).toUpperCase() + name.slice(1) : '';
    } catch (e) {
        return '';
    }
}