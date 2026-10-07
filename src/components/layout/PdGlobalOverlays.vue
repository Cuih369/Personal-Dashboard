<script setup lang="ts">
/**
 * PdGlobalOverlays —— 全局浮层宿主
 * 统一承载「庆祝弹窗」与「成就解锁提示」，避免每个页面重复挂载；
 * 逻辑仍归属 store（session / stats），本组件只负责交互编排。
 */
import { computed } from 'vue';
import AchievementToast from '@/components/business/AchievementToast.vue';
import CelebrationModal from '@/components/business/CelebrationModal.vue';
import { usePreferencesStore } from '@/store/preferences';
import { useSessionStore } from '@/store/session';
import { useStatsStore } from '@/store/stats';
import { useTasksStore } from '@/store/tasks';
import { toast } from '@/utils/feedback';
import { HOME_COPY } from '@/utils/copy';

interface PageStackItem {
  route?: string;
}

const preferences = usePreferencesStore();
const session = useSessionStore();
const stats = useStatsStore();
const tasks = useTasksStore();

const celebrationVisible = computed(() => session.celebration !== null);
const achievementVisible = computed(() => stats.latestAchievement !== null);

function currentRoute(): string {
  if (typeof getCurrentPages !== 'function') return '';
  try {
    const stack = getCurrentPages() as unknown as PageStackItem[];
    return stack[stack.length - 1]?.route ?? '';
  } catch {
    return '';
  }
}

function go(url: string): void {
  if (typeof uni === 'undefined') return;
  try {
    uni.reLaunch({ url });
  } catch {
    // 忽略：导航失败不应白屏
  }
}

function onCelebrationVisible(value: boolean): void {
  if (!value) session.dismissCelebration();
}

/** 再来1个：关闭弹窗 -> 换到下一个任务 -> 直接开始新一轮专注 */
async function onContinue(): Promise<void> {
  session.dismissCelebration();
  tasks.rotateFocus();
  const next = tasks.focusTask;
  if (!next) {
    toast(HOME_COPY.noTaskToast);
    go('/pages/home/index');
    return;
  }
  await session.start(next);
  if (currentRoute() !== 'pages/focus/index') go('/pages/focus/index');
}

/** 今天到此为止：回到首页 */
function onStop(): void {
  session.dismissCelebration();
  session.reset();
  if (currentRoute() !== 'pages/home/index') go('/pages/home/index');
}

function onAchievementVisible(value: boolean): void {
  if (!value) stats.dismissAchievement();
}
</script>

<template>
  <view class="pd-overlays">
    <CelebrationModal
      :visible="celebrationVisible"
      :celebration="session.celebration"
      :reduce-motion="preferences.reduceMotion"
      @update:visible="onCelebrationVisible"
      @continue="onContinue"
      @stop="onStop"
    />

    <AchievementToast
      :visible="achievementVisible"
      :achievement="stats.latestAchievement"
      :reduce-motion="preferences.reduceMotion"
      @update:visible="onAchievementVisible"
    />
  </view>
</template>

<style scoped lang="scss">
.pd-overlays {
  display: contents;
}
</style>