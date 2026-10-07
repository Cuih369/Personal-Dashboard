/**
 * 轻量日志工具（跨端安全）。
 *
 * 服务层要求「初始化失败必须降级而非白屏」，因此日志本身也不允许抛错：
 * 任何 console 缺失 / 异常都会被吞掉。
 */

type LogFn = (...args: unknown[]) => void;

function safeLog(method: 'log' | 'warn' | 'error'): LogFn {
  return (...args: unknown[]): void => {
    try {
      const g = globalThis as unknown as { console?: Record<string, unknown> };
      const fn = g.console?.[method];
      if (typeof fn === 'function') {
        (fn as LogFn).apply(g.console, args);
      }
    } catch {
      /* 忽略日志失败 */
    }
  };
}

export const log = {
  info: safeLog('log'),
  warn: safeLog('warn'),
  error: safeLog('error'),
};