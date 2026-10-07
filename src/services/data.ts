/**
 * 数据导出 / 清空 —— 公开契约
 *
 * 负责人：engineering-backend-architect
 * 依据：PRD Story 8（本地数据存储与隐私）
 */
import type { AppDataSnapshot } from '@/types';
import { completionRepo, preferenceRepo, taskRepo } from './db';
import { ready } from './internal/runtime';
import { DEFAULT_PREFERENCE } from './defaults';
import { SCHEMA_VERSION } from './schema';

/** 导出全量数据快照（JSON 序列化与落盘由调用方负责） */
export async function exportSnapshot(): Promise<AppDataSnapshot> {
  const [tasks, completions, preference] = await Promise.all([
    taskRepo.list(),
    completionRepo.list(),
    preferenceRepo.get(),
  ]);
  return {
    app: 'personal-dashboard',
    version: SCHEMA_VERSION,
    exportedAt: Date.now(),
    tasks,
    completions,
    preference,
  };
}

/** 清空所有本地数据（任务 / 完成记录清空，偏好重置为默认值） */
export async function clearAllData(): Promise<void> {
  const store = await ready();
  await store.clear();
  await store.writeTable('preference', [DEFAULT_PREFERENCE]);
}