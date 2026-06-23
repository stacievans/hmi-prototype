# 遥操作 Web HMI 2.0

`teleop-hmi` 是一个面向机器人遥操作与模仿学习数据采集的 Web 前端原型。当前版本以前端 Mock 数据为主，完整演示「设备连接 → 遥操控制 → 数据采集 → 压缩上传 → 任务提交」的业务流程，尚未接入真实后端 API。

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | React 18.3 |
| 构建 | Vite 5.4 |
| 路由 | react-router-dom 6 |
| 样式 | Tailwind CSS 4（`@tailwindcss/vite`） |
| 图标 | lucide-react |
| 语言 | JavaScript（`.jsx`） |
| 图表 | 自研 SVG 折线图（无第三方图表库） |

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式（默认 http://localhost:5510，端口见 vite.config.js）
npm run dev

# 生产构建
npm run build

# 预览构建产物
npm run preview
```

开发服务器监听 `0.0.0.0:5510`（`vite.config.js` 中配置，使用 `strictPort` 避免与 Vite 默认 5173 及其他原型冲突），可在局域网内访问。

## 目录结构

```
HMI/
├── index.html                 # HTML 入口
├── package.json
├── vite.config.js
├── dist/                      # 构建产物
└── src/
    ├── main.jsx               # 应用入口
    ├── App.jsx                # 路由定义
    ├── state/
    │   └── AppContext.jsx     # 全局状态 + 数据模拟器
    ├── styles/
    │   └── index.css          # 主题与全局样式
    ├── pages/                 # 页面组件
    │   ├── TeleopPage.jsx           # 连接 / 遥操
    │   ├── CollectionPage.jsx       # 采集任务列表
    │   ├── TaskDetailPage.jsx       # 任务详情
    │   ├── WorkstationPage.jsx      # 采集工作站
    │   ├── DevicesPage.jsx          # 设备管理
    │   └── SettingsPage.jsx         # 系统设置
    └── components/            # 可复用 UI
        ├── Layout.jsx
        ├── SideNav.jsx
        ├── TopStatusBar.jsx
        ├── CameraGrid.jsx
        ├── TeleopSidePanel.jsx
        ├── EasingOverlay.jsx
        ├── LeaveConfirmModal.jsx
        └── charts/
            ├── LineChart.jsx
            ├── GripperCurveChart.jsx
            ├── GripperTimeDock.jsx
            ├── CurveCards.jsx
            └── CurvesPanel.jsx
```

## 应用入口

```
index.html → src/main.jsx → BrowserRouter + AppProvider → App.jsx
```

`main.jsx` 挂载 React 根节点，包裹路由与全局 Context；`App.jsx` 定义所有页面路由。

## 路由与页面

| 路由 | 页面 | 职责 |
|------|------|------|
| `/` | — | 重定向至 `/teleop` |
| `/teleop` | TeleopPage | 相机预览、输入源选择、开启/退出遥操控制 |
| `/collection` | CollectionPage | 云平台登录、任务搜索与分页列表 |
| `/collection/task/:taskId` | TaskDetailPage | 采集文件列表、批量压缩/上传、提交任务 |
| `/collection/workstation/:taskId` | WorkstationPage | 实际采集录制、相机、遥操、实时曲线 |
| `/devices` | DevicesPage | 机器人子系统启停、外骨骼/VR 设备状态 |
| `/settings` | SettingsPage | 系统版本信息（静态展示） |

未知路由统一回退至 `/teleop`。

### 路由关系

```
Layout（壳层）
├── SideNav        左侧导航（连接 / 采集 / 设备 / 设置）
├── TopStatusBar   顶栏状态（控制状态、延迟、电量、设备灯）
└── Outlet         主内容区（各页面）
```

## 布局与安全导航

`Layout.jsx` 提供固定的三栏壳层结构。在以下状态时切换路由会触发 `LeaveConfirmModal` 安全确认：

- `controlState === 'controlling'`（设备控制中）
- `recordingState === 'recording'`（录制中）

确认离开后会调用 `releaseControl()` 释放设备控制，再执行页面跳转。

## 全局状态（AppContext）

`src/state/AppContext.jsx` 是架构核心，负责：

- 全局 React Context 状态管理
- 22 条采集任务 Mock 数据
- 30 Hz 实时传感器数据模拟
- 遥操控制状态机
- 录制缓冲与本地回放

通过 `useApp()` Hook 在组件中消费状态。

### 状态域一览

| 状态域 | 关键字段 | 说明 |
|--------|----------|------|
| 机器人 | `robotStatus` | IP、电量、ping、各子设备 online/warning/offline |
| 子系统 | `subSystems` | 机械臂、底盘、相机、躯干、视频流启停 |
| 设备连接 | `connectedDevices` | 外骨骼 / VR 是否连接 |
| 输入源 | `inputSource` | `null` / `exoskeleton` / `vr` |
| 遥操 | `controlState`, `teleopMode`, `easingProgress` | idle/controlling；easing/follow |
| 录制 | `recordingState`, `recordingDisplayState` | idle/recording/replaying；hidden/live/frozen |
| 实时数据 | `liveData`, `history`, `paused` | 当前快照 + 10s 滚动历史 |
| 任务 | `tasks` | 采集任务及条目列表 |
| 用户 | `isLoggedIn`, `userName` | 云平台登录（Mock） |

### 遥操状态机

```
idle ──takeControl()──► controlling
                              │
                    ┌─────────┴─────────┐
                    │ 外骨骼             │ VR
                    ▼                   ▼
                 easing ──100%──► follow   follow（直接进入）
                    │
              releaseControl()
                    ▼
                  idle
