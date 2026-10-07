<script setup lang="ts">
/**
 * CelebrationModal —— 庆祝弹窗（UI-UX 第 5.5 节）
 * 入场：遮罩淡入 + 弹窗上滑弹跳；图标 0→1.3→1.0 弹跳 400ms（第 6.1 节）
 * 文案：默认打字机（30ms/字），减少动效时直接整段显示（第 4.5 / 6.5 节）
 * 两个按钮等权重：「再来1个」/「今天到此为止」
 */
import { computed, ref, watch } from 'vue';
import PdModal from '@/components/base/PdModal.vue';
import PdButton from '@/components/base/PdButton.vue';
import type { CelebrationState } from '@/store/session';
import { CELEBRATION_COPY } from '@/utils/copy';
import { MOTION_DURATION } from '@/utils/motion';

const props = withDefaults(
  defineProps<{
    visible: boolean;
    celebration: CelebrationState | null;
    reduceMotion?: boolean;
  }>(),
  { reduceMotion: false }
);

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void;
  (event: 'continue'): void;
  (event: 'stop'): void;
}>();

const CONFETTI_COUNT = 12;

const displayedText = ref('');
let typeTimer: ReturnType<typeof setInterval> | null = null;

function stopTypewriter(): void {
  if (typeTimer !== null) {
    clearInterval(typeTimer);
    typeTimer = null;
  }
}

function startTypewriter(text: string): void {
  stopTypewriter();
  if (props.reduceMotion) {
    displayedText.value = text;
    return;
  }
  displayedText.value = '';
  let cursor = 0;
  typeTimer = setInterval(() => {
    cursor += 1;
    displayedText.value = text.slice(0, cursor);
    if (cursor >= text.length) stopTypewriter();
  }, MOTION_DURATION.typewriter);
}

watch(
  () => [props.visible, props.celebration?.text ?? ''],
  () => {
    if (props.visible && props.celebration) {
      startTypewriter(props.celebration.text);
      return;
    }
    stopTypewriter();
    displayedText.value = '';
  },
  { immediate: true }
);

const confettiPieces = computed(() => {
  if (!props.celebration?.confetti || props.reduceMotion) return [];
  return Array.from({ length: CONFETTI_COUNT }, (_unused, index) => ({
    id: index,
    className: `pd-confetti--c${index % 5}`,
    style: {
      left: `${Math.round((index * 100) / CONFETTI_COUNT + (index % 3) * 3)}%`,
      animationDelay: `${(index % 5) * 120}ms`,
    },
  }));
});

function onVisibleChange(value: boolean): void {
  emit('update:visible', value);
}

function onContinue(): void {
  emit('continue');
}

function onStop(): void {
  emit('stop');
}
</script>

<template>
  <PdModal
    :visible="visible"
    variant="celebration"
    :mask-closable="false"
    :reduce-motion="reduceMotion"
    :aria-label="CELEBRATION_COPY.ariaLabel"
    @update:visible="onVisibleChange"
  >
    <view class="pd-celebration">
      <view class="pd-celebration__confetti" aria-hidden="true">
        <view
          v-for="piece in confettiPieces"
          :key="piece.id"
          class="pd-confetti"
          :class="piece.className"
          :style="piece.style"
        />
      </view>

      <text class="pd-celebration__icon" aria-hidden="true">
        {{ celebration?.icon ?? CELEBRATION_COPY.iconDefault }}
      </text>

      <text class="pd-celebration__title">{{ displayedText }}</text>

      <view class="pd-celebration__stats">
        <view class="pd-celebration__row">
          <text class="pd-celebration__label">{{ CELEBRATION_COPY.statsToday }}</text>
          <text class="pd-celebration__value pd-celebration__value--success">
            {{ celebration?.todayCount ?? 0 }} {{ CELEBRATION_COPY.unitItem }}
          </text>
        </view>
        <view class="pd-celebration__row">
          <text class="pd-celebration__label">{{ CELEBRATION_COPY.statsWeek }}</text>
          <text class="pd-celebration__value">
            {{ celebration?.weekCount ?? 0 }} {{ CELEBRATION_COPY.unitItem }}
          </text>
        </view>
        <view class="pd-celebration__row">
          <text class="pd-celebration__label">{{ CELEBRATION_COPY.statsStreak }}</text>
          <text class="pd-celebration__value pd-celebration__value--fire">
            {{ celebration?.consecutiveDays ?? 0 }} {{ CELEBRATION_COPY.unitDay }}
            {{ CELEBRATION_COPY.fire }}
          </text>
        </view>
      </view>

      <view class="pd-celebration__actions">
        <PdButton variant="primary" size="lg" block @click="onContinue">
          {{ CELEBRATION_COPY.continueNext }}
        </PdButton>
        <PdButton variant="secondary" size="lg" block @click="onStop">
          {{ CELEBRATION_COPY.stopToday }}
        </PdButton>
      </view>
    </view>
  </PdModal>
</template>

<style scoped lang="scss">
@import '../../styles/mixins.scss';

.pd-celebration {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.pd-celebration__confetti {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  pointer-events: none;
}

.pd-confetti {
  position: absolute;
  top: -20rpx;
  width: 20rpx;
  height: 20rpx;
  border-radius: 4rpx;
  opacity: 0;
  animation: pd-confetti-fall 2s ease-out forwards;
}

.pd-confetti--c0 {
  background-color: $color-primary;
}
.pd-confetti--c1 {
  background-color: $color-info;
}
.pd-confetti--c2 {
  background-color: $color-success;
}
.pd-confetti--c3 {
  background-color: $color-warning;
}
.pd-confetti--c4 {
  background-color: $color-error;
}

.pd-celebration__icon {
  display: block;
  font-size: 96rpx;
  line-height: 1;
  margin-bottom: $space-4;
  animation: pd-icon-bounce $motion-icon-bounce $ease-bounce;
}

.pd-celebration__title {
  display: block;
  min-height: 88rpx;
  font-size: $font-size-2xl;
  font-weight: $font-weight-bold;
  line-height: 1.4;
  color: var(--pd-text-primary);
}

.pd-celebration__stats {
  width: 100%;
  margin: $space-5 0 $space-6;
  padding: $space-3 $space-4;
  background-color: var(--pd-bg-secondary);
  border-radius: $radius-lg;
}

.pd-celebration__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-1 0;
}

.pd-celebration__label {
  font-size: $font-size-base;
  color: var(--pd-text-secondary);
}

.pd-celebration__value {
  font-size: $font-size-base;
  font-weight: $font-weight-semibold;
  color: var(--pd-text-primary);
}

.pd-celebration__value--success {
  color: var(--pd-color-success);
}

.pd-celebration__value--fire {
  color: var(--pd-color-warning-ink);
}

// 第 5.5 节：两个按钮等宽并排（Primary + Secondary）
.pd-celebration__actions {
  display: flex;
  flex-direction: row;
  gap: $space-3;
  width: 100%;

  > * {
    flex: 1;
    min-width: 0;
  }
}

// 第 6.5 节：减少动效时禁用弹跳与纸屑
@include reduce-motion {
  .pd-celebration__icon {
    animation: none;
  }

  .pd-confetti {
    display: none;
  }
}
</style>