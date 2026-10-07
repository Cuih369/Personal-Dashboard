<script setup lang="ts">
/**
 * 任务列表页（UI-UX 第 5.2 节）
 * 全部 / 进行中 / 已完成 三个 Tab；左滑露出「完成 / 删除」，长按操作菜单；
 * 点击左侧圆圈快速完成；删除后 5 秒内可撤销（第 1.3 节 容错原则）。
 */
import { computed, onUnmounted, ref } from 'vue';
import { onActivateKey } from '@/utils/a11y';
import { onLoad, onShow } from '@dcloudio/uni-app';
import PdButton from '@/components/base/PdButton.vue';
import PdEmptyState from '@/components/base/PdEmptyState.vue';
import PdInput from '@/components/base/PdInput.vue';
import PdModal from '@/components/base/PdModal.vue';
import TaskCard from '@/components/business/TaskCard.vue';
import PdPage from '@/components/layout/PdPage.vue';
import { usePreferencesStore } from '@/store/preferences';
import { useStatsStore } from '@/store/stats';
import { useTasksStore } from '@/store/tasks';
import { CATEGORY_LABEL, TASK_CATEGORIES, type Task, type TaskCategory } from '@/types';
import { MOTION_DURATION } from '@/utils/motion';
import { COMMON_COPY, HOME_COPY, TASK_LIST_COPY } from '@/utils/copy';
import { toast } from '@/utils/feedback';
import { haptic } from '@/utils/haptic';

type ListTab = 'all' | 'active' | 'done';

const preferences = usePreferencesStore();
const tasks = useTasksStore();
const stats = useStatsStore();

const activeTab = ref<ListTab>('all');
const searching = ref(false);
const keyword = ref('');
const menuTaskId = ref<string | null>(null);
const pendingDelete = ref<Task | null>(null);
const undoVisible = ref(false);
const filterVisible = ref(false);
const categoryFilter = ref<TaskCategory | 'all'>('all');

let undoTimer: ReturnType<typeof setTimeout> | null = null;

const tabs: Array<{ key: ListTab; label: string }> = [
  { key: 'all', label: TASK_LIST_COPY.tabAll },
  { key: 'active', label: TASK_LIST_COPY.tabActive },
  { key: 'done', label: TASK_LIST_COPY.tabDone },
];

onLoad(() => {
  tasks.ensureLoaded();
});

onShow(() => {
  tasks.load(true);
  stats.refresh();
});

onUnmounted(() => {
  if (undoTimer) clearTimeout(undoTimer);
});

const menuTask = computed(() => tasks.getById(menuTaskId.value));

const baseList = computed<Task[]>(() => {
  if (activeTab.value === 'done') return tasks.completed;
  if (activeTab.value === 'active') return tasks.pending;
  return [...tasks.pending, ...tasks.completed];
});

const filteredList = computed<Task[]>(() => {
  if (categoryFilter.value === 'all') return baseList.value;
  return baseList.value.filter((task) => task.category === categoryFilter.value);
});

const visibleTasks = computed<Task[]>(() => {
  const search = keyword.value.trim();
  if (!search) return filteredList.value;
  return filteredList.value.filter((task) => task.title.includes(search));
});

const categoryFilterOptions = computed<
  Array<{ value: TaskCategory | 'all'; label: string }>
>(() => [
  { value: 'all', label: TASK_LIST_COPY.tabAll },
  ...TASK_CATEGORIES.map((category) => ({ value: category, label: CATEGORY_LABEL[category] })),
]);

const emptyTitle = computed(() => {
  if (keyword.value.trim()) return TASK_LIST_COPY.searchEmpty;
  if (activeTab.value === 'done') return TASK_LIST_COPY.emptyDone;
  if (activeTab.value === 'active') return TASK_LIST_COPY.emptyActive;
  return TASK_LIST_COPY.emptyAll;
});

const emptyIcon = computed(() => (keyword.value.trim() ? '🔍' : '📝'));

