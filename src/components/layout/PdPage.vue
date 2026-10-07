<script setup lang="ts">
/**
 * PdPage —— 页面容器
 * 职责：主题类（浅色/深色）、减少动效类、页面背景、导航栏、底部导航、安全区。
 * 主题与减少动效统一在此注入，保证全站一致（UI-UX 第 6.5 / 7.4 节）。
 */
import { computed } from 'vue';
import PdNavBar from '@/components/base/PdNavBar.vue';
import PdGlobalOverlays from '@/components/layout/PdGlobalOverlays.vue';
import PdTabBar from '@/components/layout/PdTabBar.vue';
import type { TabKey } from '@/components/layout/tabs';
import { usePreferencesStore } from '@/store/preferences';
import { useRainbowMode } from '@/utils/easter-eggs';

type PageBackground = 'page' | 'plain' | 'focus';

const props = withDefaults(
  defineProps<{
    /** 背景：page=页面灰底，plain=白底，focus=专注页深色渐变 */
    background?: PageBackground;
    showNav?: boolean;
    title?: string;
    showBack?: boolean;
    navTransparent?: boolean;
    /** 内容左右内边距（32rpx） */
    padded?: boolean;
    /** 渲染自定义底部导航 */
    tabBar?: boolean;
    tab?: TabKey;
    /** 阻止页面滚动（专注页等） */
    fill?: boolean;
  }>(),
  {
    background: 'page',
    showNav: false,
    title: '',
    showBack: false,
    navTransparent: false,
    padded: false,
    tabBar: false,
    tab: 'home',
    fill: false,
  }
);

const emit = defineEmits<{ (event: 'back'): void }>();

const preferences = usePreferencesStore();
const { rainbowActive } = useRainbowMode();

const rootClasses = computed(() => [
  `pd-page--bg-${props.background}`,
  {
    'pd-theme-dark': preferences.resolvedTheme === 'dark',
    'pd-reduce-motion': preferences.reduceMotion,
    'pd-rainbow': rainbowActive.value && !preferences.reduceMotion,
    'pd-page--fill': props.fill,
  },
]);

const bodyClasses = computed(() => [
  {
    'pd-page__body--padded': props.padded,
    'pd-page__body--tabbar': props.tabBar,
  },
]);

function onBack(): void {
  emit('back');
}
</script>

<template>
  <view class="pd-page" :class="rootClasses">
    <PdNavBar
      v-if="showNav"
      :title="title"
      :show-back="showBack"
      :transparent="navTransparent"
      :on-dark="background === 'focus'"
      @back="onBack"
    >
      <template #left>
        <slot name="nav-left" />
      </template>
      <template #right>
        <slot name="nav-right" />
      </template>
    </PdNavBar>

    <view class="pd-page__body" :class="bodyClasses">
      <slot />
    </view>

    <PdTabBar v-if="tabBar" :current="tab" :reduce-motion="preferences.reduceMotion" />

    <slot name="overlay" />

    <!-- 全局浮层：庆祝弹窗 + 成就提示 -->
    <PdGlobalOverlays />
  </view>
</template>

<style scoped lang="scss">
@import '../../styles/mixins.scss';

.pd-page {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  min-height: 100vh;
  background-color: var(--pd-bg-page);
  transition: background-color $motion-theme-switch linear, color $motion-theme-switch linear;
}

.pd-page--bg-plain {
  background-color: var(--pd-bg-primary);
}

.pd-page--bg-focus {
  background: var(--pd-focus-bg);
}

.pd-page--fill {
  height: 100vh;
  overflow: hidden;
}

.pd-page__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  min-height: 0;
}

.pd-page__body--padded {
  padding-left: $container-padding;
  padding-right: $container-padding;
}

.pd-page__body--tabbar {
  padding-bottom: $layout-tabbar-space;
}

// 顶部安全区：无导航栏时由页面自行处理
.pd-page {
  @include safe-area-top;
}

// 彩蛋：彩虹模式（第 4.5 节）
.pd-page.pd-rainbow {
  background: linear-gradient(
    135deg,
    $color-primary,
    $color-info,
    $color-success,
    $color-warning,
    $color-error
  );
  background-size: 400% 400%;
  animation: pd-rainbow-shift 4s linear infinite;
}
</style>