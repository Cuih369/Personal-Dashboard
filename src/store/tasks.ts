/**
 * 任务 Store
 * 负责人：engineering-frontend-developer
 * 约束：只能通过 `@/services` 访问数据，绝不直接触碰存储。
 */
import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { completionRepo, pickNextTask, sortTasksForFocus, taskRepo } from '@/services';
import type { CreateTaskInput, Task, TaskStatus, UpdateTaskPatch } from '@/types';
import { localPickNextTask, localSortForFocus } from '@/utils/local-rules';

interface CompletionExtra {
  /** 实际耗时（分钟），未知为 null */
  durationMinutes?: number | null;
}

export const useTasksStore = defineStore('tasks', () => {
  const tasks = ref<Task[]>([]);
  const loading = ref(false);
  const ready = ref(false);
  const failed = ref(false);
  const currentFocusId = ref<string | null>(null);
  const lastRemoved = ref<Task | null>(null);

  let inflight: Promise<void> | null = null;

  const pending = computed(() => tasks.value.filter((task) => task.status !== 'completed'));
  const completed = computed(() =>
    tasks.value
      .filter((task) => task.status === 'completed')
      .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
  );
  const pendingCount = computed(() => pending.value.length);
  const totalCount = computed(() => tasks.value.length);
  /** 第 1.3 节：>10 个未完成时进入 overwhelmed 微冲刺引导 */
  const overwhelmed = computed(() => pendingCount.value > 10);

  const focusQueue = computed<Task[]>(() => {
    const list = pending.value;
    if (list.length === 0) return [];
    try {
      return sortTasksForFocus(list, Date.now());
    } catch {
      return localSortForFocus(list, Date.now());
    }
  });

  /** 首页当前展示的唯一任务（单任务原则） */
  const focusTask = computed<Task | null>(() => {
    if (tasks.value.length === 0) return null;
    try {
      return pickNextTask(tasks.value, currentFocusId.value, Date.now());
    } catch {
      return localPickNextTask(tasks.value, currentFocusId.value, Date.now());
    }
  });

  const inProgressTask = computed(
    () => tasks.value.find((task) => task.status === 'in_progress') ?? null
  );

  function replaceTask(next: Task): void {
    const index = tasks.value.findIndex((task) => task.id === next.id);
    if (index === -1) tasks.value = [...tasks.value, next];
    else tasks.value = tasks.value.map((task) => (task.id === next.id ? next : task));
  }

  async function load(force = false): Promise<void> {
    if (ready.value && !force) return;
    loading.value = true;
    try {
      tasks.value = await taskRepo.list();
      failed.value = false;
    } catch {
      tasks.value = [];
      failed.value = true;
    } finally {
      loading.value = false;
      ready.value = true;
    }
  }

  function ensureLoaded(): Promise<void> {
    if (ready.value) return Promise.resolve();
    if (!inflight) {
      inflight = load().finally(() => {
        inflight = null;
      });
    }
    return inflight;
  }

  async function create(input: CreateTaskInput): Promise<Task | null> {
    try {
      const created = await taskRepo.create(input);
      tasks.value = [...tasks.value, created];
      return created;
    } catch {
      failed.value = true;
      return null;
    }
  }

  async function update(patch: UpdateTaskPatch): Promise<Task | null> {
    try {
      const updated = await taskRepo.update(patch);
      replaceTask(updated);
      return updated;
    } catch {
      failed.value = true;
      return null;
    }
  }

  async function setStatus(id: string, status: TaskStatus): Promise<Task | null> {
    const target = tasks.value.find((task) => task.id === id);
    if (!target) return null;
    try {
      const updated = await taskRepo.setStatus(id, status);
      replaceTask(updated);
      return updated;
    } catch {
      failed.value = true;
      replaceTask({
        ...target,
        status,
        completedAt: status === 'completed' ? Date.now() : null,
      });
      return tasks.value.find((task) => task.id === id) ?? null;
    }
  }

  async function togglePin(id: string): Promise<void> {
    const target = tasks.value.find((task) => task.id === id);
    if (!target) return;
    await update({ id, priority: target.priority === 1 ? 0 : 1 });
  }

  /**
   * 完成任务：写状态 + 落一条完成记录（统计与规则引擎的数据来源）。
   * 返回完成前的任务快照，供庆祝弹窗与成就判定使用。
   */
  async function completeTask(id: string, extra: CompletionExtra = {}): Promise<Task | null> {
    const snapshot = tasks.value.find((task) => task.id === id);
    if (!snapshot) return null;
    const completedAt = Date.now();
    await setStatus(id, 'completed');
    try {
      await completionRepo.add({
        taskId: snapshot.id,
        taskTitle: snapshot.title,
        category: snapshot.category,
        completedAt,
        durationMinutes: extra.durationMinutes ?? null,
      });
    } catch {
      // 降级：记录失败不阻塞庆祝流程
    }
    return snapshot;
  }

  /** 删除任务，保留快照以支持 5 秒内撤销（第 1.3 节 容错原则） */
  async function remove(id: string): Promise<Task | null> {
    const snapshot = tasks.value.find((task) => task.id === id) ?? null;
    if (!snapshot) return null;
    lastRemoved.value = snapshot;
    tasks.value = tasks.value.filter((task) => task.id !== id);
    try {
      await taskRepo.remove(id);
      await completionRepo.removeByTask(id);
    } catch {
      failed.value = true;
    }
    return snapshot;
  }

  /** 撤销删除：用快照重建任务 */
  async function restoreLastRemoved(): Promise<Task | null> {
    const snapshot = lastRemoved.value;
    if (!snapshot) return null;
    lastRemoved.value = null;
    try {
      const restored = await taskRepo.create({
        title: snapshot.title,
        note: snapshot.note,
        category: snapshot.category,
        estimatedDuration: snapshot.estimatedDuration,
        dueDate: snapshot.dueDate,
      });
      tasks.value = [...tasks.value, restored];
      if (snapshot.status !== 'pending') await setStatus(restored.id, snapshot.status);
      return restored;
    } catch {
      failed.value = true;
      tasks.value = [...tasks.value, snapshot];
      return snapshot;
    }
  }

  function clearLastRemoved(): void {
    lastRemoved.value = null;
  }

  /** 首页「换一个」 */
  function rotateFocus(): void {
    const currentId = focusTask.value?.id ?? null;
    currentFocusId.value = currentId;
    const queue = focusQueue.value;
    if (queue.length === 0) {
      currentFocusId.value = null;
      return;
    }
    const index = queue.findIndex((task) => task.id === currentId);
    const next = queue[(index + 1) % queue.length];
    currentFocusId.value = next ? next.id : null;
  }

  function getById(id: string | null | undefined): Task | null {
    if (!id) return null;
    return tasks.value.find((task) => task.id === id) ?? null;
  }

  return {
    tasks,
    loading,
    ready,
    failed,
    currentFocusId,
    lastRemoved,
    pending,
    completed,
    pendingCount,
    totalCount,
    overwhelmed,
    focusQueue,
    focusTask,
    inProgressTask,
    load,
    ensureLoaded,
    create,
    update,
    setStatus,
    togglePin,
    completeTask,
    remove,
    restoreLastRemoved,
    clearLastRemoved,
    rotateFocus,
    getById,
  };
});