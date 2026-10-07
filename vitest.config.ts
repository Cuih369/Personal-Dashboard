import path from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * 单元测试专用配置（**刻意不复用 vite.config.ts**）
 *
 * vitest 默认会加载 vite.config.ts，而其中注册了 `@dcloudio/vite-plugin-uni`——
 * 该插件面向跨端构建，启动时会走 uni 的编译管线，在纯 Node 测试环境下会报
 * `Failed to resolve vue/compiler-sfc` 而直接中断。
 *
 * 被测对象（src/services 的规则引擎 / 统计聚合 / 推送计划）都是**纯函数**，
 * 不依赖任何 uni 运行时，因此这里只保留 `@` 别名即可。
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.spec.ts'],
    // 纯函数测试，无需全局注入
    globals: false,
  },
});
