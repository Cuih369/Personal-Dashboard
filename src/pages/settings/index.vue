<script setup lang="ts">
/**
 * 设置 / 我的页（UI-UX 第 5.7 节）
 * 偏好设置（推送渠道 / 频率 / 激励方式 / 高效时段 / 专注时长）、外观（主题 / 减少动效）、
 * 数据管理（导出 JSON / 清空）、关于；清空数据需二次确认。
 * 彩蛋：在本页输入 ↑↑↓↓←→←→BA 解锁隐藏主题提示（第 4.5 节）。
 */
import { computed, onUnmounted, ref } from 'vue';
import { onActivateClick, onActivateKey } from '@/utils/a11y';
import { onLoad } from '@dcloudio/uni-app';
import PdButton from '@/components/base/PdButton.vue';
import PdModal from '@/components/base/PdModal.vue';
import PdPage from '@/components/layout/PdPage.vue';
import { usePreferencesStore } from '@/store/preferences';
import { useStatsStore } from '@/store/stats';
import { useTasksStore } from '@/store/tasks';
import { exportSnapshot, clearAllData } from '@/services';
import type { AppDataSnapshot, MotivationStyle, PushChannel, PushFrequency, ThemeMode } from '@/types';
import { BRAND, COMMON_COPY, EASTER_EGG_COPY, SETTINGS_COPY } from '@/utils/copy';
import { watchKonami } from '@/utils/easter-eggs';
import { toast, toastError } from '@/utils/feedback';
import { hourRangeLabel } from '@/utils/format';
import { MOTION_DURATION } from '@/utils/motion';
import { TOKEN_HEX } from '@/utils/tokens';

type SheetId = 'pushChannel' | 'pushFrequency' | 'motivation' | 'theme' | 'focusDuration';

interface OptionItem {
  value: string;
  label: string;
}

interface WebDownloadDocument {
  createElement: (tag: string) => {
    href: string;
    download: string;
    style: Record<string, string>;
    click: () => void;
  };
  body: {
    appendChild: (node: unknown) => void;
    removeChild: (node: unknown) => void;
  };
}

interface WebDownloadEnvironment {
  document?: WebDownloadDocument;
  URL?: { createObjectURL: (blob: unknown) => string; revokeObjectURL: (url: string) => void };
  Blob?: new (parts: string[], options: { type: string }) => unknown;
}

const preferences = usePreferencesStore();
const tasks = useTasksStore();
const stats = useStatsStore();

const activeSheet = ref<SheetId | null>(null);
const hoursVisible = ref(false);
const clearVisible = ref(false);
const exporting = ref(false);
const exportPercent = ref(0);

let konamiStop: (() => void) | null = null;
let progressTimer: ReturnType<typeof setInterval> | null = null;

const focusHoursText = computed(() =>
  hourRangeLabel(preferences.preference.focusHoursStart, preferences.preference.focusHoursEnd2)
);

const pushChannelText = computed(() => SETTINGS_COPY.pushChannelLabels[preferences.preference.pushChannel]);
const pushFrequencyText = computed(
  () => SETTINGS_COPY.pushFrequencyLabels[preferences.preference.pushFrequency]
);
const motivationText = computed(() => SETTINGS_COPY.motivationLabels[preferences.preference.motivationStyle]);
const themeText = computed(() => SETTINGS_COPY.themeLabels[preferences.preference.theme]);
const focusDurationText = computed(() => `${preferences.preference.focusDuration} 分钟`);

const sheetTitle = computed(() => {
  switch (activeSheet.value) {
    case 'pushChannel':
      return SETTINGS_COPY.itemPushChannel;
    case 'pushFrequency':
      return SETTINGS_COPY.itemPushFrequency;
    case 'motivation':
      return SETTINGS_COPY.itemMotivation;
    case 'theme':
      return SETTINGS_COPY.itemTheme;
    case 'focusDuration':
      return SETTINGS_COPY.itemFocusDuration;
    default:
      return '';
  }
});

