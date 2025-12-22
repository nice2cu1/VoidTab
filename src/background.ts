// src/background.ts

// 监听安装事件：创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "set-voidtab-wallpaper",
        title: "设为 VoidTab 壁纸",
        contexts: ["image"]
    });
});

// 监听菜单点击事件
// 1. 移除了未使用的 'tab' 参数，只保留 info
chrome.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId === "set-voidtab-wallpaper" && info.srcUrl) {
        convertImageToBase64(info.srcUrl);
    }
});

// 辅助函数：将网络图片转为 Base64
async function convertImageToBase64(url: string) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64data = reader.result as string;

            // 存入 local storage (大图)
            chrome.storage.local.set({ 'voidtab-wallpaper-blob': base64data }, () => {
                console.log('壁纸已保存到本地存储');
            });

            // 更新 sync storage 标记位
            chrome.storage.sync.get(['voidtab-core-config'], (result) => {
                // 2. 这里加上 : any 类型断言，告诉 TS "别管结构，我心里有数"
                const config: any = result['voidtab-core-config'] || {};

                // 现在可以安全地访问和修改 .theme 了
                if (!config.theme) config.theme = {};

                config.theme.wallpaper = '_USE_LOCAL_STORAGE_'; // 你的标记位常量

                chrome.storage.sync.set({ 'voidtab-core-config': config });
            });
        };
        reader.readAsDataURL(blob);
    } catch (error) {
        console.error('图片下载失败:', error);
    }
}