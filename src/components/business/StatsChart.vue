<script setup lang="ts">
/**
 * StatsChart —— 统计图表（UI-UX 第 5.6 节）
 * 1) 近 7 天完成趋势：柱状图，顶部 8rpx 圆角，主色渐变，今日加深
 * 2) 分类占比：环形图 + 图例，中心显示总计
 *
 * 渲染策略（PRD 已确认决策：图表库 echarts-for-uniapp，按需引入）
 * - H5 且 echarts 可用：用 echarts 渲染（懒加载，不进首屏包）
 * - 其他情况：回退到与高保真原型一致的纯视图图表，保证任何端都不白屏
 * - 减少动效（preference.reduceMotion）：跳过生长 / 旋转动画（第 6.5 节）
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { CategorySlice, DailyPoint } from '@/types';
import { CATEGORY_LABEL } from '@/types';
import { STATS_COPY } from '@/utils/copy';
import { parseDateKey, weekdayLabel } from '@/utils/format';
import {
  CATEGORY_CSS_VAR,
  CHART_COLORS,
  getWebChartHost,
  hasWebDocument,
  loadEcharts,
  type EchartsInstanceLike,
  type EchartsLike,
} from '@/utils/echarts';
import { MOTION_DURATION } from '@/utils/motion';

const props = withDefaults(
  defineProps<{
    trend: DailyPoint[];
    breakdown: CategorySlice[];
    total: number;
    reduceMotion?: boolean;
  }>(),
  { reduceMotion: false }
);

const BAR_HOST_ID = 'pd-stats-bar-chart';
const DONUT_HOST_ID = 'pd-stats-donut-chart';

const mode = ref<'native' | 'echarts'>('native');
let echartsRef: EchartsLike | null = null;
let barChart: EchartsInstanceLike | null = null;
let donutChart: EchartsInstanceLike | null = null;

const lastDate = computed(() => props.trend[props.trend.length - 1]?.date ?? '');

const bars = computed(() => {
  const points = props.trend;
  const max = Math.max(1, ...points.map((point) => point.count));
  return points.map((point) => ({
    date: point.date,
    count: point.count,
    label: weekdayLabel(parseDateKey(point.date)),
    percent: point.count === 0 ? 0 : Math.max(6, Math.round((point.count / max) * 100)),
    isToday: point.date === lastDate.value,
  }));
});

const hasBreakdown = computed(() => props.breakdown.some((slice) => slice.count > 0));

const legend = computed(() =>
  props.breakdown.map((slice) => ({
    category: slice.category,
    label: CATEGORY_LABEL[slice.category],
    count: slice.count,
    percent: slice.percent,
  }))
);

/** 原生环形图：用圆锥渐变拼接（颜色走 CSS 变量，跟随主题） */
const donutStyle = computed(() => {
  if (!hasBreakdown.value) {
    return { background: 'var(--pd-bg-tertiary)' };
  }
  let cursor = 0;
  const stops: string[] = [];
  props.breakdown.forEach((slice) => {
    if (slice.count <= 0) return;
    const from = cursor;
    cursor += slice.percent;
    stops.push(`${CATEGORY_CSS_VAR[slice.category]} ${from}% ${cursor}%`);
  });
  return { background: `conic-gradient(${stops.join(', ')})` };
});

function barHeightStyle(percent: number): Record<string, string> {
  return { height: `${percent}%` };
}

function barTransition(index: number): string {
  if (props.reduceMotion) return 'none';
  return `height ${MOTION_DURATION.barGrow}ms ${MOTION_DURATION.barStagger * index}ms cubic-bezier(0.34, 1.56, 0.64, 1)`;
}

/* ============================================================
 * echarts（可选，仅 H5）
 * ============================================================ */
