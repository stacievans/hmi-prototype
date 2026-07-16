# 遥操作 Web HMI 2.0

`teleop-hmi` 是一个面向机器人遥操作与模仿学习数据采集的 Web 前端原型。当前版本以前端 Mock 数据为主，完整演示「设备连接 → 遥操控制 → 数据采集 → 质检 → 压缩上传 → 异常清理 → 任务提交」的业务流程，尚未接入真实后端 API。

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
    │   └── AppContext.jsx     # 全局状态 + Mock 数据 + 数据模拟器
    ├── styles/
    │   └── index.css          # 主题与全局样式
    ├── pages/                 # 页面组件
    │   ├── TeleopPage.jsx           # 连接 / 遥操
    │   ├── CollectionPage.jsx       # 采集任务列表
    │   ├── TaskDetailPage.jsx       # 任务详情（质检、压缩、上传）
    │   ├── WorkstationPage.jsx      # 采集工作站
    │   ├── AnomalyDataPage.jsx      # 异常数据管理
    │   ├── DevicesPage.jsx          # 设备管理（存储、子系统）
    │   └── SettingsPage.jsx         # 系统设置
    └── components/            # 可复用 UI
        ├── Layout.jsx
        ├── SideNav.jsx
        ├── TopStatusBar.jsx
        ├── CollectProgressBar.jsx   # 采集进度条（质检分段着色）
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
| `/collection/task/:taskId` | TaskDetailPage | 采集文件列表、质检状态、批量压缩/上传、提交任务 |
| `/collection/workstation/:taskId` | WorkstationPage | 实际采集录制、相机、遥操、实时曲线、存储告警 |
| `/anomaly` | AnomalyDataPage | 跨任务异常数据汇总、筛选、批量删除 |
| `/devices` | DevicesPage | 机器人状态、本地存储、子系统启停、遥操设备 |
| `/settings` | SettingsPage | 系统版本信息（静态展示） |

未知路由统一回退至 `/teleop`。

### 布局壳层

```
Layout（壳层）
├── SideNav        左侧导航（连接 / 采集 / 异常数据 / 设备 / 设置）
├── TopStatusBar   顶栏状态（控制状态、延迟、电量、设备灯）
├── Outlet         主内容区（各页面）
├── LeaveConfirmModal   侧栏离开确认（控制中/录制中）
└── 全局 Toast     appToast（跨页提示，如采集中断）
```

## 布局与安全导航

系统在「设备控制中」或「录制中」时拦截非预期离开，共有 **两套入口**，行为保持一致。

### 触发条件

- `controlState === 'controlling'`（设备控制中）
- `recordingState === 'recording'`（录制中）

### 入口一：Layout 侧栏导航

`Layout.jsx` 在侧栏切换路由时弹出共享组件 `LeaveConfirmModal`：

- 取消 → 留在当前页
- 确认离开 → 调用 `releaseControl()` → 若正在录制则视为**采集中断** → 跳转目标页

### 入口二：WorkstationPage 内联确认

工作站使用**独立内联弹窗**（非 `LeaveConfirmModal`），触发场景：

- 顶栏「返回」→ 任务详情
- 顶栏「存储」角标（使用率 ≥ 80%）→ `/anomaly`

确认/取消逻辑与侧栏一致；录制中确认离开同样走采集中断流程。

### 采集中断规则（`releaseControl`）

录制中若发生退出控制或确认离开，按产品规则处理：

| 规则 | 实现 |
|------|------|
| 不生成条目 | 不调用 `doStop` 保存逻辑，不增加 `completedItems` |
| 清空缓冲与状态 | 清空 `recordingBuffer`、`frozenHistory`；`recordingState → idle`；`recordingDisplayState → hidden`；`paused → false` |
| 用户提示 | Toast：**「采集已中断，本次数据未保存」** |

提示渠道：

- 留在工作站（如点「退出控制」）→ 页面内 `flashToast`
- 确认离开并跳转 → 全局 `showAppToast`（由 `Layout` 渲染，避免页面卸载后丢失）

`releaseControl()` 返回 `wasRecording` 布尔值，供各入口决定是否展示中断提示。

> **未实现**：浏览器后退、刷新、关闭标签页的拦截（刻意不做）。

## 全局状态（AppContext）

`src/state/AppContext.jsx` 是架构核心，负责：

