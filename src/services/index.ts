/**
 * 服务层统一出口（冻结）
 *
 * 调用方（pages / components / store）**只允许**从 `@/services` 导入，
 * 不得直接引用内部实现文件，以便后续替换存储引擎而不影响 UI。
 */

export * from './db';
export * from './rule-engine';
export * from './stats';
export * from './push';
export * from './data';

/** 应用启动时初始化：建库 / 建表 / 载入偏好。失败时必须降级而非白屏。 */
export async function initServices(): Promise<void> {
  const { initDatabase } = await import('./db');
  await initDatabase();
}
