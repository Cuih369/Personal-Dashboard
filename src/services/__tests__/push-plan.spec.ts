import { describe, expect, it } from 'vitest';
import type { Task, UserPreference } from '@/types';
import { buildPushPlan, isInactive, pushIntervalDays } from '../internal/push-plan';
import { DEFAULT_PREFERENCE } from '../defaults';
import { formatDateKey } from '../internal/date';
import { NOW, makeTask, ts } from './fixtures';

const DAY = 86_400_000;

function pref(overrides: Partial<UserPreference> = {}): UserPreference {
  return {
    ...DEFAULT_PREFERENCE,
    lastActiveDate: formatDateKey(NOW),
    ...overrides,
  };
}

const pending: Task[] = [makeTask({ id: 'p1', title: '写周报', createdAt: ts(-1) })];

describe('pushIntervalDays（频率 + stuck 降频）', () => {
  it('daily / every_other_day / weekly 映射为 1 / 2 / 7 天', () => {
    expect(pushIntervalDays(pref({ pushFrequency: 'daily' }))).toBe(1);
    expect(pushIntervalDays(pref({ pushFrequency: 'every_other_day' }))).toBe(2);
    expect(pushIntervalDays(pref({ pushFrequency: 'weekly' }))).toBe(7);
  });

  it('smart 依据状态：fresh -> 1，stuck -> 2', () => {
    expect(pushIntervalDays(pref({ pushFrequency: 'smart', userStatus: 'fresh' }))).toBe(1);
    expect(pushIntervalDays(pref({ pushFrequency: 'smart', userStatus: 'stuck' }))).toBe(2);
  });

  it('stuck 状态强制降频到至少 2 天', () => {
    expect(pushIntervalDays(pref({ pushFrequency: 'daily', userStatus: 'stuck' }))).toBe(2);
  });
});

describe('isInactive', () => {
  it('空 lastActiveDate 视为活跃（不触发流失召回）', () => {
    expect(isInactive('', NOW)).toBe(false);
  });

  it('连续 3 天未打开视为流失', () => {
    expect(isInactive(formatDateKey(ts(-3)), NOW)).toBe(true);
    expect(isInactive(formatDateKey(ts(-2)), NOW)).toBe(false);
  });
});

describe('buildPushPlan', () => {
  it('pushChannel === none 时不产生任何计划', () => {
    expect(buildPushPlan(pref({ pushChannel: 'none' }), pending, NOW)).toEqual([]);
  });

  it('无未完成任务时不产生计划', () => {
    expect(buildPushPlan(pref(), [], NOW)).toEqual([]);
    expect(buildPushPlan(pref(), [makeTask({ id: 'done', status: 'completed' })], NOW)).toEqual([]);
  });

  it('流失用户（连续 3 天未打开）安排 winback，且至少间隔一周', () => {
    const plan = buildPushPlan(pref({ lastActiveDate: formatDateKey(ts(-10)) }), pending, NOW);
    expect(plan).toHaveLength(1);
    expect(plan[0]?.kind).toBe('winback');
    expect(plan[0]?.at).toBe(ts(7, 8));
    expect((plan[0]?.at ?? 0) - NOW).toBeGreaterThanOrEqual(6 * DAY);
  });

  it('fresh 用户在 15:00 前会同时安排早间 + 下午提醒', () => {
    const plan = buildPushPlan(pref({ userStatus: 'fresh' }), pending, NOW);
    const kinds = plan.map((item) => item.kind);
    expect(kinds).toContain('morning');
    expect(kinds).toContain('afternoon');
    const morning = plan.find((item) => item.kind === 'morning');
    const afternoon = plan.find((item) => item.kind === 'afternoon');
    expect(morning?.at).toBe(ts(1, 8));
    expect(afternoon?.at).toBe(ts(0, 15));
  });

  it('stuck 用户只保留早间提醒（降频 + 温和）', () => {
    const plan = buildPushPlan(pref({ userStatus: 'stuck' }), pending, NOW);
    expect(plan.map((item) => item.kind)).toEqual(['morning']);
    expect(plan[0]?.at).toBe(ts(2, 8));
  });

  it('momentum 用户不安排下午提醒', () => {
    const plan = buildPushPlan(pref({ userStatus: 'momentum' }), pending, NOW);
    expect(plan.map((item) => item.kind)).toEqual(['morning']);
  });

  it('weekly 频率下早间提醒安排在 7 天后同一时段', () => {
    const plan = buildPushPlan(pref({ pushFrequency: 'weekly' }), pending, NOW);
    expect(plan[0]?.at).toBe(ts(7, 8));
    expect((plan[0]?.at ?? 0) - NOW).toBeGreaterThanOrEqual(6 * DAY);
  });

  it('早间提醒携带任务标题与 taskId', () => {
    const plan = buildPushPlan(pref(), pending, NOW);
    const morning = plan.find((item) => item.kind === 'morning');
    expect(morning?.text).toContain('写周报');
    expect(morning?.taskId).toBe('p1');
  });
});