- 全局 React Context 状态管理
- 22 条采集任务 Mock 数据（含质检/异常样本）
- 30 Hz 实时传感器数据模拟
- 遥操控制状态机
- 录制缓冲、曲线快照、中断清理与本地回放
- **全局本地存储统计**（与设备页、异常页、工作站联动）
- **全局 Toast**（`appToast` / `showAppToast`）
- **录制暂停标志**（`paused` / `setPaused`）

通过 `useApp()` Hook 在组件中消费状态。工具函数 `parseDataSizeMB()` 可从 `dataSize` 字符串解析 MB 数值，供异常页等复用。

### 状态域一览

| 状态域 | 关键字段 | 说明 |
|--------|----------|------|
| 机器人 | `robotStatus` | IP、电量、ping、CPU 占用率、各子设备 online/warning/offline |
| 子系统 | `subSystems` | 机械臂、底盘、相机、躯干、视频流启停 |
| **本地存储** | `storage` | 总容量、系统/处理中/异常占用、使用率（由 `tasks` 实时计算） |
| 设备连接 | `connectedDevices` | 外骨骼 / VR 是否连接 |
| 输入源 | `inputSource` | `null` / `exoskeleton` / `vr` |
| 遥操 | `controlState`, `teleopMode`, `easingProgress` | idle/controlling；idle/easing/follow |
| 录制 | `recordingState`, `recordingDisplayState` | idle/recording/replaying；hidden/live/frozen |
| 实时数据 | `liveData`, `history`, `frozenHistory`, `paused` | 当前快照 + 10s 滚动历史 + 结束采集快照；`paused` 控制 tick |
| 任务 | `tasks`, `setTasks` | 采集任务及条目列表 |
| 用户 | `isLoggedIn`, `userName` | 云平台登录（Mock） |
| 全局提示 | `appToast`, `showAppToast` | 跨页面 Toast |

### 本地存储模型

机器人端侧本地占用由 **固定 Mock + 任务条目实时汇总** 构成，设备页、异常页、工作站存储角标共用同一 `storage` 对象：

```
已用 = baseGB + processingGB + anomalyGB
使用率 = 已用 / totalGB
```

| 组成部分 | 来源 | 说明 |
|----------|------|------|
| `baseGB` | 固定 Mock（8 GB） | 系统、程序等基础占用 |
| `processingGB` | 实时汇总 | 已落盘（`collectStatus === 'done'`）且 `qualityStatus !== 'failed'` 且 `uploadStatus !== 'uploaded'` |
| `anomalyGB` | 实时汇总 | 所有 `qualityStatus === 'failed'` 条目的 `dataSize` 之和 |
| `totalGB` | 固定 Mock（50 GB） | 机器人本地总容量 |

**告警阈值**（设备页存储卡片、工作站存储角标一致）：

| 使用率 | 级别 | 表现 |
|--------|------|------|
| < 80% | 正常 | 灰/蓝色 |
| 80% ~ 90% | 警告 | 黄色，可点击跳转异常页 |
| ≥ 90% | 严重 | 红色 + 告警图标，可点击跳转异常页 |

Mock 初始数据约 **92% 使用率**（异常数据占比较大），便于演示：在异常数据管理页删除 failed 条目后，存储占用与告警状态会**实时同步**下降。

### 遥操状态机

```
idle ──takeControl()──► controlling + teleopMode: easing
                              │
                    easingProgress 0 → 100%（约每 600ms 步进）
                              │
                              ▼
                         teleopMode: follow（随动）
                              │
                    releaseControl() / 离开确认
                              ▼
                            idle
```

- **开启控制**：`takeControl()` 将 `controlState → controlling`，`teleopMode → easing`，`easingProgress` 从 0 开始
- **自动随动**：`easingProgress ≥ 100%` 后延迟 500ms 自动切换 `teleopMode → follow`
- **外骨骼缓动 UI**：`/teleop` 页在 `easing` 阶段显示全屏 `EasingOverlay`，提示保持手臂静止；工作站右栏显示对齐进度条
- **VR**：状态机同样经过 `easing → follow`，但**采集准入不等待 follow**（见下文工作站规则）

### 实时数据模拟

| 参数 | 值 |
|------|-----|
| 采样率 | 30 Hz |
| 历史窗口 | 10 秒（live 模式滚动） |
| 关节角 | 7 路：左右肩 pitch/roll、肘、腰 |
| 六维力 | 6 路：Fx/Fy/Fz、Tx/Ty/Tz |
| 夹爪 | 行程（mm）、力值（N），开合为方波模拟 |

`initialSample(tSec)` 使用正弦波 + 噪声生成关节角与力数据；夹爪开合通过方波模拟。

