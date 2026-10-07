<script setup lang="ts">
/**
 * 专注页（UI-UX 第 5.4 节）
 * 全屏深色、极简无干扰；计时器等宽字体；最后 10 秒变橙并脉冲；
 * 「完成了」触发庆祝弹窗（由 PdGlobalOverlays 统一承载）。
 */
import { computed, ref } from 'vue';
import { onActivateKey } from '@/utils/a11y';
import { onLoad, onUnload } from '@dcloudio/uni-app';
import PdButton from '@/components/base/PdButton.vue';
import PdModal from '@/components/base/PdModal.vue';
import PdPage from '@/components/layout/PdPage.vue';
import { useSessionStore } from '@/store/session';
import { useTasksStore } from '@/store/tasks';
import { COMMON_COPY, FOCUS_COPY } from '@/utils/copy';
import { formatTimer } from '@/utils/format';
import { toast } from '@/utils/feedback';

const session = useSessionStore();
const tasks = useTasksStore();

const exitVisible = ref(false);

const timerText = computed(() => formatTimer(session.remainingSec));
const firstStepText = computed(() => `${FOCUS_COPY.firstStepPrefix}${session.firstStep}`);
const pauseLabel = computed(() => (session.paused ? FOCUS_COPY.resume : FOCUS_COPY.pause));
const needsTask = computed(() => !session.active);

onLoad(async (query?: Record<string, string>) => {
  const id = query?.id ? String(query.id) : '';
  if (!session.active) {
    if (id) {
      await tasks.ensureLoaded();
      const task = tasks.getById(id);
      if (task) await session.start(task);
    }
    if (!session.active) toast(FOCUS_COPY.emptyTask);
  }
});

onUnload(() => {
  // 离开专注页时停止计时，避免后台空转
  if (!session.celebration) session.pause();
});

function onComplete(): void {
  session.complete();
}

function onTogglePause(): void {
  if (session.paused) session.resume();
  else session.pause();
}

function askExit(): void {
  exitVisible.value = true;
}

function cancelExit(): void {
  exitVisible.value = false;
}

function confirmExit(): void {
  exitVisible.value = false;
  session.reset();
  uni.navigateBack();
}

/** 计时结束：继续 / 休息 */
function onTimeUpContinue(): void {
  session.resume();
}

function onTimeUpRest(): void {
  session.dismissTimeUp();
  session.reset();
  uni.navigateBack();
}

function goHome(): void {
  session.reset();
  uni.reLaunch({ url: '/pages/home/index' });
}


</script>

<template>
  <PdPage
    background="focus"
    :fill="true"
    :show-nav="true"
    :nav-transparent="true"
    :show-back="true"
    @back="askExit"
  >
    <view class="focus">
      <text class="focus__label">{{ FOCUS_COPY.label }}</text>

      <view class="focus__task">
        <text class="focus__title">{{ session.taskTitle }}</text>
      </view>

      <text class="focus__step">{{ firstStepText }}</text>

      <text class="focus__timer" :class="{ 'focus__timer--warning': session.isWarning }">
        {{ timerText }}
      </text>

      <view class="focus__actions">
        <PdButton variant="primary" size="lg" block @click="onComplete">
          {{ FOCUS_COPY.complete }}
        </PdButton>
        <PdButton variant="ghost" size="lg" block bordered @click="onTogglePause">
          {{ pauseLabel }}
        </PdButton>
      </view>

      <view class="focus__give-up" role="button" tabindex="0" @tap="askExit" @keydown="onActivateKey($event, askExit)">
        <text class="focus__give-up-text">{{ FOCUS_COPY.giveUp }}</text>
      </view>
    </view>

    <template #overlay>
      <!-- 退出确认（第 5.4 节） -->
      <PdModal
        :visible="exitVisible"
        :title="FOCUS_COPY.exit"
        :aria-label="FOCUS_COPY.exit"
        @update:visible="cancelExit"
      >
        <text class="focus__modal-text">{{ FOCUS_COPY.exitConfirm }}</text>
        <template #footer>
          <PdButton variant="ghost" size="lg" block bordered @click="cancelExit">
            {{ COMMON_COPY.cancel }}
          </PdButton>
          <PdButton variant="primary" size="lg" block @click="confirmExit">
            {{ COMMON_COPY.confirm }}
          </PdButton>
        </template>
      </PdModal>

      <!-- 5 分钟到点提示 -->
      <PdModal
        :visible="session.timeUpVisible"
        :title="FOCUS_COPY.timeUpTitle"
        :aria-label="FOCUS_COPY.timeUpTitle"
        @update:visible="session.dismissTimeUp()"
      >
        <text class="focus__modal-text">{{ FOCUS_COPY.timeUpText }}</text>
        <template #footer>
          <PdButton variant="primary" size="lg" block @click="onTimeUpContinue">
            {{ FOCUS_COPY.timeUpContinue }}
          </PdButton>
          <PdButton variant="ghost" size="lg" block bordered @click="onTimeUpRest">
            {{ FOCUS_COPY.timeUpRest }}
          </PdButton>
        </template>
      </PdModal>

      <view v-if="needsTask" class="focus__empty">
        <PdButton variant="secondary" size="lg" @click="goHome">
          {{ COMMON_COPY.back }}
        </PdButton>
      </view>
    </template>
  </PdPage>
</template>

<style scoped lang="scss">
@import '../../styles/mixins.scss';

.focus {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: $space-6 $container-padding $space-10;
  text-align: center;
}

.focus__label {
  margin-bottom: $space-5;
  font-size: $font-size-sm;
  letter-spacing: 8rpx;
  color: $color-on-dark-tertiary;
}

.focus__task {
  width: 100%;
  margin-bottom: $space-5;
}

.focus__title {
  font-size: $font-size-3xl;
  font-weight: $font-weight-semibold;
  line-height: 1.4;
  color: $color-white;
  @include ellipsis(2);
}

.focus__step {
  padding: 0 $space-5;
  margin-bottom: $space-12;
  font-size: $font-size-base;
  line-height: 1.5;
  color: var(--pd-color-primary-light);
}

.focus__timer {
  margin-bottom: $space-12;
  font-family: $font-mono;
  font-size: $font-size-5xl;
  font-weight: $font-weight-bold;
  letter-spacing: 4rpx;
  color: $color-white;
  font-variant-numeric: tabular-nums;
}

.focus__timer--warning {
  color: var(--pd-color-warning);
  animation: pd-pulse 1s ease-in-out infinite;
}

.focus__actions {
  display: flex;
  flex-direction: column;
  gap: $space-3;
  width: 100%;
}

.focus__give-up {
  margin-top: $space-5;
  padding: $space-3;

  @include focus-visible;
}

.focus__give-up-text {
  font-size: $font-size-sm;
  color: $color-on-dark-faint;
}

.focus__modal-text {
  display: block;
  font-size: $font-size-base;
  line-height: 1.6;
  color: var(--pd-text-secondary);
  text-align: center;
}

.focus__empty {
  position: fixed;
  left: 0;
  right: 0;
  bottom: $space-10;
  display: flex;
  justify-content: center;
}

// 第 6.5 节：减少动效时禁用计时器脉冲
@include reduce-motion {
  .focus__timer--warning {
    animation: none;
    opacity: 1;
  }
}
</style>