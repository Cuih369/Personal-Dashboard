/**
 * 统计 Store
 * 负责人：engineering-frontend-developer
 * 约束：聚合交给 `@/services`（summarizeStats 等），store 只做编排与缓存。
 */
import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { completionRepo, summarizeStats } from '@/services';
import type { CategorySlice, CompletionRecord, StatsSummary } from '@/types';
import { localSummarizeStats } from '@/utils/local-rules';
import { collectCategoriesUsed, evaluateAchievements } from '@/utils/achievements';
import type { AchievementDef } from '@/utils/copy';
import { useTasksStore } from './tasks';

const EMPTY_SUMMARY: StatsSummary = {
  todayCount: 0,
  weekCount: 0,
  totalCount: 0,
  consecutiveDays: 0,
  todayDelta: 0,
  weekDelta: 0,
  dailyTrend: [],
  categoryBreakdown: [],
};

export const useStatsStore = defineStore('stats', () => {
  const summary = ref<StatsSummary>({ ...EMPTY_SUMMARY });
  const records = ref<CompletionRecord[]>([]);
  const loading = ref(false);
  const ready = ref(false);
  const failed = ref(false);
  /** 本次会话内已解锁过的成就 id（无独立存储字段，故仅内存去重） */
  const unlockedIds = ref<string[]>([]);
  const latestAchievement = ref<AchievementDef | null>(null);

  let inflight: Promise<void> | null = null;

  const hasData = computed(() => summary.value.totalCount > 0);
  const categoryBreakdown = computed<CategorySlice[]>(() => summary.value.categoryBreakdown);
  const dailyTrend = computed(() => summary.value.dailyTrend);
  const totalCount = computed(() => summary.value.totalCount);

  async function refresh(): Promise<void> {
    const tasksStore = useTasksStore();
    loading.value = true;
    const now = Date.now();
    try {
      const list = await completionRepo.list();
      records.value = list;
      failed.value = false;
      summary.value = summarizeStats(tasksStore.tasks, list, now);
    } catch {
      failed.value = true;
      summary.value = localSummarizeStats(tasksStore.tasks, records.value, now);
    } finally {
      loading.value = false;
      ready.value = true;
    }
  }

  function ensureLoaded(): Promise<void> {
    if (ready.value) return Promise.resolve();
    if (!inflight) {
      inflight = refresh().finally(() => {
        inflight = null;
      });
    }
    return inflight;
  }

  /** 依据最新数据判定成就，返回本次新解锁的成就（第 4.4 节） */
  function syncAchievements(): AchievementDef[] {
    const unlocked = evaluateAchievements({
      totalCount: summary.value.totalCount,
      todayCount: summary.value.todayCount,
      consecutiveDays: summary.value.consecutiveDays,
      categoriesUsed: collectCategoriesUsed(records.value),
      records: records.value,
      now: Date.now(),
    });
    const fresh = unlocked.filter((item) => !unlockedIds.value.includes(item.id));
    if (fresh.length > 0) {
      unlockedIds.value = [...unlockedIds.value, ...fresh.map((item) => item.id)];
      latestAchievement.value = fresh[0];
    }
    return fresh;
  }

  function dismissAchievement(): void {
    latestAchievement.value = null;
  }

  function reset(): void {
    summary.value = { ...EMPTY_SUMMARY };
    records.value = [];
    ready.value = false;
    failed.value = false;
  }

  return {
    summary,
    records,
    loading,
    ready,
    failed,
    unlockedIds,
    latestAchievement,
    hasData,
    categoryBreakdown,
    dailyTrend,
    totalCount,
    refresh,
    ensureLoaded,
    syncAchievements,
    dismissAchievement,
    reset,
  };
});