const sheetOptions = computed<OptionItem[]>(() => {
  switch (activeSheet.value) {
    case 'pushChannel':
      return (['app', 'system', 'none'] as PushChannel[]).map((value) => ({
        value,
        label: SETTINGS_COPY.pushChannelLabels[value],
      }));
    case 'pushFrequency':
      return (['daily', 'every_other_day', 'weekly', 'smart'] as PushFrequency[]).map((value) => ({
        value,
        label: SETTINGS_COPY.pushFrequencyLabels[value],
      }));
    case 'motivation':
      return (['encouragement', 'direct', 'gamification'] as MotivationStyle[]).map((value) => ({
        value,
        label: SETTINGS_COPY.motivationLabels[value],
      }));
    case 'theme':
      return (['system', 'light', 'dark'] as ThemeMode[]).map((value) => ({
        value,
        label: SETTINGS_COPY.themeLabels[value],
      }));
    case 'focusDuration':
      return [5, 15, 25].map((minutes) => ({ value: String(minutes), label: `${minutes} 分钟` }));
    default:
      return [];
  }
});

const sheetCurrent = computed(() => {
  switch (activeSheet.value) {
    case 'pushChannel':
      return preferences.preference.pushChannel as string;
    case 'pushFrequency':
      return preferences.preference.pushFrequency as string;
    case 'motivation':
      return preferences.preference.motivationStyle as string;
    case 'theme':
      return preferences.preference.theme as string;
    case 'focusDuration':
      return String(preferences.preference.focusDuration);
    default:
      return '';
  }
});

onLoad(async () => {
  await preferences.ensureLoaded();
  await tasks.ensureLoaded();
  konamiStop = watchKonami(() => toast(EASTER_EGG_COPY.konami));
});

onUnmounted(() => {
  konamiStop?.();
  konamiStop = null;
  if (progressTimer) clearInterval(progressTimer);
});

function openSheet(id: SheetId): void {
  activeSheet.value = id;
}

function closeSheet(): void {
  activeSheet.value = null;
}

async function chooseOption(value: string): Promise<void> {
  const sheet = activeSheet.value;
  activeSheet.value = null;
  switch (sheet) {
    case 'pushChannel':
      await preferences.save({ pushChannel: value as PushChannel });
      await preferences.applyPushPreferences(tasks.tasks);
      break;
    case 'pushFrequency':
      await preferences.save({ pushFrequency: value as PushFrequency });
      await preferences.applyPushPreferences(tasks.tasks);
      break;
    case 'motivation':
      await preferences.save({ motivationStyle: value as MotivationStyle });
      break;
    case 'theme':
      await preferences.save({ theme: value as ThemeMode });
      break;
    case 'focusDuration':
      await preferences.save({ focusDuration: Number(value) });
      break;
    default:
      break;
  }
}

function onStartChange(event: { detail?: { value?: string } }): void {
  const value = event?.detail?.value;
  if (value) preferences.save({ focusHoursStart: value });
}

function onEndChange(event: { detail?: { value?: string } }): void {
  const value = event?.detail?.value;
  if (value) preferences.save({ focusHoursEnd2: value });
}

// 模板 <switch> 的 @change 由 vue-tsc 按 DOM（Event）校验，故参数取 Event，内部再收窄出 uni 的 detail
function onReduceMotionChange(event: Event): void {
  const detail = (event as unknown as { detail?: { value?: boolean } }).detail;
  const next = detail?.value ?? false;
  preferences.setReduceMotion(next);
}

function openClear(): void {
  clearVisible.value = true;
}

function closeClear(): void {
  clearVisible.value = false;
}

async function confirmClear(): Promise<void> {
  clearVisible.value = false;
  try {
    await clearAllData();
    stats.reset();
    await preferences.load(true);
    await tasks.load(true);
    toast(SETTINGS_COPY.clearDone);
    uni.reLaunch({ url: '/pages/home/index' });
  } catch {
    toastError(SETTINGS_COPY.exportFailed);
  }
}

/** H5：直接触发文件下载；失败返回 false 由调用方降级 */
function downloadOnWeb(json: string): boolean {
  const env = globalThis as WebDownloadEnvironment;
  const doc = env.document;
  const BlobCtor = env.Blob;
  const url = env.URL;
  if (!doc || !BlobCtor || !url) return false;
  try {
    const blob = new BlobCtor([json], { type: 'application/json' });
    const href = url.createObjectURL(blob);
    const anchor = doc.createElement('a');
    anchor.href = href;
    anchor.download = `personal-dashboard-${Date.now()}.json`;
    anchor.style.display = 'none';
    doc.body.appendChild(anchor);
    anchor.click();
    doc.body.removeChild(anchor);
    url.revokeObjectURL(href);
    return true;
  } catch {
    return false;
  }
}

function copyToClipboard(json: string): void {
  try {
    uni.setClipboardData({ data: json });
    toast(SETTINGS_COPY.exportClipboard);
  } catch {
    toastError(SETTINGS_COPY.exportFailed);
  }
}

