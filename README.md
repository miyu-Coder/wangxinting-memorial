# 王新亭将军红色教育基地线上导览系统

湖北省爱国主义教育基地官方 H5 导览系统，面向参观者提供展点导览、知识答题、互动打卡等数字化体验，同时为管理人员提供数据看板与内容管理后台。

## 一、项目概述

| 项目 | 说明 |
|------|------|
| 项目名称 | 王新亭将军红色教育基地线上导览系统 |
| 技术架构 | 前后端一体（Express 静态托管 + RESTful API） |
| 部署方式 | Node.js 单进程部署，SQLite 文件数据库，零配置启动 |
| 目标用户 | 红色教育基地参观者（移动端为主）、基地管理人员 |

## 二、功能清单

### 参观者端

| 功能 | 描述 |
|------|------|
| 首页 | 将军生平时间轴、红色足迹地图（ECharts 地图可视化）、活动动态滚动、留言墙预览 |
| 展点导览 | 四大展区详情页（陈列馆、故居、纪念园、将军铜像），支持图文/音频/视频多媒体展示 |
| 打卡签到 | 每个展点独立打卡，记录昵称与时间，基于 IP+UA 指纹去重 |
| 献花致敬 | 每个展点可献花一次，查看近期献花名单，飘花瓣全屏动画 |
| 知识答题 | 每个展点 4 道选择题，即时评分，记录答题用时，满分可预约纪念品 |
| 留言墙 | 提交留言（需审核），查看已通过留言，黑板粉笔风格渲染，支持多字体/多颜色/倾斜/旋转 |
| 排行榜 | 答题排行榜，综合得分率(50%)+完成度(30%)+速度分(20%)，完成全部展点者优先 |
| 纪念品预约 | 展点满分预约对应奖品，四展点全满分解锁礼盒，排行榜预约按排名分配奖品 |
| 成就系统 | 打卡/答题/献花进度追踪，成就勋章展示，生成成就海报（含二维码） |
| 荣誉证书 | 完成所有展点打卡后生成电子证书（Canvas 绘制） |
| 统一昵称 | 全站共享昵称，支持修改，自动生成默认昵称，localStorage 持久化 |
| 庆祝动画 | 打卡成功飘星、献花成功飘花瓣全屏 Canvas 动画 |
| 字体调节 | 全局字体大小调节（适老化设计），localStorage 记忆 |
| 背景音乐 | 展点语音讲解自动播放，全局 BGM 控制 |

### 管理端

| 功能 | 描述 |
|------|------|
| 数据看板 | 总访问量、今日/昨日 PV/UV、近 7 日趋势图（ECharts）、时段分布、转化率分析 |
| 留言审核 | 通过/拒绝/删除留言，软删除机制（status=2） |
| 答题记录 | 查看各展点答题统计与记录，答题时长统计 |
| 展点管理 | 编辑展点内容/题目，iframe 实时预览，CSV 导入导出 |
| 纪念品管理 | 查看预约列表，标记已领取，按状态筛选，自动填充 prize_name |
| 排行榜预约 | 排行榜预约按排名自动分配奖品名称 |
| 操作日志 | 记录所有管理操作（审核/删除/修改/导出等） |
| 数据导出 | 打卡/献花/答题/纪念品/全部数据 CSV 导出，UTF-8 BOM 编码 |
| 智能分析 | 展点转化率（浏览→打卡）、答题时长分析、热门展点统计 |
| 系统工具 | 一键生成演示数据（含加权分布、周末加成）、清空测试数据、系统状态监控 |

## 三、技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端基础 | HTML5 / CSS3 / JavaScript (ES6+) | - |
| 图表可视化 | ECharts | CDN |
| 后端框架 | Express | ^5.2.1 |
| 数据库 | SQLite 3 (sqlite3 驱动) | ^6.0.1 |
| 环境变量 | dotenv | ^17.4.2 |
| 安全中间件 | helmet | ^8.1.0 |
| 跨域支持 | cors | ^2.8.6 |
| 开发工具 | nodemon | ^3.1.14 |