function buildBarOption(): unknown {
  const lastIndex = bars.value.length - 1;
  const gradient = {
    type: 'linear',
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: CHART_COLORS.primary },
      { offset: 1, color: CHART_COLORS.primaryLight },
    ],
  };
  const todayGradient = {
    type: 'linear',
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: CHART_COLORS.primaryDark },
      { offset: 1, color: CHART_COLORS.primary },
    ],
  };
  return {
    animation: !props.reduceMotion,
    animationDuration: MOTION_DURATION.barGrow,
    animationDelay: (index: number) => (props.reduceMotion ? 0 : index * MOTION_DURATION.barStagger),
    grid: { left: 6, right: 6, top: 26, bottom: 6, containLabel: true },
    xAxis: {
      type: 'category',
      data: bars.value.map((bar) => bar.label),
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { color: CHART_COLORS.textTertiary, fontSize: 10 },
    },
    yAxis: { type: 'value', show: false, minInterval: 1 },
    series: [
      {
        type: 'bar',
        barWidth: 12,
        label: {
          show: true,
          position: 'top',
          fontSize: 10,
          color: CHART_COLORS.textSecondary,
          formatter: '{c}',
        },
        itemStyle: { borderRadius: [4, 4, 0, 0] },
        data: bars.value.map((bar, index) => ({
          value: bar.count,
          itemStyle: { color: index === lastIndex ? todayGradient : gradient },
        })),
      },
    ],
  };
}

