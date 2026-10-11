import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { defineConfig } from 'vite'

// 使用 React 插件构建前端开发和生产资源。
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 3000, // 5173 落在 Windows 保留端口段(5160-5259)内，监听会被系统拒绝，改用 3000。
  },
})