## 四、数据库设计

### 表结构一览

#### 1. visits — 打卡记录

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 主键 |
| user_identifier | TEXT | NOT NULL, UNIQUE(exhibit_id) | 用户指纹（IP+UA 的 MD5 前16位） |
| exhibit_id | INTEGER | NOT NULL | 展点 ID（1-4） |
| visited_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 打卡时间 |
| nickname | TEXT | - | 用户昵称 |

#### 2. flowers — 献花记录

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 主键 |
| user_identifier | TEXT | NOT NULL, UNIQUE(exhibit_id) | 用户指纹 |
| exhibit_id | INTEGER | NOT NULL | 展点 ID（1-4） |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 献花时间 |
| nickname | TEXT | - | 用户昵称 |

#### 3. quiz_records — 答题记录

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 主键 |
| nickname | TEXT | NOT NULL | 用户昵称 |
| exhibit_id | INTEGER | NOT NULL | 展点 ID（1-4） |
| score | INTEGER | NOT NULL | 得分（0-4） |
| completed_at | DATETIME | - | 答题完成时间 |
| time_cost | INTEGER | DEFAULT 0 | 答题用时（秒） |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 记录创建时间 |

#### 4. messages — 留言

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 主键 |
| nickname | TEXT | NOT NULL | 昵称 |
| content | TEXT | NOT NULL | 留言内容 |
| status | INTEGER | DEFAULT 0 | 状态：0待审核/1通过/2拒绝（软删除） |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

#### 5. page_views — 页面访问记录

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 主键 |
| page | VARCHAR(50) | - | 页面标识（index/detail_1~4/flower-wall） |
| session_id | VARCHAR(32) | - | 会话 ID |
| visit_time | DATETIME | DEFAULT CURRENT_TIMESTAMP | 访问时间 |

#### 6. souvenir_orders — 纪念品预约

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 主键 |
| nickname | TEXT | NOT NULL | 昵称 |
| exhibit_id | INTEGER | NOT NULL | 展点 ID（0=全部满分，1-4=单展点） |
| name | TEXT | NOT NULL | 真实姓名 |
| phone | TEXT | NOT NULL | 手机号 |
| status | INTEGER | DEFAULT 0 | 状态：0待领取/1已领取 |
| order_type | TEXT | DEFAULT 'exhibit' | 预约类型：exhibit/ranking |
| prize_name | TEXT | - | 奖品名称（自动填充） |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 预约时间 |

#### 7. admin_logs — 管理操作日志

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 主键 |
| action | TEXT | NOT NULL | 操作类型 |
| target | TEXT | - | 操作对象 |
| detail | TEXT | - | 操作详情 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 操作时间 |

### 去重约束策略

- **visits/flowers**: `UNIQUE(user_identifier, exhibit_id)` — 同一用户同一展点只能打卡/献花一次
- **quiz_records**: 业务层去重 — 同一昵称同一展点只能答题一次
- **page_views**: 业务层去重 — 10 分钟内同一会话同一页面不重复记录

## 五、API 接口清单

### 1. 打卡模块

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | `/api/checkin` | 打卡签到 |
| GET | `/api/checkin/stats` | 各展点打卡人数统计 |
| GET | `/api/checkin/:exhibitId` | 查询当前用户是否已打卡 |

### 2. 献花模块

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | `/api/flower` | 献花致敬 |
| GET | `/api/flower/:exhibitId` | 获取展点献花总数 |
| GET | `/api/flower/user/:exhibitId` | 查询当前用户是否已献花 |
| GET | `/api/flower/recent/:exhibitId` | 获取近期献花名单 |

### 3. 答题模块

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | `/api/quiz/submit` | 提交答题记录 |
| GET | `/api/quiz/records` | 获取答题记录列表 |
| GET | `/api/quiz/stats` | 各展点答题统计 |
| GET | `/api/quiz/time-by-user` | 获取当前用户各展点答题用时 |

