import { describe, expect, it } from 'vitest';
import { summarizeStats } from '../stats';
import { NOW, makeRecord, makeTask, ts } from './fixtures';

describe('summarizeStats', () => {
  it('空数据：全为 0，趋势 7 天补零，分类为空', () => {
    const stats = summarizeStats([], [], NOW);
    expect(stats.todayCount).toBe(0);
    expect(stats.weekCount).toBe(0);
    expect(stats.totalCount).toBe(0);
    expect(stats.consecutiveDays).toBe(0);
    expect(stats.todayDelta).toBe(0);
    expect(stats.weekDelta).toBe(0);
    expect(stats.dailyTrend).toHaveLength(7);
    expect(stats.dailyTrend.every((point) => point.count === 0)).toBe(true);
    expect(stats.categoryBreakdown).toEqual([]);
  });

  it('7 天趋势按日期升序且含今日、缺失补 0', () => {
    const records = [makeRecord({ id: 'a', completedAt: ts(0) }), makeRecord({ id: 'b', completedAt: ts(-2) })];
    const stats = summarizeStats([], records, NOW);
    const dates = stats.dailyTrend.map((point) => point.date);
    const sorted = [...dates].sort();
    expect(dates).toEqual(sorted);
    expect(stats.dailyTrend[6]?.date).toBe('2026-01-14');
    expect(stats.dailyTrend[6]?.count).toBe(1);
    expect(stats.dailyTrend[4]?.count).toBe(1);
    expect(stats.dailyTrend[5]?.count).toBe(0);
  });

  it('今日/昨日/本周（周一起点）/上周同期 与分类占比', () => {
    const records = [
      makeRecord({ id: 'r1', category: 'work', completedAt: ts(0, 9) }), // 今日
      makeRecord({ id: 'r2', category: 'study', completedAt: ts(0, 11) }), // 今日
      makeRecord({ id: 'r3', category: 'work', completedAt: ts(-1, 9) }), // 昨日（周二）
      makeRecord({ id: 'r4', category: 'life', completedAt: ts(-2, 0, 30) }), // 周一 00:30
      makeRecord({ id: 'r5', category: 'other', completedAt: ts(-5, 9) }), // 上周五（同期窗口外）
      makeRecord({ id: 'r6', category: 'life', completedAt: ts(-8, 9) }), // 上周二（同期窗口内）
    ];
    const stats = summarizeStats([], records, NOW);

    expect(stats.todayCount).toBe(2);
    expect(stats.todayDelta).toBe(1); // 2 - 昨日 1
    expect(stats.weekCount).toBe(4); // 今日2 + 昨日1 + 周一1
    expect(stats.weekDelta).toBe(3); // 4 - 上周同期 1
    expect(stats.totalCount).toBe(6);
    expect(stats.consecutiveDays).toBe(3); // 今日 / 昨日 / 周一

    expect(stats.categoryBreakdown.map((slice) => slice.category)).toEqual(['work', 'life', 'study', 'other']);
    expect(stats.categoryBreakdown.map((slice) => slice.count)).toEqual([2, 2, 1, 1]);
    expect(stats.categoryBreakdown[0]?.percent).toBeCloseTo(33.3, 1);
    expect(stats.categoryBreakdown[2]?.percent).toBeCloseTo(16.7, 1);
  });

  it('今日未完成时连续天数为 0', () => {
    const records = [makeRecord({ id: 'a', completedAt: ts(-1) }), makeRecord({ id: 'b', completedAt: ts(-2) })];
    expect(summarizeStats([], records, NOW).consecutiveDays).toBe(0);
  });

  it('周一边界：周一 00:30 的完成计入本周', () => {
    const records = [makeRecord({ id: 'mon', completedAt: ts(-2, 0, 30) })];
    expect(summarizeStats([], records, NOW).weekCount).toBe(1);
  });

  it('不依赖 tasks 参数即可汇总（保留契约形参）', () => {
    const stats = summarizeStats([makeTask({ id: 'x' })], [], NOW);
    expect(stats.todayCount).toBe(0);
  });
});