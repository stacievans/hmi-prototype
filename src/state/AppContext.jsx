import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'

const AppContext = createContext(null)
export const useApp = () => useContext(AppContext)

const initialRobotStatus = {
  ip: '192.168.1.100',
  battery: 78,
  ping: 12,
  frameRate: 30,
  deviceStatus: {
    arm: 'online',
    camera: 'online',
    torso: 'warning',
    videoStream: 'online',
  },
}

const initialSubSystems = [
  { id: 'arm', name: '机械臂', status: 'running', heartbeat: '10ms', errorCode: '-' },
  { id: 'chassis', name: '底盘', status: 'running', heartbeat: '15ms', errorCode: '-' },
  { id: 'camera', name: 'RealSense 相机', status: 'running', heartbeat: '8ms', errorCode: '-' },
  { id: 'torso', name: '躯干（腰腿/头部）', status: 'stopped', heartbeat: '-', errorCode: '-' },
  { id: 'video', name: '视频流', status: 'running', heartbeat: '5ms', errorCode: '-' },
]

// File name generator: YYYYMMDD_HHMMSS.h5 offset by `t` minutes
function fnName(base, t = 0) {
  const r = new Date(base.getTime() + t * 60_000)
  return `${r.getFullYear()}${String(r.getMonth() + 1).padStart(2, '0')}${String(r.getDate()).padStart(2, '0')}_${String(r.getHours()).padStart(2, '0')}${String(r.getMinutes()).padStart(2, '0')}${String(r.getSeconds()).padStart(2, '0')}.h5`
}
function collectTime(base, t = 0) {
  const r = new Date(base.getTime() + t * 60_000)
  return `${r.getFullYear()}-${String(r.getMonth() + 1).padStart(2, '0')}-${String(r.getDate()).padStart(2, '0')} ${String(r.getHours()).padStart(2, '0')}:${String(r.getMinutes()).padStart(2, '0')}:${String(r.getSeconds()).padStart(2, '0')}`
}

const D1 = new Date('2026-03-18T09:30:00')
const D2 = new Date('2026-03-22T10:00:00')
const D3 = new Date('2026-03-15T14:00:00')

