<script setup lang="ts">
/**
 * 首次偏好设置（PRD Story 5 / UI-UX 第 5.7 节选项标签）
 * 说明：UI-UX 第 5 章未单独给出本页设计稿，故沿用第 3 章组件规范与第 5.7 节选项标签实现；
 *       所有偏好均可跳过，完成或跳过后写入 onboarded = true 并回首页。
 */
import { computed, ref } from 'vue';
import { onActivateClick, onActivateKey } from '@/utils/a11y';
import PdButton from '@/components/base/PdButton.vue';
import PdCard from '@/components/base/PdCard.vue';
import PdPage from '@/components/layout/PdPage.vue';
import { usePreferencesStore } from '@/store/preferences';
import type { MotivationStyle, PushChannel, PushFrequency } from '@/types';
import { PREFERENCE_SETUP_COPY, SETTINGS_COPY } from '@/utils/copy';
import { hourRangeLabel } from '@/utils/format';
import { toast } from '@/utils/feedback';

const preferences = usePreferencesStore();

const pushChannel = ref<PushChannel>(preferences.preference.pushChannel);
const pushFrequency = ref<PushFrequency>(preferences.preference.pushFrequency);
const motivationStyle = ref<MotivationStyle>(preferences.preference.motivationStyle);
const focusStart = ref(preferences.preference.focusHoursStart);
const focusEnd = ref(preferences.preference.focusHoursEnd);
const focusDuration = ref(preferences.preference.focusDuration);

const pushChannelOptions: Array<{ value: PushChannel; label: string }> = [
  { value: 'app', label: SETTINGS_COPY.pushChannelLabels.app },
  { value: 'system', label: SETTINGS_COPY.pushChannelLabels.system },
  { value: 'none', label: SETTINGS_COPY.pushChannelLabels.none },
];

const pushFrequencyOptions: Array<{ value: PushFrequency; label: string }> = [
  { value: 'daily', label: SETTINGS_COPY.pushFrequencyLabels.daily },
  { value: 'every_other_day', label: SETTINGS_COPY.pushFrequencyLabels.every_other_day },
  { value: 'weekly', label: SETTINGS_COPY.pushFrequencyLabels.weekly },
  { value: 'smart', label: SETTINGS_COPY.pushFrequencyLabels.smart },
];

const motivationOptions: Array<{ value: MotivationStyle; label: string }> = [
  { value: 'encouragement', label: SETTINGS_COPY.motivationLabels.encouragement },
  { value: 'direct', label: SETTINGS_COPY.motivationLabels.direct },
  { value: 'gamification', label: SETTINGS_COPY.motivationLabels.gamification },
];

const durationOptions = [5, 15, 25];

const focusHoursText = computed(() => hourRangeLabel(focusStart.value, focusEnd.value));

function onStartChange(event: { detail?: { value?: string } }): void {
  focusStart.value = event?.detail?.value ?? focusStart.value;
}

function onEndChange(event: { detail?: { value?: string } }): void {
  focusEnd.value = event?.detail?.value ?? focusEnd.value;
}

async function persistAndGoHome(showToast: boolean): Promise<void> {
  await preferences.save({
    pushChannel: pushChannel.value,
    pushFrequency: pushFrequency.value,
    motivationStyle: motivationStyle.value,
    focusHoursStart: focusStart.value,
    focusHoursEnd: focusEnd.value,
    focusDuration: focusDuration.value,
    onboarded: true,
  });
  if (showToast) toast(PREFERENCE_SETUP_COPY.savedToast);
  uni.reLaunch({ url: '/pages/home/index' });
}

function onDone(): void {
  persistAndGoHome(true);
}

function onSkip(): void {
  persistAndGoHome(false);
}
</script>

