# Personal Dashboard — 开发分工与契约（Phase 0 产出）

**Status**: Active
**Last Updated**: 2026-10-07
**依据**: `docs/PRD-MVP.md` v1.1、`docs/UI-UX-Design.md` v1.1

> 本文件是并行开发的分工依据。任何人对**自己的写入范围之外**的文件只读不改。

---

## 1. 交付范围（MVP）

- 平台：**H5 + Android App**（微信小程序延后至 V1.5+）
- 技术栈：UniApp + Vue3（`<script setup lang="ts">`）+ Vite + TypeScript + Pinia + SCSS
- 图表：`echarts-for-uniapp`
- 推送：系统级推送（UniPush / 个推）
- 数据：**全本地**，无账号、无云端、无网络请求（PRD Story 8）

## 2. 团队与写入范围（互不重叠）

| 角色 | 写入范围（独占） | 交付物 |
|---|---|---|
| engineering-backend-architect | `src/services/**` | 存储适配层、规则引擎、统计聚合、推送调度、导出/清空 |
| engineering-frontend-developer | `src/pages/**`、`src/components/**`、`src/store/**`、`src/utils/**`、`src/styles/{mixins,reset,common}.scss` | 8 个页面、基础/业务组件、Pinia store、全局样式 |
| engineering-mobile-app-builder | 根目录配置（含 `.gitignore`、`.npmrc`、`README.md`）+ `src/manifest.json`、`src/pages.json`、`src/main.ts`、`src/App.vue`、`src/uni.scss`、`src/shims-uni.d.ts` | 工程化、跨端构建、UniPush 原生配置、性能预算、构建文档 |
| engineering-git-workflow-master | `.git/**` | 仓库初始化、规范化提交、推送到远端（Phase 3，**不新建 `.gitignore`**，沿用 mobile 产出） |

### 只读（任何人不得修改）

- `src/types/index.ts` — 领域模型与跨层契约
- `src/services/index.ts` 及各服务模块的**导出签名**
- `src/styles/variables.scss` — 设计 token
- `docs/**`（除本人负责新增的文档外）

## 3. 冻结契约

### 3.1 导入约定

- 页面/组件/store **只能**从 `@/services` 导入服务层能力
- `@` 别名 → `src/`（由 mobile-app-builder 在 `vite.config.ts` + `tsconfig.json` 配置）

### 3.2 页面路径（冻结，`src/pages.json` 必须与之一致）

| 路径 | 说明 |
|---|---|
| `src/pages/home/index.vue` | 首页（**pages.json 首项 = 启动页**） |
| `src/pages/onboarding/index.vue` | 引导页（3 屏） |
| `src/pages/preference-setup/index.vue` | 首次偏好设置 |
| `src/pages/task-list/index.vue` | 任务列表 |
| `src/pages/task-edit/index.vue` | 创建/编辑任务 |
| `src/pages/focus/index.vue` | 专注页 |
| `src/pages/stats/index.vue` | 统计页 |
| `src/pages/settings/index.vue` | 设置/我的 |

### 3.3 导航与首次启动

- **不使用原生 `tabBar`**（避免二进制图标资源），改用自定义底部导航组件 `PdTabBar`，
  在三主页面（首页/统计/我的）内渲染，切换用 `uni.reLaunch`。
- `pages.json` **第一个页面为首页**。首页加载时若 `preference.onboarded === false`，
  `uni.reLaunch` 到引导页；引导页完成 → 偏好设置 → 回首页。

### 3.4 必须遵守的设计约束（来自 UI-UX 第 1.3 节）

1. 单任务：任何时刻只聚焦 1 个任务
2. 绝不展示「剩余 N 个任务」等制造焦虑的信息
3. 每个助推都提供「不 / 跳过 / 今天休息」
4. 触控目标 ≥ 88rpx（44px）
5. 交互反馈 ≤ 300ms
6. 不使用硬编码色值/尺寸，一律引用 `variables.scss` 的 token
7. 支持「减少动效」：`preference.reduceMotion` 为真时禁用弹跳/缩放/位移

## 4. 阶段与验收

| 阶段 | 内容 | 验收标准 |
|---|---|---|
| Phase 0 | 冻结契约（已完成） | `src/types/index.ts`、`src/styles/variables.scss`、`src/services/*` 签名就位 |
| Phase 1 | 三线并行开发 | 各自范围内代码完成，不越界修改 |
| Phase 2 | 集成与验证 | `npm run type-check` 通过；`npm run build:h5` 成功；规则引擎单测通过 |
| Phase 3 | 交付 | git-workflow-master 规范化提交并推送到 `Cuih369/Personal-Dashboard` |

## 5. 环境约束（重要）

- 本机 **无 HBuilderX / Android SDK**：Android APK 无法在本地构建，只交付配置与构建文档，
  由用户在 HBuilderX 中打包。
- 本机 **无外网直连**：npm / GitHub 均需经本地代理 `http://127.0.0.1:7890`。
- Node v22.19.0 / npm 11.14.1（不在默认 PATH，需绝对路径或先补齐 PATH）。
- 项目根目录尚未初始化 git 仓库（Phase 3 处理）。

## 6. 关联文档

- 需求：`docs/PRD-MVP.md`
- 设计：`docs/UI-UX-Design.md`
- 视觉参考：`docs/prototype/index.html`（高保真原型，可直接对照还原）