const initialTasks = [
  {
    id: 'task-001',
    taskId: 'T-20260318-001',
    name: '桌面物品抓取 - 第3批',
    project: '室内抓取数据集 v2',
    collector: '张明',
    scene: '桌面',
    collectionMethod: '外骨骼遥操',
    purpose: '模仿学习训练',
    status: 'in_progress',
    description: '采集桌面物品抓取动作数据，包含杯子、瓶子、笔等常见物品。每组动作要求：伸手→抓取→提起→放置，完整记录力矩与轨迹。',
    initialScene: '桌面上摆放杯子、瓶子、笔各1个，机械臂处于初始位姿',
    steps: ['伸手靠近目标物品', '抓取物品并施加稳定夹持力', '提起物品离开桌面约15cm', '平稳放置到指定位置'],
    totalItems: 20,
    completedItems: 8,
    items: [
      { id: 'item-1', index: 1, fileName: fnName(D1, 0),  dataSize: '345.2 MB', duration: '25s', collectTime: collectTime(D1, 0),  compressStatus: 'done', qualityStatus: 'passed', uploadStatus: 'uploaded',   collectStatus: 'done' },
      { id: 'item-2', index: 2, fileName: fnName(D1, 3),  dataSize: '412.8 MB', duration: '32s', collectTime: collectTime(D1, 3),  compressStatus: 'done', qualityStatus: 'passed', uploadStatus: 'uploaded',   collectStatus: 'done' },
      { id: 'item-3', index: 3, fileName: fnName(D1, 6),  dataSize: '298.5 MB', duration: '18s', collectTime: collectTime(D1, 6),  compressStatus: 'done', qualityStatus: 'passed', uploadStatus: 'uploaded',   collectStatus: 'done' },
      { id: 'item-4', index: 4, fileName: fnName(D1, 9),  dataSize: '521.3 MB', duration: '38s', collectTime: collectTime(D1, 9),  compressStatus: 'done', qualityStatus: 'passed', uploadStatus: 'uploaded',   collectStatus: 'done' },
      { id: 'item-5', index: 5, fileName: fnName(D1, 12), dataSize: '387.9 MB', duration: '29s', collectTime: collectTime(D1, 12), compressStatus: 'done', qualityStatus: 'passed', uploadStatus: 'uploaded',   collectStatus: 'done' },
      { id: 'item-6', index: 6, fileName: fnName(D1, 15), dataSize: '456.7 MB', duration: '35s', collectTime: collectTime(D1, 15), compressStatus: 'done', qualityStatus: 'passed', uploadStatus: 'uploading',  collectStatus: 'done' },
      { id: 'item-7', index: 7, fileName: fnName(D1, 18), dataSize: '334.1 MB', duration: '22s', collectTime: collectTime(D1, 18), compressStatus: 'done', qualityStatus: 'checking', uploadStatus: 'pending',  collectStatus: 'done' },
      { id: 'item-8', index: 8, fileName: fnName(D1, 21), dataSize: '489.6 MB', duration: '31s', collectTime: collectTime(D1, 21), compressStatus: 'compressing', qualityStatus: 'pending', uploadStatus: 'pending', collectStatus: 'done' },
    ],
  },
  {
    id: 'task-002', taskId: 'T-20260319-002',
    name: '开门关门动作采集', project: '室内导航数据集', collector: '张明',
    scene: '房门', collectionMethod: '外骨骼遥操', purpose: '策略模型微调',
    status: 'pending',
    description: '采集机器人开门、关门的完整动作序列，包含不同类型门把手。',
    initialScene: '机器人面向关闭状态的房门，距门约0.5m',
    steps: ['靠近门把手', '握住门把手并旋转开启', '推/拉门至完全打开', '反向操作关闭门'],
    totalItems: 15, completedItems: 0, items: [],
  },
  {
    id: 'task-003', taskId: 'T-20260315-003',
    name: '厨房操作采集 - 第1批', project: '厨房场景数据集', collector: '张明',
    scene: '厨房', collectionMethod: 'VR遥操', purpose: '模仿学习训练',
    status: 'completed',
    description: '采集厨房场景下的操作数据，包含拿碗、倒水等动作。',
    initialScene: '厨房台面上放置碗和水壶，机械臂处于初始位姿',
    steps: ['从柜中取出碗', '将碗放置于台面', '拿起水壶', '向碗中倒水并放回水壶'],
    totalItems: 10, completedItems: 10,
    items: Array.from({ length: 10 }, (_, i) => ({
      id: `item-k-${i + 1}`, index: i + 1, fileName: fnName(D3, i * 4),
      dataSize: `${(Math.random() * 400 + 150).toFixed(1)} MB`,
      duration: `${Math.floor(Math.random() * 25 + 8)}s`,
      collectTime: collectTime(D3, i * 4),
      compressStatus: 'done', qualityStatus: 'passed', uploadStatus: 'uploaded', collectStatus: 'done',
    })),
  },
  {
    id: 'task-004', taskId: 'T-20260320-004',
    name: '书架整理动作采集', project: '室内操作数据集', collector: '李华',
    scene: '书架', collectionMethod: '外骨骼遥操', purpose: '模仿学习训练',
    status: 'pending',
    description: '采集从书架取书、放书的操作动作，包含不同高度和位置。',
    initialScene: '机械臂位于书架前方1m，书架上摆放多本书籍',
    steps: ['伸手接近目标书籍', '抓取书籍边缘', '平稳抽出书籍', '移动至指定位置放置'],
    totalItems: 12, completedItems: 0, items: [],
  },
  {
    id: 'task-005', taskId: 'T-20260321-005',
    name: '垃圾分类投放采集', project: '环境交互数据集', collector: '王芳',
    scene: '垃圾桶', collectionMethod: 'VR遥操', purpose: '策略模型微调',
    status: 'pending',
    description: '采集识别垃圾类型并投放到相应垃圾桶的动作序列。',
    initialScene: '桌面上放置多种垃圾物品，前方有分类垃圾桶',
    steps: ['识别并抓取垃圾', '判断垃圾类别', '移动至对应垃圾桶', '松开手指投放'],
    totalItems: 18, completedItems: 0, items: [],
  },
  {
    id: 'task-006', taskId: 'T-20260322-006',
    name: '衣物折叠采集 - 第1批', project: '家务机器人数据集', collector: '张明',
    scene: '桌面', collectionMethod: '外骨骼遥操', purpose: '模仿学习训练',
    status: 'in_progress',
    description: '采集折叠不同类型衣物的操作数据，包含T恤、毛巾等。',
    initialScene: '桌面上平铺一件未折叠的衣物',
    steps: ['双臂抓取衣物两侧', '对折衣物中线', '再次对折', '整理边缘放置整齐'],
    totalItems: 25, completedItems: 3,
    items: Array.from({ length: 3 }, (_, i) => ({
      id: `item-f-${i + 1}`, index: i + 1, fileName: fnName(D2, i * 5),
      dataSize: `${(Math.random() * 450 + 250).toFixed(1)} MB`,
      duration: `${Math.floor(Math.random() * 40 + 15)}s`,
      collectTime: collectTime(D2, i * 5),
      compressStatus: 'done', qualityStatus: 'passed', uploadStatus: 'uploaded', collectStatus: 'done',
    })),
  },
  {
    id: 'task-007', taskId: 'T-20260323-007',
    name: '电器开关操作采集', project: '室内操作数据集', collector: '李华',
    scene: '墙面', collectionMethod: 'VR遥操', purpose: '策略模型微调',
    status: 'pending',
    description: '采集操作各类墙面开关的动作，包含按钮、旋钮等。',
    initialScene: '机械臂位于开关面板前方50cm',
    steps: ['定位开关位置', '伸手接近开关', '按下或旋转开关', '确认开关状态'],
    totalItems: 20, completedItems: 0, items: [],
  },
  {
    id: 'task-008', taskId: 'T-20260324-008',
    name: '抽屉开关采集 - 第2批', project: '室内导航数据集', collector: '王芳',
    scene: '柜子', collectionMethod: '外骨骼遥操', purpose: '模仿学习训练',
    status: 'pending',
    description: '采集打开和关闭不同高度抽屉的操作序列。',
    initialScene: '机械臂位于抽屉柜前方，所有抽屉处于关闭状态',
    steps: ['抓取抽屉把手', '向外拉开抽屉', '松开把手', '推回抽屉关闭'],
    totalItems: 15, completedItems: 0, items: [],
  },
  {
    id: 'task-009', taskId: 'T-20260325-009',
    name: '水果切割采集', project: '厨房场景数据集', collector: '张明',
    scene: '厨房', collectionMethod: '外骨骼遥操', purpose: '模仿学习训练',
    status: 'pending',
    description: '采集切割水果的操作数据，包含握刀、固定、对齐、下压等动作。',
    initialScene: '砧板上放置待切割水果，刀具位于旁边',
    steps: ['一只手固定水果', '另一只手握刀', '对准切割位置', '施力切割'],
    totalItems: 16, completedItems: 0, items: [],
  },
  {
    id: 'task-010', taskId: 'T-20260326-010',
    name: '插头插拔采集', project: '电器交互数据集', collector: '李华',
    scene: '墙面', collectionMethod: 'VR遥操', purpose: '模仿学习训练',
    status: 'pending',
    description: '采集对准、对齐、推入插座的完整插头操作序列。',
    initialScene: '机械臂持有插头，面向墙面插座',
    steps: ['对准插座孔位', '调整插头角度', '向前推入插头', '确认插入到位'],
    totalItems: 12, completedItems: 0, items: [],
  },
  {
    id: 'task-011', taskId: 'T-20260327-011',
    name: '键盘按键采集', project: '细粒度交互数据集', collector: '王芳',
    scene: '桌面', collectionMethod: '外骨骼遥操', purpose: '细粒度策略训练',
    status: 'pending',
    description: '采集按压单键与组合键的力度与轨迹。',
    initialScene: '机械臂位于键盘上方，手指对准按键',
    steps: ['定位目标按键', '手指下压', '感知按键触发', '手指抬起'],
    totalItems: 30, completedItems: 0, items: [],
  },
  {
    id: 'task-012', taskId: 'T-20260328-012',
    name: '鼠标点击采集', project: '精细操作数据集', collector: '张明',
    scene: '桌面', collectionMethod: 'VR遥操', purpose: '细粒度策略训练',
    status: 'pending',
    description: '采集机械臂操作鼠标点击和拖拽的动作。',
    initialScene: '机械臂位于鼠标上方，鼠标位于桌面',
    steps: ['手指接触鼠标左键', '按下鼠标', '松开鼠标', '移动鼠标位置'],
    totalItems: 12, completedItems: 0, items: [],
  },
  {
    id: 'task-013', taskId: 'T-20260329-013',
    name: '瓶盖旋转开启采集', project: '精细操作数据集', collector: '李华',
    scene: '桌面', collectionMethod: '外骨骼遥操', purpose: '细粒度策略训练',
    status: 'pending',
    description: '采集双手配合旋转开启不同尺寸瓶盖的操作。',
    initialScene: '桌面上放置多个带盖瓶子',
    steps: ['一手固定瓶身', '另一手抓握瓶盖', '逆时针旋转瓶盖', '提起瓶盖'],
    totalItems: 22, completedItems: 0, items: [],
  },
  {
    id: 'task-014', taskId: 'T-20260330-014',
    name: '纸张翻页采集', project: '精细操作数据集', collector: '王芳',
    scene: '桌面', collectionMethod: 'VR遥操', purpose: '细粒度策略训练',
    status: 'pending',
    description: '采集翻阅书籍或文件的精细手部动作。',
    initialScene: '桌面上放置打开的书籍或文件夹',
    steps: ['手指接触纸张边缘', '轻轻夹起纸张', '翻转纸张', '放下压平'],
    totalItems: 18, completedItems: 0, items: [],
  },
  {
    id: 'task-015', taskId: 'T-20260331-015',
    name: '拉链拉合采集', project: '精细操作数据集', collector: '张明',
    scene: '桌面', collectionMethod: '外骨骼遥操', purpose: '细粒度策略训练',
    status: 'pending',
    description: '采集双手协调拉动拉链的精细操作。',
    initialScene: '桌面上平铺带拉链的物品',
    steps: ['一手固定拉链底部', '另一手握住拉链头', '向上拉动拉链', '确认拉链闭合'],
    totalItems: 14, completedItems: 0, items: [],
  },
  {
    id: 'task-016', taskId: 'T-20260401-016',
    name: '笔盖开合采集', project: '精细操作数据集', collector: '李华',
    scene: '桌面', collectionMethod: 'VR遥操', purpose: '细粒度策略训练',
    status: 'in_progress',
    description: '采集拔出和盖上笔盖的双手协作动作。',
    initialScene: '桌面上放置多支带盖签字笔',
    steps: ['一手握住笔身', '另一手握住笔盖', '向外拔出笔盖', '反向盖回笔盖'],
    totalItems: 10, completedItems: 5,
    items: Array.from({ length: 5 }, (_, i) => ({
      id: `item-p-${i + 1}`, index: i + 1, fileName: fnName(D2, 20 + i * 4),
      dataSize: `${(Math.random() * 320 + 180).toFixed(1)} MB`,
      duration: `${Math.floor(Math.random() * 22 + 10)}s`,
      collectTime: collectTime(D2, 20 + i * 4),
      compressStatus: 'done', qualityStatus: 'passed', uploadStatus: 'uploaded', collectStatus: 'done',
    })),
  },
  {
    id: 'task-017', taskId: 'T-20260402-017',
    name: '遥控器按键采集', project: '室内操作数据集', collector: '王芳',
    scene: '桌面', collectionMethod: '外骨骼遥操', purpose: '模仿学习训练',
    status: 'pending',
    description: '采集操作电视遥控器按键的精细动作。',
    initialScene: '机械臂持有遥控器，面向按键区域',
    steps: ['定位目标按键', '手指对准按键', '按下按键', '松开手指'],
    totalItems: 15, completedItems: 0, items: [],
  },
  {
    id: 'task-018', taskId: 'T-20260403-018',
    name: '螺丝拧紧采集 - 第1批', project: '工具使用数据集', collector: '张明',
    scene: '工作台', collectionMethod: '外骨骼遥操', purpose: '策略模型微调',
    status: 'pending',
    description: '采集使用螺丝刀拧紧螺丝的操作数据。',
    initialScene: '工作台上放置待拧紧的部件和螺丝刀',
    steps: ['对准螺丝头', '施加下压力', '顺时针旋转', '确认拧紧'],
    totalItems: 20, completedItems: 0, items: [],
  },
  {
    id: 'task-019', taskId: 'T-20260404-019',
    name: '卡片插入采集', project: '精细操作数据集', collector: '李华',
    scene: '桌面', collectionMethod: 'VR遥操', purpose: '细粒度策略训练',
    status: 'pending',
    description: '采集将卡片精确插入卡槽的操作动作。',
    initialScene: '机械臂持有卡片，面向卡槽设备',
    steps: ['对准卡槽方向', '调整卡片角度', '缓慢插入卡片', '确认插入到位'],
    totalItems: 12, completedItems: 0, items: [],
  },
  {
    id: 'task-020', taskId: 'T-20260405-020',
    name: '喷壶喷水采集', project: '家务机器人数据集', collector: '王芳',
    scene: '桌面', collectionMethod: '外骨骼遥操', purpose: '模仿学习训练',
    status: 'pending',
    description: '采集握持喷壶并按压喷头的操作。',
    initialScene: '桌面上放置喷水壶',
    steps: ['握住喷壶把手', '对准喷水目标', '按压喷头扳机', '松开扳机'],
    totalItems: 16, completedItems: 0, items: [],
  },
  {
    id: 'task-021', taskId: 'T-20260406-021',
    name: '纸巾抽取采集', project: '日常操作数据集', collector: '张明',
    scene: '桌面', collectionMethod: 'VR遥操', purpose: '模仿学习训练',
    status: 'pending',
    description: '采集从纸巾盒抽取纸巾的精细动作。',
    initialScene: '桌面上放置纸巾盒',
    steps: ['定位纸巾边缘', '夹住纸巾', '向外抽取', '松开纸巾'],
    totalItems: 10, completedItems: 0, items: [],
  },
  {
    id: 'task-022', taskId: 'T-20260407-022',
    name: '手机滑动解锁采集', project: '精细操作数据集', collector: '李华',
    scene: '桌面', collectionMethod: '外骨骼遥操', purpose: '细粒度策略训练',
    status: 'completed',
    description: '采集在手机屏幕上滑动解锁的触控操作。',
    initialScene: '桌面上放置锁屏状态的手机',
    steps: ['定位屏幕底部', '手指接触屏幕', '向上滑动', '抬起手指'],
    totalItems: 6, completedItems: 6,
    items: Array.from({ length: 6 }, (_, i) => ({
      id: `item-m-${i + 1}`, index: i + 1, fileName: fnName(D3, 50 + i * 3),
      dataSize: `${(Math.random() * 200 + 90).toFixed(1)} MB`,
      duration: `${Math.floor(Math.random() * 12 + 5)}s`,
      collectTime: collectTime(D3, 50 + i * 3),
      compressStatus: 'done', qualityStatus: 'passed', uploadStatus: 'uploaded', collectStatus: 'done',
    })),
  },
]

