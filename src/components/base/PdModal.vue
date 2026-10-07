<script setup lang="ts">
/**
 * PdModal —— 模态弹窗（UI-UX 第 3.4.4 节）
 * 入场：遮罩淡入 200ms + 弹窗上滑弹跳 300ms（第 6.1 节）
 * 出场：下滑 + 淡出 200ms
 * 无障碍：role=dialog + aria-modal（第 7.2 节）
 */
import { computed, ref, watch } from 'vue';
import { onActivateKey } from '@/utils/a11y';
import { motionMs, MOTION_DURATION } from '@/utils/motion';
import { COMMON_COPY } from '@/utils/copy';

const props = withDefaults(
  defineProps<{
    visible: boolean;
    title?: string;
    /** 点击遮罩关闭 */
    maskClosable?: boolean;
    showClose?: boolean;
    /** 减少动效时跳过弹跳（第 6.5 节） */
    reduceMotion?: boolean;
    variant?: 'standard' | 'celebration';
    ariaLabel?: string;
  }>(),
  {
    title: '',
    maskClosable: true,
    showClose: false,
    reduceMotion: false,
    variant: 'standard',
    ariaLabel: undefined,
  }
);

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void;
  (event: 'close'): void;
}>();

const rendered = ref(props.visible);
const active = ref(props.visible);
let enterTimer: ReturnType<typeof setTimeout> | null = null;
let exitTimer: ReturnType<typeof setTimeout> | null = null;

watch(
  () => props.visible,
  (next) => {
    if (enterTimer) clearTimeout(enterTimer);
    if (exitTimer) clearTimeout(exitTimer);
    if (next) {
      rendered.value = true;
      enterTimer = setTimeout(() => {
        active.value = true;
      }, 0);
    } else {
      active.value = false;
      exitTimer = setTimeout(
        () => {
          rendered.value = false;
        },
        motionMs(MOTION_DURATION.modalExit, props.reduceMotion) || 1
      );
    }
  }
);

const classes = computed(() => [
  `pd-modal--${props.variant}`,
  {
    'pd-modal--active': active.value,
  },
]);

function close(): void {
  emit('update:visible', false);
  emit('close');
}

function onMaskTap(): void {
  if (!props.maskClosable) return;
  close();
}


</script>

<template>
  <view
    v-if="rendered"
    class="pd-modal"
    :class="classes"
    :aria-label="ariaLabel"
  >
    <view class="pd-modal__mask" aria-hidden="true" @tap="onMaskTap" />
    <view
      class="pd-modal__panel"
      role="dialog"
      aria-modal="true"
      :aria-label="ariaLabel || title"
    >
      <view v-if="showClose" class="pd-modal__close-wrap">
        <view
          class="pd-modal__close"
          role="button"
          tabindex="0"
          :aria-label="COMMON_COPY.ariaCloseModal"
          @tap="close" @keydown="onActivateKey($event, close)"
        >
          <text class="pd-modal__close-icon">✕</text>
        </view>
      </view>
      <view v-if="title" class="pd-modal__header">
        <text class="pd-modal__title">{{ title }}</text>
      </view>
      <view class="pd-modal__body">
        <slot />
      </view>
      <view v-if="$slots.footer" class="pd-modal__footer">
        <slot name="footer" />
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
@import '../../styles/mixins.scss';

.pd-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 $space-4;
}

.pd-modal__mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--pd-overlay);
  opacity: 0;
  transition: opacity 200ms ease-out;
}

.pd-modal__panel {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  max-width: 640rpx;
  padding: $space-6;
  background-color: var(--pd-bg-primary);
  border-radius: $radius-xl;
  box-shadow: var(--pd-shadow-lg);
  transform: translateY(100rpx) scale(0.8);
  opacity: 0;
  transition: transform $motion-modal-enter $ease-bounce, opacity $motion-modal-enter ease-out;
}

.pd-modal--active {
  .pd-modal__mask {
    opacity: 1;
  }

  .pd-modal__panel {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

.pd-modal__header {
  margin-bottom: $space-4;
  text-align: center;
}

.pd-modal__title {
  font-size: $font-size-2xl;
  font-weight: $font-weight-semibold;
  color: var(--pd-text-primary);
  line-height: 1.35;
}

.pd-modal__body {
  color: var(--pd-text-secondary);
}

.pd-modal__footer {
  display: flex;
  align-items: center;
  gap: $space-3;
  margin-top: $space-6;

  > * {
    flex: 1;
  }
}

.pd-modal__close-wrap {
  display: flex;
  justify-content: flex-end;
  margin-bottom: $space-2;
}

.pd-modal__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: $hit-target-min;
  height: $hit-target-min;
  border-radius: $radius-full;

  @include focus-visible;
}

.pd-modal__close-icon {
  font-size: $font-size-xl;
  color: var(--pd-text-tertiary);
}

.pd-modal--celebration {
  .pd-modal__panel {
    padding: $space-8 $space-6 $space-6;
    text-align: center;
  }
}

// 第 6.5 节：减少动效时禁用缩放与位移，仅保留淡入淡出
.pd-modal {
  @include reduce-motion {
    .pd-modal__panel {
      transform: none;
    }
  }
}
</style>