30 Hz tick 在 `paused === true` 时**整段跳过**（不更新 `liveData` / `history`，不向 `recordingBuffer` 写入）。工作站「录制时长过短」弹窗依赖此机制暂停底层采集。

### 录制、曲线显示与回放

| API / 状态 | 说明 |
|------------|------|
| `beginLiveRecordingDisplay()` | 开始采集前：清空 `frozenHistory`，`recordingDisplayState → live`，`paused → false` |
| `finishRecordingDisplay()` | 正常结束采集：将 `recordingBuffer` 快照写入 `frozenHistory`，`recordingState → idle`，`recordingDisplayState → frozen`，`paused → true` |
| `abortRecordingSession()` | 取消/中断采集：清空 buffer 与 frozen 历史，`recordingState → idle`，`recordingDisplayState → hidden`，`paused → false` |
| `releaseControl()` | 释放控制；若正在录制则内联调用中断清理逻辑，返回 `wasRecording` |
| `recordingBuffer` | ref，录制期间 30 Hz 写入（`paused` 时不写入） |
| `exportRecordingCSV()` | 将缓冲导出为 CSV |
| `startReplay()` / `stopReplay()` | 本地回放（`recordingState === 'replaying'`） |

**曲线三阶段**（`GripperTimeDock`）：

| 阶段 | `recordingDisplayState` | 数据来源 | 表现 |
|------|-------------------------|----------|------|
| 等待 | `hidden` | — | 空状态占位 |
| 采集中 | `live` | `history`（实时滚动） | 实时数据流，写入 buffer |
| 已结束 | `frozen` | `frozenHistory`（快照） | 曲线冻结在最后一帧，可拖动时间轴回看 |

结束采集后仿真 tick 在 `recordingDisplayState === 'frozen'` 时跳过，不再更新 `history` / `liveData`，确保曲线不再变动。

### 采集进度组件（CollectProgressBar）

`src/components/CollectProgressBar.jsx` 提供统一的进度计算与两种展示形态：

| 导出 | 使用位置 | 形态 |
|------|----------|------|
| `computeCollectProgress(task)` | 内部 | 计算 `collectedCount/total`、按质检状态分段 |
| `CollectProgressBar` | TaskDetailPage | 进度条 + 下方图例 + 右侧 `8/20` 计数 |
| `CollectProgressInline` | WorkstationPage 顶栏 | 单行：`采集进度 08/20 [分段条] [合格2·异常3]` |

已落盘部分按 `qualityStatus` 着色：`passed` 绿、`failed` 红、`warning` 黄、`pending` 灰；未落盘轨道使用更暗底色 `#161b22`。

## 核心业务流

### 遥操（/teleop）

```
选择输入源（外骨骼 / VR）
  → 开启控制 takeControl()
  → teleopMode: easing，进度条 0→100%
  → 自动进入 follow（随动）
  → 外骨骼 easing 阶段：EasingOverlay 全屏提示
  → 退出控制 releaseControl()
```

主要组件：

- `CameraGrid` — 4 路相机占位（头/胸/左/右手），支持开关与全屏
- `TeleopSidePanel` — 输入源选择、遥操控制、缓动/随动状态展示
- `EasingOverlay` — 外骨骼缓动对齐全屏提示（仅 `/teleop`）

### 采集任务

```
CollectionPage 登录云平台
  → 选择任务
  → TaskDetailPage 查看条目 / 质检 / 批量压缩 / 批量上传
  → WorkstationPage 进入工作站执行采集
  → （可选）AnomalyDataPage 清理异常数据释放存储
```

#### TaskDetailPage（任务详情）

**顶栏操作区**

| 按钮 | 样式 | 说明 |
|------|------|------|
| **继续采集 / 开始采集** | 深蓝实心主按钮 `CollectPrimaryButton` | 进入采集工作站的**主入口**，置右突出 |
| 批量压缩 / 批量上传 / 提交任务 / 打开工作站 | 线框次要按钮 `OUTLINE_BTN` | 灰色底 + 边框 |

「继续采集 / 开始采集」点击后弹出「打开工作站」确认框，确认后跳转 `/collection/workstation/:taskId`。

**CollectProgressBar**：已落盘段按质检状态分段着色，图例展示各状态条数。

**文件列表**

