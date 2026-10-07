/**
 * 数据访问层 —— 公开契约
 *
 * 负责人：engineering-backend-architect
 *
 * 实现：
 * - App 端：uni-app SQLite 插件，数据落在应用沙盒目录（见 ./storage/app.ts）
 * - H5 端：localStorage 版本化 JSON 文档（见 ./storage/h5.ts）
 * - 两端差异抹平在 ./storage 与 ./repositories 内部，调用方无感
 *
 * 本文件只保留冻结签名与薄封装，具体实现位于 `src/services/internal/**`。
 */
import type { CompletionRepository, PreferenceRepository, TaskRepository } from '@/types';
import { ensureStorageReady, ready } from './internal/runtime';
import {
  createCompletionRepository,
  createPreferenceRepository,
  createTaskRepository,
} from './repositories';
import { DEFAULT_PREFERENCE } from './defaults';

export { SCHEMA_VERSION } from './schema';
export { DEFAULT_PREFERENCE };

/** 初始化数据库 / 建表 / 迁移（幂等）。应用启动时调用一次。 */
export async function initDatabase(): Promise<void> {
  await ensureStorageReady();
}

export const taskRepo: TaskRepository = createTaskRepository(ready);

export const preferenceRepo: PreferenceRepository = createPreferenceRepository(ready, DEFAULT_PREFERENCE);

export const completionRepo: CompletionRepository = createCompletionRepository(ready);