function buildDonutOption(): unknown {
  return {
    animation: !props.reduceMotion,
    animationDuration: MOTION_DURATION.barGrow,
    series: [
      {
        type: 'pie',
        radius: ['62%', '86%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        label: { show: false },
        labelLine: { show: false },
        data: legend.value.map((item) => ({
          name: item.label,
          value: item.count,
          itemStyle: { color: CHART_COLORS[item.category] },
        })),
      },
    ],
  };
}

function disposeCharts(): void {
  barChart?.dispose();
  donutChart?.dispose();
  barChart = null;
  donutChart = null;
}

function renderEcharts(): void {
  if (!echartsRef || mode.value !== 'echarts') return;
  const barHost = getWebChartHost(BAR_HOST_ID);
  const donutHost = getWebChartHost(DONUT_HOST_ID);
  if (!barHost || !donutHost) {
    mode.value = 'native';
    return;
  }
  try {
    if (!barChart) barChart = echartsRef.init(barHost);
    barChart.setOption(buildBarOption(), true);
    if (!donutChart) donutChart = echartsRef.init(donutHost);
    donutChart.setOption(buildDonutOption(), true);
  } catch {
    disposeCharts();
    mode.value = 'native';
  }
}

onMounted(async () => {
  if (!hasWebDocument()) return;
  const loaded = await loadEcharts();
  if (!loaded) return;
  echartsRef = loaded;
  mode.value = 'echarts';
  await nextTick();
  renderEcharts();
});

watch(
  () => [props.trend, props.breakdown, props.reduceMotion],
  () => {
    if (mode.value === 'echarts') renderEcharts();
  }
);

onBeforeUnmount(() => {
  disposeCharts();
  echartsRef = null;
});
</script>

<template>
  <view class="pd-stats-chart">
    <!-- ---------- 近 7 天完成趋势 ---------- -->
    <text class="pd-stats-chart__section-title">{{ STATS_COPY.sectionTrend }}</text>
    <view class="pd-stats-chart__card">
      <view
        v-if="mode === 'echarts'"
        class="pd-stats-chart__canvas-wrap pd-stats-chart__canvas-wrap--bar"
      >
        <canvas :id="BAR_HOST_ID" :canvas-id="BAR_HOST_ID" class="pd-stats-chart__canvas" />
      </view>

      <view v-else class="pd-bars" role="img" :aria-label="STATS_COPY.ariaBarChart">
        <view v-for="(bar, index) in bars" :key="bar.date" class="pd-bars__item">
          <text class="pd-bars__value">{{ bar.count }}</text>
          <view class="pd-bars__track">
            <view
              class="pd-bars__bar"
              :class="{ 'pd-bars__bar--today': bar.isToday }"
              :style="[barHeightStyle(bar.percent), { transition: barTransition(index) }]"
            />
          </view>
          <text class="pd-bars__label">{{ bar.label }}</text>
        </view>
      </view>
    </view>

    <!-- ---------- 分类占比 ---------- -->
    <text class="pd-stats-chart__section-title">{{ STATS_COPY.sectionCategory }}</text>
    <view class="pd-stats-chart__card">
      <view class="pd-donut">
        <view v-if="mode === 'echarts'" class="pd-donut__canvas-wrap">
          <canvas :id="DONUT_HOST_ID" :canvas-id="DONUT_HOST_ID" class="pd-stats-chart__canvas" />
        </view>
        <view v-else class="pd-donut__ring" :style="donutStyle" role="img" :aria-label="STATS_COPY.ariaDonutChart" />

        <view class="pd-donut__center" aria-hidden="true">
          <text class="pd-donut__total">{{ total }}</text>
          <text class="pd-donut__total-label">{{ STATS_COPY.donutTotal }}</text>
        </view>

        <view class="pd-donut__legend">
          <view v-for="item in legend" :key="item.category" class="pd-legend__item">
            <view class="pd-legend__dot" :class="`pd-legend__dot--${item.category}`" />
            <text class="pd-legend__label">{{ item.label }}</text>
            <text class="pd-legend__value">{{ item.count }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
@import '../../styles/mixins.scss';

.pd-stats-chart__section-title {
  display: block;
  margin: $space-2 0 $space-3;
  font-size: $font-size-lg;
  font-weight: $font-weight-semibold;
  color: var(--pd-text-primary);
}

.pd-stats-chart__card {
  padding: $space-4;
  margin-bottom: $space-5;
  background-color: var(--pd-bg-primary);
  border-radius: $radius-lg;
  box-shadow: var(--pd-shadow-xs);
}

.pd-stats-chart__canvas-wrap {
  width: 100%;
}

.pd-stats-chart__canvas-wrap--bar {
  height: 280rpx;
}

.pd-stats-chart__canvas {
  width: 100%;
  height: 100%;
}

// ---------- 原生柱状图 ----------
.pd-bars {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: 280rpx;
  padding-top: $space-2;
}

.pd-bars__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $space-2;
  height: 100%;
}

.pd-bars__value {
  font-size: $font-size-xs;
  font-weight: $font-weight-semibold;
  color: var(--pd-text-secondary);
}

.pd-bars__track {
  flex: 1;
  display: flex;
  align-items: flex-end;
  width: 100%;
  justify-content: center;
}

.pd-bars__bar {
  width: 48rpx;
  min-height: 4rpx;
  background: linear-gradient(180deg, var(--pd-color-primary) 0%, var(--pd-color-primary-light) 100%);
  border-radius: $radius-sm $radius-sm 0 0;
}

.pd-bars__bar--today {
  background: linear-gradient(180deg, var(--pd-color-primary-dark) 0%, var(--pd-color-primary) 100%);
  box-shadow: 0 0 12rpx rgba(108, 92, 231, 0.4);
}

.pd-bars__label {
  font-size: $font-size-xs;
  color: var(--pd-text-tertiary);
}

// ---------- 环形图 ----------
.pd-donut {
  position: relative;
  display: flex;
  align-items: center;
  gap: $space-5;
}

.pd-donut__ring,
.pd-donut__canvas-wrap {
  position: relative;
  flex-shrink: 0;
  width: 240rpx;
  height: 240rpx;
  border-radius: $radius-full;
}

.pd-donut__ring {
  // 空心：中心挖一个透明圆，露出卡片底色（跨端保留 -webkit 前缀）
  -webkit-mask: radial-gradient(circle at center, transparent 58%, rgb(0, 0, 0) 58%);
  mask: radial-gradient(circle at center, transparent 58%, rgb(0, 0, 0) 58%);
}

.pd-donut__center {
  position: absolute;
  left: 0;
  top: 0;
  width: 240rpx;
  height: 240rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.pd-donut__total {
  font-size: $font-size-2xl;
  font-weight: $font-weight-bold;
  color: var(--pd-text-primary);
}

.pd-donut__total-label {
  font-size: $font-size-xs;
  color: var(--pd-text-tertiary);
}

.pd-donut__legend {
  flex: 1;
  min-width: 0;
}

.pd-legend__item {
  display: flex;
  align-items: center;
  gap: $space-2;
  padding: $space-1 0;
}

.pd-legend__dot {
  width: 20rpx;
  height: 20rpx;
  border-radius: 6rpx;
  flex-shrink: 0;
}

.pd-legend__dot--work {
  background-color: var(--pd-cat-work);
}

.pd-legend__dot--study {
  background-color: var(--pd-cat-study);
}

.pd-legend__dot--life {
  background-color: var(--pd-cat-life);
}

.pd-legend__dot--other {
  background-color: var(--pd-cat-other);
}

.pd-legend__label {
  flex: 1;
  font-size: $font-size-base;
  color: var(--pd-text-secondary);
}

.pd-legend__value {
  font-size: $font-size-base;
  font-weight: $font-weight-semibold;
  color: var(--pd-text-primary);
}
</style>