- 按 `index` **升序**排列（新采集条目追加到 `items` 末尾，`index = max(index)+1`）
- `#` 列固定 **48px**，各列**居中对齐**；文件名列占据剩余宽度
- 列：序号、文件名、采集时间、大小、时长、压缩、质检状态、上传
- 筛选栏左侧显示「共 N 条」；支持压缩 / 上传 / 质检三维筛选与分页
- 点击异常/警告徽章打开右侧质检详情抽屉（原因、异常类型）
- **批量压缩 / 批量上传** 仅处理 `passed` 与 `warning`，排除 `failed` 与 `pending`
- 列表为只读，不支持行内删除

#### WorkstationPage（采集工作站）

**顶栏三栏布局**：

```
┌ 返回 + 存储角标 │ 采集进度 08/20 [分段条] [图例] REC? │ 任务名 + ID ─┐
└────────────────────────────────────────────────────────────────────────┘
```

**主区域两列布局**（左 2/3 + 右 1/3）：

```
┌ 左列 (2/3)              │  右列 (1/3)                  │
│  四路相机网格            │  任务详情（可折叠）            │
│  夹爪曲线 GripperTimeDock│  采集计时 + 开始/结束/取消      │
│                         │  输入源 + 遥操控制              │
└─────────────────────────┴──────────────────────────────┘
```

**采集准入条件**

| 输入源 | 条件 |
|--------|------|
| 外骨骼 | `controlState === 'controlling'` **且** `teleopMode === 'follow'` |
| VR | `controlState === 'controlling'`（不等待 follow） |

外骨骼缓动对齐期间：

- 「开始采集」按钮置灰，提示 `缓动对齐中 (XX%)，请等待随动就绪`
- 快捷键 `R` → 弹出「缓动对齐中」弹窗（含实时进度条）
- 对齐完成且弹窗仍打开 → 自动关闭并 toast「随动就绪，可以开始采集」
- **随动就绪后直接 `startRecord()`**，无开录前倒计时

**快捷键与按钮统一入口**

| 键 | 行为 | 实现要点 |
|----|------|----------|
| `R` | 开始 / 结束采集 | 经 `handleRecordClickRef` 调用，与按钮同源 |
| `S` | 结束采集 | 经 `stopRecordRef` 调用，与按钮同源 |
| `Esc` | 取消采集确认 | 弹出「确认取消录制」 |

键盘监听通过 **ref 转发**（`elapsedRef`、`stopRecordRef`、`handleRecordClickRef`）避免闭包过期，保证与按钮使用同一套实时判断。

**录制控制**

| 操作 | 行为 |
|------|------|
| 开始采集 (R) | `beginLiveRecordingDisplay()` + `recordingState → recording`，`elapsed` 从 0 开始 |
| 结束采集 (S) | 见下方「录制时长过短」弹窗 |
| 取消采集 (Esc) | 见下方「确认取消录制」弹窗 |
| 最长时长 | 5 分钟；超时前 30s 警告，5s 后自动 `doStop()` 保存 |
| 退出控制 | 录制中 → 采集中断（不保存）；非录制 → 仅释放控制 |

**弹窗：录制时长过短**（`elapsed < 3s` 时结束采集）

触发：`stopRecord()` 判断 `elapsedRef.current < MIN_DURATION`（含 0～2 秒）。

| 维度 | 弹窗期间行为 |
|------|-------------|
| 页面计时 `elapsed` | **停止**（`showWarnShort` 时 clearInterval） |
| 曲线 / `liveData` / `history` | **停止更新**（`setPaused(true)`，AppContext tick 跳过） |
| `recordingBuffer` 写入 | **停止**（同上，`push` 在 `paused`  guard 之后） |
| `recordingState` | 仍为 `'recording'`（会话未结束） |

用户选择：

- **继续录制** → `setPaused(false)`，计时与 buffer 恢复
- **丢弃** → `doStop(true)` → `abortRecordingSession()`

**弹窗：确认取消录制**（Esc / 「取消采集」）

触发：仅 `setShowCancelConfirm(true)`，**不**调用 `setPaused`。

| 维度 | 弹窗期间行为 |
|------|-------------|
| 页面计时 `elapsed` | **继续递增** |
| 曲线 / buffer | **继续写入**（`paused` 仍为 `false`） |

用户选择：

- **继续录制** → 关闭弹窗，重置 3s 倒计时
- **确认取消 / 倒计时结束** → `doStop(true)` 清空 buffer

> 两个弹窗的暂停策略** intentionally 不一致**：「过短」暂停底层采集；「取消确认」目前仅为 UI 拦截，后台录制不暂停（倒计时期间 buffer 会继续增长，取消后整段丢弃）。