/** 第 6.4 节：导出显示进度条 + 百分比 */
async function onExport(): Promise<void> {
  if (exporting.value) return;
  exporting.value = true;
  exportPercent.value = 0;
  progressTimer = setInterval(() => {
    if (exportPercent.value < 90) exportPercent.value += 10;
  }, 120);
  try {
    const snapshot: AppDataSnapshot = await exportSnapshot();
    exportPercent.value = 100;
    const json = JSON.stringify(snapshot, null, 2);
    if (!downloadOnWeb(json)) copyToClipboard(json);
    else toast(SETTINGS_COPY.exportedToast);
  } catch {
    toastError(SETTINGS_COPY.exportFailed);
  } finally {
    if (progressTimer) clearInterval(progressTimer);
    progressTimer = null;
    setTimeout(() => {
      exporting.value = false;
      exportPercent.value = 0;
    }, MOTION_DURATION.toastEnter);
  }
}

function onComingSoon(): void {
  toast(SETTINGS_COPY.comingSoon);
}
</script>

<template>
  <PdPage :tab-bar="true" tab="settings" background="page">
    <view class="settings">
      <text class="settings__title">{{ SETTINGS_COPY.title }}</text>

      <view class="settings__user">
        <view class="settings__avatar" aria-hidden="true">
          <text class="settings__avatar-icon">👤</text>
        </view>
        <view class="settings__user-text">
          <text class="settings__user-name">{{ SETTINGS_COPY.userName }}</text>
          <text class="settings__user-desc">{{ SETTINGS_COPY.userDesc }}</text>
        </view>
      </view>

      <!-- 偏好设置 -->
      <text class="settings__group-title">{{ SETTINGS_COPY.groupPreference }}</text>
      <view class="settings__group">
        <view class="settings__item" role="button" tabindex="0" @tap="openSheet('pushChannel')" @keydown="onActivateKey($event, () => (openSheet('pushChannel')))">
          <text class="settings__item-label">{{ SETTINGS_COPY.itemPushChannel }}</text>
          <view class="settings__item-right">
            <text class="settings__item-value">{{ pushChannelText }}</text>
            <text class="settings__item-arrow">›</text>
          </view>
        </view>
        <view class="settings__item" role="button" tabindex="0" @tap="openSheet('pushFrequency')" @keydown="onActivateKey($event, () => (openSheet('pushFrequency')))">
          <text class="settings__item-label">{{ SETTINGS_COPY.itemPushFrequency }}</text>
          <view class="settings__item-right">
            <text class="settings__item-value">{{ pushFrequencyText }}</text>
            <text class="settings__item-arrow">›</text>
          </view>
        </view>
        <view class="settings__item" role="button" tabindex="0" @tap="openSheet('motivation')" @keydown="onActivateKey($event, () => (openSheet('motivation')))">
          <text class="settings__item-label">{{ SETTINGS_COPY.itemMotivation }}</text>
          <view class="settings__item-right">
            <text class="settings__item-value">{{ motivationText }}</text>
            <text class="settings__item-arrow">›</text>
          </view>
        </view>
        <view class="settings__item" role="button" tabindex="0" @tap="hoursVisible = true" @keydown="onActivateKey($event, () => (hoursVisible = true))">
          <text class="settings__item-label">{{ SETTINGS_COPY.itemFocusHours }}</text>
          <view class="settings__item-right">
            <text class="settings__item-value">{{ focusHoursText }}</text>
            <text class="settings__item-arrow">›</text>
          </view>
        </view>
        <view class="settings__item" role="button" tabindex="0" @tap="openSheet('focusDuration')" @keydown="onActivateKey($event, () => (openSheet('focusDuration')))">
          <text class="settings__item-label">{{ SETTINGS_COPY.itemFocusDuration }}</text>
          <view class="settings__item-right">
            <text class="settings__item-value">{{ focusDurationText }}</text>
            <text class="settings__item-arrow">›</text>
          </view>
        </view>
      </view>

      <!-- 外观 -->
      <text class="settings__group-title">{{ SETTINGS_COPY.groupAppearance }}</text>
      <view class="settings__group">
        <view class="settings__item" role="button" tabindex="0" @tap="openSheet('theme')" @keydown="onActivateKey($event, () => (openSheet('theme')))">
          <text class="settings__item-label">{{ SETTINGS_COPY.itemTheme }}</text>
          <view class="settings__item-right">
            <text class="settings__item-value">{{ themeText }}</text>
            <text class="settings__item-arrow">›</text>
          </view>
        </view>
        <view class="settings__item">
          <text class="settings__item-label">{{ SETTINGS_COPY.itemReduceMotion }}</text>
          <view class="settings__item-right">
            <switch
              :checked="preferences.reduceMotion"
              :color="TOKEN_HEX.primary"
              aria-label="减少动效"
              @change="onReduceMotionChange"
            />
          </view>
        </view>
      </view>

      <!-- 数据管理 -->
      <text class="settings__group-title">{{ SETTINGS_COPY.groupData }}</text>
      <view class="settings__group">
        <view class="settings__item" role="button" tabindex="0" @tap="onExport" @keydown="onActivateKey($event, onExport)">
          <text class="settings__item-label">{{ SETTINGS_COPY.itemExport }}</text>
          <view class="settings__item-right">
            <text class="settings__item-value">{{ exporting ? `${exportPercent}%` : '' }}</text>
            <text class="settings__item-arrow">›</text>
          </view>
        </view>
        <view v-if="exporting" class="settings__progress">
          <view class="settings__progress-bar" :style="{ width: exportPercent + '%' }" />
        </view>
        <view class="settings__item" role="button" tabindex="0" @tap="openClear" @keydown="onActivateKey($event, openClear)">
          <text class="settings__item-label settings__item-label--danger">
            {{ SETTINGS_COPY.itemClear }}
          </text>
          <view class="settings__item-right">
            <text class="settings__item-arrow">›</text>
          </view>
        </view>
      </view>

      <!-- 关于 -->
      <text class="settings__group-title">{{ SETTINGS_COPY.groupAbout }}</text>
      <view class="settings__group">
        <view class="settings__item">
          <text class="settings__item-label">{{ SETTINGS_COPY.itemVersion }}</text>
          <view class="settings__item-right">
            <text class="settings__item-value">{{ BRAND.version }}</text>
          </view>
        </view>
        <view class="settings__item" role="button" tabindex="0" @tap="onComingSoon" @keydown="onActivateKey($event, onComingSoon)">
          <text class="settings__item-label">{{ SETTINGS_COPY.itemPrivacy }}</text>
          <view class="settings__item-right">
            <text class="settings__item-arrow">›</text>
          </view>
        </view>
        <view class="settings__item" role="button" tabindex="0" @tap="onComingSoon" @keydown="onActivateKey($event, onComingSoon)">
          <text class="settings__item-label">{{ SETTINGS_COPY.itemRate }}</text>
          <view class="settings__item-right">
            <text class="settings__item-arrow">›</text>
          </view>
        </view>
      </view>
    </view>

    <template #overlay>
      <!-- 通用选项面板 -->
      <PdModal
        :visible="activeSheet !== null"
        :title="sheetTitle"
        :aria-label="sheetTitle"
        @update:visible="closeSheet"
      >
        <view class="settings__options">
          <view
            v-for="option in sheetOptions"
            :key="option.value"
            class="settings__option"
            role="button"
            tabindex="0"
            :aria-label="option.label"
            @tap="chooseOption(option.value)" @keydown="onActivateKey($event, () => (chooseOption(option.value)))"
          >
            <text
              class="settings__option-text"
              :class="{ 'settings__option-text--active': sheetCurrent === option.value }"
            >
              {{ option.label }}
            </text>
          </view>
        </view>
      </PdModal>

      <!-- 高效时段 -->
      <PdModal
        :visible="hoursVisible"
        :title="SETTINGS_COPY.itemFocusHours"
        :aria-label="SETTINGS_COPY.itemFocusHours"
        @update:visible="hoursVisible = false"
      >
        <view class="settings__hours">
          <picker mode="time" :value="preferences.preference.focusHoursStart" @change="onStartChange">
            <view class="settings__time" role="button" tabindex="0" aria-label="高效时段开始时间" @keydown="onActivateClick($event)">
              <text class="settings__time-text">{{ preferences.preference.focusHoursStart }}</text>
            </view>
          </picker>
          <text class="settings__hours-sep">-</text>
          <picker mode="time" :value="preferences.preference.focusHoursEnd2" @change="onEndChange">
            <view class="settings__time" role="button" tabindex="0" aria-label="高效时段结束时间" @keydown="onActivateClick($event)">
              <text class="settings__time-text">{{ preferences.preference.focusHoursEnd2 }}</text>
            </view>
          </picker>
        </view>
      </PdModal>

      <!-- 清空数据二次确认 -->
      <PdModal
        :visible="clearVisible"
        :title="SETTINGS_COPY.clearConfirmTitle"
        :aria-label="SETTINGS_COPY.clearConfirmTitle"
        @update:visible="closeClear"
      >
        <text class="settings__modal-text">{{ SETTINGS_COPY.clearConfirm }}</text>
        <template #footer>
          <PdButton variant="ghost" size="lg" block bordered @click="closeClear">
            {{ COMMON_COPY.cancel }}
          </PdButton>
          <PdButton variant="danger" size="lg" block @click="confirmClear">
            {{ COMMON_COPY.confirm }}
          </PdButton>
        </template>
      </PdModal>
    </template>
  </PdPage>
