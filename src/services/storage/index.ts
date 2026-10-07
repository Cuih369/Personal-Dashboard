/**
 * 存储适配层出口：按平台选择实现。
 *
 * - App：SQLite（真实列 + 索引）
 * - H5 ：localStorage 版本化 JSON 文档（不可用时降级内存）
 * - 初始化失败的兜底：createFallbackAdapter / createMemoryAdapter（绝不白屏）
 */

import type { StorageAdapter } from './types';
import { detectPlatform } from './platform';
import { createH5Adapter } from './h5';
import { createAppAdapter } from './app';

export type { StorageAdapter, StoragePlatform, TableName } from './types';
export { detectPlatform, detectRuntimePlatform } from './platform';
export { createH5Adapter } from './h5';
export { createAppAdapter } from './app';

export function createStorageAdapter(): StorageAdapter {
  return detectPlatform() === 'app' ? createAppAdapter() : createH5Adapter();
}

/** 主适配层不可用时的降级（H5 适配层在无 localStorage 时自动退化内存）。 */
export function createFallbackAdapter(): StorageAdapter {
  return createH5Adapter();
}

/** 最终兜底：纯内存存储，接口一致，仅不跨进程持久化。 */
export function createMemoryAdapter(): StorageAdapter {
  return createH5Adapter({ forceMemory: true });
}