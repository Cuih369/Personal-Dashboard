/**
 * H5 存储适配层：localStorage 上的「按表版本化 JSON 文档」。
 *
 * - 文档结构：{ version: SCHEMA_VERSION, rows: T[] }
 * - 元数据（schema 版本）单独存在 pd:meta
 * - localStorage 不可用（隐私模式 / Node 单测）时自动降级为进程内内存存储，
 *   接口行为完全一致，仅不跨进程持久化
 */

import type { StorageAdapter, StoragePlatform, TableName } from './types';
import { SCHEMA_VERSION } from '../schema';
import { log } from '../internal/log';

const NAMESPACE = 'pd';
const META_KEY = `${NAMESPACE}:meta`;

interface KVStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface StoredDoc<T> {
  version: number;
  rows: T[];
}

interface StoredMeta {
  schemaVersion: number;
}

const DATA_TABLES: TableName[] = ['tasks', 'completions', 'preference'];

const memory = new Map<string, string>();

function createMemoryStore(): KVStore {
  return {
    getItem: (key) => (memory.has(key) ? (memory.get(key) as string) : null),
    setItem: (key, value) => {
      memory.set(key, value);
    },
    removeItem: (key) => {
      memory.delete(key);
    },
  };
}

function resolveStore(forceMemory: boolean): KVStore {
  if (forceMemory) return createMemoryStore();
  try {
    const g = globalThis as unknown as { localStorage?: KVStore };
    const ls = g.localStorage;
    if (ls && typeof ls.getItem === 'function' && typeof ls.setItem === 'function') {
      const probe = `${NAMESPACE}:__probe__`;
      ls.setItem(probe, '1');
      ls.removeItem(probe);
      return ls;
    }
  } catch {
    /* 不可用则降级内存存储 */
  }
  return createMemoryStore();
}

function parseJson<T>(raw: string | null): T | null {
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function docKey(table: TableName): string {
  return `${NAMESPACE}:doc:${table}`;
}

export function createH5Adapter(options: { forceMemory?: boolean } = {}): StorageAdapter {
  const store = resolveStore(options.forceMemory === true);
  const platform: StoragePlatform = 'h5';

  return {
    platform,

    async init(): Promise<void> {
      // localStorage 无需建表；这里只做一次可写性确认
      try {
        store.setItem(`${NAMESPACE}:__ready__`, '1');
      } catch (error) {
        log.warn('[storage:h5] storage is not writable', error);
      }
    },

    async readTable<T>(table: TableName): Promise<T[]> {
      const doc = parseJson<StoredDoc<T>>(store.getItem(docKey(table)));
      if (!doc || !Array.isArray(doc.rows)) return [];
      return doc.rows.slice();
    },

    async writeTable<T>(table: TableName, rows: T[]): Promise<void> {
      const doc: StoredDoc<T> = { version: SCHEMA_VERSION, rows };
      store.setItem(docKey(table), JSON.stringify(doc));
    },

    async getSchemaVersion(): Promise<number> {
      const meta = parseJson<StoredMeta>(store.getItem(META_KEY));
      return meta && Number.isFinite(meta.schemaVersion) ? meta.schemaVersion : 0;
    },

    async setSchemaVersion(version: number): Promise<void> {
      const meta: StoredMeta = { schemaVersion: version };
      store.setItem(META_KEY, JSON.stringify(meta));
    },

    async clear(): Promise<void> {
      for (const table of DATA_TABLES) {
        store.removeItem(docKey(table));
      }
    },
  };
}