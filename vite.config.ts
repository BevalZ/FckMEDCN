import { defineConfig } from 'vite';

// 相对 base：在 GitHub Pages 子路径(/<仓库名>/)与 Vercel/Netlify 根路径下均可部署
export default defineConfig({
  base: './',
  server: { host: true },
  build: {
    chunkSizeWarningLimit: 2000,
    target: 'es2019',
    // Phaser 很稳定而游戏事件数据更新频繁；分成独立 vendor chunk，避免每次内容更新都让
    // 浏览器重新下载整个 2MB+ 单包，也让生产构建不再出现超大 chunk 警告。
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'phaser', test: /node_modules[\\/]phaser[\\/]/ },
          ],
        },
      },
    },
  },
});
