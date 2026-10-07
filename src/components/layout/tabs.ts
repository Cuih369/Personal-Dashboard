/**
 * 底部导航项定义（DEV-PLAN 3.3 / UI-UX 第 3.4.6 节）
 * 独立成模块，避免在 <script setup> 中写 export（SFC 编译器不允许）
 */
export type TabKey = 'home' | 'stats' | 'settings';

export interface TabItem {
  key: TabKey;
  label: string;
  icon: string;
  url: string;
}

export const TAB_ITEMS: readonly TabItem[] = [
  { key: 'home', label: '首页', icon: '🏠', url: '/pages/home/index' },
  { key: 'stats', label: '统计', icon: '📊', url: '/pages/stats/index' },
  { key: 'settings', label: '我的', icon: '⚙️', url: '/pages/settings/index' },
] as const;