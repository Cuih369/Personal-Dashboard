<script setup lang="ts">
/**
 * PdInput —— 输入框 / 文本域（UI-UX 第 3.4.3 节）
 * 高 88rpx、圆角 16rpx、背景 F8F9FA、1rpx 边框
 * 状态：default / focus / error / disabled
 */
import { computed, ref } from 'vue';

interface InputEventLike {
  detail?: { value?: string };
}

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    placeholder?: string;
    /** 多行文本域（备注 / 第一步） */
    multiline?: boolean;
    disabled?: boolean;
    /** 错误文案；非空即进入 Error 状态（第 3.3.1 / 3.3.2 条） */
    error?: string;
    maxlength?: number;
    autofocus?: boolean;
    ariaLabel?: string;
  }>(),
  {
    modelValue: '',
    placeholder: '',
    multiline: false,
    disabled: false,
    error: '',
    maxlength: 140,
    autofocus: false,
    ariaLabel: undefined,
  }
);

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void;
  (event: 'focus'): void;
  (event: 'blur'): void;
  (event: 'confirm', value: string): void;
}>();

const focused = ref(false);

const hasError = computed(() => props.error.length > 0);

const classes = computed(() => [
  {
    'pd-input--focused': focused.value,
    'pd-input--error': hasError.value,
    'pd-input--disabled': props.disabled,
    'pd-input--multiline': props.multiline,
  },
]);

function readValue(event: InputEventLike | undefined): string {
  return event?.detail?.value ?? '';
}

/**
 * 模板里 @input / @confirm 是「裸函数引用」绑定，vue-tsc 按 DOM 函数类型逆变校验，
 * 因此参数需同时接受 DOM 的 Event 与 uni 端带 detail 的载荷；内部统一收窄为 InputEventLike。
 */
type InputEventCompat = Event | InputEventLike;

function onInput(event: InputEventCompat): void {
  emit('update:modelValue', readValue(event as InputEventLike));
}

function onFocus(): void {
  focused.value = true;
  emit('focus');
}

function onBlur(): void {
  focused.value = false;
  emit('blur');
}

function onConfirm(event: InputEventCompat): void {
  emit('confirm', readValue(event as InputEventLike));
}
</script>

<template>
  <view class="pd-input" :class="classes">
    <textarea
      v-if="multiline"
      class="pd-input__control pd-input__control--multiline"
      :value="modelValue"
      :placeholder="placeholder"
      :placeholder-class="'pd-input__placeholder'"
      :disabled="disabled"
      :maxlength="maxlength"
      :focus="autofocus"
      :aria-label="ariaLabel"
      :auto-height="true"
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
      @confirm="onConfirm"
    />
    <input
      v-else
      class="pd-input__control"
      :value="modelValue"
      :placeholder="placeholder"
      :placeholder-class="'pd-input__placeholder'"
      :disabled="disabled"
      :maxlength="maxlength"
      :focus="autofocus"
      :confirm-type="'done'"
      :aria-label="ariaLabel"
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
      @confirm="onConfirm"
    />
  </view>
</template>

<style scoped lang="scss">
@import '../../styles/mixins.scss';

.pd-input {
  box-sizing: border-box;
  width: 100%;
  min-height: $input-height;
  padding: 0 $space-3;
  display: flex;
  align-items: center;
  background-color: var(--pd-bg-secondary);
  border: 1rpx solid var(--pd-border);
  border-radius: $radius-md;
  transition: border-color $transition-fast, background-color $transition-fast,
    box-shadow $transition-fast;
}

.pd-input__control {
  width: 100%;
  min-height: calc(#{$input-height} - 4rpx);
  font-family: $font-family;
  font-size: $font-size-base;
  line-height: 1.5;
  color: var(--pd-text-primary);
}

.pd-input__control--multiline {
  padding: $space-3 0;
  min-height: 160rpx;
}

// Focus：边框主色 + 白色底 + 主色光晕
.pd-input--focused {
  background-color: var(--pd-bg-primary);
  border-color: var(--pd-color-primary);
  box-shadow: 0 0 0 6rpx rgba(108, 92, 231, 0.1);
}

.pd-input--error {
  border-color: var(--pd-color-error);

  &.pd-input--focused {
    box-shadow: 0 0 0 6rpx rgba(225, 112, 85, 0.1);
  }
}

.pd-input--multiline {
  align-items: flex-start;
  min-height: 160rpx;
}

.pd-input--disabled {
  background-color: var(--pd-bg-tertiary);
  color: var(--pd-text-tertiary);
}
</style>

<style lang="scss">
// placeholder-class 作用于 uni-app 内部节点，需非 scoped 声明（类名全局唯一）
@import '../../styles/mixins.scss';

.pd-input__placeholder {
  color: var(--pd-text-tertiary);
  font-size: $font-size-base;
  line-height: 1.5;
}
</style>