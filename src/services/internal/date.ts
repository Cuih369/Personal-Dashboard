/**
 * 日期工具（纯函数）。
 *
 * 全部基于「本地自然日」计算，保证 H5 与 App 端行为一致；
 * 使用 Date 的日历方法（setDate/setHours）而不是毫秒加减，避免夏令时偏移。
 */

export const MS_PER_DAY = 86_400_000;

/** 零完成天数计算的硬上限，避免无记录时无限回溯。 */
export const MAX_ZERO_COMPLETION_DAYS = 999;

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/** 本地时间当日 00:00:00.000 的时间戳。 */
export function startOfDay(ts: number): number {
  const date = new Date(ts);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** 按自然日加减（跨月 / 跨年 / 夏令时安全）。 */
export function addDays(ts: number, days: number): number {
  const date = new Date(ts);
  date.setDate(date.getDate() + days);
  return date.getTime();
}

/** 本地自然日键：YYYY-MM-DD。 */
export function formatDateKey(ts: number): string {
  const date = new Date(ts);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** 解析 YYYY-MM-DD 为本地当日 00:00 时间戳；非法输入返回 null。 */
export function parseDateKey(key: string): number | null {
  if (typeof key !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key.trim());
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 0, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

/** 本周起点（周一 00:00）的时间戳。 */
export function startOfWeek(ts: number): number {
  const date = new Date(startOfDay(ts));
  const weekday = date.getDay(); // 0=周日 ... 6=周六
  const offsetFromMonday = (weekday + 6) % 7;
  return addDays(date.getTime(), -offsetFromMonday);
}

/** 解析 'HH:mm'；非法输入返回 null。 */
export function parseHHmm(value: string): { hours: number; minutes: number } | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
}

/** 指定自然日内的某个时刻（本地时间）。 */
export function atTimeOfDay(day: number, hours: number, minutes: number): number {
  const date = new Date(startOfDay(day));
  date.setHours(hours, minutes, 0, 0);
  return date.getTime();
}

/** 两个时间戳之间的自然日差（按本地自然日对齐后计算）。 */
export function calendarDaysBetween(fromTs: number, toTs: number): number {
  return Math.round((startOfDay(toTs) - startOfDay(fromTs)) / MS_PER_DAY);
}