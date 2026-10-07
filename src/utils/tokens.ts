/**
 * 设计 token 的字面值（JS 侧）
 *
 * 少数 API 只接受字面色值（如 uni <switch color>、canvas / echarts 绘制），
 * 无法使用 CSS 变量。此处集中声明一次，与 src/styles/variables.scss 一一对应。
 * ⚠️ 修改色值时必须同步 variables.scss，避免分叉。
 */
export const TOKEN_HEX = {
  primary: '#6c5ce7',
  primaryLight: '#a29bfe',
  primaryDark: '#4834d4',
  primaryBg: '#f0eeff',
  success: '#00b894',
  warning: '#fdcb6e',
  error: '#e17055',
  info: '#0984e3',
  textSecondary: '#636e72',
  textTertiary: '#b2bec3',
  divider: '#f1f2f6',
  categoryWork: '#6c5ce7',
  categoryStudy: '#0984e3',
  categoryLife: '#00b894',
  categoryOther: '#fdcb6e',
} as const;