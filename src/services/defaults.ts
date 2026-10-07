/** 偏好默认值（PRD Story 5 + UI-UX 第 5.7 节）。 */

import type { UserPreference } from '@/types';

export const DEFAULT_PREFERENCE: UserPreference = {
  id: 'default',
  pushChannel: 'app',
  pushFrequency: 'smart',
  motivationStyle: 'encouragement',
  focusHoursStart: '08:00',
  focusHoursEnd: '12:00',
  focusHoursStart2: '14:00',
  focusHoursEnd2: '18:00',
  userStatus: 'fresh',
  consecutiveDays: 0,
  lastActiveDate: '',
  focusDuration: 5,
  theme: 'system',
  reduceMotion: false,
  onboarded: false,
};