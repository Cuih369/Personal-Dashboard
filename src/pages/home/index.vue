<script setup lang="ts">
/**
 * 首页（UI-UX 第 5.1 节）—— 启动页
 * - 单任务原则：只展示 1 个最该做的任务，绝不显示「剩余 N 个」
 * - 首次启动：preference.onboarded === false 时 reLaunch 到引导页
 * - 彩蛋：连续点击顶部品牌区 5 次进入彩虹模式；摇一摇换一个任务
 */
import { computed, onUnmounted, ref } from 'vue';
import { onActivateKey } from '@/utils/a11y';
import { onLoad, onShow } from '@dcloudio/uni-app';
import PdButton from '@/components/base/PdButton.vue';
import PdEmptyState from '@/components/base/PdEmptyState.vue';
import PdModal from '@/components/base/PdModal.vue';
import TaskCard from '@/components/business/TaskCard.vue';
import StreakFlame from '@/components/business/StreakFlame.vue';
import PdPage from '@/components/layout/PdPage.vue';
import { usePreferencesStore } from '@/store/preferences';
import { useSessionStore } from '@/store/session';
import { useStatsStore } from '@/store/stats';
import { useTasksStore } from '@/store/tasks';
import { BRAND, completedTodayLabel, HOME_COPY, EASTER_EGG_COPY } from '@/utils/copy';
import { RAINBOW_TAP_COUNT, triggerRainbow, watchShake } from '@/utils/easter-eggs';
import { toast } from '@/utils/feedback';
import { haptic } from '@/utils/haptic';

const preferences = usePreferencesStore();
const tasks = useTasksStore();
const stats = useStatsStore();
const session = useSessionStore();

const booting = ref(true);
const restVisible = ref(false);
const redirecting = ref(false);

let shakeStop: (() => void) | null = null;
let logoHits = 0;
let lastHitAt = 0;

const focusTask = computed(() => tasks.focusTask);
const showStreak = computed(() => preferences.consecutiveDays >= 1);
const startLabel = computed(() =>
  tasks.overwhelmed || preferences.userStatus === 'overwhelmed'
    ? HOME_COPY.startSprint
    : HOME_COPY.start
);
const guideText = computed(() =>
  tasks.overwhelmed || preferences.userStatus === 'overwhelmed'
    ? HOME_COPY.guideOverwhelmed
    : HOME_COPY.guide
);
const completedText = computed(() => completedTodayLabel(stats.summary.todayCount));
const showCompleted = computed(() => stats.summary.todayCount > 0);

onLoad(async () => {
  await preferences.ensureLoaded();
  if (!preferences.onboarded) {
    redirecting.value = true;
    uni.reLaunch({ url: '/pages/onboarding/index' });
    return;
  }
  await Promise.all([tasks.ensureLoaded(), stats.ensureLoaded()]);
  booting.value = false;
  setupShake();
});

onShow(() => {
  if (redirecting.value) return;
  tasks.load(true);
  stats.refresh();
});

onUnmounted(() => {
  shakeStop?.();
  shakeStop = null;
});

/** 彩蛋：摇一摇换一个任务（仅 App 端生效） */
function setupShake(): void {
  if (shakeStop) return;
  shakeStop = watchShake(() => {
    tasks.rotateFocus();
    toast(EASTER_EGG_COPY.shake);
  });
}

async function onStart(): Promise<void> {
  const task = focusTask.value;
  if (!task) {
    toast(HOME_COPY.noTaskToast);
    return;
  }
  haptic.tap();
  await session.start(task);
  uni.navigateTo({ url: '/pages/focus/index' });
}

function onSwap(): void {
  tasks.rotateFocus();
}

function onRest(): void {
  restVisible.value = true;
}

function onRestConfirm(): void {
  restVisible.value = false;
  toast(HOME_COPY.restToast);
}

function openList(): void {
  uni.navigateTo({ url: '/pages/task-list/index' });
}

function openEditor(): void {
  uni.navigateTo({ url: '/pages/task-edit/index' });
}

/** 彩蛋：连续点击品牌区 5 次 -> 彩虹模式 10s */
function onBrandTap(): void {
  const now = Date.now();
  logoHits = now - lastHitAt > 1500 ? 1 : logoHits + 1;
  lastHitAt = now;
  if (logoHits < RAINBOW_TAP_COUNT) return;
  logoHits = 0;
  if (preferences.reduceMotion) return;
  triggerRainbow(preferences.reduceMotion);
  toast(EASTER_EGG_COPY.rainbow);
}


</script>

