/**
 * 规则引擎（MVP 代替本地 LLM）—— 公开契约
 *
 * 负责人：engineering-backend-architect
 * 依据：docs/PRD-MVP.md 附录 B（用户状态）/ 附录 C（优先级排序）/ 附录 A（话术）
 *
 * 全部为纯函数：禁止副作用、禁止 IO，便于单测与跨端复用。
 */
import type {
  CelebrationContext,
  CelebrationResult,
  CompletionRecord,
  MotivationStyle,
  NudgeKind,
  NudgeMessage,
  Task,
  UserStatus,
  UserStatusInput,
} from '@/types';
import {
  MAX_ZERO_COMPLETION_DAYS,
  addDays,
  formatDateKey,
  startOfDay,
} from './internal/date';

const ONE_DAY_MS = 86_400_000;
const SHORT_TASK_MINUTES = 15;
const MOMENTUM_RATE_THRESHOLD = 0.6;
const MOMENTUM_STREAK_THRESHOLD = 3;
const STUCK_ZERO_DAYS_THRESHOLD = 3;
const OVERWHELMED_PENDING_THRESHOLD = 10;

/** 备注解析为空时的兜底「第一步」。 */
const FALLBACK_FIRST_STEP = '先开始就好';

/**
 * 附录 B：用户状态判定，判定顺序必须为 overwhelmed -> stuck -> momentum -> fresh
 * - overwhelmed: pendingCount > 10
 * - stuck: zeroCompletionDays >= 3
 * - momentum: weeklyCompletionRate >= 0.6 且 consecutiveDays >= 3
 * - fresh: 其他
 */
export function computeUserStatus(input: UserStatusInput): UserStatus {
  if (input.pendingCount > OVERWHELMED_PENDING_THRESHOLD) return 'overwhelmed';
  if (input.zeroCompletionDays >= STUCK_ZERO_DAYS_THRESHOLD) return 'stuck';
  if (
    input.weeklyCompletionRate >= MOMENTUM_RATE_THRESHOLD &&
    input.consecutiveDays >= MOMENTUM_STREAK_THRESHOLD
  ) {
    return 'momentum';
  }
  return 'fresh';
}

/** 连续零完成天数（以本地自然日计算，从今日向前回溯）。
 *
 * - 无任何完成记录：返回 0 —— 「零完成」只有相对「上一次完成」才有意义，
 *   新用户没有历史，不应被判定为零完成连续（否则会被误判为 stuck）
 * - 有历史记录但最近很久没完成：正常回溯累计，上限 MAX_ZERO_COMPLETION_DAYS
 */
export function zeroCompletionDays(records: CompletionRecord[], now: number): number {
  if (records.length === 0) return 0;

  const completedDays = new Set<string>();
  for (const record of records) {
    completedDays.add(formatDateKey(record.completedAt));
  }

  let days = 0;
  let cursor = startOfDay(now);
  while (days < MAX_ZERO_COMPLETION_DAYS && !completedDays.has(formatDateKey(cursor))) {
    days += 1;
    cursor = addDays(cursor, -1);
  }
  return days;
}

/** 最近 7 天完成率 = 近 7 天完成数 / 近 7 天创建数；无创建时返回 1 */
export function weeklyCompletionRate(
  tasks: Task[],
  records: CompletionRecord[],
  now: number
): number {
  const windowStart = addDays(startOfDay(now), -6);

  let created = 0;
  for (const task of tasks) {
    if (task.createdAt >= windowStart && task.createdAt <= now) created += 1;
  }

  let completed = 0;
  for (const record of records) {
    if (record.completedAt >= windowStart && record.completedAt <= now) completed += 1;
  }

  if (created === 0) return 1;
  const rate = completed / created;
  if (rate < 0) return 0;
  if (rate > 1) return 1;
  return rate;
}

