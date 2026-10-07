<script setup lang="ts">
/**
 * 统计页（UI-UX 第 5.6 节）
 * 4 张数据卡片（数字 800ms 滚动）+ 近 7 天趋势柱状图 + 分类占比环形图；
 * 无数据时展示空状态文案。减少动效时直接显示终值（第 6.5 节）。
 */
import { computed, ref, watch } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import PdEmptyState from '@/components/base/PdEmptyState.vue';
import StreakFlame from '@/components/business/StreakFlame.vue';
import StatsChart from '@/components/business/StatsChart.vue';
import PdPage from '@/components/layout/PdPage.vue';
import { usePreferencesStore } from '@/store/preferences';
import { useStatsStore } from '@/store/stats';
import { useTasksStore } from '@/store/tasks';
import { hundredGoalLabel, STATS_COPY, trendTodayLabel, trendWeekLabel } from '@/utils/copy';
import { rollNumber } from '@/utils/roll-number';

const preferences = usePreferencesStore();
const stats = useStatsStore();
const tasks = useTasksStore();

const todayValue = ref(0);
const weekValue = ref(0);
const streakValue = ref(0);
const totalValue = ref(0);

let cancels: Array<() => void> = [];

const summary = computed(() => stats.summary);
const showEmpty = computed(() => stats.ready && summary.value.totalCount === 0);
const todayTrend = computed(() => trendTodayLabel(summary.value.todayDelta));
type TrendDirection = 'up' | 'down' | 'flat';

/** 第 5.6 节：较昨日/上周上升为绿、下降为红、持平为灰 */
function trendDirection(delta: number): TrendDirection {
  if (delta > 0) return 'up';
  if (delta < 0) return 'down';
  return 'flat';
}
const weekTrend = computed(() => trendWeekLabel(summary.value.weekDelta));
const goalText = computed(() => hundredGoalLabel(summary.value.totalCount));

function cancelRolls(): void {
  cancels.forEach((cancel) => cancel());
  cancels = [];
}

/** 第 4.3 节：数字从 0 滚动到实际值（800ms ease-out） */
function rollAll(): void {
  cancelRolls();
  const reduceMotion = preferences.reduceMotion;
  const options = { reduceMotion };
  cancels.push(rollNumber(summary.value.todayCount, (value) => (todayValue.value = value), options));
  cancels.push(rollNumber(summary.value.weekCount, (value) => (weekValue.value = value), options));
  cancels.push(
    rollNumber(summary.value.consecutiveDays, (value) => (streakValue.value = value), options)
  );
  cancels.push(rollNumber(summary.value.totalCount, (value) => (totalValue.value = value), options));
}

onLoad(async () => {
  await preferences.ensureLoaded();
  await tasks.ensureLoaded();
  await stats.refresh();
  rollAll();
});

onShow(() => {
  stats.refresh().then(rollAll);
});

watch(
  () => summary.value.totalCount,
  () => rollAll()
);

watch(
  () => preferences.reduceMotion,
  () => rollAll()
);
</script>

<template>
  <PdPage :tab-bar="true" tab="stats" background="page" :padded="true">
    <view class="stats">
      <text class="stats__title">{{ STATS_COPY.title }}</text>

      <PdEmptyState v-if="showEmpty" icon="📊" :title="STATS_COPY.emptyTitle" />

      <template v-else>
        <view class="stats__grid">
          <view class="stats__card">
            <text class="stats__number">{{ todayValue }}</text>
            <text class="stats__label">{{ STATS_COPY.cardToday }}</text>
            <text class="stats__trend" :class="`stats__trend--${trendDirection(summary.todayDelta)}`">{{ todayTrend }}</text>
          </view>

          <view class="stats__card">
            <text class="stats__number">{{ weekValue }}</text>
            <text class="stats__label">{{ STATS_COPY.cardWeek }}</text>
            <text class="stats__trend" :class="`stats__trend--${trendDirection(summary.weekDelta)}`">{{ weekTrend }}</text>
          </view>

          <view class="stats__card">
            <text class="stats__number">{{ streakValue }}</text>
            <text class="stats__label">{{ STATS_COPY.cardStreak }}</text>
            <view class="stats__streak">
              <StreakFlame :days="summary.consecutiveDays" variant="icon" />
              <text class="stats__trend stats__trend--up">{{ STATS_COPY.streakHint }}</text>
            </view>
          </view>

          <view class="stats__card">
            <text class="stats__number">{{ totalValue }}</text>
            <text class="stats__label">{{ STATS_COPY.cardTotal }}</text>
            <text class="stats__trend stats__trend--up">{{ goalText }}</text>
          </view>
        </view>

        <StatsChart
          :trend="stats.dailyTrend"
          :breakdown="stats.categoryBreakdown"
          :total="summary.totalCount"
          :reduce-motion="preferences.reduceMotion"
        />
      </template>
    </view>
  </PdPage>
</template>

<style scoped lang="scss">
@import '../../styles/mixins.scss';

.stats {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding-top: $space-3;
  padding-bottom: $space-6;
}

.stats__title {
  margin-bottom: $space-5;
  font-size: $font-size-3xl;
  font-weight: $font-weight-bold;
  color: var(--pd-text-primary);
}

.stats__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $space-3;
  margin-bottom: $space-6;
}

.stats__card {
  display: flex;
  flex-direction: column;
  padding: $space-4;
  background-color: var(--pd-bg-primary);
  border-radius: $radius-lg;
  box-shadow: var(--pd-shadow-xs);
}

.stats__number {
  font-size: $font-size-4xl;
  font-weight: $font-weight-bold;
  line-height: 1.2;
  color: var(--pd-color-primary);
  font-variant-numeric: tabular-nums;
}

.stats__label {
  margin-top: $space-1;
  font-size: $font-size-sm;
  color: var(--pd-text-secondary);
}

.stats__trend {
  margin-top: $space-1;
  font-size: $font-size-xs;
  font-weight: $font-weight-medium;
}

.stats__trend--up {
  color: var(--pd-color-success);
}

.stats__trend--down {
  color: var(--pd-color-error);
}

.stats__trend--flat {
  color: var(--pd-text-tertiary);
}

.stats__streak {
  display: flex;
  align-items: center;
  gap: $space-2;
  margin-top: $space-1;
}
</style>