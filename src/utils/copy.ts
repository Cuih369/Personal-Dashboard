/**
 * 全站微文案（逐字取自 docs/UI-UX-Design.md 第 4.2 / 4.4 / 4.5 节与第 5 章页面规范）
 * 负责人：engineering-frontend-developer
 *
 * 约定：
 * - 页面/组件不得内联文案，一律从此处引用，保证与设计稿逐字一致
 * - 助力话术（推送 / 庆祝）的“选择”由服务层规则引擎负责；
 *   此处的 CELEBRATION_* 仅作为服务层不可用时的**降级兜底**，避免白屏
 */
import type { CelebrationContext, CelebrationResult, MotivationStyle, TaskCategory } from '@/types';

/** 插值：把 {x} / {task_title} 等占位符替换为实际值 */
export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (matched, key: string) => {
    const value = vars[key];
    return value === undefined ? matched : String(value);
  });
}

export const BRAND = {
  name: 'Personal Dashboard',
  slogan: '不是帮你列更多，是陪你做完',
  version: 'v1.0.0',
} as const;

/* ============================================================
 * 引导页（第 4.2 节「引导页文案」+ 第 5.8 节）
 * ============================================================ */
export interface OnboardingScreen {
  icon: string;
  title: string;
  desc: string;
}

export const ONBOARDING_SCREENS: readonly OnboardingScreen[] = [
  {
    icon: '✅',
    title: '不是又一个待办清单',
    desc: 'Personal Dashboard 不帮你列更多任务，只陪你把事情一件一件做完',
  },
  {
    icon: '🎯',
    title: '一次只做一件事',
    desc: '打开App只看到1个最该做的任务，5分钟就能启动，不再被一堆待办压垮',
  },
  {
    icon: '🎉',
    title: '完成了，就庆祝',
    desc: '每完成1件都有正向反馈，量化你的成就，让你有动力继续。数据全本地，隐私无忧',
  },
] as const;

export const ONBOARDING_COPY = {
  skip: '跳过',
  next: '下一步',
  start: '开始使用',
  ariaLabel: '引导页',
} as const;

/* ============================================================
 * 首页（第 4.2 节「首页文案」+ 第 5.1 节）
 * ============================================================ */
export const HOME_COPY = {
  guide: '今天先做这1件就好',
  guideOverwhelmed: '任务有点多，我们一件一件来',
  overwhelmedDetail: '先花5分钟启动这1件，其他的稍后再说',
  start: '开始',
  startSprint: '开始5分钟冲刺',
  swap: '换一个',
  restToday: '今天休息',
  viewAll: '查看全部',
  addTask: '添加任务',
  emptyTitle: '今天没有待办，真不错！',
  emptyDesc: '添加第一个任务，或者好好享受这一天',
  emptyRest: '今天就休息',
  restTitle: '今天休息',
  restCopy: '好好休息！明天见，任务都帮你存着呢',
  restConfirm: '明天见',
  restToast: '好好休息！明天见，任务都帮你存着呢',
  swapToast: '换个心情，换个任务',
  noTaskToast: '暂时没有可展示的任务，先添加1件吧',
  logoAriaLabel: 'Personal Dashboard 标志',
  startAriaLabel: '开始专注',
  fabAriaLabel: '添加任务',
} as const;

/** 首页完成统计：'今日已完成 3 件' */
export function completedTodayLabel(count: number): string {
  return `今日已完成 ${count} 件`;
}

/** 连续天数徽标：'连续 3 天' */
export function streakBadgeLabel(days: number): string {
  return `连续 ${days} 天`;
}

/* ============================================================
 * 专注页（第 4.2 节「专注页文案」+ 第 5.4 节）
 * ============================================================ */
export const FOCUS_COPY = {
  label: '专注中',
  firstStepPrefix: '第一步：',
  defaultFirstStep: '先开始就好',
  timeUpText: '5分钟到了！已经有个好的开始，继续还是休息？',
  timeUpTitle: '时间到',
  timeUpContinue: '继续',
  timeUpRest: '休息一下',
  complete: '完成了',
  pause: '暂停',
  resume: '继续',
  giveUp: '先不做了',
  exit: '退出',
  exitConfirm: '确定要退出专注吗？任务进度会保存',
  emptyTask: '任务不见了，先回首页看看',
} as const;

/* ============================================================
 * 庆祝弹窗（第 4.2 节「庆祝弹窗文案」+ 第 5.5 节）
 * ============================================================ */
export interface CelebrationTemplate {
  id: string;
  /** 文案模板，占位符：{x} {y} {total} {task_title} {delta} {rate} */
  text: string;
  /** 显示该模板所必需的变量；缺失则跳过（如 {y} 涉及剩余数量，遵「无焦虑原则」不展示） */
  needs?: readonly string[];
}