function focusTier(task: Task, now: number): number {
  if (task.priority === 1) return 0;
  if (task.dueDate !== null && task.dueDate <= now + ONE_DAY_MS) return 1;
  if (task.estimatedDuration <= SHORT_TASK_MINUTES) return 2;
  return 3;
}

/**
 * 附录 C：聚焦排序（首页「换一个」的遍历顺序），档位从高到低：
 * 1. priority === 1（手动置顶）
 * 2. dueDate <= now + 1 天（即将到期）
 * 3. estimatedDuration <= 15 分钟（降低启动门槛）
 * 4. 兜底：其余任务
 * 同一档位内按 createdAt 升序（FIFO）
 */
export function sortTasksForFocus(tasks: Task[], now: number): Task[] {
  return tasks
    .map((task) => ({ task, tier: focusTier(task, now) }))
    .sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      if (a.task.createdAt !== b.task.createdAt) return a.task.createdAt - b.task.createdAt;
      return a.task.id < b.task.id ? -1 : a.task.id > b.task.id ? 1 : 0;
    })
    .map((entry) => entry.task);
}

/**
 * 取当前应展示的任务。
 * currentId 命中时返回其下一个；否则返回队列首个；队列为空返回 null。
 */
export function pickNextTask(tasks: Task[], currentId: string | null, now: number): Task | null {
  const queue = sortTasksForFocus(tasks, now);
  if (queue.length === 0) return null;
  if (currentId === null) return queue[0] ?? null;

  const index = queue.findIndex((task) => task.id === currentId);
  if (index === -1) return queue[0] ?? null;
  return queue[(index + 1) % queue.length] ?? null;
}

/** 列表 / 步骤前缀：`- `、`* `、`1.`、`1、`、`(1)`、`第一步：` 等 */
const STEP_PREFIX = /^\s*(?:[-*•·–—]|\d+\s*[.、)．]|[（(]\s*\d+\s*[)）]|第[一二三四五六七八九十百\d]+步\s*[:：、.]?)\s*/;

/** 从备注中提取「第一步」；无备注时返回默认启动建议「先开始就好」 */
export function extractFirstStep(note: string): string {
  if (typeof note !== 'string') return FALLBACK_FIRST_STEP;
  for (const rawLine of note.split(/\r?\n/)) {
    const line = rawLine.replace(STEP_PREFIX, '').trim();
    if (line.length > 0) return line;
  }
  return FALLBACK_FIRST_STEP;
}

/* ------------------------------------------------------------------
 * 话术模板库（附录 A / UI-UX 4.2）
 * 允许占位符：{task_title} {x} {delta} {week} {streak} {total}
 * 注意：remainingCount 仅用于内部判断，禁止出现在文案中。
 * ------------------------------------------------------------------ */

