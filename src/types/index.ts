/**
 * Personal Dashboard — 领域模型与跨层契约（冻结 v1）
 *
 * 约定：本文件是跨模块的唯一事实来源（single source of truth）。
 * - 前端（pages / components / store）只依赖本文件与 `@/services` 的导出签名
 * - 服务层（src/services/**）负责实现，不得擅自改动此处签名
 * - 如需变更契约，必须先改本文件，再同步更新所有调用方
 *
 * 依据：docs/PRD-MVP.md 第 6 章「数据模型」、第 8 章附录 B/C
 */

/* ============================================================
 * 任务
 * ============================================================ */

/** 任务分类：MVP 固定 4 类（2026-10-07 决策） */
export type TaskCategory = 'work' | 'study' | 'life' | 'other';

export const TASK_CATEGORIES: readonly TaskCategory[] = ['work', 'study', 'life', 'other'] as const;

export const CATEGORY_LABEL: Record<TaskCategory, string> = {
  work: '工作',
  study: '学习',
  life: '生活',
  other: '其他',
};

/** 预计耗时档位（分钟） */
export const DURATION_OPTIONS: readonly number[] = [5, 15, 30, 60] as const;

export const DURATION_LABEL: Record<number, string> = {
  5: '5分钟',
  15: '15分钟',
  30: '30分钟',
  60: '1小时+',
};

/** 任务状态 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed';

/** 任务 */
export interface Task {
  /** 唯一 ID（UUID） */
  id: string;
  title: string;
  /** 备注 / 第一步拆解 */
  note: string;
  category: TaskCategory;
  /** 预计耗时（分钟） */
  estimatedDuration: number;
  /** 0 = 普通，1 = 手动置顶 */
  priority: number;
  status: TaskStatus;
  /** 创建时间戳（ms） */
  createdAt: number;
  /** 完成时间戳（ms） */
  completedAt: number | null;
  /** 截止日期时间戳（ms） */
  dueDate: number | null;
}

export interface CreateTaskInput {
  title: string;
  note?: string;
  category?: TaskCategory;
  estimatedDuration?: number;
  dueDate?: number | null;
}

export interface UpdateTaskPatch {
  id: string;
  title?: string;
  note?: string;
  category?: TaskCategory;
  estimatedDuration?: number;
  priority?: number;
  status?: TaskStatus;
  dueDate?: number | null;
}

/* ============================================================
 * 用户偏好
 * ============================================================ */

export type PushChannel = 'app' | 'system' | 'none';
export type PushFrequency = 'daily' | 'every_other_day' | 'weekly' | 'smart';
export type MotivationStyle = 'encouragement' | 'direct' | 'gamification';
export type ThemeMode = 'system' | 'light' | 'dark';

/** 用户状态（规则引擎判定，附录 B） */
export type UserStatus = 'fresh' | 'momentum' | 'stuck' | 'overwhelmed';

export interface UserPreference {
  /** 单用户，固定 ID */
  id: 'default';
  pushChannel: PushChannel;
  pushFrequency: PushFrequency;
  motivationStyle: MotivationStyle;
  /** 'HH:mm' */
  focusHoursStart: string;
  /** 'HH:mm' */
  focusHoursEnd: string;
  /** 'HH:mm' */
  focusHoursStart2: string;
  /** 'HH:mm' */
  focusHoursEnd2: string;
  userStatus: UserStatus;
  /** 连续完成天数 */
  consecutiveDays: number;
  /** 最后活跃日期 'YYYY-MM-DD' */
  lastActiveDate: string;
  /** 专注时长（分钟），默认 5 */
  focusDuration: number;
  theme: ThemeMode;
  reduceMotion: boolean;
  /** 是否已完成引导页 */
  onboarded: boolean;
}

/* ============================================================
 * 完成记录（统计用）
 * ============================================================ */

export interface CompletionRecord {
  id: string;
  taskId: string;
  taskTitle: string;
  category: TaskCategory;
  completedAt: number;
  /** 实际耗时（分钟），未知为 null */
  durationMinutes: number | null;
}

/* ============================================================
 * 统计
 * ============================================================ */

export interface DailyPoint {
  /** 'YYYY-MM-DD' */
  date: string;
  count: number;
}

export interface CategorySlice {
  category: TaskCategory;
  count: number;
  /** 0..100 */
  percent: number;
}

export interface StatsSummary {
  todayCount: number;
  weekCount: number;
  totalCount: number;
  consecutiveDays: number;
  /** 今日相对昨日的变化量 */
  todayDelta: number;
  /** 本周相对上周同期的变化量 */
  weekDelta: number;
  /** 近 7 天趋势（含今日，按日期升序） */
  dailyTrend: DailyPoint[];
  categoryBreakdown: CategorySlice[];
}

/* ============================================================
 * 助推与庆祝话术
 * ============================================================ */

export type NudgeKind = 'morning' | 'afternoon' | 'winback';

export interface NudgeMessage {
  kind: NudgeKind;
  text: string;
  taskId?: string;
}

export interface CelebrationContext {
  taskTitle: string;
  todayCount: number;
  weekCount: number;
  /** 剩余未完成数（注意：仅用于内部判断，不得展示给用户） */
  remainingCount: number;
  consecutiveDays: number;
  motivationStyle: MotivationStyle;
  yesterdayCount: number;
  /** 今日是否已全部完成 */
  allDone: boolean;
}

export interface CelebrationResult {
  text: string;
  /** 命中的连续成就里程碑，未命中为 null */
  streakMilestone: 3 | 7 | 14 | 30 | null;
}

/* ============================================================
 * 用户状态判定（附录 B）
 * ============================================================ */

export interface UserStatusInput {
  /** 未完成任务数 */
  pendingCount: number;
  /** 连续零完成天数 */
  zeroCompletionDays: number;
  /** 最近 7 天完成率 0..1 */
  weeklyCompletionRate: number;
  /** 连续完成天数 */
  consecutiveDays: number;
}

/* ============================================================
 * 仓储契约
 * ============================================================ */

export interface TaskRepository {
  list(): Promise<Task[]>;
  get(id: string): Promise<Task | null>;
  create(input: CreateTaskInput): Promise<Task>;
  update(patch: UpdateTaskPatch): Promise<Task>;
  setStatus(id: string, status: TaskStatus): Promise<Task>;
  remove(id: string): Promise<void>;
}

export interface PreferenceRepository {
  get(): Promise<UserPreference>;
  save(patch: Partial<Omit<UserPreference, 'id'>>): Promise<UserPreference>;
}

export interface CompletionRepository {
  list(since?: number): Promise<CompletionRecord[]>;
  add(record: Omit<CompletionRecord, 'id'>): Promise<CompletionRecord>;
  removeByTask(taskId: string): Promise<void>;
}

/* ============================================================
 * 数据导出 / 清空
 * ============================================================ */

export interface AppDataSnapshot {
  app: 'personal-dashboard';
  version: number;
  exportedAt: number;
  tasks: Task[];
  completions: CompletionRecord[];
  preference: UserPreference;
}
