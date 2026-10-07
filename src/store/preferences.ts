/**
 * 偏好 Store
 * 负责人：engineering-frontend-developer
 * 约束：只能通过 `@/services` 访问数据，绝不直接触碰存储。
 */
import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { DEFAULT_PREFERENCE, preferenceRepo, pushService } from '@/services';
import type { Task, ThemeMode, UserPreference } from '@/types';
import { hourRangeLabel } from '@/utils/format';
import { getSystemTheme, onSystemThemeChange, resolveTheme, type ResolvedTheme } from '@/utils/theme';

type PreferencePatch = Partial<Omit<UserPreference, 'id'>>;

export const usePreferencesStore = defineStore('preferences', () => {
  const preference = ref<UserPreference>({ ...DEFAULT_PREFERENCE });
  const loading = ref(false);
  const ready = ref(false);
  const systemTheme = ref<ResolvedTheme>(getSystemTheme());

  let inflight: Promise<void> | null = null;
  let themeSubscribed = false;

  const onboarded = computed(() => preference.value.onboarded);
  const reduceMotion = computed(() => preference.value.reduceMotion);
  const theme = computed(() => preference.value.theme);
  const resolvedTheme = computed<ResolvedTheme>(() =>
    theme.value === 'system' ? systemTheme.value : resolveTheme(theme.value)
  );
  const focusDuration = computed(() => preference.value.focusDuration);
  const consecutiveDays = computed(() => preference.value.consecutiveDays);
  const userStatus = computed(() => preference.value.userStatus);
  const motivationStyle = computed(() => preference.value.motivationStyle);
  const pushChannel = computed(() => preference.value.pushChannel);
  const focusHoursText = computed(() =>
    hourRangeLabel(preference.value.focusHoursStart, preference.value.focusHoursEnd2)
  );

  function subscribeSystemTheme(): void {
    if (themeSubscribed) return;
    themeSubscribed = true;
    onSystemThemeChange((next) => {
      systemTheme.value = next;
    });
  }

  /** 读取偏好；失败时降级为默认值，绝不白屏 */
  async function load(force = false): Promise<void> {
    if (ready.value && !force) return;
    loading.value = true;
    try {
      const stored = await preferenceRepo.get();
      preference.value = { ...DEFAULT_PREFERENCE, ...stored };
    } catch {
      preference.value = { ...DEFAULT_PREFERENCE };
    } finally {
      ready.value = true;
      loading.value = false;
      subscribeSystemTheme();
    }
  }

  /** 幂等初始化：并发调用共享同一次加载 */
  function ensureLoaded(): Promise<void> {
    if (ready.value) return Promise.resolve();
    if (!inflight) {
      inflight = load().finally(() => {
        inflight = null;
      });
    }
    return inflight;
  }

  /**
   * 保存偏好：先本地乐观更新（保证交互反馈 ≤300ms），再落盘。
   * 落盘失败时保留本地值，功能不中断。
   */
  async function save(patch: PreferencePatch): Promise<UserPreference> {
    const optimistic = { ...preference.value, ...patch };
    preference.value = optimistic;
    ready.value = true;
    try {
      const stored = await preferenceRepo.save(patch);
      preference.value = { ...optimistic, ...stored };
    } catch {
      // 降级：本地生效即可
    }
    return preference.value;
  }

  async function completeOnboarding(): Promise<void> {
    await save({ onboarded: true });
  }

  async function setReduceMotion(value: boolean): Promise<void> {
    await save({ reduceMotion: value });
  }

  async function setTheme(value: ThemeMode): Promise<void> {
    await save({ theme: value });
  }

  /** 推送渠道 / 频率变化后重排推送计划（不支持时静默降级） */
  async function applyPushPreferences(tasks: Task[]): Promise<void> {
    try {
      if (preference.value.pushChannel === 'none') {
        await pushService.cancelAll();
        return;
      }
      if (!pushService.isSupported()) return;
      await pushService.schedule(preference.value, tasks);
    } catch {
      // 降级：推送服务不可用不影响本地使用（第 4.2 节文案）
    }
  }


  return {
    preference,
    loading,
    ready,
    onboarded,
    reduceMotion,
    theme,
    resolvedTheme,
    focusDuration,
    consecutiveDays,
    userStatus,
    motivationStyle,
    pushChannel,
    focusHoursText,
    load,
    ensureLoaded,
    save,
    completeOnboarding,
    setReduceMotion,
    setTheme,
    applyPushPreferences,
  };
});