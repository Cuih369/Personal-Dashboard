import { describe, expect, it } from 'vitest';
import type { CelebrationContext, CompletionRecord, MotivationStyle, NudgeKind, Task } from '@/types';
import {
  computeUserStatus,
  extractFirstStep,
  pickCelebration,
  pickNudge,
  pickNextTask,
  sortTasksForFocus,
  weeklyCompletionRate,
  zeroCompletionDays,
} from '../rule-engine';
import { NOW, makeRecord, makeTask, ts } from './fixtures';

const DAY = 86_400_000;

describe('computeUserStatus（附录 B，判定顺序 overwhelmed -> stuck -> momentum -> fresh）', () => {
  it('pendingCount > 10 判定为 overwhelmed', () => {
    expect(
      computeUserStatus({ pendingCount: 11, zeroCompletionDays: 5, weeklyCompletionRate: 0.9, consecutiveDays: 9 })
    ).toBe('overwhelmed');
  });

  it('zeroCompletionDays >= 3 判定为 stuck', () => {
    expect(
      computeUserStatus({ pendingCount: 3, zeroCompletionDays: 3, weeklyCompletionRate: 0.9, consecutiveDays: 9 })
    ).toBe('stuck');
  });

  it('完成率 >= 0.6 且连续 >= 3 判定为 momentum', () => {
    expect(
      computeUserStatus({ pendingCount: 2, zeroCompletionDays: 0, weeklyCompletionRate: 0.6, consecutiveDays: 3 })
    ).toBe('momentum');
  });

  it('其余为 fresh', () => {
    expect(
      computeUserStatus({ pendingCount: 2, zeroCompletionDays: 1, weeklyCompletionRate: 0.4, consecutiveDays: 2 })
    ).toBe('fresh');
  });

  it('优先级：overwhelmed 覆盖 stuck', () => {
    expect(
      computeUserStatus({ pendingCount: 20, zeroCompletionDays: 10, weeklyCompletionRate: 1, consecutiveDays: 0 })
    ).toBe('overwhelmed');
  });

  it('优先级：stuck 覆盖 momentum', () => {
    expect(
      computeUserStatus({ pendingCount: 1, zeroCompletionDays: 4, weeklyCompletionRate: 1, consecutiveDays: 30 })
    ).toBe('stuck');
  });
});

describe('zeroCompletionDays', () => {
  it('今日有完成记录时为 0', () => {
    expect(zeroCompletionDays([makeRecord({ id: 'a', completedAt: ts(0, 9) })], NOW)).toBe(0);
  });

  it('最后一次完成在昨日时为 1', () => {
    expect(zeroCompletionDays([makeRecord({ id: 'a', completedAt: ts(-1, 22) })], NOW)).toBe(1);
  });

  it('连续三天零完成时为 3', () => {
    expect(zeroCompletionDays([makeRecord({ id: 'a', completedAt: ts(-3, 22) })], NOW)).toBe(3);
  });

  it('无任何完成记录时返回 0（无历史 ⇒ 无零完成连续）', () => {
    expect(zeroCompletionDays([], NOW)).toBe(0);
  });

  it('有历史时仍可回溯长区间（上限保护下的真实长区间）', () => {
    expect(zeroCompletionDays([makeRecord({ id: 'a', completedAt: ts(-30, 9) })], NOW)).toBe(30);
  });
});

describe('新用户与回归保护：zeroCompletionDays 与 computeUserStatus 的组合', () => {
  it('无完成记录 + 无任务 ⇒ zeroCompletionDays = 0 且状态 fresh', () => {
    const tasks: Task[] = [];
    const records: CompletionRecord[] = [];
    const zeroDays = zeroCompletionDays(records, NOW);

    expect(zeroDays).toBe(0);
    expect(
      computeUserStatus({
        pendingCount: tasks.filter((task) => task.status !== 'completed').length,
        zeroCompletionDays: zeroDays,
        weeklyCompletionRate: weeklyCompletionRate(tasks, records, NOW),
        consecutiveDays: 0,
      })
    ).toBe('fresh');
  });

  it('无完成记录 + 未完成任务数 > 10 ⇒ 仍判定 overwhelmed', () => {
    const tasks = Array.from({ length: 11 }, (_, index) => makeTask({ id: `overwhelmed-${index}` }));
    const records: CompletionRecord[] = [];
    const zeroDays = zeroCompletionDays(records, NOW);

    expect(zeroDays).toBe(0);
    expect(
      computeUserStatus({
        pendingCount: tasks.filter((task) => task.status !== 'completed').length,
        zeroCompletionDays: zeroDays,
        weeklyCompletionRate: weeklyCompletionRate(tasks, records, NOW),
        consecutiveDays: 0,
      })
    ).toBe('overwhelmed');
  });

  it('有历史记录且最后一次完成在 3 天前 ⇒ 判定 stuck（回归保护）', () => {
    const tasks = [makeTask({ id: 'a', createdAt: ts(0) })];
    const records = [makeRecord({ id: 'c1', completedAt: ts(-3, 22) })];
    const zeroDays = zeroCompletionDays(records, NOW);

    expect(zeroDays).toBe(3);
    expect(
      computeUserStatus({
        pendingCount: 1,
        zeroCompletionDays: zeroDays,
        weeklyCompletionRate: weeklyCompletionRate(tasks, records, NOW),
        consecutiveDays: 0,
      })
    ).toBe('stuck');
  });
});