function goBack(): void {
  uni.navigateBack();
}

function switchTab(key: ListTab): void {
  activeTab.value = key;
}

function openFilter(): void {
  filterVisible.value = true;
}

function closeFilter(): void {
  filterVisible.value = false;
}

function chooseCategory(value: TaskCategory | 'all'): void {
  categoryFilter.value = value;
  filterVisible.value = false;
}

function toggleSearch(): void {
  searching.value = !searching.value;
  if (!searching.value) keyword.value = '';
}

function openEditor(id?: string): void {
  const url = id ? `/pages/task-edit/index?id=${id}` : '/pages/task-edit/index';
  uni.navigateTo({ url });
}

function openMenu(task: Task): void {
  haptic.tap();
  menuTaskId.value = task.id;
}

function closeMenu(): void {
  menuTaskId.value = null;
}

async function completeTask(id: string): Promise<void> {
  haptic.complete();
  await tasks.completeTask(id, { durationMinutes: null });
  closeMenu();
  await stats.refresh();
  stats.syncAchievements();
  await preferences.save({ consecutiveDays: stats.summary.consecutiveDays });
}

async function togglePin(id: string): Promise<void> {
  await tasks.togglePin(id);
  closeMenu();
}

function askDelete(task: Task): void {
  menuTaskId.value = null;
  pendingDelete.value = task;
}

function cancelDelete(): void {
  pendingDelete.value = null;
}

async function confirmDelete(): Promise<void> {
  const target = pendingDelete.value;
  pendingDelete.value = null;
  if (!target) return;
  haptic.remove();
  await tasks.remove(target.id);
  await stats.refresh();
  showUndo();
}

function showUndo(): void {
  undoVisible.value = true;
  toast(TASK_LIST_COPY.deletedToast);
  if (undoTimer) clearTimeout(undoTimer);
  undoTimer = setTimeout(() => {
    undoVisible.value = false;
    tasks.clearLastRemoved();
  }, MOTION_DURATION.undoWindow);
}

async function undoDelete(): Promise<void> {
  if (undoTimer) clearTimeout(undoTimer);
  undoTimer = null;
  undoVisible.value = false;
  const restored = await tasks.restoreLastRemoved();
  if (restored) {
    toast(TASK_LIST_COPY.undoneToast);
    await stats.refresh();
  }
}
</script>

