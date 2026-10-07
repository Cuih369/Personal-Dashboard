<script setup lang="ts">
/**
 * PdCard —— 基础卡片（UI-UX 第 3.4.2 节）
 * 变体：default / highlight / success / warning
 * 结构：无边框，用阴影区分；内边距 32rpx；圆角 24rpx
 */
import { computed } from 'vue';
import { isActivateKey, type KeyEventLike } from '@/utils/a11y';
type CardVariant = 'default' | 'highlight' | 'success' | 'warning';

const props = withDefaults(
  defineProps<{
    variant?: CardVariant;
    /** 是否可点击（可点击时补键盘焦点与 role=button） */
    clickable?: boolean;
    /** 紧凑内边距（列表项等场景） */
    compact?: boolean;
    ariaLabel?: string;
  }>(),
  {
    variant: 'default',
    clickable: false,
    compact: false,
    ariaLabel: undefined,
  }
);

const emit = defineEmits<{ (event: 'click'): void }>();

const classes = computed(() => [
  `pd-card--${props.variant}`,
  {
    'pd-card--clickable': props.clickable,
    'pd-card--compact': props.compact,
  },
]);

function onTap(): void {
  if (!props.clickable) return;
  emit('click');
}

function onKeydown(event: KeyEventLike): void {
  if (!props.clickable) return;
  if (!isActivateKey(event?.key)) return;
  event.preventDefault?.();
  emit('click');
}
</script>

<template>
  <view
    class="pd-card"
    :class="classes"
    :role="clickable ? 'button' : undefined"
    :tabindex="clickable ? 0 : undefined"
    :aria-label="ariaLabel"
    @tap="onTap"
    @keydown="onKeydown"
  >
    <slot />
  </view>
</template>

<style scoped lang="scss">
@import '../../styles/mixins.scss';

.pd-card {
  position: relative;
  box-sizing: border-box;
  padding: $space-4;
  background-color: var(--pd-bg-primary);
  border-radius: $radius-lg;
  box-shadow: var(--pd-shadow-sm);
  transition: box-shadow $transition-fast, transform $transition-fast,
    background-color $motion-theme-switch linear;

  @include focus-visible;
}

.pd-card--compact {
  padding: $space-3;
}

.pd-card--clickable {
  cursor: pointer;

  &:hover {
    box-shadow: var(--pd-shadow-md);
    transform: translateY(-2rpx);
  }

  &:active {
    transform: scale(0.99);
  }

  @include reduce-motion {
    &:hover,
    &:active {
      transform: none;
    }
  }
}

// 左侧 4rpx 强调边（第 3.4.2 节）
.pd-card--highlight {
  border-left: 8rpx solid var(--pd-color-primary);
}

.pd-card--success {
  background-color: var(--pd-color-success-bg);
  border-left: 8rpx solid var(--pd-color-success);
}

.pd-card--warning {
  background-color: var(--pd-color-warning-bg);
  border-left: 8rpx solid var(--pd-color-warning);
}
</style>