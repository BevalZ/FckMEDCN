import { defineConfig } from 'vite';

// 相对 base：在 GitHub Pages 子路径(/<仓库名>/)与 Vercel/Netlify 根路径下均可部署
export default defineConfig({
  base: './',
  server: { host: true },
  build: {
    chunkSizeWarningLimit: 2000,
    target: 'es2019',
  },
});
