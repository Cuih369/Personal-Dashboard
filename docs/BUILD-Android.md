# Android 打包指南（Personal Dashboard）

**Status**: Active
**Last Updated**: 2026-10-07

> ⚠️ 本机**没有** HBuilderX / Android SDK，因此 APK **无法在此环境构建**。
> 本仓库只交付 App 端资源与配置，最终打包需在你的机器上用 HBuilderX 完成。

---

## 0. 前置条件

| 项 | 说明 |
|---|---|
| HBuilderX | 3.9+（App 开发版，含云打包） |
| DCloud 账号 | https://dev.dcloud.net.cn/ |
| Android 包名 | 建议 `com.cuih.personaldashboard`（一旦发布不可更改） |
| 签名证书 | 自有 keystore（`keytool` 生成）或使用 DCloud 老版公共证书测试 |

## 1. 申请 AppID 并回填 manifest

1. 登录 DCloud 开发者中心 → 「应用」→ 新建应用（uni-app 类型）。
2. 复制生成的 AppID（形如 `__UNI__A1B2C3D`）。
3. 替换 `src/manifest.json` 中的占位值：

```json
{ "appid": "__UNI__XXXXXXX" }
```

> 未替换真实 AppID 时，云打包会被拒绝。

## 2. 配置 UniPush 2.0（系统级推送）

推送是本产品的核心助推渠道（PRD Story 6），必须配置。

1. DCloud 开发者中心 → 你的应用 → 「uniPush 2.0」→ 开通。
2. 填写 Android 厂商通道信息（按需开通，国内机型建议至少配华为/小米/OPPO/vivo/荣耀）：
   - **包名**：与 1 中一致
   - **签名 SHA1**：由 keystore 导出
     ```bash
     keytool -list -v -keystore your.keystore -alias your-alias
     ```
   - 各厂商开发者后台的 AppKey / AppSecret / AppID
3. 若使用个推厂商通道，在个推后台同步登记包名与 SHA1。
4. 在 `src/manifest.json` 中确认推送模块已开启（本仓库已预置）：

```json
"modules": { "Push": {} },
"distribute": {
  "sdkConfigs": {
    "push": { "unipush": { "version": "2", "offline": false } }
  }
}
```

> `offline: false` 表示使用**在线**推送（应用被杀死后仍可送达，依赖厂商通道）。
> 若只做开发联调，可临时改为 `true`（离线推送，仅在个推通道生效）。
>
> **注意**：推送功能未配置完成时，App 端务必保证 `pushService.isSupported()`
> 与实际能力一致，且 `schedule()` 失败必须静默降级，不得影响本地核心流程。

## 3. 权限核对

`src/manifest.json` 已按「最小必要」预置：

| 权限 | 用途 |
|---|---|
| `INTERNET` / `ACCESS_NETWORK_STATE` | 仅用于推送通道 |
| `WAKE_LOCK` | 推送唤醒 |
| `VIBRATE` | 完成任务的震动反馈（UI-UX 6.3） |
| `POST_NOTIFICATIONS` | Android 13+ 通知授权 |

> 本 App 为本地优先，**不要**添加定位、通讯录、相机等与功能无关的权限。

## 4. 打包

### 方式 A：云打包（推荐）

1. HBuilderX → 文件 → 导入 → 从本地目录导入（选择本仓库根目录）。
2. 确认 `src/manifest.json` 的 AppID 已回填。
3. 菜单：**发行 → 原生 App-云打包**。
4. 选择 Android，填写包名、证书（自有 keystore 或公共测试证书），勾选「安心打包」。
5. 等待云端返回 APK 下载链接。

### 方式 B：本地打包

需安装 Android Studio + SDK，并配置 `ANDROID_HOME`，再使用 HBuilderX 的
「原生 App-本地打包」生成离线打包工程。适合需要自定义原生插件的场景。

## 5. 体积预算验收（PRD 硬指标：APK ≤ 15MB）

```bash
# App 端资源构建（产出 dist/build/app）
npm run build:app
```

- 已开启 `abiFilters: ["armeabi-v7a", "arm64-v8a"]`，只保留两种主流 ABI
- 图表库为**动态懒加载**（见 `src/utils/echarts.ts`），不进入首屏包
- 若超标：优先用 `arm64-v8a` 单 ABI 出包，或改用「安心打包」的资源压缩

## 6. 发布前自检（对照 PRD 第 7 章）

- [ ] 核心流程跑通：创建 → 开始 → 完成 → 庆祝 → 统计
- [ ] 边界：零任务、50+ 任务、连续 7 天完成、连续 3 天未打开
- [ ] 飞行模式下所有功能正常（除推送）
- [ ] 首屏加载 ≤ 1.5s；任务保存 ≤ 500ms；统计页 ≤ 1s
- [ ] 数据导出 / 清空可用，且二次确认到位
- [ ] 推送各文案档位（早间 / 下午 / 流失召回）实机验证
- [ ] 深色模式 + 「减少动效」开关生效
- [ ] 卸载重装后数据不恢复（确认纯本地）

## 7. 常见问题

| 现象 | 处理 |
|---|---|
| 云打包报 AppID 无效 | 检查 `src/manifest.json` 的 `appid` 是否已替换为真实值 |
| 收不到推送 | 核对包名 / SHA1 与厂商后台是否一致；确认 `offline` 取值与测试场景匹配 |
| 通知不显示 | Android 13+ 需运行时授权 `POST_NOTIFICATIONS`；检查系统通知开关 |
| 打包体积超标 | 见第 5 节 |
