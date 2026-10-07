/**
 * 本地降级规则 —— **仅当 `@/services` 不可用时启用**
 * 负责人：engineering-frontend-developer
 *
 * ⚠️ 权威实现在服务层（src/services/rule-engine.ts、src/services/stats.ts，负责人 engineering-backend-architect）。
 *    本文件只是 UI 侧的**兜底**，用于满足「服务不可用时必须降级而非白屏」（services/index.ts 约定）。
 *    服务层可用时，store 一律优先调用服务层函数，此文件不会被使用。
 *    规则依据：PRD 附录 B（用户状态）、附录 C（优先级排序）、UI-UX 第 5.6 节（统计）。
 */
import type {
  CelebrationContext,
  CelebrationResult,
  CompletionRecord,
  DailyPoint,
  StatsSummary,
  Task,
  UserStatus,
  UserStatusInput,
} from '@/types';
import { pickFallbackCelebration } from './copy';
import { dateKey } from './format';

/** 附录 C：聚焦排序（档位高到低，档内 FIFO） */
export function localSortForFocus(tasks: readonly Task[], now: number): Task[] {
  const imminent = now + 24 * 60 * 60 * 1000;
  const rank = (task: Task): number => {
    if (task.priority === 1) return 0;
    if (task.dueDate !== null && task.dueDate <= imminent) return 1;
    if (task.estimatedDuration <= 15) return 2;
    return 3;
  };
  return [...tasks].sort((a, b) => {
    const byRank = rank(a) - rank(b);
    if (byRank !== 0) return byRank;
    return a.createdAt - b.createdAt;
  });
}

/** 取当前应展示的任务：currentId 的下一个，否则队列首个 */
export function localPickNextTask(
  tasks: readonly Task[],
  currentId: string | null,
  now: number
): Task | null {
  const pending = tasks.filter((task) => task.status !== 'completed');
  if (pending.length === 0) return null;
  const queue = localSortForFocus(pending, now);
  if (!currentId) return queue[0];
  const index = queue.findIndex((task) => task.id === currentId);
  if (index === -1) return queue[0];
  return queue[(index + 1) % queue.length];
}

/** 从备注中提取「第一步」；无备注时返回默认启动建议 */
export function localExtractFirstStep(note: string): string {
  const firstLine = (note ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)[0];
  if (!firstLine) return '先开始就好';
  return firstLine.replace(/^第[一二三四五六七八九十\d]+步[:：]?\s*/, '');
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const DAY_MS = 24 * 60 * 60 * 1000;

function recordsOn(records: readonly CompletionRecord[], dayStart: number): CompletionRecord[] {
  return records.filter(
    (record) => record.completedAt >= dayStart && record.completedAt < dayStart + DAY_MS
  );
}

/** 连续完成天数（今日未完成为 0） */
export function localConsecutiveDays(records: readonly CompletionRecord[], now: number): number {
  if (records.length === 0) return 0;
  let cursor = startOfDay(now);
  if (recordsOn(records, cursor).length === 0) return 0;
  let days = 0;
  while (recordsOn(records, cursor).length > 0) {
    days += 1;
    cursor -= DAY_MS;
  }
  return days;
}

/**
 * 连续零完成天数（附录 B，从昨天往前推）
 *
 * 语义（须与服务层保持一致）：
 * - 无任何完成记录 ⇒ 0：没有历史就没有「零完成 streak」，否则新用户会被误判为 stuck
 * - 有历史但最后一次完成已久 ⇒ 照常从昨天往前计数，并封顶（3650 天）
 */
export function localZeroCompletionDays(records: readonly CompletionRecord[], now: number): number {
  if (records.length === 0) return 0;
  let cursor = startOfDay(now) - DAY_MS;
  let days = 0;
  while (recordsOn(records, cursor).length === 0) {
    days += 1;
    cursor -= DAY_MS;
    if (days > 3650) break;
  }
  return days;
}

/** 附录 B：用户状态判定，顺序 overwhelmed -> stuck -> momentum -> fresh */
export function localComputeUserStatus(input: UserStatusInput): UserStatus {
  if (input.pendingCount > 10) return 'overwhelmed';
  if (input.zeroCompletionDays >= 3) return 'stuck';
  if (input.weeklyCompletionRate >= 0.6 && input.consecutiveDays >= 3) return 'momentum';
  return 'fresh';
}

/** 最近 7 天完成率 = 近 7 天完成数 / 近 7 天创建数；无创建时返回 1 */
export function localWeeklyCompletionRate(
  tasks: readonly Task[],
  records: readonly CompletionRecord[],
  now: number
): number {
  const since = startOfDay(now) - DAY_MS * 6;
  const created = tasks.filter((task) => task.createdAt >= since).length;
  if (created === 0) return 1;
  const done = records.filter((record) => record.completedAt >= since).length;
  return Math.min(1, done / created);
}
/** UI-UX 第 5.6 节：统计聚合降级实现 */
export function localSummarizeStats(
  tasks: readonly Task[],
  records: readonly CompletionRecord[],
  now: number
): StatsSummary {
  const todayStart = startOfDay(now);
  const todayCount = recordsOn(records, todayStart).length;
  const yesterdayCount = recordsOn(records, todayStart - DAY_MS).length;

  const weekday = (new Date(todayStart).getDay() + 6) % 7; // 周一 = 0
  const weekStart = todayStart - weekday * DAY_MS;
  const weekCount = records.filter((record) => record.completedAt >= weekStart).length;
  const lastWeekSamePeriod = records.filter(
    (record) =>
      record.completedAt >= weekStart - DAY_MS * 7 &&
      record.completedAt < weekStart - DAY_MS * 7 + (now - weekStart)
  ).length;

  const dailyTrend: DailyPoint[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const dayStart = todayStart - offset * DAY_MS;
    dailyTrend.push({ date: dateKey(dayStart), count: recordsOn(records, dayStart).length });
  }

  const buckets = new Map<string, number>();
  records.forEach((record) => {
    buckets.set(record.category, (buckets.get(record.category) ?? 0) + 1);
  });
  const categoryBreakdown = Array.from(buckets.entries())
    .map(([category, count]) => ({
      category: category as StatsSummary['categoryBreakdown'][number]['category'],
      count,
      percent: records.length > 0 ? Math.round((count / records.length) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    todayCount,
    weekCount,
    totalCount: records.length,
    consecutiveDays: localConsecutiveDays(records, now),
    todayDelta: todayCount - yesterdayCount,
    weekDelta: weekCount - lastWeekSamePeriod,
    dailyTrend,
    categoryBreakdown,
  };
}

/** 庆祝文案降级：委托给 copy.ts 的模板池 */
export function localPickCelebration(
  ctx: CelebrationContext,
  previousText?: string
): CelebrationResult {
  return pickFallbackCelebration(ctx, previousText);
}