describe('weeklyCompletionRate', () => {
  it('近 7 天没有创建任务时返回 1', () => {
    expect(weeklyCompletionRate([], [], NOW)).toBe(1);
  });

  it('5 个创建 3 个完成 -> 0.6', () => {
    const tasks = [0, 1, 2, 3, 4].map((i) => makeTask({ id: `t${i}`, createdAt: ts(-i) }));
    const records = [0, 1, 2].map((i) => makeRecord({ id: `c${i}`, completedAt: ts(-i) }));
    expect(weeklyCompletionRate(tasks, records, NOW)).toBeCloseTo(0.6, 6);
  });

  it('窗口外的创建不计入分母', () => {
    const tasks = [
      makeTask({ id: 'old', createdAt: ts(-10) }),
      makeTask({ id: 'n1', createdAt: ts(0) }),
      makeTask({ id: 'n2', createdAt: ts(0) }),
    ];
    const records = [makeRecord({ id: 'r', completedAt: ts(0) })];
    expect(weeklyCompletionRate(tasks, records, NOW)).toBeCloseTo(0.5, 6);
  });

  it('完成数超过创建数时钳制到 1', () => {
    const tasks = [makeTask({ id: 'a', createdAt: ts(0) }), makeTask({ id: 'b', createdAt: ts(0) })];
    const records = [0, 1, 2, 3, 4].map((i) => makeRecord({ id: `c${i}`, completedAt: ts(-i) }));
    expect(weeklyCompletionRate(tasks, records, NOW)).toBe(1);
  });
});

describe('sortTasksForFocus（附录 C 档位 + FIFO）', () => {
  it('按 置顶 -> 即将到期 -> 短任务 -> 其余 排序，档位内按 createdAt 升序', () => {
    const top = makeTask({ id: 'top', priority: 1, createdAt: ts(-5) });
    const due = makeTask({ id: 'due', dueDate: ts(0, 20), createdAt: ts(-2) });
    const short = makeTask({ id: 'short', estimatedDuration: 15, createdAt: ts(-4) });
    const restOld = makeTask({ id: 'rest-old', estimatedDuration: 60, createdAt: ts(-6) });
    const restNew = makeTask({ id: 'rest-new', estimatedDuration: 30, createdAt: ts(-1) });

    const sorted = sortTasksForFocus([restNew, restOld, short, due, top], NOW).map((t) => t.id);
    expect(sorted).toEqual(['top', 'due', 'short', 'rest-old', 'rest-new']);
  });

  it('dueDate 恰好在 now + 1 天时属于第 2 档（<= 边界）', () => {
    const boundary = makeTask({ id: 'boundary', dueDate: NOW + DAY, estimatedDuration: 60 });
    const later = makeTask({ id: 'later', dueDate: NOW + DAY + 1, estimatedDuration: 60, createdAt: ts(0) });
    const sorted = sortTasksForFocus([later, boundary], NOW).map((t) => t.id);
    expect(sorted).toEqual(['boundary', 'later']);
  });

  it('不修改入参数组', () => {
    const input = [makeTask({ id: 'a' }), makeTask({ id: 'b', priority: 1 })];
    const snapshot = input.map((t) => t.id);
    sortTasksForFocus(input, NOW);
    expect(input.map((t) => t.id)).toEqual(snapshot);
  });
});

describe('pickNextTask', () => {
  const a = makeTask({ id: 'a', priority: 1, createdAt: ts(-3) });
  const b = makeTask({ id: 'b', createdAt: ts(-2) });
  const c = makeTask({ id: 'c', createdAt: ts(-1) });
  const queue = [a, b, c];

  it('currentId 为 null 时返回首个', () => {
    expect(pickNextTask(queue, null, NOW)?.id).toBe('a');
  });

  it('返回 currentId 的下一个', () => {
    expect(pickNextTask(queue, 'a', NOW)?.id).toBe('b');
  });

  it('末尾时回绕到首个', () => {
    expect(pickNextTask(queue, 'c', NOW)?.id).toBe('a');
  });

  it('currentId 未知时返回首个', () => {
    expect(pickNextTask(queue, 'missing', NOW)?.id).toBe('a');
  });

  it('队列为空时返回 null', () => {
    expect(pickNextTask([], 'a', NOW)).toBeNull();
  });
});