### 4. 排行榜模块

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/rankings/quiz` | 答题排行榜（综合得分率+完成度+速度分） |

### 5. 留言模块

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | `/api/messages` | 提交留言 |
| GET | `/api/messages` | 获取已审核留言（分页） |

### 6. 纪念品预约模块

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | `/api/souvenir/order` | 提交纪念品预约（支持展点/排行榜两种类型） |

### 7. 页面访问统计模块

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | `/api/track/page` | 记录页面访问（10分钟去重） |
| GET | `/api/stats/overview` | 访问统计概览（PV/UV/转化率/献花数） |
| GET | `/api/stats/daily-trend` | 近7日访问趋势 |
| GET | `/api/stats/hourly-today` | 今日访问时段分布 |

### 8. 管理端 — 留言审核

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | `/api/admin/login` | 管理员登录验证 |
| GET | `/api/admin/messages` | 获取全部留言 |
| POST | `/api/admin/messages/:id/approve` | 审核通过（status→1） |
| POST | `/api/admin/messages/:id/reject` | 审核拒绝（status→2，软删除） |
| DELETE | `/api/admin/messages/:id` | 删除留言 |

### 9. 管理端 — 展点管理

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/admin/exhibits` | 获取展点列表 |
| GET | `/api/admin/exhibits/:id` | 获取展点详情 |
| POST | `/api/admin/exhibits/:id` | 更新展点内容 |
| POST | `/api/admin/exhibits/:id/quiz` | 更新展点题目 |
| GET | `/api/admin/export-exhibits` | 导出展点 CSV |
| POST | `/api/admin/import-exhibits` | 导入展点 CSV |

### 10. 管理端 — 纪念品管理

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/admin/souvenir/list` | 预约列表（自动补充 prize_name） |
| POST | `/api/admin/souvenir/:id/deliver` | 标记已领取 |

### 11. 管理端 — 数据导出与统计

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/admin/export/checkins` | 导出打卡数据 CSV |
| GET | `/api/admin/export/flowers` | 导出献花数据 CSV |
| GET | `/api/admin/export/quiz` | 导出答题数据 CSV |
| GET | `/api/admin/export/souvenir` | 导出纪念品预约 CSV |
| GET | `/api/admin/export/all` | 导出全部数据 CSV |
| GET | `/api/admin/quiz/time-stats` | 答题时长统计 |
| GET | `/api/admin/quiz/advanced-stats` | 答题高级统计 |
| GET | `/api/admin/logs` | 操作日志 |

### 12. 系统工具模块

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/system/status` | 系统状态（运行时间/数据库大小） |
| GET | `/api/activity/recent` | 最近活动动态 |
| POST | `/api/admin/generate-demo-data` | 一键生成演示数据 |
| POST | `/api/admin/clear-test-data` | 清空测试数据 |

## 六、系统架构说明

### 前后端交互流程

```
┌─────────────┐     HTTP/RESTful API     ┌──────────────┐
│   浏览器端    │ ◄──────────────────────► │  Express 服务  │
│  (HTML/CSS/JS)│    JSON 数据交换         │  (server.js)  │
└─────────────┘                          ┌──────────────┐
                                         │  SQLite 数据库 │
                                         │  (data.db)    │
                                         └──────────────┘
```

### 数据流向

1. **参观者交互**：用户在展点页面打卡/献花/答题 → 前端 JS 调用 API → 服务端写入数据库 → 返回结果
2. **数据统计**：服务端聚合查询 → 管理后台 ECharts 渲染图表
3. **内容管理**：管理后台编辑 → 服务端读写 data.json → 前端页面动态加载
4. **用户追踪**：IP+UA 生成 MD5 指纹 → 作为 user_identifier 关联打卡/献花记录

### 排行榜算法

```
排名分 = 得分率 × 50% + 完成度 × 30% + 速度分 × 20%

得分率 = (总分 / 16) × 100        -- 每展点最高4分，4展点满分16
完成度 = (已完成展点数 / 4) × 100  -- 完成全部4展点的用户优先
速度分 = (最快完成时间 / 用户完成时间) × 100