// ---------------- Real-time data simulator ----------------
// Exoskeleton joint angles (degrees) — typical 7 channels read from the suit
const JOINT_KEYS = [
  { key: 'l_shoulder_pitch', label: 'L·肩 Pitch', color: '#58a6ff' },
  { key: 'l_shoulder_roll',  label: 'L·肩 Roll',  color: '#79c0ff' },
  { key: 'l_elbow',          label: 'L·肘',       color: '#a5d6ff' },
  { key: 'r_shoulder_pitch', label: 'R·肩 Pitch', color: '#3fb950' },
  { key: 'r_shoulder_roll',  label: 'R·肩 Roll',  color: '#56d364' },
  { key: 'r_elbow',          label: 'R·肘',       color: '#7ee787' },
  { key: 'waist',            label: '腰',         color: '#d29922' },
]
const FORCE_KEYS = [
  { key: 'fx', label: 'Fx', color: '#58a6ff', unit: 'N' },
  { key: 'fy', label: 'Fy', color: '#3fb950', unit: 'N' },
  { key: 'fz', label: 'Fz', color: '#d29922', unit: 'N' },
  { key: 'tx', label: 'Tx', color: '#bc8cff', unit: 'N·m' },
  { key: 'ty', label: 'Ty', color: '#f778ba', unit: 'N·m' },
  { key: 'tz', label: 'Tz', color: '#f85149', unit: 'N·m' },
]
const GRIPPER_KEYS = [
  { key: 'stroke', label: '行程', color: '#58a6ff', unit: 'mm' },
  { key: 'force',  label: '力值', color: '#f85149', unit: 'N'  },
]

