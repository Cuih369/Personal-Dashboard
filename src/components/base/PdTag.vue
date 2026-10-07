<script setup lang="ts">
/**
 * PdTag —— 标签（UI-UX 第 3.4.5 节）
 * 尺寸：高 48rpx、字号 20rpx、横向内边距 16rpx、圆角 8rpx
 * 变体：primary / success / warning / default
 */
import { computed } from 'vue';

type TagVariant = 'primary' | 'success' | 'warning' | 'default';

const props = withDefaults(
  defineProps<{
    variant?: TagVariant;
    /** 纯展示标签不进入无障碍树（由父级文本表达完整语义） */
    decorative?: boolean;
  }>(),
  {
    variant: 'default',
    decorative: false,
  }
);

const classes = computed(() => [`pd-tag--${props.variant}`]);
</script>

<template>
  <view class="pd-tag" :class="classes" :aria-hidden="decorative ? 'true' : undefined">
    <text class="pd-tag__text"><slot /></text>
  </view>
</template>

<style scoped lang="scss">
@import '../../styles/mixins.scss';

.pd-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 48rpx;
  padding: 0 $space-2;
  border-radius: $radius-sm;
  box-sizing: border-box;
}

.pd-tag__text {
  font-size: $font-size-xs;
  font-weight: $font-weight-medium;
  line-height: 1;
  white-space: nowrap;
}

.pd-tag--primary {
  background-color: var(--pd-color-primary-bg);

  .pd-tag__text {
    color: var(--pd-color-primary);
  }
}

.pd-tag--success {
  background-color: var(--pd-color-success-bg);

  .pd-tag__text {
    color: var(--pd-color-success);
  }
}

.pd-tag--warning {
  background-color: var(--pd-color-warning-bg);

  .pd-tag__text {
    color: var(--pd-color-warning-ink);
  }
}

.pd-tag--default {
  background-color: var(--pd-bg-tertiary);

  .pd-tag__text {
    color: var(--pd-text-secondary);
  }
}
</style>