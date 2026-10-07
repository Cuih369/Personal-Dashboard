/**
 * 数字滚动（UI-UX 第 4.3 / 5.6 节：进入统计页时数字从 0 滚到实际值，800ms ease-out）
 * 减少动效时（第 6.5 节）直接返回终值，不做补间。
 */
import { MOTION_DURATION } from './motion';

const FRAME = 16;

function easeOut(progress: number): number {
  return 1 - Math.pow(1 - progress, 3);
}

/**
 * 启动一次数字滚动，返回取消函数。
 * onUpdate 会按帧回调（整数），结束时保证回调终值。
 */
export function rollNumber(
  target: number,
  onUpdate: (value: number) => void,
  options: { duration?: number; reduceMotion?: boolean } = {}
): () => void {
  const duration = options.duration ?? MOTION_DURATION.numberRoll;
  if (options.reduceMotion || duration <= 0 || target <= 0) {
    onUpdate(target);
    return () => undefined;
  }

  const startedAt = Date.now();
  const timer = setInterval(() => {
    const elapsed = Date.now() - startedAt;
    const progress = Math.min(1, elapsed / duration);
    onUpdate(Math.round(easeOut(progress) * target));
    if (progress >= 1) {
      clearInterval(timer);
      onUpdate(target);
    }
  }, FRAME);

  return () => {
    clearInterval(timer);
    onUpdate(target);
  };
}