/** 10 条通用庆祝文案（逐字） */
export const CELEBRATION_TEMPLATES: readonly CelebrationTemplate[] = [
  { id: 'tpl-01', text: '漂亮！这件事搞定了。今天已经完成{x}件，再来1个还是休息？', needs: ['x'] },
  { id: 'tpl-02', text: 'Nice work！又完成1件。今天完成{x}/{y}，节奏不错，继续吗？', needs: ['x', 'y'] },
  {
    id: 'tpl-03',
    text: '太棒了！{task_title}完成。今天已经做了{x}件事，给自己点个赞！',
    needs: ['x', 'task_title'],
  },
  { id: 'tpl-04', text: '完成！今天已经完成{x}件，剩余{y}件。先庆祝一下，再来1个？', needs: ['x', 'y'] },
  {
    id: 'tpl-05',
    text: '干得好！又划掉1件。已完成{x}件，你比昨天多完成了{delta}件！',
    needs: ['x', 'delta'],
  },
  {
    id: 'tpl-06',
    text: '厉害！这件事也搞定了。今天的完成率已经{rate}%，要不要冲刺一下？',
    needs: ['rate'],
  },
  { id: 'tpl-07', text: 'Wow！又完成1件。你今天已经完成{x}件了，状态很好啊！', needs: ['x'] },
  {
    id: 'tpl-08',
    text: '搞定！{task_title}已完成。今天累计完成{x}件，继续保持这个节奏？',
    needs: ['x', 'task_title'],
  },
  { id: 'tpl-09', text: '优秀！又1件完成。今天已经完成{x}件，离今日目标又近了一步！', needs: ['x'] },
  { id: 'tpl-10', text: '漂亮！这件事也做完了。已完成{x}件，要不要再挑战1个？', needs: ['x'] },
] as const;

/** 全部完成时的专属文案（逐字） */
export const CELEBRATION_ALL_DONE: readonly string[] = [
  '今日任务全部完成！太棒了！🎉',
  '今天完成了{total}件事，效率满分！好好休息吧',
  '全部搞定！今天的你超棒，明天见！',
] as const;

/** 连续成就特殊文案（逐字） */
export const CELEBRATION_STREAK: Record<3 | 7 | 14 | 30, string> = {
  3: '连续3天完成任务，节奏很棒！继续保持！',
  7: '一周全勤！太厉害了，你已经形成习惯了！',
  14: '两周连续完成！你已经是行动大师了！',
  30: '一个月全勤！你已经彻底告别拖延了！',
};

export const CELEBRATION_COPY = {
  iconDefault: '🎉',
  iconAllDone: '🏆',
  continueNext: '再来1个',
  stopToday: '今天到此为止',
  statsToday: '今日已完成',
  statsWeek: '本周累计',
  statsStreak: '连续天数',
  unitItem: '件',
  unitDay: '天',
  fire: '🔥',
  ariaLabel: '完成庆祝',
} as const;

/** 各激励风格的兜底话术（服务层 pickCelebration 不可用时使用） */
const FALLBACK_BY_STYLE: Record<MotivationStyle, readonly string[]> = {
  encouragement: ['tpl-01', 'tpl-03', 'tpl-07', 'tpl-09', 'tpl-10'],
  direct: ['tpl-05', 'tpl-08', 'tpl-01'],
  gamification: ['tpl-06', 'tpl-09', 'tpl-10', 'tpl-07'],
};

function pickRandom<T>(items: readonly T[], rng: () => number): T {
  const index = Math.min(items.length - 1, Math.max(0, Math.floor(rng() * items.length)));
  return items[index];
}

/**
 * 降级兜底：服务层 pickCelebration 不可用时，用本地模板池生成庆祝文案。
 * - allDone 优先用「全部完成」文案
 * - 命中 3/7/14/30 连续成就时用特殊文案
 * - 其余按激励风格选池，并避免与上一条重复
 */
