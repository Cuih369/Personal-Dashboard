/** 唯一 ID 生成（UUID v4）。优先使用平台 crypto，缺失时回退到随机实现。 */

export function newId(): string {
  const g = globalThis as unknown as { crypto?: { randomUUID?: () => string } };
  try {
    const uuid = g.crypto?.randomUUID;
    if (typeof uuid === 'function') {
      return uuid.call(g.crypto);
    }
  } catch {
    /* 回退到随机实现 */
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}