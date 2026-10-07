/**
 * 专注会话 Store（专注页计时 + 庆祝弹窗状态机）
 * 负责人：engineering-frontend-developer
 * 约束：只能通过 `@/services` 访问数据；文案与规则的服务不可用时降级到本地兜底。
 */
import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import {
  computeUserStatus,
  extractFirstStep,
  pickCelebration,
  weeklyCompletionRate,
  zeroCompletionDays,
} from '@/services';
import type { CelebrationContext, Task, UserStatus } from '@/types';
import {
  localComputeUserStatus,
  localExtractFirstStep,
  localPickCelebration,
  localWeeklyCompletionRate,
  localZeroCompletionDays,
} from '@/utils/local-rules';
import { CELEBRATION_COPY } from '@/utils/copy';
import { dateKey } from '@/utils/format';
import { haptic } from '@/utils/haptic';
import { usePreferencesStore } from './preferences';
import { useStatsStore } from './stats';
import { useTasksStore } from './tasks';

export interface CelebrationState {
  text: string;
  taskTitle: string;
  todayCount: number;
  weekCount: number;
  consecutiveDays: number;
  streakMilestone: 3 | 7 | 14 | 30 | null;
  allDone: boolean;
  icon: string;
  confetti: boolean;
}

export const useSessionStore = defineStore('session', () => {
  const activeTaskId = ref<string | null>(null);
  const taskTitle = ref('');
  const firstStep = ref('');
  const durationSec = ref(300);
  const remainingSec = ref(300);
  const running = ref(false);
  const paused = ref(false);
  const finished = ref(false);
  const timeUpVisible = ref(false);
  const celebration = ref<CelebrationState | null>(null);
  const lastCelebrationText = ref<string | undefined>(undefined);

  let timerId: ReturnType<typeof setInterval> | null = null;

  const active = computed(() => activeTaskId.value !== null);
  const progress = computed(() =>
    durationSec.value > 0 ? Math.min(1, 1 - remainingSec.value / durationSec.value) : 0
  );
  const isWarning = computed(() => remainingSec.value > 0 && remainingSec.value <= 10);
  const celebrationVisible = computed(() => celebration.value !== null);

  function stopTimer(): void {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function tick(): void {
    if (!running.value) return;
    if (remainingSec.value <= 1) {
      remainingSec.value = 0;
      running.value = false;
      paused.value = false;
      finished.value = true;
      timeUpVisible.value = true;
      stopTimer();
      return;
    }
    remainingSec.value -= 1;
  }

  function startTimer(): void {
    stopTimer();
    timerId = setInterval(tick, 1000);
  }

  function resolveFirstStep(note: string): string {
    try {
      return extractFirstStep(note);
    } catch {
      return localExtractFirstStep(note);
    }
  }

  /** 从首页「开始」进入：初始化计时器并把任务置为进行中 */
  async function start(task: Task): Promise<void> {
    const preferences = usePreferencesStore();
    const tasksStore = useTasksStore();
    await preferences.ensureLoaded();
    activeTaskId.value = task.id;
    taskTitle.value = task.title;
    firstStep.value = resolveFirstStep(task.note);
    durationSec.value = Math.max(60, preferences.focusDuration * 60);
    remainingSec.value = durationSec.value;
    running.value = true;
    paused.value = false;
    finished.value = false;
    timeUpVisible.value = false;
    if (task.status !== 'in_progress') {
      await tasksStore.setStatus(task.id, 'in_progress');
    }
    startTimer();
  }

  function pause(): void {
    if (!running.value) return;
    running.value = false;
    paused.value = true;
    stopTimer();
  }

  function resume(): void {
    if (remainingSec.value <= 0) return;
    running.value = true;
    paused.value = false;
    finished.value = false;
    timeUpVisible.value = false;
    startTimer();
  }

  function dismissTimeUp(): void {
    timeUpVisible.value = false;
  }

  /** 重新计时（「休息一下」后再来一轮 5 分钟） */
  function restart(): void {
    remainingSec.value = durationSec.value;
    finished.value = false;
    timeUpVisible.value = false;
    running.value = true;
    paused.value = false;
    startTimer();
  }

  function elapsedMinutes(): number {
    const used = durationSec.value - remainingSec.value;
    return Math.max(1, Math.round(used / 60));
  }

  function buildContext(task: Task | null, consecutiveDays: number): CelebrationContext {
    const statsStore = useStatsStore();
    const tasksStore = useTasksStore();
    return {
      taskTitle: task?.title ?? taskTitle.value,
      todayCount: statsStore.summary.todayCount,
      weekCount: statsStore.summary.weekCount,
      remainingCount: tasksStore.pendingCount,
      consecutiveDays,
      motivationStyle: usePreferencesStore().motivationStyle,
      yesterdayCount: Math.max(0, statsStore.summary.todayCount - statsStore.summary.todayDelta),
      allDone: tasksStore.pendingCount === 0,
    };
  }

  function resolveStatus(pendingCount: number, consecutiveDays: number): UserStatus {
    const tasksStore = useTasksStore();
    const statsStore = useStatsStore();
    const input = {
      pendingCount,
      consecutiveDays,
      zeroCompletionDays: 0,
      weeklyCompletionRate: 1,
    };
    try {
      input.zeroCompletionDays = zeroCompletionDays(statsStore.records, Date.now());
      input.weeklyCompletionRate = weeklyCompletionRate(tasksStore.tasks, statsStore.records, Date.now());
      return computeUserStatus(input);
    } catch {
      try {
        input.zeroCompletionDays = localZeroCompletionDays(statsStore.records, Date.now());
        input.weeklyCompletionRate = localWeeklyCompletionRate(
          tasksStore.tasks,
          statsStore.records,
          Date.now()
        );
      } catch {
        // 忽略：保留保守默认值
      }
      return localComputeUserStatus(input);
    }
  }

  /**
   * 专注页「完成了」：写完成记录 -> 刷新统计 -> 生成庆祝文案 -> 展示弹窗。
   * 全程不得抛错，否则庆祝流程会断（第 4 步「完成庆祝」是核心正向反馈）。
   */
  async function complete(): Promise<void> {
    stopTimer();
    running.value = false;
    paused.value = false;
    finished.value = true;
    timeUpVisible.value = false;
    haptic.complete();

    const tasksStore = useTasksStore();
    const statsStore = useStatsStore();
    const preferences = usePreferencesStore();
    const task = tasksStore.getById(activeTaskId.value);

    if (task) {
      await tasksStore.completeTask(task.id, { durationMinutes: elapsedMinutes() });
    }
    await statsStore.refresh();

    const consecutiveDays = Math.max(
      statsStore.summary.consecutiveDays,
      preferences.consecutiveDays
    );
    const context = buildContext(task, consecutiveDays);
    let result = localPickCelebration(context, lastCelebrationText.value);
    try {
      result = pickCelebration(context, lastCelebrationText.value);
    } catch {
      // 服务层不可用：使用本地模板池兜底
    }
    lastCelebrationText.value = result.text;

    celebration.value = {
      text: result.text,
      taskTitle: task?.title ?? taskTitle.value,
      todayCount: context.todayCount,
      weekCount: context.weekCount,
      consecutiveDays,
      streakMilestone: result.streakMilestone,
      allDone: context.allDone,
      icon: context.allDone ? CELEBRATION_COPY.iconAllDone : CELEBRATION_COPY.iconDefault,
      confetti: context.allDone && !preferences.reduceMotion,
    };

    statsStore.syncAchievements();

    await preferences.save({
      consecutiveDays,
      userStatus: resolveStatus(tasksStore.pendingCount, consecutiveDays),
      lastActiveDate: dateKey(Date.now()),
    });
  }

  function dismissCelebration(): void {
    celebration.value = null;
    useStatsStore().dismissAchievement();
  }

  function reset(): void {
    stopTimer();
    activeTaskId.value = null;
    taskTitle.value = '';
    firstStep.value = '';
    remainingSec.value = durationSec.value;
    running.value = false;
    paused.value = false;
    finished.value = false;
    timeUpVisible.value = false;
  }

  return {
    activeTaskId,
    taskTitle,
    firstStep,
    durationSec,
    remainingSec,
    running,
    paused,
    finished,
    timeUpVisible,
    celebration,
    active,
    progress,
    isWarning,
    celebrationVisible,
    start,
    pause,
    resume,
    restart,
    dismissTimeUp,
    complete,
    dismissCelebration,
    reset,
  };
});