保存成功时：根据 CSV 帧数估算 `dataSize`，新条目**追加**到 `items` 末尾（`index = max(index)+1`），`qualityStatus: 'pending'`，`completedItems + 1`，随后 `finishRecordingDisplay()` 冻结曲线。

**Mock 质检 Toast**（仅工作站）

- 新条目落盘后 2.2~5s 内随机完成 Mock 质检（约 68% 合格 / 16% 警告 / 16% 异常）
- 质检从 `pending` 变为终态时，右下角堆叠 Toast：`第N条：合格/警告/异常`

**其他**

- 4 路相机网格 + 开关 + 全屏（内联 `CameraTile`，非 `CameraGrid`）
- 录制中步骤描述高亮；页面外圈红色 REC 描边
- 顶部存储角标：≥ 80% 可点击跳转异常页（带离开确认）

#### AnomalyDataPage（异常数据管理）

- 跨任务聚合所有 `qualityStatus === 'failed'` 条目
- **概览区**（`grid-cols-4`）：异常总条数（25%）、总占用空间（25%）、**异常类型分布**（50%，分段色条 + 图例）
- 类型配色：文件异常 `#79c0ff`、数据缺失 `#a371f7`、时序异常 `#56d4dd`、传感器异常 `#db6d9c`
- 表格：任务、采集时间、大小（GB 两位小数）、异常类型、原因摘要、本地路径复制
- 筛选：任务、异常类型；分页 + 跨页全选
- **批量删除**：从各任务 `items` 中移除选中条目 → `anomalyGB` 下降 → 设备页/工作站存储实时更新

### 设备管理（/devices）

页面分为两个大区块（`BlockPanel` 容器）：

**机器人本体**

| 模块 | 内容 |
|------|------|
| 状态卡片 | IP 地址、电量、心跳、CPU 占用率（> 80% 黄色） |
| 存储空间 | 分段进度条（系统 / 处理中 / 异常 / 剩余）+ 图例；≥ 80% 黄、≥ 90% 红，可「前往清理」 |
| 子系统启停 | 5 个子系统（机械臂、底盘、相机、躯干、视频流），`toggleSubSystem` 模拟 2s 启动 |

**遥操设备**

- 外骨骼（EXO-PRO v3）、VR 头显（Quest Pro）连接状态卡片
- 展示当前 `inputSource` 选择

底盘从停止态启动需二次安全确认（旋钮/充电线提示）。

## 图表子系统

基于纯 SVG 自研，无第三方图表依赖：

| 组件 | 用途 | 使用位置 |
|------|------|----------|
| `LineChart` | 通用多序列折线图 | `CurveCards` |
| `GripperCurveChart` | 双 Y 轴（开合度 0~1 + 力值 0~30N） | `GripperTimeDock` |
| `GripperTimeDock` | 曲线 Dock + 10s 时间轴拖拽 | `WorkstationPage`（左列底部） |
| `CurveCards` | 关节角 / 六维力 / 夹爪三图 | 被 `CurvesPanel` 引用 |
| `CurvesPanel` | 完整曲线面板（导出/回放） | 当前未接入任何页面 |

## 任务与条目数据模型

### 任务（Task）

```javascript
{
  id, taskId, name, project, collector, scene,
  collectionMethod,   // "外骨骼遥操" | "VR遥操"
  purpose, status,    // pending | in_progress | completed
  description, initialScene, steps[],
  totalItems, completedItems,
  items: [ /* TaskItem */ ]
}
```

预置 **22** 个采集任务，覆盖桌面抓取、开门、厨房操作、书架整理、垃圾分类、衣物折叠等场景。部分任务预置了 failed / warning / pending 质检样本及大体积异常文件，用于演示存储与异常管理。

### 条目（TaskItem）

```javascript
{
  id, index,          // index 为采集序号，列表按 index 升序展示
  fileName,           // YYYYMMDD_HHMMSS.h5
  dataSize,           // 如 "5200 MB"
  duration, collectTime,
  compressStatus,     // pending | compressing | done
  uploadStatus,       // pending | uploading | uploaded | failed
  collectStatus,      // pending | done
  // 数据质量扩展字段
  qualityStatus,      // pending | passed | failed | warning
  anomalyType,        // '文件异常' | '数据缺失' | '时序异常' | '传感器异常' | '警告类' | null
  anomalyReasons,     // string[]，异常/警告原因
  localPath           // 如 /data/robot/real-world/task-001/xxx.h5
}
```

