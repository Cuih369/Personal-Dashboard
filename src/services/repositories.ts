/**
 * 仓储实现（平台无关）。
 *
 * 三个仓储都建立在 StorageAdapter 之上，因此 App（SQLite）与 H5（localStorage）
 * 行为完全一致。写操作为「读全表 -> 变更 -> 覆盖写」，MVP 数据量下足够，
 * 且天然避免了跨端 SQL 语义差异。
 */

import type {
  CompletionRecord,
  CompletionRepository,
  PreferenceRepository,
  Task,
  TaskRepository,
  UserPreference,
} from '@/types';
import type { StorageAdapter } from './storage/types';
import { newId } from './internal/id';

/** 惰性取用适配层（内部保证初始化完成）。 */
export type StorageReady = () => Promise<StorageAdapter>;

function withoutUndefined<T extends object>(patch: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key of Object.keys(patch) as (keyof T)[]) {
    const value = patch[key];
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

export function createTaskRepository(ready: StorageReady): TaskRepository {
  return {
    async list(): Promise<Task[]> {
      const store = await ready();
      const rows = await store.readTable<Task>('tasks');
      return rows.slice().sort((a, b) => a.createdAt - b.createdAt);
    },

    async get(id: string): Promise<Task | null> {
      const store = await ready();
      const rows = await store.readTable<Task>('tasks');
      return rows.find((task) => task.id === id) ?? null;
    },

    async create(input): Promise<Task> {
      const store = await ready();
      const rows = await store.readTable<Task>('tasks');
      const task: Task = {
        id: newId(),
        title: input.title,
        note: input.note ?? '',
        category: input.category ?? 'work',
        estimatedDuration: input.estimatedDuration ?? 15,
        priority: 0,
        status: 'pending',
        createdAt: Date.now(),
        completedAt: null,
        dueDate: input.dueDate ?? null,
      };
      rows.push(task);
      await store.writeTable('tasks', rows);
      return task;
    },

    async update(patch): Promise<Task> {
      const store = await ready();
      const rows = await store.readTable<Task>('tasks');
      const index = rows.findIndex((task) => task.id === patch.id);
      if (index === -1) {
        throw new Error(`TASK_NOT_FOUND: ${patch.id}`);
      }
      const current = rows[index] as Task;
      const next: Task = { ...current };
      if (patch.title !== undefined) next.title = patch.title;
      if (patch.note !== undefined) next.note = patch.note;
      if (patch.category !== undefined) next.category = patch.category;
      if (patch.estimatedDuration !== undefined) next.estimatedDuration = patch.estimatedDuration;
      if (patch.priority !== undefined) next.priority = patch.priority;
      if (patch.status !== undefined) next.status = patch.status;
      if (patch.dueDate !== undefined) next.dueDate = patch.dueDate;
      rows[index] = next;
      await store.writeTable('tasks', rows);
      return next;
    },

    async setStatus(id, status): Promise<Task> {
      const store = await ready();
      const rows = await store.readTable<Task>('tasks');
      const index = rows.findIndex((task) => task.id === id);
      if (index === -1) {
        throw new Error(`TASK_NOT_FOUND: ${id}`);
      }
      const current = rows[index] as Task;
      const next: Task = {
        ...current,
        status,
        completedAt: status === 'completed' ? Date.now() : null,
      };
      rows[index] = next;
      await store.writeTable('tasks', rows);
      return next;
    },

    async remove(id): Promise<void> {
      const store = await ready();
      const rows = await store.readTable<Task>('tasks');
      const remaining = rows.filter((task) => task.id !== id);
      if (remaining.length !== rows.length) {
        await store.writeTable('tasks', remaining);
      }
    },
  };
}

export function createPreferenceRepository(
  ready: StorageReady,
  defaults: UserPreference
): PreferenceRepository {
  async function current(store: StorageAdapter): Promise<UserPreference> {
    const rows = await store.readTable<UserPreference>('preference');
    const stored = rows[0];
    return {
      ...defaults,
      ...(stored ?? {}),
      id: 'default',
    };
  }

  return {
    async get(): Promise<UserPreference> {
      const store = await ready();
      return current(store);
    },

    async save(patch): Promise<UserPreference> {
      const store = await ready();
      const merged: UserPreference = {
        ...(await current(store)),
        ...withoutUndefined(patch),
        id: 'default',
      };
      await store.writeTable('preference', [merged]);
      return merged;
    },
  };
}

export function createCompletionRepository(ready: StorageReady): CompletionRepository {
  return {
    async list(since?: number): Promise<CompletionRecord[]> {
      const store = await ready();
      const rows = await store.readTable<CompletionRecord>('completions');
      const filtered =
        since === undefined ? rows : rows.filter((record) => record.completedAt >= since);
      return filtered.slice().sort((a, b) => a.completedAt - b.completedAt);
    },

    async add(record): Promise<CompletionRecord> {
      const store = await ready();
      const rows = await store.readTable<CompletionRecord>('completions');
      const created: CompletionRecord = { ...record, id: newId() };
      rows.push(created);
      await store.writeTable('completions', rows);
      return created;
    },

    async removeByTask(taskId: string): Promise<void> {
      const store = await ready();
      const rows = await store.readTable<CompletionRecord>('completions');
      const remaining = rows.filter((record) => record.taskId !== taskId);
      if (remaining.length !== rows.length) {
        await store.writeTable('completions', remaining);
      }
    },
  };
}