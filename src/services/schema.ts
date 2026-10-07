/**
 * 数据库 schema 版本与迁移钩子。
 *
 * 迁移策略（expand-and-contract 的最小可用形态）：
 * - SCHEMA_VERSION 单调递增；每新增一次破坏性变更 +1
 * - 通过 registerMigration(version, fn) 注册「从 version-1 升级到 version」的迁移
 * - initDatabase() 启动时对比存储中的版本，逐级执行缺失的迁移
 */

import type { StorageAdapter } from './storage/types';
import { log } from './internal/log';

/** 当前 schema 版本。新增字段 / 新表时递增，并注册对应迁移。 */
export const SCHEMA_VERSION = 1;

export type MigrationFn = (adapter: StorageAdapter) => Promise<void>;

const MIGRATIONS: Record<number, MigrationFn> = {};

/**
 * 注册迁移钩子。
 * @param version 目标版本号（必须 > 0），表示「从 version-1 升级到 version」。
 * @param migration 迁移实现，可读写表结构或做数据回填。
 */
export function registerMigration(version: number, migration: MigrationFn): void {
  if (!Number.isInteger(version) || version <= 0) {
    throw new Error(`INVALID_MIGRATION_VERSION: ${version}`);
  }
  MIGRATIONS[version] = migration;
}

export function hasMigration(version: number): boolean {
  return typeof MIGRATIONS[version] === 'function';
}

/** 依次执行 (from, to] 区间内已注册的迁移。 */
export async function runMigrations(
  adapter: StorageAdapter,
  from: number,
  to: number
): Promise<void> {
  for (let version = Math.max(from, 0) + 1; version <= to; version += 1) {
    const migration = MIGRATIONS[version];
    if (!migration) continue;
    log.info(`[storage] applying migration v${version}`);
    await migration(adapter);
  }
}