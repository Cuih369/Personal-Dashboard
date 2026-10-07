/// <reference types="@dcloudio/types" />

/**
 * uni-app 全局类型说明（本文件刻意保持"空"）
 *
 * - `uni` / `getCurrentPages` 等由 @dcloudio/types 提供，见 tsconfig 的 `types` 字段
 * - HTML5+ 的 `plus` 由服务层通过 `globalThis` 局部断言访问
 *   （src/services/storage/app.ts、src/services/push.ts），因此**不在此处**
 *   声明全局 `plus`，避免与 @dcloudio/types 冲突
 * - 刻意**不**声明 `declare module '*.vue'`：vue-tsc 能直接推导 SFC 的 props 类型，
 *   通配声明会把组件类型抹成 any，反而削弱类型检查
 *
 * 本文件仅作为后续新增全局声明的落点保留。
 */

export {}