<template>
  <PdPage :tab-bar="true" tab="home" background="page">
    <view v-if="!redirecting" class="home">
      <view class="home__header" @tap="onBrandTap">
        <StreakFlame v-if="showStreak" :days="preferences.consecutiveDays" variant="badge" />
        <view v-else class="home__brand">
          <text class="home__brand-dot" aria-hidden="true">◈</text>
          <text class="home__brand-text">{{ BRAND.name }}</text>
        </view>
        <PdButton variant="ghost" size="sm" :aria-label="HOME_COPY.viewAll" @click="openList">
          {{ HOME_COPY.viewAll }}
        </PdButton>
      </view>

      <!-- 骨架屏（第 6.4 节） -->
      <view v-if="booting" class="home__skeleton">
        <view class="home__skeleton-line home__skeleton-line--short" />
        <view class="home__skeleton-card" />
      </view>

      <template v-else>
        <text class="home__guide">{{ guideText }}</text>

        <template v-if="focusTask">
          <TaskCard :task="focusTask" current>
            <template #action>
              <view class="home__start">
                <PdButton
                  variant="primary"
                  size="lg"
                  block
                  :aria-label="HOME_COPY.startAriaLabel"
                  @click="onStart"
                >
                  {{ startLabel }}
                </PdButton>
              </view>
            </template>
          </TaskCard>

          <text v-if="tasks.overwhelmed" class="home__hint">{{ HOME_COPY.overwhelmedDetail }}</text>

          <view class="home__actions">
            <PdButton variant="ghost" size="md" block bordered @click="onSwap">
              {{ HOME_COPY.swap }}
            </PdButton>
            <PdButton variant="ghost" size="md" block bordered @click="onRest">
              {{ HOME_COPY.restToday }}
            </PdButton>
          </view>

          <view class="home__divider" />

          <view v-if="showCompleted" class="home__completed">
            <text class="home__completed-icon" aria-hidden="true">✅</text>
            <text class="home__completed-text">{{ completedText }}</text>
          </view>
        </template>

        <PdEmptyState
          v-else
          icon="🎉"
          :title="HOME_COPY.emptyTitle"
          :desc="HOME_COPY.emptyDesc"
        >
          <PdButton variant="primary" size="lg" block @click="openEditor">
            {{ HOME_COPY.addTask }}
          </PdButton>
          <PdButton variant="ghost" size="lg" block @click="onRest">
            {{ HOME_COPY.emptyRest }}
          </PdButton>
        </PdEmptyState>
      </template>
    </view>

    <template #overlay>
      <view v-if="!redirecting" class="home__fab" role="button" tabindex="0" :aria-label="HOME_COPY.fabAriaLabel" @tap="openEditor" @keydown="onActivateKey($event, openEditor)">
        <text class="home__fab-icon">+</text>
      </view>

      <PdModal
        v-model:visible="restVisible"
        :title="HOME_COPY.restTitle"
        :aria-label="HOME_COPY.restTitle"
      >
        <text class="home__modal-text">{{ HOME_COPY.restCopy }}</text>
        <template #footer>
          <PdButton variant="primary" size="lg" block @click="onRestConfirm">
            {{ HOME_COPY.restConfirm }}
          </PdButton>
        </template>
      </PdModal>
    </template>
  </PdPage>
</template>

<style scoped lang="scss">
@import '../../styles/mixins.scss';

.home {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: $space-4 $container-padding 0;
}

.home__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $space-5;
}

.home__brand {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.home__brand-dot {
  font-size: $font-size-lg;
  color: var(--pd-color-primary);
}

.home__brand-text {
  font-size: $font-size-base;
  font-weight: $font-weight-semibold;
  color: var(--pd-text-primary);
}

.home__guide {
  display: block;
  margin-bottom: $space-3;
  font-size: $font-size-base;
  font-weight: $font-weight-medium;
  color: var(--pd-text-secondary);
}

.home__start {
  margin-top: $space-5;
}

.home__hint {
  display: block;
  margin-top: $space-3;
  font-size: $font-size-sm;
  color: var(--pd-text-tertiary);
  line-height: 1.5;
}

.home__actions {
  display: flex;
  gap: $space-3;
  margin-top: $space-5;

  > * {
    flex: 1;
  }
}

.home__divider {
  height: 1px;
  margin: $space-5 0 $space-4;
  background-color: var(--pd-divider);
}

.home__completed {
  display: flex;
  align-items: center;
  gap: $space-1;
}

.home__completed-text {
  font-size: $font-size-base;
  font-weight: $font-weight-semibold;
  color: var(--pd-color-success);
}

// ---------- 悬浮添加按钮（第 5.1 节：距底部 140rpx） ----------
.home__fab {
  position: fixed;
  right: $container-padding;
  bottom: calc(#{$layout-fab-bottom} + #{$safe-bottom});
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 112rpx;
  height: 112rpx;
  border-radius: $radius-full;
  background-color: var(--pd-color-primary);
  box-shadow: var(--pd-shadow-primary);
  transition: transform $transition-bounce;

  @include focus-visible;

  &:active {
    transform: scale(0.95);
  }
}

.home__fab-icon {
  font-size: $font-size-4xl;
  line-height: 1;
  color: $color-white;
}

.home__modal-text {
  display: block;
  font-size: $font-size-base;
  color: var(--pd-text-secondary);
  line-height: 1.6;
  text-align: center;
}

// ---------- 骨架屏 ----------
.home__skeleton {
  display: flex;
  flex-direction: column;
  gap: $space-4;
}

.home__skeleton-line {
  height: 32rpx;
  border-radius: $radius-sm;
  background-color: var(--pd-bg-tertiary);
}

.home__skeleton-line--short {
  width: 40%;
}

.home__skeleton-card {
  height: 360rpx;
  border-radius: $radius-lg;
  background-color: var(--pd-bg-tertiary);
}

@include reduce-motion {
  .home__fab:active {
    transform: none;
  }
}
</style>