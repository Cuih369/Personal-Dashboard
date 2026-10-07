/**
 * 存储运行时：单例适配层 + 幂等初始化。
 *
 * 初始化流程（全部容错，绝不因存储问题白屏）：
 * 1. 选择平台适配层并 init（建表 / 建索引）
 * 2. 失败时依次降级：本地存储 -> 纯内存
 * 3. 对比 schema 版本并执行缺失迁移
 * 4. 确保存在偏好行（首次启动写入默认值）
 */

import type { UserPreference } from '@/types';
import type { StorageAdapter } from '../storage/types';
import {
  createFallbackAdapter,
  createMemoryAdapter,
  createStorageAdapter,
} from '../storage';
import { SCHEMA_VERSION, runMigrations } from '../schema';
import { DEFAULT_PREFERENCE } from '../defaults';
import { log } from './log';

let adapter: StorageAdapter | null = null;
let readyPromise: Promise<void> | null = null;

export function getAdapter(): StorageAdapter {
  if (!adapter) {
    adapter = createStorageAdapter();
  }
  return adapter;
}

/** 幂等：重复调用返回同一个 Promise，不会重复建库 / 迁移。 */
export function ensureStorageReady(): Promise<void> {
  if (!readyPromise) {
    readyPromise = initialize();
  }
  return readyPromise;
}

/** 供仓储层使用：确保初始化完成并拿到适配层。 */
export async function ready(): Promise<StorageAdapter> {
  await ensureStorageReady();
  return getAdapter();
}

async function initialize(): Promise<void> {
  let store = getAdapter();

  try {
    await store.init();
  } catch (error) {
    log.error('[storage] primary adapter init failed; falling back to local storage', error);
    try {
      store = createFallbackAdapter();
      adapter = store;
      await store.init();
    } catch (fallbackError) {
      log.error('[storage] fallback adapter init failed; using in-memory store', fallbackError);
      store = createMemoryAdapter();
      adapter = store;
      await store.init();
    }
  }

  try {
    const version = await store.getSchemaVersion();
    if (version < SCHEMA_VERSION) {
      await runMigrations(store, version, SCHEMA_VERSION);
      await store.setSchemaVersion(SCHEMA_VERSION);
    } else if (version > SCHEMA_VERSION) {
      log.warn(
        `[storage] stored schema version ${version} is newer than supported ${SCHEMA_VERSION}; skipping migrations`
      );
    }

    const preferences = await store.readTable<UserPreference>('preference');
    if (preferences.length === 0) {
      await store.writeTable('preference', [DEFAULT_PREFERENCE]);
    }
  } catch (error) {
    log.error('[storage] post-init step failed; continuing with partial storage', error);
  }
}