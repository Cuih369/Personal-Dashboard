/**
 * 主题解析（UI-UX 第 7.4 节：跟随系统 / 浅色 / 深色）
 * 负责人：engineering-frontend-developer
 */
import type { ThemeMode } from '@/types';

export type ResolvedTheme = 'light' | 'dark';

interface UniThemeApi {
  getSystemInfoSync: () => Record<string, unknown>;
  onThemeChange?: (callback: (result: { theme: ResolvedTheme }) => void) => void;
  offThemeChange?: (callback: (result: { theme: ResolvedTheme }) => void) => void;
}

function api(): UniThemeApi | null {
  if (typeof uni === 'undefined') return null;
  return uni as unknown as UniThemeApi;
}

/** 读取系统主题；无法获取时按浅色处理 */
export function getSystemTheme(): ResolvedTheme {
  const instance = api();
  if (!instance?.getSystemInfoSync) return 'light';
  try {
    const info = instance.getSystemInfoSync();
    const theme = info.theme ?? info.darkTheme;
    if (theme === 'dark' || theme === true) return 'dark';
    return 'light';
  } catch {
    return 'light';
  }
}

/** 把三态主题解析成实际生效的两态主题 */
export function resolveTheme(theme: ThemeMode): ResolvedTheme {
  if (theme === 'dark') return 'dark';
  if (theme === 'light') return 'light';
  return getSystemTheme();
}

/** 订阅系统主题变化，返回取消订阅函数（失败时静默降级） */
export function onSystemThemeChange(handler: (theme: ResolvedTheme) => void): () => void {
  const instance = api();
  if (!instance?.onThemeChange) return () => undefined;
  try {
    instance.onThemeChange((result) => handler(result?.theme === 'dark' ? 'dark' : 'light'));
    return () => {
      try {
        instance.offThemeChange?.(() => undefined);
      } catch {
        // 忽略
      }
    };
  } catch {
    return () => undefined;
  }
}