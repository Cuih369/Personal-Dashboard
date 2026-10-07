<script setup lang="ts">
/**
 * TaskCard —— 任务卡片（UI-UX 第 3.4.2 节卡片变体 + 第 5.2 节列表项交互）
 * - 变体：default / highlight（当前任务）/ success（已完成）/ warning（进行中）
 * - 交互：点击、左侧圆圈快速完成、长按菜单、左滑露出「完成 / 删除」
 * - 触控目标：圆圈与滑动按钮均 ≥ 88rpx
 */
import { computed, ref } from 'vue';
import { isActivateKey, onActivateKey, type KeyEventLike } from '@/utils/a11y';
import PdTag from '@/components/base/PdTag.vue';
import { CATEGORY_LABEL, type Task } from '@/types';
import { formatDayLabel, minutesLabel } from '@/utils/format';
import { MOTION_DURATION } from '@/utils/motion';
import { TASK_LIST_COPY } from '@/utils/copy';

const props = withDefaults(
  defineProps<{
    task: Task;
    /** 首页当前任务：Highlight 变体 */
    current?: boolean;
    /** 显示左侧完成圆圈 */
    showCircle?: boolean;
    /** 可点击（进入编辑） */
    interactive?: boolean;
    /** 开启左滑操作 */
    swipeable?: boolean;
    /** 减少动效（第 6.5 节） */
    reduceMotion?: boolean;
  }>(),
  {
    current: false,
    showCircle: false,
    interactive: false,
    swipeable: false,
    reduceMotion: false,
  }
);

const emit = defineEmits<{
  (event: 'tap'): void;
  (event: 'toggle'): void;
  (event: 'complete'): void;
  (event: 'delete'): void;
  (event: 'longpress'): void;
}>();

const isCompleted = computed(() => props.task.status === 'completed');
const isInProgress = computed(() => props.task.status === 'in_progress');
const pinned = computed(() => props.task.priority === 1);

const variant = computed(() => {
  if (isCompleted.value) return 'success';
  if (props.current) return 'highlight';
  if (isInProgress.value) return 'warning';
  return 'default';
});

const categoryLabel = computed(() => CATEGORY_LABEL[props.task.category]);
const durationText = computed(() => `⏱ 预计${minutesLabel(props.task.estimatedDuration)}`);
const completedAtText = computed(() =>
  props.task.completedAt
    ? `${TASK_LIST_COPY.completedAtPrefix} ${formatDayLabel(props.task.completedAt)}`
    : ''
);

// ---------- 左滑操作 ----------
const maxReveal = ref(160);
try {
  if (typeof uni !== 'undefined') maxReveal.value = uni.upx2px(320);
} catch {
  // 保持默认值
}

const offset = ref(0);
const dragging = ref(false);
let startX = 0;
let startY = 0;
let startOffset = 0;
let axis: 'none' | 'x' | 'y' = 'none';

interface TouchEventLike {
  touches?: Array<{ clientX: number; clientY: number }>;
}

const surfaceStyle = computed(() => ({
  transform: `translateX(${offset.value}px)`,
  transition: dragging.value
    ? 'none'
    : `transform ${MOTION_DURATION.listSwipe}ms ease-in-out`,
}));

/**
 * 模板里 @touchstart / @touchmove 是「裸函数引用」绑定，vue-tsc 按 DOM 函数类型逆变校验，
 * 因此参数需同时接受 DOM 的 TouchEvent 与自定的 TouchEventLike；内部统一收窄为 TouchEventLike。
 */
type TouchEventCompat = TouchEvent | TouchEventLike;

function onTouchStart(event: TouchEventCompat): void {
  if (!props.swipeable) return;
  const touch = (event as TouchEventLike).touches?.[0];
  if (!touch) return;
  startX = touch.clientX;
  startY = touch.clientY;
  startOffset = offset.value;
  axis = 'none';
}

function onTouchMove(event: TouchEventCompat): void {
  if (!props.swipeable) return;
  const touch = (event as TouchEventLike).touches?.[0];
  if (!touch) return;
  const dx = touch.clientX - startX;
  const dy = touch.clientY - startY;
  if (axis === 'none' && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
    axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
  }
  if (axis !== 'x') return;
  dragging.value = true;
  const next = startOffset + dx;
  offset.value = Math.max(-maxReveal.value, Math.min(0, next));
}

function onTouchEnd(): void {
  if (!props.swipeable) return;
  if (axis === 'x') {
    offset.value = offset.value < -maxReveal.value / 2 ? -maxReveal.value : 0;
  }
  dragging.value = false;
}

function closeSwipe(): void {
  offset.value = 0;
}

function onTap(): void {
  if (offset.value !== 0) {
    closeSwipe();
    return;
  }
  if (!props.interactive) return;
  emit('tap');
}

function onToggle(): void {
  if (isCompleted.value) return;
  emit('toggle');
}

function onComplete(): void {
  closeSwipe();
  emit('complete');
}

function onDelete(): void {
  closeSwipe();
  emit('delete');
}

function onLongpress(): void {
  emit('longpress');
}

function onKeydown(event: KeyEventLike): void {
  if (!props.interactive) return;
  if (!isActivateKey(event?.key)) return;
  event.preventDefault?.();
  emit('tap');
}
</script>