<template>
  <PdPage background="page" :padded="true">
    <view class="pref">
      <text class="pref__title">{{ PREFERENCE_SETUP_COPY.title }}</text>
      <text class="pref__subtitle">{{ PREFERENCE_SETUP_COPY.subtitle }}</text>

      <view class="pref__group">
        <text class="pref__label">{{ PREFERENCE_SETUP_COPY.labelPushChannel }}</text>
        <view class="pref__chips">
          <view
            v-for="option in pushChannelOptions"
            :key="option.value"
            class="pref__chip"
            :class="{ 'pref__chip--active': pushChannel === option.value }"
            role="radio"
            tabindex="0"
            :aria-checked="pushChannel === option.value ? 'true' : 'false'"
            :aria-label="option.label"
            @tap="pushChannel = option.value" @keydown="onActivateKey($event, () => (pushChannel = option.value))"
          >
            <text class="pref__chip-text">{{ option.label }}</text>
          </view>
        </view>
      </view>

      <view class="pref__group">
        <text class="pref__label">{{ PREFERENCE_SETUP_COPY.labelPushFrequency }}</text>
        <view class="pref__chips">
          <view
            v-for="option in pushFrequencyOptions"
            :key="option.value"
            class="pref__chip"
            :class="{ 'pref__chip--active': pushFrequency === option.value }"
            role="radio"
            tabindex="0"
            :aria-checked="pushFrequency === option.value ? 'true' : 'false'"
            :aria-label="option.label"
            @tap="pushFrequency = option.value" @keydown="onActivateKey($event, () => (pushFrequency = option.value))"
          >
            <text class="pref__chip-text">{{ option.label }}</text>
          </view>
        </view>
      </view>

      <view class="pref__group">
        <text class="pref__label">{{ PREFERENCE_SETUP_COPY.labelMotivation }}</text>
        <view class="pref__chips">
          <view
            v-for="option in motivationOptions"
            :key="option.value"
            class="pref__chip"
            :class="{ 'pref__chip--active': motivationStyle === option.value }"
            role="radio"
            tabindex="0"
            :aria-checked="motivationStyle === option.value ? 'true' : 'false'"
            :aria-label="option.label"
            @tap="motivationStyle = option.value" @keydown="onActivateKey($event, () => (motivationStyle = option.value))"
          >
            <text class="pref__chip-text">{{ option.label }}</text>
          </view>
        </view>
      </view>

      <view class="pref__group">
        <text class="pref__label">{{ PREFERENCE_SETUP_COPY.labelFocusHours }}</text>
        <PdCard compact>
          <view class="pref__row">
            <text class="pref__row-value">{{ focusHoursText }}</text>
            <view class="pref__times">
              <picker mode="time" :value="focusStart" @change="onStartChange">
                <view class="pref__time" role="button" tabindex="0" aria-label="高效时段开始时间" @keydown="onActivateClick($event)">
                  <text class="pref__time-text">{{ focusStart }}</text>
                </view>
              </picker>
              <picker mode="time" :value="focusEnd" @change="onEndChange">
                <view class="pref__time" role="button" tabindex="0" aria-label="高效时段结束时间" @keydown="onActivateClick($event)">
                  <text class="pref__time-text">{{ focusEnd }}</text>
                </view>
              </picker>
            </view>
          </view>
          <text class="pref__hint">{{ PREFERENCE_SETUP_COPY.hintFocusHours }}</text>
        </PdCard>
      </view>

      <view class="pref__group">
        <text class="pref__label">{{ PREFERENCE_SETUP_COPY.labelFocusDuration }}</text>
        <view class="pref__chips">
          <view
            v-for="minutes in durationOptions"
            :key="minutes"
            class="pref__chip"
            :class="{ 'pref__chip--active': focusDuration === minutes }"
            role="radio"
            tabindex="0"
            :aria-checked="focusDuration === minutes ? 'true' : 'false'"
            :aria-label="`${minutes} 分钟`"
            @tap="focusDuration = minutes" @keydown="onActivateKey($event, () => (focusDuration = minutes))"
          >
            <text class="pref__chip-text">{{ minutes }} 分钟</text>
          </view>
        </view>
      </view>

      <view class="pref__actions">
        <PdButton variant="primary" size="lg" block @click="onDone">
          {{ PREFERENCE_SETUP_COPY.done }}
        </PdButton>
        <PdButton variant="ghost" size="lg" block @click="onSkip">
          {{ PREFERENCE_SETUP_COPY.skip }}
        </PdButton>
      </view>
    </view>
  </PdPage>
</template>

<style scoped lang="scss">
@import '../../styles/mixins.scss';

.pref {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: $space-6 0 $space-8;
}

.pref__title {
  font-size: $font-size-3xl;
  font-weight: $font-weight-bold;
  color: var(--pd-text-primary);
  line-height: 1.3;
}

.pref__subtitle {
  margin: $space-2 0 $space-6;
  font-size: $font-size-sm;
  color: var(--pd-text-secondary);
  line-height: 1.6;
}

.pref__group {
  margin-bottom: $space-6;
}

.pref__label {
  display: block;
  margin-bottom: $space-3;
  font-size: $font-size-sm;
  color: var(--pd-text-secondary);
}

.pref__chips {
  display: flex;
  flex-wrap: wrap;
  gap: $space-3;
}

.pref__chip {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: $hit-target-min;
  padding: 0 $space-5;
  background-color: var(--pd-bg-primary);
  border: 1rpx solid var(--pd-border);
  border-radius: $radius-full;
  transition: background-color $transition-fast, border-color $transition-fast;

  @include focus-visible;
}

.pref__chip--active {
  background-color: var(--pd-color-primary-bg);
  border-color: var(--pd-color-primary);

  .pref__chip-text {
    color: var(--pd-color-primary);
    font-weight: $font-weight-semibold;
  }
}

.pref__chip-text {
  font-size: $font-size-base;
  color: var(--pd-text-primary);
}

.pref__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pref__row-value {
  font-size: $font-size-base;
  color: var(--pd-text-primary);
}

.pref__times {
  display: flex;
  gap: $space-2;
}

.pref__time {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 140rpx;
  min-height: 64rpx;
  padding: 0 $space-3;
  background-color: var(--pd-bg-secondary);
  border-radius: $radius-md;

  @include focus-visible;
}

.pref__time-text {
  font-size: $font-size-base;
  color: var(--pd-text-primary);
}

.pref__hint {
  display: block;
  margin-top: $space-2;
  font-size: $font-size-xs;
  color: var(--pd-text-tertiary);
}

.pref__actions {
  display: flex;
  flex-direction: column;
  gap: $space-3;
  margin-top: $space-4;
}
</style>