describe('extractFirstStep', () => {
  it('提取第一行有效内容并剥离列表前缀', () => {
    expect(extractFirstStep('- 先打开文档')).toBe('先打开文档');
    expect(extractFirstStep('1. 打开日历')).toBe('打开日历');
    expect(extractFirstStep('第一步：写标题')).toBe('写标题');
    expect(extractFirstStep('（1）喝口水')).toBe('喝口水');
    expect(extractFirstStep('2、列大纲')).toBe('列大纲');
  });

  it('跳过空行', () => {
    expect(extractFirstStep('\n\n   \n3) 打开 IDE')).toBe('打开 IDE');
  });

  it('空备注回退到默认建议', () => {
    expect(extractFirstStep('')).toBe('先开始就好');
    expect(extractFirstStep('   \n  ')).toBe('先开始就好');
  });
});

function celebrationCtx(overrides: Partial<CelebrationContext> = {}): CelebrationContext {
  return {
    taskTitle: '写周报',
    todayCount: 3,
    weekCount: 12,
    remainingCount: 999,
    consecutiveDays: 0,
    motivationStyle: 'encouragement',
    yesterdayCount: 1,
    allDone: false,
    ...overrides,
  };
}

describe('pickCelebration', () => {
  it('命中 3/7/14/30 连续成就时回填 streakMilestone 并使用专属文案', () => {
    const milestones = [3, 7, 14, 30] as const;
    for (const milestone of milestones) {
      const result = pickCelebration(celebrationCtx({ consecutiveDays: milestone }), undefined, () => 0);
      expect(result.streakMilestone).toBe(milestone);
      expect(result.text.length).toBeGreaterThan(0);
    }
  });

  it('未命中里程碑时 streakMilestone 为 null', () => {
    expect(pickCelebration(celebrationCtx({ consecutiveDays: 4 }), undefined, () => 0).streakMilestone).toBeNull();
  });

  it('每种激励风格至少 10 条模板', () => {
    const styles: MotivationStyle[] = ['encouragement', 'direct', 'gamification'];
    for (const style of styles) {
      const seen = new Set<string>();
      for (let i = 0; i < 300; i += 1) {
        seen.add(pickCelebration(celebrationCtx({ motivationStyle: style }), undefined, () => i / 300).text);
      }
      expect(seen.size).toBeGreaterThanOrEqual(10);
    }
  });

  it('避免与 previousText 重复', () => {
    const ctx = celebrationCtx();
    const first = pickCelebration(ctx, undefined, () => 0).text;
    const second = pickCelebration(ctx, first, () => 0).text;
    expect(second).not.toBe(first);
  });

  it('allDone 使用「全部完成」专属文案且不展示剩余数量', () => {
    const ctx = celebrationCtx({ allDone: true, remainingCount: 999 });
    const seen = new Set<string>();
    for (let i = 0; i < 200; i += 1) {
      const text = pickCelebration(ctx, undefined, () => i / 200).text;
      expect(text).not.toContain('999');
      expect(text).not.toContain('剩余');
      seen.add(text);
    }
    expect(seen.size).toBeGreaterThanOrEqual(3);
  });

  it('普通文案不展示剩余数量（remainingCount 仅供内部判断）', () => {
    for (let i = 0; i < 200; i += 1) {
      const text = pickCelebration(celebrationCtx(), undefined, () => i / 200).text;
      expect(text).not.toContain('999');
      expect(text).not.toContain('剩余');
    }
  });
});

describe('pickNudge', () => {
  const task = makeTask({ id: 'task-1', title: '写周报' });
  const kinds: NudgeKind[] = ['morning', 'afternoon', 'winback'];

  it('morning 模板都需要任务标题，task 为 null 时返回 null', () => {
    expect(pickNudge('morning', null, undefined, () => 0)).toBeNull();
  });

  it('有任务时 morning 文案包含任务标题并回填 taskId', () => {
    const message = pickNudge('morning', task, undefined, () => 0);
    expect(message).not.toBeNull();
    expect(message?.text).toContain('写周报');
    expect(message?.taskId).toBe('task-1');
    expect(message?.kind).toBe('morning');
  });

  it('afternoon / winback 存在无需标题的模板，task 为 null 时仍可用', () => {
    const afternoon = pickNudge('afternoon', null, undefined, () => 0);
    const winback = pickNudge('winback', null, undefined, () => 0);
    expect(afternoon?.text.length ?? 0).toBeGreaterThan(0);
    expect(winback?.text.length ?? 0).toBeGreaterThan(0);
    expect(afternoon?.taskId).toBeUndefined();
  });

  it('每种类型至少 3 条模板', () => {
    for (const kind of kinds) {
      const seen = new Set<string>();
      for (let i = 0; i < 100; i += 1) {
        const message = pickNudge(kind, task, undefined, () => i / 100);
        if (message) seen.add(message.text);
      }
      expect(seen.size).toBeGreaterThanOrEqual(3);
    }
  });

  it('避免与 previousText 重复', () => {
    const first = pickNudge('morning', task, undefined, () => 0);
    const second = pickNudge('morning', task, first?.text, () => 0);
    expect(second?.text).not.toBe(first?.text);
  });
});
