/**
 * Store 统一出口
 * 负责人：engineering-frontend-developer
 */
import { usePreferencesStore } from './preferences';
import { useSessionStore } from './session';
import { useStatsStore } from './stats';
import { useTasksStore } from './tasks';

export { usePreferencesStore } from './preferences';
export { useTasksStore } from './tasks';
export { useStatsStore } from './stats';
export { useSessionStore } from './session';
export type { CelebrationState } from './session';

/** 一次性取齐四个 store */
export function useAppStores() {
  return {
    preferences: usePreferencesStore(),
    tasks: useTasksStore(),
    stats: useStatsStore(),
    session: useSessionStore(),
  };
}

/** 启动预热：偏好 -> 任务（各自失败都会降级，不抛错） */
export async function bootstrapAppData(): Promise<void> {
  const preferences = usePreferencesStore();
  const tasks = useTasksStore();
  await preferences.ensureLoaded();
  await tasks.ensureLoaded();
}