### 质检与上传规则

| 操作 | 可处理条目 |
|------|------------|
| 批量压缩 | `passed`、`warning`（已落盘） |
| 批量上传 | `passed`、`warning`（压缩完成） |
| 异常页展示/删除 | `failed` |
| 计入 processing 存储 | 已落盘、非 failed、未 uploaded |
| 计入 anomaly 存储 | `failed` |
| 不计入本地占用 | 已 uploaded 的合格数据（视为已从端侧删除） |

## 设计系统

主题定义于 `src/styles/index.css`：

- **配色**：深色 GitHub 风格（背景 `#0d1117`，主色 `#58a6ff`，警告 `#d29922`，危险 `#f85149`）
- **字体**：Inter（界面文字）、JetBrains Mono（数值/代码）
- **圆角**：输入框 6px、按钮 6px、卡片 10px
- **交互**：按钮点击缩放反馈、`card-depth` 内阴影、`prefers-reduced-motion` 适配

> 注意：全局 `button { background: none; color: inherit }` 会覆盖 Tailwind 按钮背景类。主操作按钮（如任务详情「继续采集」）、告警态控件（存储角标、质检 Chip）使用**内联样式**确保颜色生效。

任务详情主按钮配色：`#1a4f8c`（默认）→ `#2563b8`（悬停）→ `#0f3a6e`（按下）。

## 演示建议

### 存储清理闭环

1. 打开 **设备** 页 → 查看存储卡片红色告警（约 92%），注意异常数据橙色分段
2. 进入 **异常数据** 页 → 查看类型分布色条 → 全选 failed 条目 → 批量删除
3. 返回设备页 → 使用率明显下降，告警解除
4. 在 **采集工作站** 顶栏观察存储角标与采集进度同步变化

### 外骨骼采集完整流程

1. 任务详情 → 点击深蓝 **继续采集** → 确认进入工作站
2. 选择外骨骼 → 开启控制 → 观察缓动对齐（此期间「开始采集」置灰）
3. 随动就绪后开始采集 → REC 描边、曲线 live、步骤高亮
4. 结束采集（≥ 3s）→ 曲线 frozen → Mock 质检 Toast
5. 返回任务详情 → 列表按序号递增排列，进度条新增 pending 段

### 录制弹窗与暂停行为

1. **过短弹窗**：开录后 1～2 秒内按 **S 或按钮** 结束 → 应稳定弹出；弹窗期间计时与曲线停住 → 选「继续录制」恢复
2. **取消确认**：按 **Esc** → 弹窗 3s 倒计时；此期间计时与曲线**仍在走** → 确认取消后 buffer 清空

### 采集中断与离开确认

1. 录制中点击「退出控制」→ toast「采集已中断，本次数据未保存」，进度不增加
2. 录制中点侧栏其他页 → 离开确认 → 全局 toast + 跳转，条目未增加
3. 录制中点顶栏「返回」→ 工作站内联确认，行为与侧栏一致

### 曲线冻结

1. 正常结束采集后 `GripperTimeDock` 进入 `frozen` 阶段
2. 拖动时间轴回看；仿真 tick 已停止，曲线不再变动

## 已知局限

- **无真实 API**：登录、任务、设备、视频流、质检均为前端 Mock
- **无持久化**：页面刷新后状态重置
- **无自动化测试**：未见单元测试或 E2E 测试
- **遗留组件**：`CurvesPanel` 尚未接入任何页面
- **待修复**：`CameraGrid.jsx` 全屏退出按钮引用了未定义的 `onExitFullscreen`（`/teleop` 使用；工作站相机为内联实现，不受影响）
- **浏览器导航拦截**：未拦截后退/刷新/关闭标签页
- **取消确认弹窗不暂停采集**：Esc 确认期间 buffer 仍写入，与「过短」弹窗行为不一致（见上文说明）
- **暂停恢复时间戳空档**：「过短」弹窗 `paused` 期间 wall clock 继续走，恢复后 buffer 时间轴可能出现间隙
- **工作站新录制条目**：通过 CSV 帧数估算 `dataSize`；Mock 质检仅在工作站页触发

## 版本信息

| 项 | 值 |
|----|-----|
| 包名 | `teleop-hmi` |
| 版本 | `2.0.0` |
| 前端服务版本 | v3.2.1（Settings 页展示） |
| 后端服务版本 | v2.8.0（Settings 页展示，当前未接入） |

## License

© 2026 RoboTech Inc.