const HISTORY_WINDOW_MS = 10_000   // 10-second rolling window
const SAMPLE_HZ = 30                // 30 Hz sampling

export function AppProvider({ children }) {
  const [robotStatus, setRobotStatus] = useState(initialRobotStatus)
  const [subSystems, setSubSystems] = useState(initialSubSystems)
  const [tasks, setTasks] = useState(initialTasks)
  const [connectedDevices, setConnectedDevices] = useState({ exoskeleton: true, vr: false })
  const [multipleDevicesConnected] = useState(true)
  const [controlState, setControlState] = useState('idle') // idle | controlling
  const [teleopMode, setTeleopMode] = useState('idle')     // idle | easing | follow
  const [inputSource, setInputSource] = useState(null)     // null | exoskeleton | vr
  const [easingProgress, setEasingProgress] = useState(0)
  const [recordingState, setRecordingState] = useState('idle') // idle | recording | replaying
  const [recordingTime, setRecordingTime] = useState(0)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userName, setUserName] = useState('')
  const [user, setUser] = useState({ name: '' })

  // Real-time data
  const [liveData, setLiveData] = useState(() => initialSample(0))
  const [history, setHistory] = useState([])
  const [paused, setPaused] = useState(false)
  const recordingBuffer = useRef([])   // samples saved while recording
  const replayTimer = useRef(0)

  const startedAt = useRef(Date.now())
  const pingInterval = useRef(null)

  // Simulate ping updates
  useEffect(() => {
    pingInterval.current = setInterval(() => {
      setRobotStatus((s) => ({ ...s, ping: 8 + Math.floor(Math.random() * 10) }))
    }, 3000)
    return () => clearInterval(pingInterval.current)
  }, [])

  // Simulate easing progress
  useEffect(() => {
    if (controlState !== 'controlling' || teleopMode !== 'easing') return
    const t = setInterval(() => {
      setEasingProgress((p) => {
        if (p >= 100) { clearInterval(t); return 100 }
        return Math.min(100, p + 4 + Math.random() * 4)
      })
    }, 600)
    return () => clearInterval(t)
  }, [controlState, teleopMode])

  // Auto switch to follow when easing reaches 100
  useEffect(() => {
    if (controlState === 'controlling' && teleopMode === 'easing' && easingProgress >= 100) {
      const timer = setTimeout(() => {
        setTeleopMode('follow')
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [controlState, teleopMode, easingProgress])

  // Real-time data tick (30Hz). When paused, the curve freezes but the chart still draws.
  useEffect(() => {
    if (paused && recordingState !== 'replaying') return
    const interval = 1000 / SAMPLE_HZ

    const t = setInterval(() => {
      if (recordingState === 'replaying') {
        replayTimer.current += interval / 1000
        const rt = replayTimer.current
        const rows = recordingBuffer.current
        if (rows.length === 0) {
          setRecordingState('idle')
          return
        }
        const targetT = rows[0].t + rt
        const row = rows.find((r) => r.t >= targetT) || rows[rows.length - 1]

        setLiveData({ joints: row.joints, force: row.force, gripper: row.gripper })
        setHistory((prev) => {
          const next = [...prev, { t: targetT * 1000, joints: row.joints, force: row.force, gripper: row.gripper }]
          const cutoff = targetT * 1000 - HISTORY_WINDOW_MS
          return next.length > 600 ? next.filter((s) => s.t >= cutoff) : next
        })

        if (rt >= rows[rows.length - 1].t - rows[0].t) {
          setRecordingState('idle')
        }
        return
      }

      const tSec = (Date.now() - startedAt.current) / 1000
      const sample = initialSample(tSec)
      setLiveData(sample)
      setHistory((prev) => {
        const next = prev.length === 0 || (tSec * 1000 - prev[prev.length - 1].t) >= interval
          ? [...prev, { t: tSec * 1000, ...sample }]
          : prev
        const cutoff = tSec * 1000 - HISTORY_WINDOW_MS
        return next.length > 600 ? next.filter((s) => s.t >= cutoff) : next
      })
      if (recordingState === 'recording') {
        recordingBuffer.current.push({ t: tSec, ...sample })
      }
    }, interval)
    return () => clearInterval(t)
  }, [paused, recordingState])

  const startReplay = useCallback(() => {
    if (recordingBuffer.current.length === 0) return
    setRecordingState('replaying')
    replayTimer.current = 0
    setHistory([])
  }, [])

  const stopReplay = useCallback(() => {
    setRecordingState('idle')
    replayTimer.current = 0
  }, [])

  const takeControl = useCallback(() => {
    if (!inputSource) return
    setControlState('controlling')
    setEasingProgress(0)
    setTeleopMode('easing')
  }, [inputSource])

  const releaseControl = useCallback(() => {
    setControlState('idle')
    setTeleopMode('easing')
    setEasingProgress(0)
    setRecordingState('idle')
  }, [])

  const switchToFollow = useCallback(() => {
    if (easingProgress < 100) return
    setTeleopMode('follow')
  }, [easingProgress])

  const login = useCallback((name) => {
    setIsLoggedIn(true)
    setUserName(name)
    setUser({ name })
  }, [])

  const logout = useCallback(() => {
    setIsLoggedIn(false)
    setUserName('')
  }, [])

  const toggleSubSystem = useCallback((id) => {
    setSubSystems((list) => list.map((it) => {
      if (it.id !== id) return it
      if (it.status === 'running') return { ...it, status: 'stopped', heartbeat: '-' }
      return { ...it, status: 'starting' }
    }))
    setTimeout(() => {
      setSubSystems((list) => list.map((it) => it.id === id && it.status === 'starting'
        ? { ...it, status: 'running', heartbeat: `${Math.floor(Math.random() * 15 + 5)}ms` }
        : it))
    }, 2000)
  }, [])

  // Take the buffer collected during a recording and convert to CSV
  const exportRecordingCSV = useCallback(() => {
    const rows = recordingBuffer.current
    if (rows.length === 0) return null
    const header = [
      't_s',
      ...JOINT_KEYS.map((k) => `joint_${k.key}_deg`),
      ...FORCE_KEYS.map((k) => `force_${k.key}`),
      ...GRIPPER_KEYS.map((k) => `gripper_${k.key}`),
    ]
    const lines = [header.join(',')]
    for (const r of rows) {
      lines.push([
        r.t.toFixed(3),
        ...JOINT_KEYS.map((k) => r.joints[k.key].toFixed(3)),
        ...FORCE_KEYS.map((k) => r.force[k.key].toFixed(3)),
        ...GRIPPER_KEYS.map((k) => r.gripper[k.key].toFixed(3)),
      ].join(','))
    }
    return lines.join('\n')
  }, [])

  const clearRecordingBuffer = useCallback(() => {
    recordingBuffer.current = []
  }, [])

  const value = {
    robotStatus, setRobotStatus,
    subSystems, setSubSystems, toggleSubSystem,
    tasks, setTasks,
    connectedDevices, setConnectedDevices,
    multipleDevicesConnected,
    controlState, setControlState,
    teleopMode, setTeleopMode,
    inputSource, setInputSource,
    easingProgress, setEasingProgress,
    recordingState, setRecordingState,
    recordingTime, setRecordingTime,
    isLoggedIn, setIsLoggedIn,
    userName, setUserName,
    user,
    takeControl, releaseControl, switchToFollow,
    login, logout,
    // Real-time data
    liveData, history, paused, setPaused,
    exportRecordingCSV, clearRecordingBuffer,
    recordingBufferSize: () => recordingBuffer.current.length,
    startReplay, stopReplay,
    // Exposed definitions
    JOINT_KEYS, FORCE_KEYS, GRIPPER_KEYS,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// Initial sample: produces a representative snapshot for t=0
function initialSample(tSec = 0) {
  const joints = {}
  for (const j of JOINT_KEYS) {
    const phase = ({ l_shoulder_pitch: 0, l_shoulder_roll: 1.2, l_elbow: 2.4, r_shoulder_pitch: 0.6, r_shoulder_roll: 1.8, r_elbow: 3.0, waist: 4.2 })[j.key]
    const amp   = ({ l_shoulder_pitch: 35, l_shoulder_roll: 18, l_elbow: 50, r_shoulder_pitch: 35, r_shoulder_roll: 18, r_elbow: 50, waist: 8 })[j.key]
    const freq  = 0.4 + (phase % 1) * 0.3
    joints[j.key] = +(amp * Math.sin(2 * Math.PI * freq * tSec + phase) + (Math.random() - 0.5) * 0.6).toFixed(2)
  }
  const force = {}
  const forceAmp = { fx: 8, fy: 10, fz: 22, tx: 1.2, ty: 1.5, tz: 0.8 }
  for (const f of FORCE_KEYS) {
    const noise = (Math.random() - 0.5) * 1.5
    const drift = Math.sin(2 * Math.PI * 0.3 * tSec + f.key.charCodeAt(0)) * forceAmp[f.key] * 0.3
    force[f.key] = +(forceAmp[f.key] * 0.4 + drift + noise).toFixed(2)
  }
  // Gripper: openness 0..1 as a 2-level step (square wave, no intermediate
  // levels) — gripper commanded in just two positions: closed (0) and
  // open (1).  Open dwell is short (a quick release after a sustained
  // close).  force correlates non-linearly with openness.
  const CLOSE_S = 4   // closed (0) hold
  const OPEN_S = 1.5  // open (1) hold (short release)
  const total = CLOSE_S + OPEN_S
  const phase = tSec % total
  const openness = phase < CLOSE_S ? 0 : 1
  const closing = 1 - openness             // 0 (open) .. 1 (closed)
  // Non-linear: closing^1.5 gives a quick spike near full close, gentle tail when open
  const forceN = Math.max(0, 28 * Math.pow(closing, 1.5) + (Math.random() - 0.5) * 0.6)
  const stroke = 20 + openness * 60        // 20..80mm
  const gripper = {
    open: +openness.toFixed(2),
    stroke: +stroke.toFixed(2),
    force: +forceN.toFixed(2),
  }
  return { joints, force, gripper }
}
