/**
 * 成就徽章判定（UI-UX 第 4.4 节）
 * 负责人：engineering-frontend-developer
 *
 * 说明：成就状态完全由本地数据推导（无独立存储字段），
 *       “首次解锁”通过内存中的已解锁集合去重，避免重复弹提示。
 */
import type { CompletionRecord, TaskCategory } from '@/types';
import { ACHIEVEMENTS, type AchievementDef } from './copy';

export interface AchievementInput {
  totalCount: number;
  todayCount: number;
  consecutiveDays: number;
  categoriesUsed: readonly TaskCategory[];
  records: readonly CompletionRecord[];
  now: number;
}

function completedHour(record: CompletionRecord): number {
  return new Date(record.completedAt).getHours();
}

/** 判定当前数据满足的全部成就 */
export function evaluateAchievements(input: AchievementInput): AchievementDef[] {
  const unlocked: AchievementDef[] = [];
  const push = (id: string) => {
    const def = ACHIEVEMENTS.find((item) => item.id === id);
    if (def) unlocked.push(def);
  };

  if (input.totalCount >= 1) push('first-step');
  if (input.consecutiveDays >= 3) push('streak-3');
  if (input.consecutiveDays >= 7) push('streak-7');
  if (input.consecutiveDays >= 14) push('streak-14');
  if (input.consecutiveDays >= 30) push('streak-30');
  if (input.totalCount >= 100) push('total-100');
  if (input.todayCount >= 5) push('day-5');
  if (input.categoriesUsed.length >= 4) push('all-categories');

  const hours = input.records.map(completedHour);
  if (hours.some((hour) => hour >= 6 && hour < 8)) push('early-bird');
  if (hours.some((hour) => hour >= 22 && hour < 24)) push('night-owl');

  return unlocked;
}

/** 从 records 中提取使用过的分类 */
export function collectCategoriesUsed(records: readonly CompletionRecord[]): TaskCategory[] {
  const set = new Set<TaskCategory>();
  records.forEach((record) => set.add(record.category));
  return Array.from(set);
}