</template>

<style scoped lang="scss">
@import '../../styles/mixins.scss';

.settings {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding-bottom: $space-6;
}

.settings__title {
  padding: $space-3 $container-padding $space-4;
  font-size: $font-size-3xl;
  font-weight: $font-weight-bold;
  color: var(--pd-text-primary);
}

.settings__user {
  display: flex;
  align-items: center;
  gap: $space-3;
  margin: 0 $container-padding $space-5;
  padding: $space-5;
  background: linear-gradient(135deg, var(--pd-color-primary) 0%, var(--pd-color-primary-dark) 100%);
  border-radius: $radius-lg;
}

.settings__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 104rpx;
  height: 104rpx;
  border-radius: $radius-full;
  background-color: rgba(255, 255, 255, 0.2);
}

.settings__avatar-icon {
  font-size: $font-size-3xl;
}

.settings__user-text {
  display: flex;
  flex-direction: column;
}

.settings__user-name {
  font-size: $font-size-lg;
  font-weight: $font-weight-semibold;
  color: $color-white;
}

.settings__user-desc {
  margin-top: 2rpx;
  font-size: $font-size-sm;
  color: rgba(255, 255, 255, 0.8);
}

.settings__group-title {
  padding: 0 $container-padding $space-2;
  font-size: $font-size-sm;
  color: var(--pd-text-tertiary);
}