const CELEBRATION_TEMPLATES: Record<MotivationStyle, string[]> = {
  encouragement: [
    '漂亮！这件事搞定了。今天已经完成{x}件，再来1个还是休息？',
    '太棒了！{task_title}完成。今天已经做了{x}件事，给自己点个赞！',
    '干得好！又划掉1件。已完成{x}件，你比昨天多完成了{delta}件！',
    'Wow！又完成1件。你今天已经完成{x}件了，状态很好啊！',
    '搞定！{task_title}已完成。今天累计完成{x}件，继续保持这个节奏？',
    '优秀！又1件完成。今天已经完成{x}件，离今日目标又近了一步！',
    '太厉害了！{task_title}被你拿下了。今天完成{x}件，慢慢来也没关系。',
    '真不错！又往前一步。今天完成{x}件，本周已经{week}件啦。',
    '完成1件！{task_title}。今天{x}件，你正在一点点变强。',
    '好样的！这件事结束了。今天完成{x}件，给自己倒杯水休息一下？',
    '又搞定一件事！今天累计完成{x}件，你的努力都被记录下来了。',
    '漂亮收尾！{task_title}完成，今天{x}件，继续保持这份从容。',
  ],
  direct: [
    '完成。今天{x}件。下一个？',
    '{task_title} 已划掉。今日{x}件，继续。',
    '搞定1件。今天{x}件，比昨天多{delta}件。',
    '完成。今天{x}件，本周{week}件。',
    '{task_title} 完成。今日进度{x}件，再开一个？',
    '又1件。今天{x}件，别停。',
    '任务清空1项。今天{x}件，保持速度。',
    '完成。已连续{streak}天，今天第{x}件。',
    '{task_title} 搞定。今日{x}件，继续推进。',
    '结束1件。今天{x}件，还有力气就再来。',
    '完成。今天累计{x}件，节奏稳定。',
  ],
  gamification: [
    '+1 得分！今日累计{x}分，连击{streak}天。',
    '任务击破！{task_title} 已清关，今日{x}件。',
    '成就进度更新：今日完成{x}件，继续连击！',
    'KP +1！今天已经{x}件，连击天数{streak}。',
    'Boss 已击败：{task_title}。今日战绩{x}件。',
    '连击保持中！今日{x}件，连击{streak}天。',
    '打卡成功。今日{x}件，本周{week}件。',
    '升级进度 +1。今天{x}件，再打一关？',
    '{task_title} 通关！今日已获得{x}点经验。',
    '稀有成就：又完成1件。今天{x}件，继续冲榜！',
    '能量 +1！今日{x}件，连击{streak}天，别断连。',
  ],
};

/** 「全部完成」专属文案（UI-UX 5.5）。 */
const ALL_DONE_TEMPLATES: string[] = [
  '今日任务全部完成！太棒了！🎉',
  '今天完成了{x}件事，效率满分！好好休息吧。',
  '全部搞定！今天的你超棒，明天见！',
  '今日任务清零！完成了{x}件，安心休息吧。',
];

/** 连续成就里程碑（附录 A「连续成就」）。 */
const STREAK_MILESTONES: ReadonlyArray<3 | 7 | 14 | 30> = [3, 7, 14, 30];

const STREAK_TEMPLATES: Record<3 | 7 | 14 | 30, string> = {
  3: '连续3天完成任务，节奏很棒！继续保持！',
  7: '一周全勤！太厉害了，你已经形成习惯了！',
  14: '两周连续完成！你已经是行动大师了！',
  30: '一个月全勤！你已经彻底告别拖延了！',
};

/** 推送话术（附录 A）。含 {task_title} 的模板需要任务上下文。 */
const NUDGE_TEMPLATES: Record<NudgeKind, string[]> = {
  morning: [
    '早！今天先搞定这1件最重要的：{task_title}。开始吗？',
    '新的一天！从这1件事开始，5分钟就能启动。{task_title}',
    '早安！我帮你选好了今天的第一件事：{task_title}。准备好了吗？',
    '{task_title}，就是今天最好的第一步。要开始了吗？',
  ],
  afternoon: [
    '下午好！今天还没开始，要不要花5分钟先启动最简单的那件？',
    '下午啦！一件都还没做也没关系，从这1件开始就好：{task_title}',
    '下午好！5分钟冲刺了解一下？先把{task_title}启动起来。',
    '下午好！今天还没动也没关系，先做5分钟就算赢。',
  ],
  winback: [
    '好久不见！我帮你把任务精简到了1件最重要的，5分钟就能重启节奏。',
    '失踪人口回归！不用补之前的，从今天这1件开始就好：{task_title}',
    '嘿！几天没见了。不用有压力，今天只做这1件：{task_title}。开始吗？',
    '好久不见！不用有压力，今天先花5分钟找回节奏就好。',
  ],
};

const TASK_TITLE_TOKEN = '{task_title}';

interface TemplateVars {
  taskTitle?: string;
  todayCount?: number;
  yesterdayCount?: number;
  weekCount?: number;
  consecutiveDays?: number;
}

