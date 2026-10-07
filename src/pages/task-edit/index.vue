<script setup lang="ts">
/**
 * 创建 / 编辑任务页（UI-UX 第 5.3 节）
 * 标题必填且自动聚焦；预计耗时默认 15 分钟；分类默认「工作」；
 * 保存按钮在标题为空时禁用。
 */
import { computed, ref } from 'vue';
import { onActivateKey } from '@/utils/a11y';
import { onLoad } from '@dcloudio/uni-app';
import PdButton from '@/components/base/PdButton.vue';
import PdInput from '@/components/base/PdInput.vue';
import PdPage from '@/components/layout/PdPage.vue';
import { useStatsStore } from '@/store/stats';
import { useTasksStore } from '@/store/tasks';
import { CATEGORY_LABEL, DURATION_LABEL, DURATION_OPTIONS, TASK_CATEGORIES, type TaskCategory } from '@/types';
import { COMMON_COPY, TASK_EDIT_COPY } from '@/utils/copy';
import { toast, toastSuccess } from '@/utils/feedback';

const tasks = useTasksStore();
const stats = useStatsStore();

const editingId = ref<string | null>(null);
const title = ref('');
const note = ref('');
const duration = ref<number>(15);
const category = ref<TaskCategory>('work');
const submitting = ref(false);

const isEditing = computed(() => editingId.value !== null);
const navTitle = computed(() =>
  isEditing.value ? TASK_EDIT_COPY.titleEdit : TASK_EDIT_COPY.titleNew
);
const canSave = computed(() => title.value.trim().length > 0 && !submitting.value);
const titleError = computed(() =>
  title.value.length > 0 && title.value.trim().length === 0 ? TASK_EDIT_COPY.titleEmptyError : ''
);
const durationOptions = DURATION_OPTIONS;
const categoryOptions = TASK_CATEGORIES;

onLoad(async (query?: Record<string, string>) => {
  await tasks.ensureLoaded();
  const id = query?.id ? String(query.id) : '';
  if (!id) return;
  const task = tasks.getById(id);
  if (!task) return;
  editingId.value = task.id;
  title.value = task.title;
  note.value = task.note;
  duration.value = task.estimatedDuration;
  category.value = task.category;
});

function goBack(): void {
  uni.navigateBack();
}

async function onSave(): Promise<void> {
  if (!canSave.value) return;
  submitting.value = true;
  const payload = {
    title: title.value.trim(),
    note: note.value.trim(),
    category: category.value,
    estimatedDuration: duration.value,
  };
  try {
    if (editingId.value) {
      await tasks.update({ id: editingId.value, ...payload });
    } else {
      await tasks.create(payload);
    }
    await stats.refresh();
    toastSuccess(TASK_EDIT_COPY.savedToast);
    setTimeout(() => goBack(), 300);
  } catch {
    toast(COMMON_COPY.retry);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <PdPage background="plain" :show-nav="true" :title="navTitle" :show-back="true" @back="goBack">
    <template #nav-right>
      <PdButton
        variant="primary"
        size="sm"
        :disabled="!canSave"
        :loading="submitting"
        @click="onSave"
      >
        {{ TASK_EDIT_COPY.save }}
      </PdButton>
    </template>

    <view class="editor">
      <view class="editor__group">
        <view class="editor__label-row">
          <text class="editor__label">{{ TASK_EDIT_COPY.labelTitle }}</text>
          <text class="editor__required" aria-label="必填">*</text>
        </view>
        <PdInput
          v-model="title"
          :placeholder="TASK_EDIT_COPY.titlePlaceholder"
          :error="titleError"
          :autofocus="!isEditing"
          :aria-label="TASK_EDIT_COPY.labelTitle"
          @confirm="onSave"
        />
        <text v-if="titleError" class="editor__error">{{ titleError }}</text>
      </view>

      <view class="editor__group">
        <text class="editor__label">{{ TASK_EDIT_COPY.labelNote }}</text>
        <PdInput
          v-model="note"
          multiline
          :placeholder="TASK_EDIT_COPY.notePlaceholder"
          :maxlength="200"
          :aria-label="TASK_EDIT_COPY.labelNote"
        />
        <text class="editor__hint">{{ TASK_EDIT_COPY.noteHint }}</text>
      </view>

      <view class="editor__group">
        <text class="editor__label">{{ TASK_EDIT_COPY.labelDuration }}</text>
        <view class="editor__chips">
          <view
            v-for="minutes in durationOptions"
            :key="minutes"
            class="editor__chip"
            :class="{ 'editor__chip--active': duration === minutes }"
            role="radio"
            tabindex="0"
            :aria-checked="duration === minutes ? 'true' : 'false'"
            :aria-label="DURATION_LABEL[minutes]"
            @tap="duration = minutes" @keydown="onActivateKey($event, () => (duration = minutes))"
          >
            <text class="editor__chip-text">{{ DURATION_LABEL[minutes] }}</text>
          </view>
        </view>
      </view>

      <view class="editor__group">
        <text class="editor__label">{{ TASK_EDIT_COPY.labelCategory }}</text>
        <view class="editor__chips">
          <view
            v-for="item in categoryOptions"
            :key="item"
            class="editor__chip"
            :class="{ 'editor__chip--active': category === item }"
            role="radio"
            tabindex="0"
            :aria-checked="category === item ? 'true' : 'false'"
            :aria-label="CATEGORY_LABEL[item]"
            @tap="category = item" @keydown="onActivateKey($event, () => (category = item))"
          >
            <text class="editor__chip-text">{{ CATEGORY_LABEL[item] }}</text>
          </view>
        </view>
      </view>
    </view>
  </PdPage>
</template>

<style scoped lang="scss">
@import '../../styles/mixins.scss';

.editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: $space-4 $container-padding $space-8;
}

.editor__group {
  margin-bottom: $space-6;
}

.editor__label-row {
  display: flex;
  align-items: center;
  gap: $space-1;
}

.editor__label {
  display: block;
  margin-bottom: $space-2;
  font-size: $font-size-sm;
  color: var(--pd-text-secondary);
}

.editor__label-row .editor__label {
  margin-bottom: 0;
}

.editor__required {
  margin-left: $space-1;
  font-size: $font-size-sm;
  color: var(--pd-color-error);
}

.editor__label-row {
  margin-bottom: $space-2;
}

.editor__hint {
  display: block;
  margin-top: $space-2;
  font-size: $font-size-xs;
  color: var(--pd-text-tertiary);
}

.editor__error {
  display: block;
  margin-top: $space-1;
  font-size: $font-size-sm;
  color: var(--pd-color-error);
}

.editor__chips {
  display: flex;
  flex-wrap: wrap;
  gap: $space-3;
}

.editor__chip {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: $hit-target-min;
  padding: 0 $space-5;
  background-color: var(--pd-bg-primary);
  border: 1rpx solid var(--pd-border);
  border-radius: $radius-full;
  transition: background-color $transition-fast, border-color $transition-fast;

  @include focus-visible;
}

.editor__chip--active {
  background-color: var(--pd-color-primary-bg);
  border-color: var(--pd-color-primary);

  .editor__chip-text {
    color: var(--pd-color-primary);
    font-weight: $font-weight-semibold;
  }
}

.editor__chip-text {
  font-size: $font-size-base;
  color: var(--pd-text-primary);
}
</style>