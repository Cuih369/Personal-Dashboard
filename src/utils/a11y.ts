/**
 * 无障碍工具 —— 键盘可操作性（WCAG 2.1.1 键盘 / 第 2.1 节）
 * 负责人：engineering-frontend-developer
 *
 * 自定义 role="button" / "tab" / "radio" / "checkbox" 的 <view> 不具备原生键盘激活能力
 * （原生活跃行为只对 <button> / <a> 生效），因此需要显式处理 Enter / Space。
 * 空格键在浏览器中会滚动页面，激活时必须 preventDefault。
 *
 * 类型说明：模板中的 @keydown 绑定会被 vue-tsc 按真实 DOM 类型（KeyboardEvent）校验，
 * 因此这里对外暴露的参数类型必须是「真实事件可赋值给它」的宽松结构（各字段可选），
 * 且不能把 DOM 类型直接当作参数类型暴露，否则会出现逆变不兼容。
 */

export interface KeyEventLike {
  key?: string;
  preventDefault?: () => void;
}

/**
 * 带事件目标的键盘事件形状。
 * currentTarget 的真实类型是 `EventTarget | null`，故此处声明为 `EventTarget | null`
 * 以保持可赋值；内部再收窄为「可点击对象」，不把 DOM 类型暴露给调用方。
 */
export interface KeyEventWithTarget extends KeyEventLike {
  currentTarget?: EventTarget | null;
}

/** 各端 / 各浏览器对空格键的 key 值不一致，统一收敛 */
const ACTIVATE_KEYS = ['Enter', ' ', 'Spacebar', 'Space', 'SpaceBar', 'NumpadEnter'];

export function isActivateKey(key?: string): boolean {
  return typeof key === 'string' && ACTIVATE_KEYS.indexOf(key) !== -1;
}

/**
 * 按下 Enter / Space 时触发 handler。
 * 用法：`<view role="button" tabindex="0" @tap="doIt" @keydown="onActivateKey($event, doIt)">`
 * 多参数写法：`@keydown="onActivateKey($event, () => doIt(id))"`
 */
export function onActivateKey(event: KeyEventLike | undefined, handler: () => void): void {
  if (!isActivateKey(event?.key)) return;
  event?.preventDefault?.();
  handler();
}

/**
 * 键盘激活「自身」：适用于包在 <picker> 等原生控件外层、自身没有点击处理函数的
 * 可聚焦容器 —— 合成一次 click 交给外层控件响应，避免出现
 * 「可获得焦点但按 Enter 无反应」的死 tab 停靠点。
 */
export function onActivateClick(event: KeyEventWithTarget | undefined): void {
  if (!isActivateKey(event?.key)) return;
  event?.preventDefault?.();
  // 从 EventTarget | null 收窄为「可点击对象」；null / 不可点击时静默跳过
  const target = event?.currentTarget as unknown as { click?: () => void } | null | undefined;
  if (target && typeof target.click === 'function') {
    target.click();
  }
}