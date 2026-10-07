/**
 * 推送服务 —— 公开契约
 *
 * 负责人：engineering-backend-architect（业务抽象）+ engineering-mobile-app-builder（UniPush 原生配置）
 * 决策（2026-10-07）：MVP 接入系统级推送（UniPush / 个推）
 *
 * 约束：
 * - H5 端不支持系统推送，isSupported() 返回 false，此时必须静默降级为应用内提醒，不得抛错
 * - stuck 状态降频：最多每两天 1 次；winback 最多每周 1 次
 * - pushChannel === 'none' 时调用 cancelAll()
 */
import type { Task, UserPreference } from '@/types';
import { log } from './internal/log';
import { buildPushPlan, type PlannedPush } from './internal/push-plan';

export interface PushService {
  /** 当前端是否支持系统推送 */
  isSupported(): boolean;
  /** 申请通知权限，返回是否已授权 */
  ensurePermission(): Promise<boolean>;
  /** 依据偏好与任务列表重排推送计划 */
  schedule(pref: UserPreference, tasks: Task[]): Promise<void>;
  /** 取消所有已排期的推送 */
  cancelAll(): Promise<void>;
}

interface PlusPushApi {
  createMessage?(content: string, payload?: string, options?: Record<string, unknown>): void;
  clear?(): void;
}

interface PlusNavigatorApi {
  checkPermission?(permission: string): string;
}

interface PlusGlobal {
  push?: PlusPushApi;
  navigator?: PlusNavigatorApi;
}

function plusGlobal(): PlusGlobal | null {
  try {
    const g = globalThis as unknown as { plus?: PlusGlobal };
    return g.plus ?? null;
  } catch {
    return null;
  }
}

function plusPush(): PlusPushApi | null {
  return plusGlobal()?.push ?? null;
}

/**
 * 是否支持系统推送：仅 App（APP-PLUS）且存在 plus.push 时为真。
 * H5 端恒为 false —— 调用方据此静默降级为应用内提醒。
 */
function isPushSupported(): boolean {
  let supported = false;
  // #ifdef APP-PLUS
  supported = plusPush() !== null;
  // #endif
  return supported;
}

async function ensurePermissionImpl(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const push = plusPush();
    if (!push) return false;
    const permission = plusGlobal()?.navigator?.checkPermission?.('NOTIFICATION');
    // 'denied' 明确拒绝；'authorized' / 'unknown' 都允许后续推送时由原生层申请
    return permission !== 'denied';
  } catch (error) {
    log.warn('[push] ensurePermission failed; treating as denied', error);
    return false;
  }
}

function deliver(item: PlannedPush): void {
  const push = plusPush();
  if (!push || typeof push.createMessage !== 'function') return;
  try {
    push.createMessage(
      item.text,
      JSON.stringify({ kind: item.kind, taskId: item.taskId ?? null, at: item.at }),
      { title: 'Personal Dashboard', when: new Date(item.at), cover: false }
    );
  } catch (error) {
    log.warn('[push] createMessage failed (ignored)', error);
  }
}

async function cancelAllImpl(): Promise<void> {
  try {
    if (!isPushSupported()) return;
    const push = plusPush();
    if (push && typeof push.clear === 'function') {
      push.clear();
    }
  } catch (error) {
    log.warn('[push] cancelAll failed (ignored)', error);
  }
}

async function scheduleImpl(pref: UserPreference, tasks: Task[]): Promise<void> {
  try {
    if (pref.pushChannel === 'none') {
      await cancelAllImpl();
      return;
    }
    if (!isPushSupported()) {
      // H5：静默降级，不抛错、不排期
      return;
    }
    await cancelAllImpl();
    const plan = buildPushPlan(pref, tasks, Date.now());
    for (const item of plan) {
      deliver(item);
    }
  } catch (error) {
    // 推送失败绝不能影响主流程
    log.warn('[push] schedule failed (ignored)', error);
  }
}

export const pushService: PushService = {
  isSupported: isPushSupported,
  ensurePermission: ensurePermissionImpl,
  schedule: scheduleImpl,
  cancelAll: cancelAllImpl,
};