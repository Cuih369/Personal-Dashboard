import { createSSRApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';

/**
 * uni-app 要求导出 createApp 工厂函数。
 * 启动期的数据初始化在 App.vue 的 onLaunch 中执行（此时 Pinia 已安装）。
 */
export function createApp() {
  const app = createSSRApp(App);
  app.use(createPinia());
  return { app };
}
