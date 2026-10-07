<script setup lang="ts">
/**
 * App —— 全局入口
 * 职责：启动引导（初始化服务层 + 预热 store）、全局样式、错误兜底。
 *
 * 说明：主题（浅色/深色/跟随系统）与「减少动效」由 src/components/layout/PdPage.vue
 * 统一注入到页面根节点，此处**不重复处理**，避免两套机制互相覆盖。
 *
 * 隐私约束（PRD Story 8）：除系统级推送外不得发起任何网络请求，此处不做任何远程拉取。
 */
import { onError, onLaunch, onShow } from '@dcloudio/uni-app';
import { initServices } from '@/services';
import { bootstrapAppData } from '@/store';

let booted = false;

async function boot(): Promise<void> {
  // 服务层初始化：内部自带 H5 降级与内存兜底，此处仅兜住异常，绝不白屏
  try {
    await initServices();
  } catch (error) {
    console.warn('[App] 服务层初始化失败，已降级运行', error);
  }
  // 预热偏好与任务，避免首屏闪烁；各 store 内部失败亦会降级
  try {
    await bootstrapAppData();
  } catch (error) {
    console.warn('[App] 启动数据预热失败，已降级运行', error);
  }
}

onLaunch(() => {
  booted = true;
  void boot();
});

onShow(() => {
  if (!booted) void boot();
});

onError((error) => {
  console.error('[App] 未捕获错误', error);
});
</script>

<style lang="scss">
/* 全局样式唯一入口：reset + 设计 token 的 CSS 变量 + 通用类/动画 */
@import '@/styles/index.scss';
</style>
