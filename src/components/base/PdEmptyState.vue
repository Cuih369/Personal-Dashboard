<script setup lang="ts">
/**
 * PdEmptyState —— 空状态（UI-UX 第 4.2 节空状态文案 + 第 6.4 节）
 */
withDefaults(
  defineProps<{
    icon?: string;
    title: string;
    desc?: string;
    /** 插画是否做浮动动画（第 4.3 节；减少动效时由全局样式自动禁用） */
    animate?: boolean;
  }>(),
  {
    icon: '📦',
    desc: '',
    animate: true,
  }
);
</script>

<template>
  <view class="pd-empty">
    <view class="pd-empty__icon" :class="{ 'pd-empty__icon--animate': animate }" aria-hidden="true">
      <text class="pd-empty__emoji">{{ icon }}</text>
    </view>
    <text class="pd-empty__title">{{ title }}</text>
    <text v-if="desc" class="pd-empty__desc">{{ desc }}</text>
    <view class="pd-empty__actions">
      <slot />
    </view>
  </view>
</template>

<style scoped lang="scss">
@import '../../styles/mixins.scss';

.pd-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: $space-10 $space-8;
  text-align: center;
}

.pd-empty__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 200rpx;
  height: 200rpx;
  margin-bottom: $space-6;
  border-radius: $radius-full;
  background: linear-gradient(135deg, var(--pd-color-primary-bg) 0%, var(--pd-bg-primary) 100%);
}

.pd-empty__icon--animate {
  animation: pd-float 3s ease-in-out infinite;
}

.pd-empty__emoji {
  font-size: 96rpx;
  line-height: 1;
}

.pd-empty__title {
  font-size: $font-size-2xl;
  font-weight: $font-weight-bold;
  color: var(--pd-text-primary);
  margin-bottom: $space-2;
}

.pd-empty__desc {
  font-size: $font-size-base;
  color: var(--pd-text-secondary);
  line-height: 1.6;
}

.pd-empty__actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $space-3;
  width: 100%;
  margin-top: $space-8;
}
</style>