/**
 * 存储适配层契约。
 *
 * 目标：App（uni-app SQLite）与 H5（localStorage JSON）以完全一致的方式
 * 满足 TaskRepository / PreferenceRepository / CompletionRepository。
 *
 * 表的语义行类型：
 * - tasks       -> Task
 * - completions -> CompletionRecord
 * - preference  -> UserPreference（单行，id='default'）
 */

export type StoragePlatform = 'app' | 'h5';

export type TableName = 'tasks' | 'completions' | 'preference';

export interface StorageAdapter {
  readonly platform: StoragePlatform;
  /** 幂等的建库 / 建表 / 索引创建。 */
  init(): Promise<void>;
  /** 读取整张表（返回拷贝，调用方可安全修改）。 */
  readTable<T>(table: TableName): Promise<T[]>;
  /** 覆盖写入整张表（全量替换）。 */
  writeTable<T>(table: TableName, rows: T[]): Promise<void>;
  /** 读取已应用的 schema 版本；全新存储返回 0。 */
  getSchemaVersion(): Promise<number>;
  setSchemaVersion(version: number): Promise<void>;
  /** 清空所有业务数据（保留 schema 版本）。 */
  clear(): Promise<void>;
  /** 可选：执行原始 SQL（仅 App 端 SQLite 提供），供迁移使用。 */
  exec?(sql: string): Promise<void>;
}