排序规则：先按 completed_exhibits 降序，再按 ranking_score 降序
```

### 纪念品名称映射

| exhibit_id | 展点预约奖品名称 |
|---|---|
| 0 | 将军纪念礼盒（四件套精装版） |
| 1 | 将军纪念徽章 |
| 2 | 红色传承手环 |
| 3 | 荣誉纪念证书 |
| 4 | 军工主题书签 |

| 排名 | 排行榜预约奖品名称 |
|---|---|
| 第1名 | 第1名·将军纪念礼盒 |
| 第2-3名 | 第2-3名·任选两件纪念品 |
| 第4-10名 | 第4-10名·任选一件纪念品 |

## 七、安装和运行

```bash
# 安装依赖
npm install

# 启动服务
node server.js

# 开发模式（自动重启）
npm run dev

# 访问
# 参观者端：http://localhost:3000
# 管理后台：http://localhost:3000/admin
```

### 环境变量

复制 `.env.example` 为 `.env`，可配置：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `ADMIN_PASSWORD` | `admin123` | 管理后台登录密码 |
| `PORT` | `3000` | 服务端口 |

## 八、项目结构

```
project/
├── server.js                  # 主服务入口（API 路由 + 数据库初始化 + 演示数据生成）
├── package.json               # 项目配置与依赖
├── .env.example               # 环境变量示例
├── data/
│   └── data.json              # 展点内容与题目数据（JSON 格式）
├── server/
│   ├── admin/
│   │   ├── index.html         # 管理后台单页应用
│   │   └── admin.css          # 管理后台样式
│   ├── routes/                # 路由模块（预留拆分目录）
│   │   ├── admin.js
│   │   ├── checkin.js
│   │   ├── flower.js
│   │   ├── messages.js
│   │   ├── quiz.js
│   │   └── stats.js
│   ├── db.js                  # 数据库工具
│   ├── res-helper.js          # 响应辅助
│   └── utils.js               # 通用工具
├── js/
│   ├── common.js              # 全局昵称管理 + 庆祝动画 + 留言墙渲染
│   ├── api.js                 # API 请求封装
│   ├── config.js              # 前端配置
│   ├── storage.js             # localStorage 封装
│   ├── index.js               # 首页逻辑（时间轴、地图、动态）
│   ├── detail.js              # 展点详情（打卡、献花、答题、预约）
│   ├── checkin.js             # 打卡逻辑
│   ├── flowers.js             # 献花逻辑
│   ├── messages.js            # 留言墙（分页、提交、自定义弹窗）
│   ├── achievement.js         # 成就系统 + 海报生成
│   ├── poster-generator.js    # 海报 Canvas 绘制
│   ├── poster-utils.js        # 海报工具函数
│   ├── certificate.js         # 证书生成
│   ├── timeline.js            # 时间轴组件
│   ├── map-navigation.js      # 地图导航
│   ├── audio-player.js        # 音频播放器
│   ├── bgm.js                 # 背景音乐控制
│   ├── loading-progress.js    # 加载进度条
│   ├── lazy-load.js           # 图片懒加载
│   ├── font-size.js           # 字体大小调节
│   └── nav-utils.js           # 导航工具
├── css/
│   ├── style.css              # 主样式（含留言墙黑板风格、献花按钮）
│   ├── achievement.css        # 成就页样式
│   ├── certificate.css        # 证书页样式
│   ├── flowers.css            # 献花页样式
│   ├── rankings.css           # 排行榜样式
│   └── loading-progress.css   # 加载进度条样式
├── images/                    # 展点图片资源
├── audio/                     # 展点语音讲解（MP3）
├── video/                     # 展点视频资源
├── index.html                 # 首页
├── detail.html                # 展点详情页
├── flower-wall.html           # 献花墙 + 留言墙
├── achievement.html           # 成就页
├── certificate.html           # 证书页
├── rankings.html              # 排行榜页
└── qr.html                    # 二维码入口页
```