```

- **外骨骼**：开启控制后先进入 `easing`（缓动对齐），进度达 100% 后自动切换为 `follow`（随动）
- **VR**：开启控制后直接进入 `follow`
- 缓动阶段会显示全屏 `EasingOverlay` 遮罩，提示保持手臂静止

### 实时数据模拟

| 参数 | 值 |
|------|-----|
| 采样率 | 30 Hz |
| 历史窗口 | 10 秒 |
| 关节角 | 7 路：左右肩 pitch/roll、肘、腰 |
| 六维力 | 6 路：Fx/Fy/Fz、Tx/Ty/Tz |
| 夹爪 | 行程（mm）、力值（N），开合为方波模拟 |

`initialSample(tSec)` 使用正弦波 + 噪声生成关节角与力数据；夹爪开合通过方波模拟。

### 录制与回放

- 录制期间数据写入 `recordingBuffer`（ref，避免 30 Hz 触发重渲染）
- `exportRecordingCSV()` 将缓冲导出为 CSV
- `startReplay()` / `stopReplay()` 支持本地回放

## 核心业务流

### 遥操（/teleop）

```
选择输入源（外骨骼 / VR）
  → 开启控制 takeControl()
  → 外骨骼：easing 缓动对齐（EasingOverlay）
  → 进度 100% 后自动进入 follow 随动
  → VR：直接进入随动
```

主要组件：

- `CameraGrid` — 4 路相机占位（头/胸/左/右手），支持开关与全屏
- `TeleopSidePanel` — 输入源选择、遥操控制、运动模式展示
- `EasingOverlay` — 缓动对齐全屏提示

### 采集任务

```
CollectionPage 登录云平台
  → 选择任务
  → TaskDetailPage 查看条目 / 批量压缩 / 批量上传
  → WorkstationPage 进入工作站执行采集
```

**WorkstationPage** 功能要点：

- 4 路相机网格 + 全屏切换
- 任务进度、步骤描述、采集计时器
- 录制控制（最短 3s，最长 5min）
- 快捷键：`R` 开始、`S` 结束、`Esc` 取消
- 底部 `GripperTimeDock`：夹爪曲线 + 10s 时间轴拖拽回看

录制结束后，数据会写入对应任务的 `items` 数组。

### 设备管理（/devices）

- 展示机器人 IP、电量、心跳延迟
- 5 个子系统启停（`toggleSubSystem`，2s 模拟启动过程）
- 底盘启动需二次安全确认
- 外骨骼 / VR 连接状态卡片

## 图表子系统

基于纯 SVG 自研，无第三方图表依赖：

| 组件 | 用途 | 使用位置 |
|------|------|----------|
| `LineChart` | 通用多序列折线图 | `CurveCards` |
| `GripperCurveChart` | 双 Y 轴（开合度 + 力值） | `GripperTimeDock` |
| `GripperTimeDock` | 底部曲线 Dock + 时间轴拖拽 | `WorkstationPage` |
| `CurveCards` | 关节角 / 六维力 / 夹爪三图 | 被 `CurvesPanel` 引用 |
| `CurvesPanel` | 完整曲线面板（导出/回放） | 当前未接入任何页面 |

`GripperTimeDock` 显示三阶段：

| 阶段 | `recordingDisplayState` | 表现 |
|------|-------------------------|------|
| 等待 | `hidden` | 空状态占位 |
| 采集中 | `live` | 实时数据流 |
| 已结束 | `frozen` | 曲线冻结在最后一帧 |

## 任务数据模型

```javascript
{
  id, taskId, name, project, collector, scene,
  collectionMethod,   // "外骨骼遥操" | "VR遥操"
  purpose, status,    // pending | in_progress | completed
  description, initialScene, steps[],
  totalItems, completedItems,
  items: [{
    id, index,
    fileName,           // YYYYMMDD_HHMMSS.h5
    dataSize, duration, collectTime,
    compressStatus,     // pending | compressing | done
    qualityStatus,      // pending | checking | passed
    uploadStatus,       // pending | uploading | uploaded | failed
    collectStatus       // pending | done
  }]
}
```

预置 22 个采集任务，覆盖桌面抓取、开门、厨房操作、书架整理、垃圾分类等场景。

## 设计系统

主题定义于 `src/styles/index.css`：

- **配色**：深色 GitHub 风格（背景 `#0d1117`，主色 `#58a6ff`）
- **字体**：Inter（界面文字）、JetBrains Mono（数值/代码）
- **圆角**：输入框 6px、按钮 6px、卡片 10px
- **交互**：按钮点击缩放反馈、`card-depth` 内阴影、`prefers-reduced-motion` 适配

## 已知局限

- **无真实 API**：登录、任务、设备、视频流均为前端 Mock
- **无持久化**：页面刷新后状态重置
- **无自动化测试**：未见单元测试或 E2E 测试
- **遗留组件**：`CurvesPanel` 尚未接入任何页面
- **待修复**：`CameraGrid.jsx` 全屏退出按钮引用了未定义的 `onExitFullscreen`

## 版本信息

| 项 | 值 |
|----|-----|
| 包名 | `teleop-hmi` |
| 版本 | `2.0.0` |
| 前端服务版本 | v3.2.1（Settings 页展示） |
| 后端服务版本 | v2.8.0（Settings 页展示，当前未接入） |

## License

© 2026 RoboTech Inc.
