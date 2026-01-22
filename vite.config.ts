
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // 设置为 './' 使构建后的资源引用变为相对路径
  // 适配 github.io/your-repo-name/ 这种子路径格式
  base: './', 
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
  }
});
