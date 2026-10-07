/**
 * App 端存储适配层：uni-app SQLite 插件（HTML5+ plus.sqlite）。
 *
 * - 数据库文件位于应用沙盒目录（_doc），卸载即删除，符合 PRD Story 8
 * - tasks / completions 使用真实列 + 索引；preference 为单行 JSON 文档
 * - 所有平台 API 均做存在性判断，模块导入期不触碰 plus，跨端安全
 */

import type { StorageAdapter, StoragePlatform, TableName } from './types';
import type { UserPreference } from '@/types';
import { SCHEMA_VERSION } from '../schema';
import { log } from '../internal/log';

const DATABASE_NAME = 'personal-dashboard';
const DATABASE_PATH = '_doc/personal-dashboard.db';
const SCHEMA_VERSION_KEY = 'schemaVersion';

interface SqlOptions {
  name: string;
  success?: () => void;
  fail?: (error: unknown) => void;
}

interface SelectOptions {
  name: string;
  sql: string;
  success?: (data: unknown[]) => void;
  fail?: (error: unknown) => void;
}

interface SqliteApi {
  isOpenDatabase(options: { name: string; path: string }): boolean;
  openDatabase(options: SqlOptions & { path: string }): void;
  closeDatabase(options: SqlOptions): void;
  executeSql(options: SqlOptions & { sql: string }): void;
  selectSql(options: SelectOptions): void;
}

const TASK_COLUMNS = [
  'id',
  'title',
  'note',
  'category',
  'estimatedDuration',
  'priority',
  'status',
  'createdAt',
  'completedAt',
  'dueDate',
] as const;

const COMPLETION_COLUMNS = [
  'id',
  'taskId',
  'taskTitle',
  'category',
  'completedAt',
  'durationMinutes',
] as const;

const CREATE_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL,
    estimatedDuration INTEGER NOT NULL DEFAULT 15,
    priority INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    createdAt INTEGER NOT NULL,
    completedAt INTEGER,
    dueDate INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS completions (
    id TEXT PRIMARY KEY NOT NULL,
    taskId TEXT NOT NULL,
    taskTitle TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL,
    completedAt INTEGER NOT NULL,
    durationMinutes INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS preference (
    id TEXT PRIMARY KEY NOT NULL,
    json TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS meta (
    "key" TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)',
  'CREATE INDEX IF NOT EXISTS idx_tasks_createdAt ON tasks(createdAt)',
  'CREATE INDEX IF NOT EXISTS idx_completions_completedAt ON completions(completedAt)',
  'CREATE INDEX IF NOT EXISTS idx_completions_taskId ON completions(taskId)',
];

function sqliteApi(): SqliteApi | null {
  try {
    const g = globalThis as unknown as { plus?: { sqlite?: SqliteApi } };
    const sqlite = g.plus?.sqlite;
    return sqlite && typeof sqlite.openDatabase === 'function' ? sqlite : null;
  } catch {
    return null;
  }
}

function toError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error(typeof error === 'string' ? error : JSON.stringify(error));
}

function openDatabase(db: SqliteApi): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      if (db.isOpenDatabase({ name: DATABASE_NAME, path: DATABASE_PATH })) {
        resolve();
        return;
      }
      db.openDatabase({
        name: DATABASE_NAME,
        path: DATABASE_PATH,
        success: () => resolve(),
        fail: (error) => reject(toError(error)),
      });
    } catch (error) {
      reject(toError(error));
    }
  });
}

function execute(db: SqliteApi, sql: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      db.executeSql({
        name: DATABASE_NAME,
        sql,
        success: () => resolve(),
        fail: (error) => reject(toError(error)),
      });
    } catch (error) {
      reject(toError(error));
    }
  });
}

function select<T>(db: SqliteApi, sql: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    try {
      db.selectSql({
        name: DATABASE_NAME,
        sql,
        success: (data) => resolve((data ?? []) as T[]),
        fail: (error) => reject(toError(error)),
      });
    } catch (error) {
      reject(toError(error));
    }
  });
}

function sqlValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  if (typeof value === 'boolean') return value ? '1' : '0';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function requireApi(): SqliteApi {
  const api = sqliteApi();
  if (!api) throw new Error('PLUS_SQLITE_UNAVAILABLE');
  return api;
}

export function createAppAdapter(): StorageAdapter {
  const platform: StoragePlatform = 'app';
  let opened = false;

  async function db(): Promise<SqliteApi> {
    const api = requireApi();
    if (!opened) {
      await openDatabase(api);
      opened = true;
    }
    return api;
  }

  return {
    platform,

    async init(): Promise<void> {
      const api = await db();
      for (const statement of CREATE_STATEMENTS) {
        await execute(api, statement);
      }
    },

    async readTable<T>(table: TableName): Promise<T[]> {
      const api = await db();
      if (table === 'tasks') {
        return (await select<T>(api, `SELECT ${TASK_COLUMNS.join(', ')} FROM tasks`)).slice();
      }
      if (table === 'completions') {
        return (await select<T>(api, `SELECT ${COMPLETION_COLUMNS.join(', ')} FROM completions`)).slice();
      }
      const rows = await select<{ id: string; json: string }>(
        api,
        'SELECT id, json FROM preference'
      );
      const preferences: UserPreference[] = [];
      for (const row of rows) {
        try {
          preferences.push(JSON.parse(row.json) as UserPreference);
        } catch (error) {
          log.warn('[storage:app] failed to parse preference row', error);
        }
      }
      return preferences as unknown as T[];
    },

    async writeTable<T>(table: TableName, rows: T[]): Promise<void> {
      const api = await db();
      if (table === 'preference') {
        await execute(api, 'DELETE FROM preference');
        for (const row of rows) {
          const record = row as unknown as Record<string, unknown>;
          const id = typeof record.id === 'string' ? record.id : 'default';
          await execute(
            api,
            `INSERT INTO preference (id, json) VALUES (${sqlValue(id)}, ${sqlValue(JSON.stringify(row))})`
          );
        }
        return;
      }
      const columns: readonly string[] = table === 'tasks' ? TASK_COLUMNS : COMPLETION_COLUMNS;
      await execute(api, `DELETE FROM ${table}`);
      for (const row of rows) {
        const record = row as unknown as Record<string, unknown>;
        const values = columns.map((column) => sqlValue(record[column])).join(', ');
        await execute(api, `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values})`);
      }
    },

    async getSchemaVersion(): Promise<number> {
      const api = await db();
      const rows = await select<{ value: string }>(
        api,
        `SELECT value FROM meta WHERE "key" = ${sqlValue(SCHEMA_VERSION_KEY)}`
      );
      const raw = rows[0]?.value;
      const parsed = raw === undefined ? 0 : Number.parseInt(raw, 10);
      return Number.isFinite(parsed) ? parsed : 0;
    },

    async setSchemaVersion(version: number): Promise<void> {
      const api = await db();
      await execute(
        api,
        `INSERT OR REPLACE INTO meta ("key", value) VALUES (${sqlValue(SCHEMA_VERSION_KEY)}, ${sqlValue(String(version))})`
      );
    },

    async clear(): Promise<void> {
      const api = await db();
      await execute(api, 'DELETE FROM tasks');
      await execute(api, 'DELETE FROM completions');
      await execute(api, 'DELETE FROM preference');
    },

    async exec(sql: string): Promise<void> {
      const api = await db();
      await execute(api, sql);
    },
  };
}