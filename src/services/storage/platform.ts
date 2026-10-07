/**
 * 平台探测。
 *
 * 使用 uni-app 条件编译（H5 / APP-PLUS）：
 * - 真实构建时，非当前平台的分支会被编译器整段移除
 * - 未被条件编译处理的环境（如 vitest / Node 单测）会保留全部赋值，
 *   此时「后赋值者生效」——因此 H5 分支放在最后，保证默认走 H5 适配层
 */

import type { StoragePlatform } from './types';

export function detectPlatform(): StoragePlatform {
  let platform: StoragePlatform | null = null;
  // #ifdef APP-PLUS
  platform = 'app';
  // #endif
  // #ifdef H5
  platform = 'h5';
  // #endif
  return platform ?? detectRuntimePlatform();
}

/** 运行时兜底探测（无 uni-app 条件编译时使用）。 */
export function detectRuntimePlatform(): StoragePlatform {
  try {
    const g = globalThis as unknown as { plus?: unknown };
    return g.plus ? 'app' : 'h5';
  } catch {
    return 'h5';
  }
}