# Personal Dashboard

> 行为型生产力助手 —— **不是帮你列更多任务，而是陪你把事情做完。**

传统待办 App 帮你列出更多任务，却让你更难开始。Personal Dashboard 用三个机制解决「列了不做」：

1. **单任务展示** —— 打开只看到 1 个最该做的任务，绝不显示「剩余 N 个」
2. **微冲刺引导** —— 把任务拆成 5 分钟就能启动的最小步骤
3. **即时正反馈** —— 完成后立刻庆祝，量化已完成的，忽略剩余的

**全本地存储，无需账号，无需联网**（除系统级推送外不产生任何网络请求）。

## 技术栈

| 层级 | 选型 |
|---|---|
| 跨端框架 | UniApp（Vue 3 + Vite） |
| 语言 / 状态 | TypeScript（strict）/ Pinia |
| 样式 | SCSS（设计 token 见 `src/styles/variables.scss`） |
| 数据 | App 端 SQLite；H5 端 localStorage 降级 |
| 图表 | echarts-for-uniapp（动态懒加载，可降级为纯样式图表） |
| 推送 | UniPush / 个推（系统级推送） |
| 目标平台 | **H5 + Android App**（小程序延后至 V1.5+） |

## 快速开始

```bash
npm install

npm run dev:h5         # H5 开发（默认 http://localhost:5173）
npm run build:h5       # H5 生产构建 → dist/build/h5

npm run type-check     # vue-tsc 类型检查
npm run test           # 规则引擎 / 统计 单元测试（vitest）

npm run dev:app        # App 端开发（需 HBuilderX 运行基座）
npm run build:app      # App 端资源构建 → dist/build/app
```

> `build:app` 只产出**资源**。真正的 APK 必须用 HBuilderX 云打包 / 本地打包，
> 见 [`docs/BUILD-Android.md`](docs/BUILD-Android.md)。

## 环境要求

- Node.js ≥ 18（本仓库在 Node 22.19.0 / npm 11.14.1 上验证）
- 依赖版本已按 uni-app Vue3 alpha 的 peer 约束锁定，**请勿随意升级**：
  - `vite` 固定 `5.2.8`（`@dcloudio/vite-plugin-uni` 的 peer 精确要求）
  - `vue` 固定 `3.4.21`（对齐 uni-app 内置 `@vue/compiler-sfc` 3.4.21）
  - `pinia` 固定 `2.2.4`（`2.3.x` 要求 Vue ≥ 3.5.11，与上面的 Vue 版本冲突）

### 受限网络（内网 / 沙箱）

若 `npm install` 无法直连 registry，请走本地代理，**不要把代理写进仓库**：

```powershell
$env:HTTP_PROXY='http://127.0.0.1:7890'
$env:HTTPS_PROXY='http://127.0.0.1:7890'
npm install
```

## 目录结构

```
src/
├── services/        # 服务层（存储/规则引擎/统计/推送/导出）—— 唯一数据入口
├── store/           # Pinia：tasks / preferences / stats / session
├── pages/           # 8 个页面（home 为启动页）
├── components/
│   ├── base/        # PdButton / PdCard / PdInput / PdModal ...
│   ├── layout/      # PdPage / PdTabBar / PdGlobalOverlays
│   └── business/    # TaskCard / CelebrationModal / StatsChart ...
├── styles/          # 设计 token + mixins + 全局样式入口 index.scss
├── types/           # 领域模型与跨层契约（冻结）
└── utils/           # 无状态工具（主题/动效/文案/成就…）
```

### 两条硬性约定

- 页面 / 组件**只允许**从 `@/services` 取数据，不得直接触碰存储
- 页面 / 组件**不得硬编码**色值与尺寸，一律引用 `variables.scss` 的 token

## 文档

- 需求： [`docs/PRD-MVP.md`](docs/PRD-MVP.md)
- 设计规范： [`docs/UI-UX-Design.md`](docs/UI-UX-Design.md)
- 开发分工与契约： [`docs/DEV-PLAN.md`](docs/DEV-PLAN.md)
- Android 打包： [`docs/BUILD-Android.md`](docs/BUILD-Android.md)
- 高保真原型： [`docs/prototype/index.html`](docs/prototype/index.html)

## 隐私

所有任务与偏好数据仅存于本机（App 沙盒 SQLite / H5 localStorage）。
卸载重装不会恢复数据——这是有意为之。可在「我的 → 数据管理」导出 JSON 备份或清空数据。
