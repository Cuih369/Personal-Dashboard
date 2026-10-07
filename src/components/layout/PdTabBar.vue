<script setup lang="ts">
/**
 * PdTabBar —— 自定义底部导航（DEV-PLAN 3.3：不使用原生 tabBar）
 * 三个主页面（首页 / 统计 / 我的）内渲染，切换用 uni.reLaunch。
 * 样式依据 UI-UX 第 3.4.6 节：高 100rpx + 安全区、图标 48rpx、文字 20rpx。
 */
import { TAB_ITEMS, type TabItem, type TabKey } from './tabs';
import { isActivateKey, type KeyEventLike } from '@/utils/a11y';
const TABS: readonly TabItem[] = TAB_ITEMS;

const props = withDefaults(
  defineProps<{
    current: TabKey;
    /** 减少动效时禁用图标弹跳（第 6.5 节） */
    reduceMotion?: boolean;
  }>(),
  { reduceMotion: false }
);

const tabs = TABS;



function isActive(key: TabKey): boolean {
  return key === props.current;
}

/** 仅切换页面，不做栈内跳转（deliberately no native tabBar） */
function switchTo(tab: TabItem): void {
  if (isActive(tab.key)) return;
  if (typeof uni === 'undefined') return;
  try {
    uni.reLaunch({ url: tab.url });
  } catch {
    // 忽略：导航失败不应白屏
  }
}

function onKeydown(event: KeyEventLike, tab: TabItem): void {
  if (!isActivateKey(event?.key)) return;
  event.preventDefault?.();
  switchTo(tab);
}


</script>

<template>
  <view class="pd-tabbar" role="tablist">
    <view
      v-for="tab in tabs"
      :key="tab.key"
      class="pd-tabbar__item"
      :class="{ 'pd-tabbar__item--active': isActive(tab.key) }"
      role="tab"
      tabindex="0"
      :aria-label="tab.label"
      :aria-selected="isActive(tab.key) ? 'true' : 'false'"
      @tap="switchTo(tab)"
      @keydown="onKeydown($event, tab)"
    >
      <text class="pd-tabbar__icon">{{ tab.icon }}</text>
      <text class="pd-tabbar__label">{{ tab.label }}</text>
    </view>

  </view>
</template>

<style scoped lang="scss">
@import '../../styles/mixins.scss';

.pd-tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  height: $tab-bar-height;
  padding-bottom: $safe-bottom;
  background-color: var(--pd-bg-primary);
  border-top: 1rpx solid var(--pd-divider);
  transition: background-color $motion-theme-switch linear, border-color $motion-theme-switch linear;
}

.pd-tabbar__item {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rpx;
  height: 100%;
  min-height: $hit-target-min;

  @include focus-visible;
}

.pd-tabbar__icon {
  font-size: 48rpx;
  line-height: 1;
  transition: transform $motion-tab-switch $ease-bounce;
}

.pd-tabbar__label {
  font-size: $font-size-xs;
  font-weight: $font-weight-medium;
  color: var(--pd-text-tertiary);
  transition: color $motion-tab-switch ease;
}

.pd-tabbar__item--active {
  .pd-tabbar__icon {
    transform: scale(1.1);
  }

  .pd-tabbar__label {
    color: var(--pd-color-primary);
    font-weight: $font-weight-semibold;
  }
}



// 第 6.5 节
@include reduce-motion {
  .pd-tabbar__item--active .pd-tabbar__icon {
    transform: none;
  }
}
</style>