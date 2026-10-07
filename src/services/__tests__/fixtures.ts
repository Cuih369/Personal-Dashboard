/** 单测用固定时间与工厂函数（纯数据，无 IO）。 */

import type { CompletionRecord, Task } from '@/types';

/** 2026-01-14 12:00 本地时间（周三），保证周边界断言稳定。 */
export const NOW = new Date(2026, 0, 14, 12, 0, 0, 0).getTime();

/** 相对 NOW 的偏移天数（可指定时刻）。 */
export function ts(dayOffset: number, hour = 10, minute = 0): number {
  const date = new Date(NOW);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date.getTime();
}

export function makeTask(overrides: Partial<Task> & { id: string }): Task {
  return {
    id: overrides.id,
    title: overrides.title ?? `任务-${overrides.id}`,
    note: overrides.note ?? '',
    category: overrides.category ?? 'work',
    estimatedDuration: overrides.estimatedDuration ?? 30,
    priority: overrides.priority ?? 0,
    status: overrides.status ?? 'pending',
    createdAt: overrides.createdAt ?? ts(0),
    completedAt: overrides.completedAt ?? null,
    dueDate: overrides.dueDate ?? null,
  };
}

export function makeRecord(overrides: Partial<CompletionRecord> & { id: string }): CompletionRecord {
  return {
    id: overrides.id,
    taskId: overrides.taskId ?? `task-${overrides.id}`,
    taskTitle: overrides.taskTitle ?? '任务',
    category: overrides.category ?? 'work',
    completedAt: overrides.completedAt ?? ts(0),
    durationMinutes: overrides.durationMinutes ?? null,
  };
}