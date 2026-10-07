/**
 * 展示层格式化工具 —— 纯函数，无副作用、无 IO
 * 负责人：engineering-frontend-developer
 */
import { DURATION_LABEL } from '@/types';

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const;

export function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/** 秒 -> 'MM:SS'（专注页计时器，等宽字体展示） */
export function formatTimer(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${pad2(minutes)}:${pad2(seconds)}`;
}

/** 时间戳 -> 'YYYY-MM-DD'（本地自然日） */
export function dateKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** 'YYYY-MM-DD' -> 本地当日 0 点时间戳 */
export function parseDateKey(key: string): number {
  const parts = key.split('-').map(Number);
  const year = parts[0] ?? 1970;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  return new Date(year, month - 1, day).getTime();
}

/** 时间戳 -> '周一' */
export function weekdayLabel(ts: number): string {
  return WEEKDAYS[new Date(ts).getDay()];
}

/** 时间戳 -> 'HH:mm' */
export function formatClock(ts: number): string {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** 时间戳 -> '今天 14:30' / '昨天 14:30' / '08-31 14:30' */
export function formatDayLabel(ts: number, now: number = Date.now()): string {
  const target = dateKey(ts);
  const today = dateKey(now);
  const yesterday = dateKey(now - 24 * 60 * 60 * 1000);
  const clock = formatClock(ts);
  if (target === today) return `今天 ${clock}`;
  if (target === yesterday) return `昨天 ${clock}`;
  const d = new Date(ts);
  return `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${clock}`;
}

/** 预计耗时：引用 @/types 的 DURATION_LABEL，避免文案分叉 */
export function minutesLabel(minutes: number): string {
  return DURATION_LABEL[minutes] ?? `${minutes}分钟`;
}

/** 0..100 -> '47%' */
export function percentLabel(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}%`;
}

/** '08:00' + '18:00' -> '8:00 - 18:00' */
export function hourRangeLabel(start: string, end: string): string {
  return `${start} - ${end}`;
}

/** 'HH:mm' -> 当天的分钟偏移，解析失败返回 null */
export function parseHourMinute(value: string): number | null {
  const matched = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!matched) return null;
  const hours = Number(matched[1]);
  const minutes = Number(matched[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** 数字千分位（统计页总计） */
export function formatCount(value: number): string {
  return String(Math.max(0, Math.round(value)));
}

/** 连续天数 -> '连续 3 天' */
export function streakLabel(days: number): string {
  return `连续 ${days} 天`;
}