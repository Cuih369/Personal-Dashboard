/**
 * 推送排期规划（纯函数）。
 *
 * 与平台无关：只根据偏好 + 任务列表算出「下一次该在什么时刻推送什么话术」。
 * App 端由 push.ts 交给 UniPush / plus.push 落地；H5 端直接忽略。
 *
 * 频率语义：
 * - daily            每天最多 1 次
 * - every_other_day  至少间隔 1 天（≤1 次 / 2 天）
 * - weekly           至少间隔 6 天（≤1 次 / 7 天）
 * - smart            stuck -> 2 天，其余 1 天
 * - 额外降频：userStatus === 'stuck' 时至少 2 天；流失召回（winback）至少 7 天
 */

import type { NudgeKind, Task, UserPreference } from '@/types';
import { pickNextTask, pickNudge, sortTasksForFocus } from '../rule-engine';
import { addDays, atTimeOfDay, calendarDaysBetween, parseHHmm, parseDateKey, startOfDay } from './date';

export interface PlannedPush {
  kind: NudgeKind;
  text: string;
  taskId?: string;
  /** 计划送达时间戳（ms） */
  at: number;
}

const AFTERNOON_NUDGE_HOUR = 15;
const DEFAULT_FOCUS_HOUR = 9;
const WINBACK_INACTIVE_DAYS = 3;
const WINBACK_MIN_GAP_DAYS = 7;
const STUCK_MIN_GAP_DAYS = 2;

export function pushIntervalDays(pref: UserPreference): number {
  let days: number;
  switch (pref.pushFrequency) {
    case 'daily':
      days = 1;
      break;
    case 'every_other_day':
      days = 2;
      break;
    case 'weekly':
      days = 7;
      break;
    case 'smart':
    default:
      days = pref.userStatus === 'stuck' ? STUCK_MIN_GAP_DAYS : 1;
      break;
  }
  if (pref.userStatus === 'stuck') {
    days = Math.max(days, STUCK_MIN_GAP_DAYS);
  }
  return days;
}

export function isInactive(lastActiveDate: string, now: number, thresholdDays = WINBACK_INACTIVE_DAYS): boolean {
  const last = parseDateKey(lastActiveDate);
  if (last === null) return false;
  return calendarDaysBetween(last, now) >= thresholdDays;
}

function focusSlot(day: number, pref: UserPreference): number {
  const parsed = parseHHmm(pref.focusHoursStart);
  return atTimeOfDay(day, parsed?.hours ?? DEFAULT_FOCUS_HOUR, parsed?.minutes ?? 0);
}

/** 下一个「高效时段开始」时刻，满足与 now 至少相隔 gapDays 天。 */
function nextFocusSlot(now: number, pref: UserPreference, gapDays: number): number {
  const todayStart = startOfDay(now);
  const gap = Math.max(1, Math.trunc(gapDays));
  if (gap <= 1) {
    const todaySlot = focusSlot(now, pref);
    return todaySlot > now ? todaySlot : focusSlot(addDays(todayStart, 1), pref);
  }
  return focusSlot(addDays(todayStart, gap), pref);
}

export function buildPushPlan(pref: UserPreference, tasks: Task[], now: number): PlannedPush[] {
  if (pref.pushChannel === 'none') return [];

  const plan: PlannedPush[] = [];
  const pending = tasks.filter((task) => task.status !== 'completed');
  const primary = pickNextTask(sortTasksForFocus(pending, now), null, now);
  const interval = pushIntervalDays(pref);

  if (isInactive(pref.lastActiveDate, now)) {
    const nudge = pickNudge('winback', primary);
    if (nudge) {
      plan.push({
        kind: nudge.kind,
        text: nudge.text,
        taskId: nudge.taskId,
        at: nextFocusSlot(now, pref, Math.max(interval, WINBACK_MIN_GAP_DAYS)),
      });
    }
    return plan;
  }

  if (pending.length === 0) return plan;

  const morning = pickNudge('morning', primary);
  if (morning) {
    plan.push({
      kind: morning.kind,
      text: morning.text,
      taskId: morning.taskId,
      at: nextFocusSlot(now, pref, interval),
    });
  }

  // 下午提醒仅在「不像已经在推进」时安排；stuck / momentum 只保留早间。
  if (pref.userStatus !== 'stuck' && pref.userStatus !== 'momentum') {
    const afternoonAt = atTimeOfDay(now, AFTERNOON_NUDGE_HOUR, 0);
    if (afternoonAt > now) {
      const afternoon = pickNudge('afternoon', primary);
      if (afternoon) {
        plan.push({
          kind: afternoon.kind,
          text: afternoon.text,
          taskId: afternoon.taskId,
          at: afternoonAt,
        });
      }
    }
  }

  return plan;
}