<template>
  <PdPage
    background="page"
    :show-nav="true"
    :title="TASK_LIST_COPY.title"
    :show-back="true"
    @back="goBack"
  >
    <template #nav-right>
      <view class="list__nav-actions">
        <view
          class="list__nav-btn"
          role="button"
          tabindex="0"
          :aria-label="TASK_LIST_COPY.filter"
          @tap="openFilter" @keydown="onActivateKey($event, openFilter)"
        >
          <text class="list__nav-icon">⚙</text>
        </view>
        <view
          class="list__nav-btn"
          role="button"
          tabindex="0"
          :aria-label="TASK_LIST_COPY.search"
          @tap="toggleSearch" @keydown="onActivateKey($event, toggleSearch)"
        >
          <text class="list__nav-icon">🔍</text>
        </view>
      </view>
    </template>

    <view class="list">
      <view class="list__tabs" role="tablist">
        <view
          v-for="tab in tabs"
          :key="tab.key"
          class="list__tab"
          :class="{ 'list__tab--active': activeTab === tab.key }"
          role="tab"
          tabindex="0"
          :aria-label="tab.label"
          :aria-selected="activeTab === tab.key ? 'true' : 'false'"
          @tap="switchTab(tab.key)" @keydown="onActivateKey($event, () => (switchTab(tab.key)))"
        >
          <text class="list__tab-text">{{ tab.label }}</text>
          <view class="list__tab-underline" />
        </view>
      </view>

      <view v-if="searching" class="list__search">
        <PdInput
          v-model="keyword"
          :placeholder="TASK_LIST_COPY.searchPlaceholder"
          :aria-label="TASK_LIST_COPY.search"
        />
      </view>

      <view v-if="visibleTasks.length > 0" class="list__items" :aria-label="TASK_LIST_COPY.ariaLabel">
        <TaskCard
          v-for="task in visibleTasks"
          :key="task.id"
          class="list__item"
          :task="task"
          :show-circle="task.status !== 'completed'"
          :swipeable="true"
          :interactive="true"
          :reduce-motion="preferences.reduceMotion"
          @tap="openEditor(task.id)"
          @toggle="completeTask(task.id)"
          @complete="completeTask(task.id)"
          @delete="askDelete(task)"
          @longpress="openMenu(task)"
        />
      </view>

      <PdEmptyState v-else :icon="emptyIcon" :title="emptyTitle">
        <PdButton variant="primary" size="lg" block @click="openEditor()">
          {{ HOME_COPY.addTask }}
        </PdButton>
      </PdEmptyState>
    </view>

    <view class="list__fab" role="button" tabindex="0" aria-label="添加任务" @tap="openEditor()" @keydown="onActivateKey($event, () => (openEditor()))">
      <text class="list__fab-icon">+</text>
    </view>

    <template #overlay>
      <!-- 长按操作菜单（第 5.2 节） -->
      <PdModal
        :visible="menuTask !== null"
        :title="TASK_LIST_COPY.actionMenuTitle"
        mask-closable
        @update:visible="closeMenu"
      >
        <view class="menu">
          <view
            v-if="menuTask && menuTask.status !== 'completed'"
            class="menu__item"
            role="button"
            tabindex="0"
            @tap="menuTask && completeTask(menuTask.id)" @keydown="onActivateKey($event, () => (menuTask && completeTask(menuTask.id)))"
          >
            <text class="menu__text">{{ TASK_LIST_COPY.actionComplete }}</text>
          </view>
          <view class="menu__item" role="button" tabindex="0" @tap="menuTask && openEditor(menuTask.id)" @keydown="onActivateKey($event, () => (menuTask && openEditor(menuTask.id)))">
            <text class="menu__text">{{ TASK_LIST_COPY.actionEdit }}</text>
          </view>
          <view class="menu__item" role="button" tabindex="0" @tap="menuTask && togglePin(menuTask.id)" @keydown="onActivateKey($event, () => (menuTask && togglePin(menuTask.id)))">
            <text class="menu__text">
              {{ menuTask && menuTask.priority === 1 ? TASK_LIST_COPY.actionUnpin : TASK_LIST_COPY.actionPin }}
            </text>
          </view>
          <view class="menu__item menu__item--danger" role="button" tabindex="0" @tap="menuTask && askDelete(menuTask)" @keydown="onActivateKey($event, () => (menuTask && askDelete(menuTask)))">
            <text class="menu__text menu__text--danger">{{ TASK_LIST_COPY.actionDelete }}</text>
          </view>
        </view>
      </PdModal>

      <!-- 删除二次确认 -->
      <PdModal
        :visible="pendingDelete !== null"
        :title="TASK_LIST_COPY.deleteConfirmTitle"
        :mask-closable="true"
        :aria-label="TASK_LIST_COPY.deleteConfirmTitle"
        @update:visible="cancelDelete"
      >
        <text class="list__modal-text">{{ TASK_LIST_COPY.deleteConfirm }}</text>
        <template #footer>
          <PdButton variant="ghost" size="lg" block bordered @click="cancelDelete">
            {{ COMMON_COPY.cancel }}
          </PdButton>
          <PdButton variant="danger" size="lg" block @click="confirmDelete">
            {{ COMMON_COPY.confirm }}
          </PdButton>
        </template>
      </PdModal>

      <!-- 分类筛选 -->
      <PdModal
        :visible="filterVisible"
        :title="TASK_LIST_COPY.filter"
        :aria-label="TASK_LIST_COPY.filter"
        @update:visible="closeFilter"
      >
        <view class="menu">
          <view
            v-for="option in categoryFilterOptions"
            :key="option.value"
            class="menu__item"
            role="button"
            tabindex="0"
            :aria-label="option.label"
            @tap="chooseCategory(option.value)" @keydown="onActivateKey($event, () => (chooseCategory(option.value)))"
          >
            <text
              class="menu__text"
              :class="{ 'menu__text--active': categoryFilter === option.value }"
            >
              {{ option.label }}
            </text>
          </view>
        </view>
      </PdModal>

      <!-- 撤销条（5 秒窗口） -->
      <view v-if="undoVisible" class="list__undo" role="status" aria-live="polite">
        <text class="list__undo-text">{{ TASK_LIST_COPY.deletedToast }}</text>
        <PdButton variant="primary" size="sm" @click="undoDelete">
          {{ TASK_LIST_COPY.undo }}
        </PdButton>
      </view>
    </template>
  </PdPage>
