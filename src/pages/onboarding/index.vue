<script setup lang="ts">
/**
 * 引导页（UI-UX 第 5.8 节，3 屏横向滑动）
 * 完成 / 跳过后进入「首次偏好设置」（可跳过），再由偏好设置回首页。
 */
import { computed, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import PdButton from '@/components/base/PdButton.vue';
import PdPage from '@/components/layout/PdPage.vue';
import { ONBOARDING_COPY, ONBOARDING_SCREENS } from '@/utils/copy';

const current = ref(0);
const swiperHeight = ref(600);

const lastIndex = ONBOARDING_SCREENS.length - 1;
const isLast = computed(() => current.value >= lastIndex);
const dots = computed(() => ONBOARDING_SCREENS.map((_screen, index) => index));

onLoad(() => {
  try {
    const info = uni.getSystemInfoSync();
    const windowHeight = info.windowHeight ?? 640;
    swiperHeight.value = Math.max(320, windowHeight - 260);
  } catch {
    // 保持默认高度
  }
});

function onChange(event: { detail?: { current?: number } }): void {
  current.value = event?.detail?.current ?? 0;
}

function next(): void {
  if (isLast.value) {
    finish();
    return;
  }
  current.value += 1;
}

function finish(): void {
  uni.reLaunch({ url: '/pages/preference-setup/index' });
}
</script>

<template>
  <PdPage background="plain" :fill="false">
    <view class="onboarding">

      <swiper
        class="onboarding__swiper"
        :style="{ height: swiperHeight + 'px' }"
        :current="current"
        :indicator-dots="false"
        :circular="false"
        @change="onChange"
      >
        <swiper-item v-for="(screen, index) in ONBOARDING_SCREENS" :key="index">
          <view class="onboarding__content" :aria-label="screen.title">
            <view class="onboarding__illustration" aria-hidden="true">
              <text class="onboarding__emoji">{{ screen.icon }}</text>
            </view>
            <text class="onboarding__title">{{ screen.title }}</text>
            <text class="onboarding__desc">{{ screen.desc }}</text>
          </view>
        </swiper-item>
      </swiper>

      <view class="onboarding__dots" aria-hidden="true">
        <view
          v-for="index in dots"
          :key="index"
          class="onboarding__dot"
          :class="{ 'onboarding__dot--active': index === current }"
        />
      </view>

      <view class="onboarding__actions">
        <view class="onboarding__actions-side">
          <PdButton v-if="!isLast" variant="ghost" size="lg" @click="finish">
            {{ ONBOARDING_COPY.skip }}
          </PdButton>
        </view>
        <PdButton variant="primary" size="lg" @click="next">
          {{ isLast ? ONBOARDING_COPY.start : ONBOARDING_COPY.next }}
        </PdButton>
      </view>
    </view>
  </PdPage>
</template>

<style scoped lang="scss">
@import '../../styles/mixins.scss';

.onboarding {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0 $container-padding;
  background: linear-gradient(180deg, var(--pd-bg-primary) 0%, var(--pd-color-primary-bg) 100%);
}


.onboarding__swiper {
  width: 100%;
}

.onboarding__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
}

.onboarding__illustration {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 240rpx;
  height: 240rpx;
  margin-bottom: $space-10;
  border-radius: $radius-full;
  background: linear-gradient(135deg, var(--pd-color-primary-bg) 0%, var(--pd-bg-primary) 100%);
  box-shadow: 0 20rpx 60rpx rgba(108, 92, 231, 0.15);
  animation: pd-float 3s ease-in-out infinite;
}

.onboarding__emoji {
  font-size: 112rpx;
  line-height: 1;
}

.onboarding__title {
  margin-bottom: $space-3;
  font-size: $font-size-4xl;
  font-weight: $font-weight-bold;
  line-height: 1.3;
  color: var(--pd-text-primary);
}

.onboarding__desc {
  padding: 0 $space-5;
  font-size: $font-size-base;
  line-height: 1.7;
  color: var(--pd-text-secondary);
}

.onboarding__dots {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $space-2;
  margin: $space-5 0;
}

.onboarding__dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: $radius-full;
  background-color: var(--pd-border);
  transition: width $transition-normal, background-color $transition-normal;
}

.onboarding__dot--active {
  width: 48rpx;
  border-radius: $radius-sm;
  background-color: var(--pd-color-primary);
}

.onboarding__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-4;
  padding-bottom: $space-8;
}

.onboarding__actions-side {
  flex: 1;
  display: flex;
  align-items: center;
}
</style>