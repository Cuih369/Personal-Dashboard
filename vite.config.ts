import path from 'node:path';
import { defineConfig } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';

// process.cwd() 即工程根目录（npm 脚本在根目录执行），
// 避免在 ESM/CJS 下 __dirname 与 import.meta.url 的差异。
const srcDir = path.resolve(process.cwd(), 'src');

export default defineConfig({
  plugins: [uni()],
  resolve: {
    alias: {
      '@': srcDir,
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // 全站仍使用 @import（SCSS 变量/mixin，无 CSS 输出）；
        // 关闭 Dart Sass 的 @import 弃用噪音，保持构建输出可读。
        silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'legacy-js-api'],
      },
    },
  },
  build: {
    // 图表库经 @vite-ignore 动态探测，按需懒加载，不进入首屏包。
    chunkSizeWarningLimit: 1024,
  },
});