</template>

<style scoped lang="scss">
@import '../../styles/mixins.scss';

.list {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0 $container-padding $space-6;
}

.list__nav-actions {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.list__nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: $hit-target-min;
  height: $hit-target-min;
  border-radius: $radius-full;

  @include focus-visible;
}

.list__nav-icon {
  font-size: $font-size-2xl;
}

.list__tabs {
  display: flex;
  align-items: center;
  gap: $space-6;
  margin-bottom: $space-4;
}

.list__tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: $hit-target-min;
  gap: $space-1;

  @include focus-visible;
}

.list__tab-text {
  font-size: $font-size-base;
  color: var(--pd-text-secondary);
}

.list__tab-underline {
  width: 100%;
  height: 4rpx;
  border-radius: $radius-full;
  background-color: transparent;
  transition: background-color $transition-fast;
}

.list__tab--active {
  .list__tab-text {
    color: var(--pd-text-primary);
    font-weight: $font-weight-semibold;
  }

  .list__tab-underline {
    background-color: var(--pd-color-primary);
  }
}

.list__search {
  margin-bottom: $space-4;
}

.list__items {
  display: flex;
  flex-direction: column;
  gap: $space-3;
}

.list__item {
  width: 100%;
}

.list__modal-text {
  display: block;
  font-size: $font-size-base;
  color: var(--pd-text-secondary);
  line-height: 1.6;
  text-align: center;
}

// ---------- 长按菜单 ----------
.menu {
  display: flex;
  flex-direction: column;
}

.menu__item {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: $hit-target-min;
  border-bottom: 1rpx solid var(--pd-divider);

  @include focus-visible;

  &:last-child {
    border-bottom: none;
  }

  &:active {
    background-color: var(--pd-bg-secondary);
  }
}

.menu__text {
  font-size: $font-size-lg;
  color: var(--pd-text-primary);
}

.menu__text--danger {
  color: var(--pd-color-error);
}

.menu__text--active {
  color: var(--pd-color-primary);
  font-weight: $font-weight-semibold;
}

// ---------- 悬浮添加按钮 ----------
.list__fab {
  position: fixed;
  right: $container-padding;
  bottom: calc(#{$layout-fab-bottom} + #{$safe-bottom});
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 112rpx;
  height: 112rpx;
  border-radius: $radius-full;
  background-color: var(--pd-color-primary);
  box-shadow: var(--pd-shadow-primary);

  @include focus-visible;
}

.list__fab-icon {
  font-size: $font-size-4xl;
  line-height: 1;
  color: $color-white;
}

// ---------- 撤销条 ----------
.list__undo {
  position: fixed;
  left: $container-padding;
  right: $container-padding;
  bottom: calc(#{$layout-tabbar-space} + #{$space-4});
  z-index: 150;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-3;
  padding: $space-3 $space-4;
  background-color: var(--pd-bg-primary);
  border-radius: $radius-lg;
  box-shadow: var(--pd-shadow-md);
  animation: pd-slide-up-in $motion-toast-enter ease-out;
}

.list__undo-text {
  font-size: $font-size-sm;
  color: var(--pd-text-secondary);
}
</style>