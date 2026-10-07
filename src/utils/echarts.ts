/**
 * echarts 适配器 —— 统计页图表（PRD 已确认决策：图表库选 echarts-for-uniapp，按需引入）
 * 负责人：engineering-frontend-developer
 *
 * 设计取舍：
 * 1) **按需 / 懒加载**：只在统计页真正需要时动态 import，绝不进入首屏包
 *    （PRD「已确认决策」要求控制包体积：APK ≤15MB）。
 * 2) **可降级**：规格串用变量传入，Vite 不做静态分析，因此
 *    依赖缺失时不会导致构建失败，运行时返回 null，
 *    由 StatsChart 回退到与高保真原型一致的纯视图图表（第 5.6 节）。
 */

import { TOKEN_HEX } from './tokens';

export interface EchartsInstanceLike {
  setOption: (option: unknown, notMerge?: boolean) => void;
  resize: (options?: unknown) => void;
  dispose: () => void;
}

export interface EchartsLike {
  init: (host: unknown, theme?: unknown, options?: unknown) => EchartsInstanceLike;
}

/** 候选模块名（按优先级）；echarts-for-uniapp 优先，其次原生 echarts */
const ECHARTS_SPECS = ['echarts-for-uniapp', 'echarts'] as const;

let cached: Promise<EchartsLike | null> | null = null;

function isEchartsLike(value: unknown): value is EchartsLike {
  return typeof (value as EchartsLike | null)?.init === 'function';
}

async function probe(): Promise<EchartsLike | null> {
  for (const spec of ECHARTS_SPECS) {
    try {
      const mod: unknown = await import(/* @vite-ignore */ spec);
      const candidate = (mod as { default?: unknown } | null)?.default ?? mod;
      if (isEchartsLike(candidate)) return candidate;
    } catch {
      // 该模块不可用，尝试下一个
    }
  }
  return null;
}

/** 懒加载 echarts；不可用时返回 null（调用方必须处理 null） */
export function loadEcharts(): Promise<EchartsLike | null> {
  if (!cached) cached = probe();
  return cached;
}

/** 当前环境是否存在 DOM（echarts 只在 H5 走 canvas 渲染） */
export function hasWebDocument(): boolean {
  return typeof (globalThis as { document?: unknown }).document !== 'undefined';
}

/** 仅在 H5（存在 DOM）时返回可用于 echarts.init 的宿主节点 */
export function getWebChartHost(id: string): unknown | null {
  const host = (globalThis as { document?: { getElementById?: (id: string) => unknown } }).document;
  if (!host?.getElementById) return null;
  return host.getElementById(id) ?? null;
}

/**
 * 统计页图表配色 —— 派生自设计 token（src/utils/tokens.ts），
 * echarts 画布无法使用 CSS 变量，故以字面值传入。
 */
export const CHART_COLORS = {
  primary: TOKEN_HEX.primary,
  primaryLight: TOKEN_HEX.primaryLight,
  primaryDark: TOKEN_HEX.primaryDark,
  textSecondary: TOKEN_HEX.textSecondary,
  textTertiary: TOKEN_HEX.textTertiary,
  divider: TOKEN_HEX.divider,
  work: TOKEN_HEX.categoryWork,
  study: TOKEN_HEX.categoryStudy,
  life: TOKEN_HEX.categoryLife,
  other: TOKEN_HEX.categoryOther,
} as const;

/** 分类 -> CSS 变量（原生圆锥渐变环形图使用，保证与主题联动） */
export const CATEGORY_CSS_VAR = {
  work: 'var(--pd-cat-work)',
  study: 'var(--pd-cat-study)',
  life: 'var(--pd-cat-life)',
  other: 'var(--pd-cat-other)',
} as const;