.settings__group {
  margin: 0 $container-padding $space-5;
  background-color: var(--pd-bg-primary);
  border-radius: $radius-lg;
  overflow: hidden;
  box-shadow: var(--pd-shadow-xs);
}

.settings__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 96rpx;
  padding: 0 $space-4;
  border-bottom: 1rpx solid var(--pd-divider);

  @include focus-visible;

  &:last-child {
    border-bottom: none;
  }
}

.settings__item-label {
  font-size: $font-size-base;
  color: var(--pd-text-primary);
}

.settings__item-label--danger {
  color: var(--pd-color-error);
}

.settings__item-right {
  display: flex;
  align-items: center;
  gap: $space-1;
}

.settings__item-value {
  font-size: $font-size-base;
  color: var(--pd-text-tertiary);
}

.settings__item-arrow {
  font-size: $font-size-xl;
  color: var(--pd-border);
}

.settings__progress {
  height: 6rpx;
  margin: 0 $space-4 $space-2;
  background-color: var(--pd-bg-tertiary);
  border-radius: $radius-full;
  overflow: hidden;
}

.settings__progress-bar {
  height: 100%;
  background-color: var(--pd-color-primary);
  border-radius: $radius-full;
  transition: width $transition-fast;
}

.settings__options {
  display: flex;
  flex-direction: column;
}

.settings__option {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: $hit-target-min;
  border-bottom: 1rpx solid var(--pd-divider);

  @include focus-visible;

  &:last-child {
    border-bottom: none;
  }
}

.settings__option-text {
  font-size: $font-size-lg;
  color: var(--pd-text-primary);
}

.settings__option-text--active {
  color: var(--pd-color-primary);
  font-weight: $font-weight-semibold;
}

.settings__hours {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $space-3;
}

.settings__time {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 160rpx;
  min-height: $hit-target-min;
  background-color: var(--pd-bg-secondary);
  border-radius: $radius-md;
}

.settings__time-text {
  font-size: $font-size-lg;
  color: var(--pd-text-primary);
}

.settings__hours-sep {
  font-size: $font-size-lg;
  color: var(--pd-text-tertiary);
}

.settings__modal-text {
  display: block;
  font-size: $font-size-base;
  line-height: 1.6;
  color: var(--pd-text-secondary);
  text-align: center;
}
</style>