function render(template: string, vars: TemplateVars): string {
  return template.replace(/\{(task_title|x|week|streak|delta|total)\}/g, (match, token: string) => {
    switch (token) {
      case 'task_title':
        return vars.taskTitle ?? '';
      case 'x':
      case 'total':
        return String(vars.todayCount ?? 0);
      case 'week':
        return String(vars.weekCount ?? 0);
      case 'streak':
        return String(vars.consecutiveDays ?? 0);
      case 'delta':
        return String((vars.todayCount ?? 0) - (vars.yesterdayCount ?? 0));
      default:
        return match;
    }
  });
}

/** 在 [0,1) 内取随机下标，并避免与 previousText 重复。 */
function chooseIndex(candidates: string[], previousText: string | undefined, rng: () => number): number {
  const length = candidates.length;
  if (length <= 1) return 0;
  const raw = rng();
  const normalized = Number.isFinite(raw) ? raw - Math.floor(raw) : 0;
  let index = Math.min(length - 1, Math.floor(normalized * length));
  if (previousText !== undefined && candidates[index] === previousText) {
    index = (index + 1) % length;
  }
  return index;
}

function streakMilestoneOf(consecutiveDays: number): 3 | 7 | 14 | 30 | null {
  return (STREAK_MILESTONES as ReadonlyArray<number>).includes(consecutiveDays)
    ? (consecutiveDays as 3 | 7 | 14 | 30)
    : null;
}

/**
 * 附录 A：庆祝文案选择。
 * - 按 motivationStyle 选择话术池
 * - allDone 时使用「全部完成」专属文案
 * - 命中 3/7/14/30 连续成就时使用特殊文案并回填 streakMilestone（优先级高于 allDone）
 * - 随机选择时避免与 previousText 重复
 */
export function pickCelebration(
  ctx: CelebrationContext,
  previousText?: string,
  rng: () => number = Math.random
): CelebrationResult {
  const milestone = streakMilestoneOf(ctx.consecutiveDays);
  if (milestone !== null) {
    return { text: STREAK_TEMPLATES[milestone], streakMilestone: milestone };
  }

  const vars: TemplateVars = {
    taskTitle: ctx.taskTitle,
    todayCount: ctx.todayCount,
    yesterdayCount: ctx.yesterdayCount,
    weekCount: ctx.weekCount,
    consecutiveDays: ctx.consecutiveDays,
  };

  const pool = ctx.allDone
    ? ALL_DONE_TEMPLATES
    : CELEBRATION_TEMPLATES[ctx.motivationStyle] ?? CELEBRATION_TEMPLATES.encouragement;

  const candidates = pool.map((template) => render(template, vars));
  const index = chooseIndex(candidates, previousText, rng);
  return { text: candidates[index] ?? candidates[0] ?? '', streakMilestone: null };
}

/**
 * 附录 A：推送话术选择。
 * - morning   高效时段开始，有未完成任务
 * - afternoon 当日零完成
 * - winback   连续 3 天未打开
 * task 为 null 时只会选择「不需要任务标题」的模板；若不存在则返回 null（调用方跳过本次推送）
 */
export function pickNudge(
  kind: NudgeKind,
  task: Task | null,
  previousText?: string,
  rng: () => number = Math.random
): NudgeMessage | null {
  const pool = NUDGE_TEMPLATES[kind];
  if (!pool || pool.length === 0) return null;

  const candidates = pool
    .filter((template) => task !== null || !template.includes(TASK_TITLE_TOKEN))
    .map((template) => ({
      text: render(template, { taskTitle: task?.title }),
      needsTask: template.includes(TASK_TITLE_TOKEN),
    }));

  if (candidates.length === 0) return null;

  const index = chooseIndex(candidates.map((candidate) => candidate.text), previousText, rng);
  const chosen = candidates[index] ?? candidates[0];
  if (!chosen) return null;

  const message: NudgeMessage = { kind, text: chosen.text };
  if (chosen.needsTask && task) {
    message.taskId = task.id;
  }
  return message;
}