export function pickFallbackCelebration(
  ctx: CelebrationContext,
  previousText?: string,
  rng: () => number = Math.random
): CelebrationResult {
  const milestone = [3, 7, 14, 30].includes(ctx.consecutiveDays)
    ? (ctx.consecutiveDays as 3 | 7 | 14 | 30)
    : null;

  if (milestone) {
    return { text: CELEBRATION_STREAK[milestone], streakMilestone: milestone };
  }

  if (ctx.allDone) {
    return {
      text: interpolate(pickRandom(CELEBRATION_ALL_DONE, rng), { total: ctx.todayCount }),
      streakMilestone: null,
    };
  }

  const vars = buildCelebrationVars(ctx);
  const preferred = FALLBACK_BY_STYLE[ctx.motivationStyle] ?? FALLBACK_BY_STYLE.encouragement;
  const candidates = CELEBRATION_TEMPLATES.filter(
    (template) =>
      (template.needs ?? []).every((key) => vars[key] !== undefined) &&
      interpolate(template.text, vars) !== previousText
  );
  const ordered = [
    ...candidates.filter((template) => preferred.includes(template.id)),
    ...candidates.filter((template) => !preferred.includes(template.id)),
  ];

  if (ordered.length === 0) {
    return { text: interpolate(CELEBRATION_ALL_DONE[0], vars), streakMilestone: null };
  }

  return { text: interpolate(pickRandom(ordered, rng).text, vars), streakMilestone: null };
}

function buildCelebrationVars(ctx: CelebrationContext): Record<string, string | number> {
  const total = ctx.todayCount + ctx.remainingCount;
  const rate = total > 0 ? Math.round((ctx.todayCount / total) * 100) : 100;
  return {
    x: ctx.todayCount,
    total: ctx.todayCount,
    task_title: ctx.taskTitle,
    delta: Math.max(0, ctx.todayCount - ctx.yesterdayCount),
    rate,
  };
}

/* ============================================================
 * 任务列表页（第 4.2 节空状态文案 + 第 5.2 节）
 * ============================================================ */
export const TASK_LIST_COPY = {
  title: '全部任务',
  tabAll: '全部',
  tabActive: '进行中',
  tabDone: '已完成',
  filter: '筛选',
  search: '搜索',
  searchPlaceholder: '搜索任务标题',
  searchEmpty: '没有找到匹配的任务，但你的搜索技能很厉害！',
  emptyAll: '还没有任务，添加第一个吧！',
  emptyDone: '还没有完成的任务，开始做第1件吧！',
  emptyActive: '还没有进行中的任务，先添加1件吧！',
  actionComplete: '完成',
  actionEdit: '编辑',
  actionDelete: '删除',
  actionPin: '置顶',
  actionUnpin: '取消置顶',
  actionMenuTitle: '任务操作',
  deleteConfirmTitle: '删除任务',
  deleteConfirm: '确定要删除这个任务吗？删除后5秒内可撤销',
  deletedToast: '已删除，5秒内可撤销',
  undo: '撤销',
  undoneToast: '已恢复',
  completedAtPrefix: '完成于',
  pinnedTag: '已置顶',
  ariaLabel: '任务列表',
} as const;

/* ============================================================
 * 创建 / 编辑任务页（第 5.3 节）
 * ============================================================ */
export const TASK_EDIT_COPY = {
  titleNew: '新建任务',
  titleEdit: '编辑任务',
  save: '保存',
  labelTitle: '任务标题',
  titlePlaceholder: '想做点什么？',
  titleEmptyError: '请输入任务标题',
  labelNote: '备注 / 第一步',
  notePlaceholder: '先做什么？',
  noteHint: '填写第一步可以帮你更快开始',
  labelDuration: '预计耗时',
  labelCategory: '分类',
  savedToast: '已保存',
} as const;

/* ============================================================
 * 统计页（第 5.6 节）
 * ============================================================ */
export const STATS_COPY = {
  title: '我的统计',
  cardToday: '今日完成',
  cardWeek: '本周完成',
  cardStreak: '连续天数',
  cardTotal: '总计完成',
  streakHint: '继续加油',
  sectionTrend: '近7天完成趋势',
  sectionCategory: '分类占比',
  donutTotal: '总计',
  donutUnit: '件',
  emptyTitle: '还没有数据，完成第1个任务后这里会有你的成就统计',
  ariaBarChart: '近7天完成趋势柱状图',
  ariaDonutChart: '任务分类占比环形图',
} as const;

export function trendTodayLabel(delta: number): string {
  if (delta === 0) return '与昨天持平';
  return delta > 0 ? `↑ ${delta} vs 昨天` : `↓ ${Math.abs(delta)} vs 昨天`;
}

export function trendWeekLabel(delta: number): string {
  if (delta === 0) return '与上周持平';
  return delta > 0 ? `↑ ${delta} vs 上周` : `↓ ${Math.abs(delta)} vs 上周`;
}

export function hundredGoalLabel(percent: number): string {
  return `百件达成 ${Math.round(percent)}%`;
}

/* ============================================================
 * 设置 / 我的页（第 4.2 节错误文案 + 第 5.7 节）
 * ============================================================ */
