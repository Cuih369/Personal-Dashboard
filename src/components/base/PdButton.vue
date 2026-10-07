<script setup lang="ts">
/**
 * PdButton —— 基础按钮（UI-UX 第 3.4.1 节）
 * 变体：primary / secondary / ghost / danger
 * 尺寸：lg（96rpx）/ md（80rpx）/ sm（64rpx）
 * 状态：default / hover / pressed / disabled / loading
 * 触控目标：md 与 sm 通过扩展热区补足到 88rpx（WCAG 2.5.5）
 */
import { computed } from 'vue';
import { isActivateKey, type KeyEventLike } from '@/utils/a11y';
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'lg' | 'md' | 'sm';

const props = withDefaults(
  defineProps<{
    variant?: ButtonVariant;
    size?: ButtonSize;
    disabled?: boolean;
    loading?: boolean;
    /** 宽度撑满父容器 */
    block?: boolean;
    /** 为 ghost 变体补一层描边（首页「换一个 / 今天休息」等场景） */
    bordered?: boolean;
    ariaLabel?: string;
  }>(),
  {
    variant: 'primary',
    size: 'md',
    disabled: false,
    loading: false,
    block: false,
    bordered: false,
    ariaLabel: undefined,
  }
);

const emit = defineEmits<{ (event: 'click'): void }>();

const isDisabled = computed(() => props.disabled || props.loading);

const classes = computed(() => [
  `pd-button--${props.variant}`,
  `pd-button--${props.size}`,
  {
    'pd-button--block': props.block,
    'pd-button--bordered': props.bordered,
    'pd-button--disabled': isDisabled.value,
    'pd-button--loading': props.loading,
  },
]);

function onTap(): void {
  if (isDisabled.value) return;
  emit('click');
}

function onKeydown(event: KeyEventLike): void {
  if (isDisabled.value) return;
  if (!isActivateKey(event?.key)) return;
  event.preventDefault?.();
  emit('click');
}
</script>

<template>
  <view
    class="pd-button"
    :class="classes"
    role="button"
    tabindex="0"
    :aria-label="ariaLabel"
    :aria-disabled="isDisabled ? 'true' : 'false'"
    :aria-busy="loading ? 'true' : 'false'"
    @tap="onTap"
    @keydown="onKeydown"
  >
    <view v-if="loading" class="pd-button__spinner" aria-hidden="true" />
    <view class="pd-button__label" :class="{ 'pd-button__label--loading': loading }">
      <slot />
    </view>
  </view>
</template>

<style scoped lang="scss">
@import '../../styles/mixins.scss';

@keyframes pd-button-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.pd-button {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  font-family: $font-family;
  font-weight: $font-weight-semibold;
  text-align: center;
  border: none;
  border-radius: $radius-md;
  transition: transform $motion-press ease-out, background-color $motion-press ease-out,
    opacity $motion-press ease-out, box-shadow $motion-press ease-out;

  @include focus-visible;
  @include pressable(0.98);
}

.pd-button__label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $space-2;
  line-height: 1.2;
}

.pd-button__label--loading {
  opacity: 0;
}

.pd-button__spinner {
  position: absolute;
  top: 50%;
  left: 50%;
  border: 4rpx solid currentColor;
  border-top-color: transparent;
  border-radius: $radius-full;
  animation: pd-button-spin 800ms linear infinite;
}

// ---------- 尺寸（第 3.4.1 节尺寸表） ----------
.pd-button--lg {
  height: $btn-height-lg;
  padding: 0 $space-6;
  font-size: $font-size-lg;
  border-radius: $radius-lg;
}

.pd-button--md {
  height: $btn-height-md;
  padding: 0 $space-4;
  font-size: $font-size-base;
  border-radius: $radius-md;
}

.pd-button--sm {
  height: $btn-height-sm;
  padding: 0 $space-3;
  font-size: $font-size-sm;
  border-radius: $radius-sm;
}

.pd-button--md .pd-button__spinner,
.pd-button--sm .pd-button__spinner,
.pd-button--lg .pd-button__spinner {
  width: 30rpx;
  height: 30rpx;
  margin-top: -15rpx;
  margin-left: -15rpx;
}

// 热区补足：md / sm 的视觉高度小于 88rpx，用伪元素把可点区域撑到 88rpx
.pd-button--md::after,
.pd-button--sm::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  width: 100%;
  height: $hit-target-min;
  transform: translateY(-50%);
}

.pd-button--block {
  width: 100%;
}

// ---------- 变体 ----------
.pd-button--primary {
  color: $color-white;
  background-color: var(--pd-color-primary);
  box-shadow: var(--pd-shadow-primary);

  &:hover {
    background-color: var(--pd-color-primary-dark);
    box-shadow: var(--pd-shadow-md);
    transform: translateY(-2rpx);
  }
}

.pd-button--secondary {
  color: var(--pd-color-primary);
  background-color: var(--pd-color-primary-bg);

  &:hover {
    opacity: 0.86;
  }
}

.pd-button--ghost {
  color: var(--pd-text-secondary);
  background-color: transparent;

  &:hover {
    color: var(--pd-text-primary);
    background-color: var(--pd-bg-secondary);
  }
}

.pd-button--ghost.pd-button--bordered {
  border: 1rpx solid var(--pd-border);
}

.pd-button--danger {
  color: var(--pd-color-error);
  background-color: var(--pd-color-error-bg);

  &:hover {
    opacity: 0.86;
  }
}

// ---------- 状态 ----------
.pd-button--disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;

  &:active {
    transform: none;
  }
}

// 第 6.5 节：减少动效时禁用位移 / 缩放
.pd-button {
  @include reduce-motion {
    &:hover {
      transform: none;
    }
  }
}
</style>