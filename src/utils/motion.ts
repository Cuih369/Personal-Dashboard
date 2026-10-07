/**
 * 动效参数（UI-UX 第 6.1 节「动画时长曲线」，权威表）
 * 与 src/styles/mixins.scss 中的 $motion-* 保持一致，供 JS 侧动画 / 定时器使用。
 * 负责人：engineering-frontend-developer
 */

export const MOTION_DURATION = {
  /** 按钮按压反馈 */
  press: 100,
  /** 页面转场（push） */
  page: 250,
  /** 模态入场（弹跳） */
  modalEnter: 300,
  /** 模态出场 */
  modalExit: 200,
  /** 列表项滑出 */
  listSwipe: 300,
  /** 数字滚动 */
  numberRoll: 800,
  /** 柱状图生长 */
  barGrow: 600,
  /** 柱状图逐根间隔 */
  barStagger: 50,
  /** 庆祝图标弹跳 */
  iconBounce: 400,
  /** Tab 切换 */
  tabSwitch: 200,
  /** Toast 入场 / 停留 / 出场 */
  toastEnter: 200,
  toastHold: 2000,
  toastExit: 200,
  /** 减少动效时保留的淡入淡出 */
  reducedFade: 100,
  /** 主题切换（第 7.4 节） */
  themeSwitch: 300,
  /** 成就卡片滑入 / 停留（第 4.4 节） */
  achievementEnter: 300,
  achievementHold: 3000,
  /** 庆祝文案打字机逐字（第 4.5 节） */
  typewriter: 30,
  /** 删除后撤销窗口（第 1.3 节 容错原则） */
  undoWindow: 5000,
} as const;

export const MOTION_EASING = {
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  easeOut: 'ease-out',
  easeIn: 'ease-in',
  easeInOut: 'ease-in-out',
  ease: 'ease',
} as const;

/**
 * 第 6.5 节：减少动效时禁用弹跳 / 缩放 / 位移，仅保留 100ms 淡入淡出。
 * 返回 0 表示调用方应直接跳到终态（不做补间）。
 */
export function motionMs(duration: number, reduceMotion: boolean): number {
  return reduceMotion ? 0 : duration;
}

/** 减少动效时不应播放的生长 / 滚动 / 弹跳动画 */
export function shouldAnimate(reduceMotion: boolean): boolean {
  return !reduceMotion;
}