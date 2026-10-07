/**
 * 彩蛋（UI-UX 第 4.5 节）：彩虹模式 / Konami 码 / 摇一摇
 * 负责人：engineering-frontend-developer
 * 原则：不影响核心功能；尊重「减少动效」（开启后禁用动画类彩蛋）。
 */
import { ref } from 'vue';
import { EASTER_EGG_COPY } from './copy';
import type { ResolvedTheme } from './theme';

/* ---------------- 彩虹模式：连续点击首页 Logo 5 次 ---------------- */
const rainbowActive = ref(false);
let rainbowTimer: ReturnType<typeof setTimeout> | null = null;

export function useRainbowMode() {
  return { rainbowActive };
}

/** 连续点击计数所需的次数 */
export const RAINBOW_TAP_COUNT = 5;

export function triggerRainbow(reduceMotion = false): void {
  if (reduceMotion) return;
  rainbowActive.value = true;
  if (rainbowTimer) clearTimeout(rainbowTimer);
  rainbowTimer = setTimeout(() => {
    rainbowActive.value = false;
    rainbowTimer = null;
  }, EASTER_EGG_COPY.rainbowDuration);
}

export function stopRainbow(): void {
  if (rainbowTimer) clearTimeout(rainbowTimer);
  rainbowTimer = null;
  rainbowActive.value = false;
}

/* ---------------- Konami 码：设置页输入 ↑↑↓↓←→←→BA ---------------- */
const KONAMI_SEQUENCE = [
  'arrowup',
  'arrowup',
  'arrowdown',
  'arrowdown',
  'arrowleft',
  'arrowright',
  'arrowleft',
  'arrowright',
  'b',
  'a',
] as const;

interface DocumentLike {
  addEventListener: (type: string, listener: (event: { key?: string }) => void) => void;
  removeEventListener?: (type: string, listener: (event: { key?: string }) => void) => void;
}

function getDocument(): DocumentLike | null {
  const host = globalThis as { document?: DocumentLike };
  return host.document ?? null;
}

/** 监听 Konami 码；返回取消监听的函数（仅在 H5 生效） */
export function watchKonami(onTrigger: () => void): () => void {
  const doc = getDocument();
  if (!doc?.addEventListener) return () => undefined;
  let cursor = 0;
  const handler = (event: { key?: string }): void => {
    const key = (event.key ?? '').toLowerCase();
    if (key === KONAMI_SEQUENCE[cursor]) {
      cursor += 1;
      if (cursor === KONAMI_SEQUENCE.length) {
        cursor = 0;
        onTrigger();
      }
      return;
    }
    cursor = key === KONAMI_SEQUENCE[0] ? 1 : 0;
  };
  doc.addEventListener('keydown', handler);
  return () => doc.removeEventListener?.('keydown', handler);
}

/* ---------------- 摇一摇：首页换一个任务 ---------------- */
export interface AccelerometerValue {
  x: number;
  y: number;
  z: number;
}

interface AccelerometerApi {
  onAccelerometerChange?: (callback: (value: AccelerometerValue) => void) => void;
  offAccelerometerChange?: (callback?: (value: AccelerometerValue) => void) => void;
  startAccelerometer?: (options?: { interval?: string; fail?: () => void }) => void;
  stopAccelerometer?: (options?: { fail?: () => void }) => void;
}

/** 监听摇一摇；返回停止监听的函数。H5 / 未授权时静默失效。 */
export function watchShake(onShake: () => void, threshold = 18): () => void {
  if (typeof uni === 'undefined') return () => undefined;
  const api = uni as unknown as AccelerometerApi;
  if (!api.onAccelerometerChange || !api.startAccelerometer) return () => undefined;

  let lastAt = 0;
  const handler = (value: AccelerometerValue): void => {
    const magnitude = Math.abs(value.x) + Math.abs(value.y) + Math.abs(value.z);
    const now = Date.now();
    if (magnitude > threshold && now - lastAt > 2000) {
      lastAt = now;
      onShake();
    }
  };

  try {
    api.onAccelerometerChange(handler);
    api.startAccelerometer({ interval: 'normal' });
  } catch {
    return () => undefined;
  }

  return () => {
    try {
      api.offAccelerometerChange?.(handler);
      api.stopAccelerometer?.();
    } catch {
      // 忽略
    }
  };
}

/** 主题解析结果类型再导出，方便页面使用 */
export type { ResolvedTheme };