export const SETTINGS_COPY = {
  title: '我的',
  userName: BRAND.name,
  userDesc: '本地模式 · 隐私无忧',
  groupPreference: '偏好设置',
  groupAppearance: '外观',
  groupData: '数据管理',
  groupAbout: '关于',
  itemPushChannel: '推送渠道',
  itemPushFrequency: '推送频率',
  itemMotivation: '激励方式',
  itemFocusHours: '高效时段',
  itemFocusDuration: '专注时长',
  itemTheme: '主题',
  itemReduceMotion: '减少动效',
  itemExport: '导出数据 (JSON)',
  itemClear: '清空数据',
  itemVersion: '版本',
  itemPrivacy: '隐私政策',
  itemRate: '给我们评分',
  pushChannelLabels: {
    app: '应用内通知',
    system: '系统通知',
    none: '不推送',
  },
  pushFrequencyLabels: {
    daily: '每天',
    every_other_day: '每两天',
    weekly: '每周',
    smart: '智能调整',
  },
  motivationLabels: {
    encouragement: '鼓励型',
    direct: '直接型',
    gamification: '游戏化',
  },
  themeLabels: {
    system: '跟随系统',
    light: '浅色',
    dark: '深色',
  },
  clearConfirmTitle: '清空数据',
  clearConfirm: '确定要清空所有数据吗？此操作不可撤销，建议先导出备份',
  clearDone: '已清空所有数据',
  exportProgress: '正在导出…',
  exportDone: '已导出备份文件',
  exportClipboard: '数据已复制到剪贴板',
  exportedToast: '导出成功',
  exportFailed: '导出失败，请稍后重试',
  comingSoon: '该功能即将上线',
  pushUnavailable: '推送服务暂时不可用，不影响本地使用',
  pickerCancel: '取消',
} as const;

/* ============================================================
 * 通用 / 空状态 / 加载（第 4.2 节末尾 + 第 6.4 节）
 * ============================================================ */
export const COMMON_COPY = {
  loading: '正在准备你的任务...',
  loadingList: '正在加载…',
  back: '返回',
  cancel: '取消',
  confirm: '确定',
  close: '关闭',
  retry: '重试',
  save: '保存',
  ariaCloseModal: '关闭弹窗',
} as const;

/* ============================================================
 * 首次偏好设置（PRD Story 5；UI-UX 第 5.7 节选项标签）
 * ============================================================ */
export const PREFERENCE_SETUP_COPY = {
  title: '先花10秒，调成你喜欢的样子',
  subtitle: '都可以稍后在「我的」里修改，也可以直接跳过',
  labelPushChannel: '推送渠道',
  labelPushFrequency: '推送频率',
  labelMotivation: '激励方式',
  labelFocusHours: '高效时段',
  labelFocusDuration: '专注时长',
  hintFocusHours: '默认 8:00-12:00 与 14:00-18:00',
  skip: '跳过',
  done: '完成',
  savedToast: '已保存你的偏好',
} as const;

/* ============================================================
 * 彩蛋（第 4.5 节）
 * ============================================================ */
export const EASTER_EGG_COPY = {
  rainbow: '🌈 你发现了彩虹模式！',
  konami: '🕵️ 你发现了隐藏主题！',
  shake: '换个心情，换个任务',
  konamiTheme: '暗夜紫',
  rainbowDuration: 10000,
} as const;

/* ============================================================
 * 成就徽章（第 4.4 节）
 * ============================================================ */
export interface AchievementDef {
  id: string;
  icon: string;
  name: string;
  desc: string;
}

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { id: 'first-step', icon: '🌱', name: '初出茅庐', desc: '完成第1个任务' },
  { id: 'streak-3', icon: '🔥', name: '小有节奏', desc: '连续3天完成任务' },
  { id: 'streak-7', icon: '⭐', name: '一周达人', desc: '连续7天完成任务' },
  { id: 'streak-14', icon: '🏆', name: '半月传说', desc: '连续14天完成任务' },
  { id: 'streak-30', icon: '👑', name: '月度大师', desc: '连续30天完成任务' },
  { id: 'total-100', icon: '💯', name: '百件达成', desc: '累计完成100个任务' },
  { id: 'day-5', icon: '⚡', name: '效率达人', desc: '单日完成5个任务' },
  { id: 'all-categories', icon: '🎨', name: '分类大师', desc: '使用过全部4个分类' },
  { id: 'early-bird', icon: '🐦', name: '早起鸟儿', desc: '在早上6-8点完成任务' },
  { id: 'night-owl', icon: '🦉', name: '夜猫子', desc: '在晚上22-24点完成任务' },
] as const;

export const ACHIEVEMENT_COPY = {
  unlocked: '成就解锁',
  ariaLabel: '成就解锁提示',
} as const;

export const CATEGORY_LABEL_FALLBACK: Record<TaskCategory, string> = {
  work: '工作',
  study: '学习',
  life: '生活',
  other: '其他',
};