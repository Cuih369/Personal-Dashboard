<script setup lang="ts">
/**
 * StreakFlame —— 连续天数火苗（UI-UX 第 4.4 节「连续天数系统」）
 * 1-2 天：灰色小火苗 / 3-6 天：橙色 + 轻微动画 / 7-13 天：红橙 + 动画增强
 * ≥14 天：金色 + 光晕 / 中断：变灰并提示「连续中断，明天重新开始」，不批评
 */
import { computed } from 'vue';
import { streakBadgeLabel } from '@/utils/copy';

const props = withDefaults(
  defineProps<{
    days: number;
    /** badge：首页药丸徽标；inline：图标 + 数字；icon：仅图标（带等级动画） */
    variant?: 'badge' | 'inline' | 'icon';
    /** 连续中断（火苗变灰） */
    broken?: boolean;
  }>(),
  { variant: 'badge', broken: false }
);

const level = computed(() => {
  if (props.broken || props.days <= 0) return 'broken';
  if (props.days >= 14) return 'max';
  if (props.days >= 7) return 'high';
  if (props.days >= 3) return 'mid';
  return 'low';
});

const label = computed(() => streakBadgeLabel(props.days));
const brokenText = '连续中断，明天重新开始';
</script>

<template>
  <view
    class="pd-streak"
    :class="[`pd-streak--${variant}`, `pd-streak--${level}`]"
    :aria-label="variant === 'icon' ? undefined : broken ? brokenText : label"
    :aria-hidden="variant === 'icon' ? 'true' : undefined"
  >
    <text class="pd-streak__flame" aria-hidden="true">🔥</text>
    <text v-if="variant === 'badge'" class="pd-streak__text">{{ broken ? brokenText : label }}</text>
    <text v-else-if="variant === 'inline'" class="pd-streak__text">{{ days }}</text>
  </view>
</template>

<style scoped lang="scss">
@import '../../styles/mixins.scss';

.pd-streak {
  display: inline-flex;
  align-items: center;
  gap: $space-1;
  border-radius: $radius-full;
  transition: background-color $transition-fast, color $transition-fast;
}

.pd-streak__flame {
  line-height: 1;
}

.pd-streak__text {
  font-weight: $font-weight-semibold;
  white-space: nowrap;
}

// ---------- 尺寸变体 ----------
.pd-streak--badge {
  height: 56rpx;
  padding: 0 $space-3;
  background-color: var(--pd-color-warning-bg);

  .pd-streak__flame {
    font-size: $font-size-lg;
  }

  .pd-streak__text {
    font-size: $font-size-sm;
    color: var(--pd-color-warning-ink);
  }
}

.pd-streak--icon {
  gap: 0;

  .pd-streak__flame {
    font-size: $font-size-3xl;
  }
}

.pd-streak--inline {
  gap: 2rpx;

  .pd-streak__flame {
    font-size: $font-size-2xl;
  }

  .pd-streak__text {
    font-size: $font-size-sm;
    color: var(--pd-color-warning-ink);
  }
}

// ---------- 等级 ----------
.pd-streak--low {
  .pd-streak__flame {
    filter: grayscale(1);
    opacity: 0.6;
  }

  .pd-streak__text {
    color: var(--pd-text-tertiary);
  }
}

.pd-streak--mid .pd-streak__flame {
  animation: pd-streak-breathe 2.4s ease-in-out infinite;
}

.pd-streak--high .pd-streak__flame {
  animation: pd-streak-breathe 1.8s ease-in-out infinite;
}

.pd-streak--max {
  .pd-streak__flame {
    animation: pd-streak-breathe 1.4s ease-in-out infinite;
    filter: drop-shadow(0 0 8rpx rgba(253, 203, 110, 0.9));
  }
}

.pd-streak--broken {
  background-color: var(--pd-bg-tertiary);

  .pd-streak__flame {
    filter: grayscale(1);
    opacity: 0.5;
  }

  .pd-streak__text {
    color: var(--pd-text-tertiary);
    font-weight: $font-weight-regular;
  }
}

@keyframes pd-streak-breathe {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.12);
  }
}

// 第 6.5 节：减少动效时禁用呼吸动画
@include reduce-motion {
  .pd-streak__flame {
    animation: none;
  }
}
</style>