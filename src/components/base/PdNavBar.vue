<script setup lang="ts">
/**
 * PdNavBar —— 顶部导航栏（第 5.2 / 5.3 节）
 * 高度 ≥ 88rpx（触控目标下限），左侧返回，右侧插槽
 */
import { COMMON_COPY } from '@/utils/copy';
import { isActivateKey, type KeyEventLike } from '@/utils/a11y';
withDefaults(
  defineProps<{
    title?: string;
    showBack?: boolean;
    backLabel?: string;
    /** 透明底（专注页等深色场景） */
    transparent?: boolean;
    /** 深色文字/图标（用于深色背景） */
    onDark?: boolean;
  }>(),
  {
    title: '',
    showBack: false,
    backLabel: COMMON_COPY.back,
    transparent: false,
    onDark: false,
  }
);

const emit = defineEmits<{ (event: 'back'): void }>();

function onBack(): void {
  emit('back');
}

function onKeydown(event: KeyEventLike): void {
  if (!isActivateKey(event?.key)) return;
  event.preventDefault?.();
  emit('back');
}
</script>

<template>
  <view
    class="pd-navbar"
    :class="{ 'pd-navbar--transparent': transparent, 'pd-navbar--on-dark': onDark }"
  >
    <view class="pd-navbar__side">
      <view
        v-if="showBack"
        class="pd-navbar__back"
        role="button"
        tabindex="0"
        :aria-label="backLabel"
        @tap="onBack"
        @keydown="onKeydown"
      >
        <text class="pd-navbar__back-icon">←</text>
      </view>
      <slot name="left" />
    </view>
    <text class="pd-navbar__title">{{ title }}</text>
    <view class="pd-navbar__side pd-navbar__side--right">
      <slot name="right" />
    </view>
  </view>
</template>

<style scoped lang="scss">
@import '../../styles/mixins.scss';

.pd-navbar {
  display: flex;
  align-items: center;
  min-height: $hit-target-min;
  padding: 0 $container-padding;
  background-color: var(--pd-bg-page);
  transition: background-color $motion-theme-switch linear;
}

.pd-navbar--transparent {
  background-color: transparent;
}

.pd-navbar__side {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: $hit-target-min;

  &--right {
    justify-content: flex-end;
  }
}

.pd-navbar__back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: $hit-target-min;
  height: $hit-target-min;
  margin-left: -#{$space-3};
  border-radius: $radius-full;

  @include focus-visible;

  &:active {
    background-color: var(--pd-bg-secondary);
  }
}

.pd-navbar__back-icon {
  font-size: $font-size-3xl;
  line-height: 1;
  color: var(--pd-text-primary);
}

.pd-navbar__title {
  flex: 0 0 auto;
  max-width: 60%;
  font-size: $font-size-lg;
  font-weight: $font-weight-semibold;
  color: var(--pd-text-primary);
  text-align: center;
  @include ellipsis(1);
}

.pd-navbar--on-dark {
  .pd-navbar__title,
  .pd-navbar__back-icon {
    color: $color-white;
  }
}
</style>