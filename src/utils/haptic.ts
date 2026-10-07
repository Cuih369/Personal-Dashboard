/**
 * 震动反馈（UI-UX 第 6.3 节，仅 App 端；H5 / 小程序静默忽略）
 * 负责人：engineering-frontend-developer
 */

export type VibrateKind = 'light' | 'medium' | 'heavy';

interface VibrateShortOptions {
  type?: VibrateKind;
}

interface UniVibrateApi {
  vibrateShort?: (options?: VibrateShortOptions) => void;
  getSystemInfoSync?: () => Record<string, unknown>;
}

function getUniApi(): UniVibrateApi | null {
  if (typeof uni === 'undefined') return null;
  return uni as unknown as UniVibrateApi;
}

/** 运行端：'app' | 'h5' | 'mp-weixin' | 'unknown' */
export function getPlatform(): string {
  const api = getUniApi();
  if (!api?.getSystemInfoSync) return 'unknown';
  try {
    const info = api.getSystemInfoSync();
    const uniPlatform = info.uniPlatform;
    if (typeof uniPlatform === 'string') return uniPlatform;
    const platform = info.platform;
    if (platform === 'android' || platform === 'ios') return 'app';
    if (platform === 'devtools' || platform === 'mac' || platform === 'windows') return 'h5';
    return typeof platform === 'string' ? platform : 'unknown';
  } catch {
    return 'unknown';
  }
}

/** 是否支持系统级震动（App 端） */
export function isHapticsSupported(): boolean {
  const platform = getPlatform();
  return platform === 'app' || platform === 'android' || platform === 'ios';
}

const VIBRATE_MAP: Record<VibrateKind, VibrateKind> = {
  light: 'light',
  medium: 'medium',
  heavy: 'heavy',
};

/** 触发震动；任何失败（H5 不支持 / 权限）都必须被吞掉，不得影响功能 */
export function vibrate(kind: VibrateKind): void {
  const api = getUniApi();
  if (!api?.vibrateShort || !isHapticsSupported()) return;
  try {
    api.vibrateShort({ type: VIBRATE_MAP[kind] });
  } catch {
    // 忽略：H5 与部分设备不支持
  }
}

/** 第 6.3 节场景封装 */
export const haptic = {
  /** 点击 Primary 按钮 */
  tap(): void {
    vibrate('light');
  },
  /** 完成任务（中等震动 + 成功反馈） */
  complete(): void {
    vibrate('medium');
  },
  /** 删除任务（重震动 + 警告） */
  remove(): void {
    vibrate('heavy');
  },
  /** 成就解锁（连续两次轻震动） */
  achievement(): void {
    vibrate('light');
    setTimeout(() => vibrate('light'), 120);
  },
} as const;