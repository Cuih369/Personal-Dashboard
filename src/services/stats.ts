/**
 * 统计聚合 —— 公开契约
 *
 * 负责人：engineering-backend-architect
 * 依据：docs/UI-UX-Design.md 第 5.6 节（统计页）
 */
import type { CategorySlice, CompletionRecord, DailyPoint, StatsSummary, Task, TaskCategory } from '@/types';
import { MS_PER_DAY, addDays, formatDateKey, startOfDay, startOfWeek } from './internal/date';

/** 与契约 TASK_CATEGORIES 一致；此处仅用于同分时的稳定排序。 */
const CATEGORY_ORDER: readonly TaskCategory[] = ['work', 'study', 'life', 'other'];

const TREND_DAYS = 7;

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** 连续完成天数（今日未完成则为 0）。 */
function consecutiveCompletionDays(completedByDay: Map<string, number>, todayStart: number): number {
  if (!completedByDay.has(formatDateKey(todayStart))) return 0;
  let days = 0;
  let cursor = todayStart;
  while (completedByDay.has(formatDateKey(cursor))) {
    days += 1;
    cursor = addDays(cursor, -1);
  }
  return days;
}

/**
 * 汇总统计数据。
 * - dailyTrend：近 7 天（含今日），按日期升序，缺失日期补 0
 * - categoryBreakdown：按分类计数并按 count 降序，percent 保留 1 位小数
 * - consecutiveDays：连续完成天数（今日未完成为 0）
 * - weekCount：本周（周一为起点）完成数；weekDelta 对比上周同期
 */
export function summarizeStats(
  tasks: Task[],
  records: CompletionRecord[],
  now: number
): StatsSummary {
  const todayStart = startOfDay(now);
  const todayKey = formatDateKey(todayStart);
  const yesterdayKey = formatDateKey(addDays(todayStart, -1));

  const weekStart = startOfWeek(todayStart);
  const daysElapsedThisWeek = Math.round((todayStart - weekStart) / MS_PER_DAY) + 1; // 周一=1 ... 周日=7
  const previousWeekStart = addDays(weekStart, -7);
  const previousWeekEndExclusive = addDays(previousWeekStart, daysElapsedThisWeek);

  let todayCount = 0;
  let yesterdayCount = 0;
  let weekCount = 0;
  let previousWeekCount = 0;
  let totalCount = 0;

  const completedByDay = new Map<string, number>();
  const countByCategory = new Map<TaskCategory, number>();

  for (const record of records) {
    totalCount += 1;
    const dayKey = formatDateKey(record.completedAt);
    completedByDay.set(dayKey, (completedByDay.get(dayKey) ?? 0) + 1);
    countByCategory.set(record.category, (countByCategory.get(record.category) ?? 0) + 1);

    if (dayKey === todayKey) todayCount += 1;
    if (dayKey === yesterdayKey) yesterdayCount += 1;
    if (record.completedAt >= weekStart && record.completedAt <= now) weekCount += 1;
    if (record.completedAt >= previousWeekStart && record.completedAt < previousWeekEndExclusive) {
      previousWeekCount += 1;
    }
  }

  const dailyTrend: DailyPoint[] = [];
  for (let offset = TREND_DAYS - 1; offset >= 0; offset -= 1) {
    const day = addDays(todayStart, -offset);
    const key = formatDateKey(day);
    dailyTrend.push({ date: key, count: completedByDay.get(key) ?? 0 });
  }

  const categoryBreakdown: CategorySlice[] = Array.from(countByCategory.entries())
    .map(([category, count]) => ({
      category,
      count,
      percent: totalCount > 0 ? round1((count / totalCount) * 100) : 0,
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
    });

  return {
    todayCount,
    weekCount,
    totalCount,
    consecutiveDays: consecutiveCompletionDays(completedByDay, todayStart),
    todayDelta: todayCount - yesterdayCount,
    weekDelta: weekCount - previousWeekCount,
    dailyTrend,
    categoryBreakdown,
  };
}