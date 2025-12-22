import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
    plugins: [vue()],
    base: './', // 确保相对路径
    build: {
        // 关键配置：输出目录设为 dist
        outDir: 'dist',
        rollupOptions: {
            // 输入入口：告诉 Vite 有两个文件要处理
            input: {
                main: resolve(__dirname, 'index.html'),       // 你的主页
                background: resolve(__dirname, 'src/background.ts') // 你的后台脚本
            },
            // 输出配置：强制去掉文件名后的哈希乱码
            output: {
                entryFileNames: 'assets/[name].js',
                chunkFileNames: 'assets/[name].js',
                assetFileNames: 'assets/[name].[ext]'
            }
        }
    }
})