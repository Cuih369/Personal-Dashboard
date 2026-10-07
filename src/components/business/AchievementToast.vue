<script setup lang="ts">
/**
 * AchievementToast —— 成就解锁提示（UI-UX 第 4.4 节）
 * 从顶部滑入 300ms → 停留 3s → 滑出；卡片带金色光晕；减少动效时改为淡入淡出
 */
import { computed, ref, watch } from 'vue';
import type { AchievementDef } from '@/utils/copy';
import { ACHIEVEMENT_COPY } from '@/utils/copy';
import { MOTION_DURATION, motionMs } from '@/utils/motion';

const props = withDefaults(
  defineProps<{
    visible: boolean;
    achievement: AchievementDef | null;
    reduceMotion?: boolean;
  }>(),
  { reduceMotion: false }
);

const emit = defineEmits<{ (event: 'update:visible', value: boolean): void }>();

const entered = ref(false);
let holdTimer: ReturnType<typeof setTimeout> | null = null;
let enterTimer: ReturnType<typeof setTimeout> | null = null;

function clearTimers(): void {
  if (holdTimer) clearTimeout(holdTimer);
  if (enterTimer) clearTimeout(enterTimer);
  holdTimer = null;
  enterTimer = null;
}

watch(
  () => props.visible,
  (next) => {
    clearTimers();
    if (!next) {
      entered.value = false;
      return;
    }
    enterTimer = setTimeout(
      () => {
        entered.value = true;
      },
      motionMs(0, props.reduceMotion)
    );
    holdTimer = setTimeout(
      () => {
        entered.value = false;
        emit('update:visible', false);
      },
      motionMs(MOTION_DURATION.achievementHold, props.reduceMotion)
    );
  },
  { immediate: true }
);

const classes = computed(() => ({
  'pd-achievement--entered': entered.value,
}));
</script>

<template>
  <view
    v-if="visible && achievement"
    class="pd-achievement"
    :class="classes"
    role="status"
    :aria-label="`${ACHIEVEMENT_COPY.unlocked}：${achievement.name}`"
  >
    <text class="pd-achievement__icon" aria-hidden="true">{{ achievement.icon }}</text>
    <view class="pd-achievement__text">
      <text class="pd-achievement__badge">{{ ACHIEVEMENT_COPY.unlocked }}</text>
      <text class="pd-achievement__name">{{ achievement.name }}</text>
      <text class="pd-achievement__desc">{{ achievement.desc }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
@import '../../styles/mixins.scss';

.pd-achievement {
  position: fixed;
  top: 0;
  left: $container-padding;
  right: $container-padding;
  z-index: 300;
  display: flex;
  align-items: center;
  gap: $space-3;
  box-sizing: border-box;
  padding: $space-3 $space-4;
  margin-top: $space-5;
  background-color: var(--pd-bg-primary);
  border: 2rpx solid var(--pd-color-warning);
  border-radius: $radius-lg;
  box-shadow: 0 8rpx 32rpx rgba(253, 203, 110, 0.35);
  transform: translateY(-160rpx);
  opacity: 0;
  transition: transform $motion-achievement $ease-bounce, opacity $motion-achievement ease-out;
}

.pd-achievement--entered {
  transform: translateY(0);
  opacity: 1;
}

.pd-achievement__icon {
  font-size: 56rpx;
  line-height: 1;
}

.pd-achievement__text {
  display: flex;
  flex-direction: column;
  gap: 2rpx;
  min-width: 0;
}

.pd-achievement__badge {
  font-size: $font-size-xs;
  color: var(--pd-color-warning-ink);
  letter-spacing: 2rpx;
}

.pd-achievement__name {
  font-size: $font-size-lg;
  font-weight: $font-weight-semibold;
  color: var(--pd-text-primary);
}

.pd-achievement__desc {
  font-size: $font-size-sm;
  color: var(--pd-text-secondary);
}

// 第 6.5 节：减少动效时只保留淡入淡出
@include reduce-motion {
  .pd-achievement {
    transform: none;
  }
}
</style>