<template>
  <view class="pd-task-card" :class="`pd-task-card--${variant}`">
    <view v-if="swipeable" class="pd-task-card__actions" aria-hidden="false">
      <view
        v-if="!isCompleted"
        class="pd-task-card__action pd-task-card__action--complete"
        role="button"
        tabindex="0"
        :aria-label="TASK_LIST_COPY.actionComplete"
        @tap="onComplete" @keydown="onActivateKey($event, onComplete)"
      >
        <text class="pd-task-card__action-text">{{ TASK_LIST_COPY.actionComplete }}</text>
      </view>
      <view
        class="pd-task-card__action pd-task-card__action--delete"
        role="button"
        tabindex="0"
        :aria-label="TASK_LIST_COPY.actionDelete"
        @tap="onDelete" @keydown="onActivateKey($event, onDelete)"
      >
        <text class="pd-task-card__action-text">{{ TASK_LIST_COPY.actionDelete }}</text>
      </view>
    </view>

    <view
      class="pd-task-card__surface"
      :class="{ 'pd-task-card__surface--interactive': interactive }"
      :style="surfaceStyle"
      :role="interactive ? 'button' : undefined"
      :tabindex="interactive ? 0 : undefined"
      :aria-label="task.title"
      @tap="onTap"
      @longpress="onLongpress"
      @keydown="onKeydown"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
      @touchcancel="onTouchEnd"
    >
      <view
        v-if="showCircle"
        class="pd-task-card__circle-wrap"
        role="checkbox"
        tabindex="0"
        :aria-checked="isCompleted ? 'true' : 'false'"
        :aria-label="`${TASK_LIST_COPY.actionComplete} ${task.title}`"
        @tap.stop="onToggle"
        @keydown="onActivateKey($event, onToggle)"
      >
        <view class="pd-task-card__circle" :class="{ 'pd-task-card__circle--done': isCompleted }">
          <text v-if="isCompleted" class="pd-task-card__check">✓</text>
        </view>
      </view>

      <view class="pd-task-card__main">
        <text class="pd-task-card__title" :class="{ 'pd-task-card__title--done': isCompleted }">
          {{ task.title }}
        </text>
        <view class="pd-task-card__meta">
          <PdTag :variant="isCompleted ? 'success' : 'primary'">{{ categoryLabel }}</PdTag>
          <text class="pd-task-card__duration">{{ durationText }}</text>
          <PdTag v-if="pinned" variant="warning">{{ TASK_LIST_COPY.pinnedTag }}</PdTag>
        </view>
        <text v-if="isCompleted && completedAtText" class="pd-task-card__done-at">
          {{ completedAtText }}
        </text>
      </view>

      <slot name="action" />
    </view>
  </view>
</template>

<style scoped lang="scss">
@import '../../styles/mixins.scss';

.pd-task-card {
  position: relative;
  width: 100%;
  border-radius: $radius-lg;
  overflow: hidden;
  background-color: var(--pd-bg-primary);
  box-shadow: var(--pd-shadow-sm);
  transition: background-color $motion-theme-switch linear;
}

.pd-task-card__surface {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: flex-start;
  gap: $space-3;
  box-sizing: border-box;
  padding: $space-4;
  background-color: var(--pd-bg-primary);
}

.pd-task-card__surface--interactive {
  @include focus-visible;

  &:active {
    background-color: var(--pd-bg-secondary);
  }
}

.pd-task-card__main {
  flex: 1;
  min-width: 0;
}

.pd-task-card__title {
  display: block;
  font-size: $font-size-xl;
  font-weight: $font-weight-semibold;
  line-height: 1.4;
  color: var(--pd-text-primary);
  @include ellipsis(2);
}

.pd-task-card__title--done {
  color: var(--pd-text-tertiary);
  text-decoration: line-through;
}

.pd-task-card__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: $space-2;
  margin-top: $space-2;
}

.pd-task-card__duration {
  font-size: $font-size-sm;
  color: var(--pd-text-tertiary);
}

.pd-task-card__done-at {
  display: block;
  margin-top: $space-1;
  font-size: $font-size-xs;
  color: var(--pd-text-tertiary);
}

// ---------- 左侧完成圆圈 ----------
.pd-task-card__circle-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48rpx;
  height: 48rpx;
  margin-top: 4rpx;

  // 触控目标补足到 88rpx
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: $hit-target-min;
    height: $hit-target-min;
    transform: translate(-50%, -50%);
  }

  @include focus-visible;
}

.pd-task-card__circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44rpx;
  height: 44rpx;
  border: 2rpx solid var(--pd-border);
  border-radius: $radius-full;
  transition: background-color $motion-press ease-out, border-color $motion-press ease-out;
}

.pd-task-card__circle--done {
  background-color: var(--pd-color-success);
  border-color: var(--pd-color-success);
}

.pd-task-card__check {
  font-size: $font-size-sm;
  color: $color-white;
  line-height: 1;
}

// ---------- 变体（第 3.4.2 节） ----------
.pd-task-card--highlight .pd-task-card__surface {
  border-left: 8rpx solid var(--pd-color-primary);
}

.pd-task-card--warning .pd-task-card__surface {
  border-left: 8rpx solid var(--pd-color-warning);
  background-color: var(--pd-color-warning-bg);
}

.pd-task-card--success .pd-task-card__surface {
  border-left: 8rpx solid var(--pd-color-success);
  background-color: var(--pd-color-success-bg);
}

// ---------- 左滑操作 ----------
.pd-task-card__actions {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  display: flex;
  align-items: stretch;
}

.pd-task-card__action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 160rpx;
  min-width: 160rpx;

  @include focus-visible;
}

.pd-task-card__action-text {
  font-size: $font-size-base;
  font-weight: $font-weight-semibold;
  color: $color-white;
}

.pd-task-card__action--complete {
  background-color: var(--pd-color-success);
}

.pd-task-card__action--delete {
  background-color: var(--pd-color-error);
}
</style>
