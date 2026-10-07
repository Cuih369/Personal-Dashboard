/**
 * 轻量交互反馈（Toast / 模态确认）
 * 依据：UI-UX 第 6.4 节加载状态、第 6.1 节 Toast 时长
 * 负责人：engineering-frontend-developer
 */
import { MOTION_DURATION } from './motion';

export type ToastIcon = 'none' | 'success' | 'error' | 'loading';

interface ToastOptions {
  icon?: ToastIcon;
  duration?: number;
  mask?: boolean;
}

interface UniFeedbackApi {
  showToast: (options: { title: string; icon?: ToastIcon; duration?: number; mask?: boolean }) => void;
  hideToast: () => void;
  showModal: (options: {
    title?: string;
    content?: string;
    showCancel?: boolean;
    cancelText?: string;
    confirmText?: string;
    confirmColor?: string;
    success?: (result: { confirm: boolean; cancel: boolean }) => void;
    fail?: () => void;
  }) => void;
}

function api(): UniFeedbackApi | null {
  if (typeof uni === 'undefined') return null;
  return uni as unknown as UniFeedbackApi;
}

/** 交互反馈时长遵循第 6.1 节：入场 200ms + 停留 2000ms + 出场 200ms */
export function toast(title: string, options: ToastOptions = {}): void {
  const instance = api();
  if (!instance) return;
  try {
    instance.showToast({
      title,
      icon: options.icon ?? 'none',
      duration: options.duration ?? MOTION_DURATION.toastHold,
      mask: options.mask ?? false,
    });
  } catch {
    // 忽略：反馈失败不得影响主流程
  }
}

export function toastSuccess(title: string): void {
  toast(title, { icon: 'success' });
}

export function toastError(title: string): void {
  toast(title, { icon: 'error' });
}

export function hideToast(): void {
  const instance = api();
  try {
    instance?.hideToast();
  } catch {
    // 忽略
  }
}

/**
 * 二次确认。用于删除任务 / 清空数据等破坏性操作（第 4.1 节「错误时刻」）。
 * 返回 Promise<boolean>，取消或失败一律返回 false。
 */
export function confirmDialog(options: {
  title: string;
  content: string;
  confirmText?: string;
  cancelText?: string;
}): Promise<boolean> {
  const instance = api();
  if (!instance) return Promise.resolve(false);
  return new Promise<boolean>((resolve) => {
    try {
      instance.showModal({
        title: options.title,
        content: options.content,
        showCancel: true,
        confirmText: options.confirmText,
        cancelText: options.cancelText,
        success: (result) => resolve(Boolean(result?.confirm)),
        fail: () => resolve(false),
      });
    } catch {
      resolve(false);
    }
  });
}