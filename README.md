# 王新亭将军红色教育基地线上导览系统

湖北省爱国主义教育基地官方 H5 导览系统，面向参观者提供展点导览、知识答题、互动打卡等数字化体验，同时为管理人员提供数据看板与内容管理后台。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | HTML5 / CSS3 / JavaScript (ES6+) / ECharts |
| 后端 | Node.js / Express 5 |
| 数据库 | SQLite 3 (sqlite3 驱动) |
| 其他 | dotenv / helmet / cors |

## 功能清单

### 参观者端

- **首页** — 将军生平时间轴、红色足迹地图（ECharts）、活动动态滚动
- **展点导览** — 四大展区详情页（陈列馆、故居、纪念园、将军铜像），支持图文/音频/视频
- **打卡签到** — 每个展点独立打卡，记录昵称与时间
- **献花致敬** — 每个展点可献花一次，查看近期献花名单
- **知识答题** — 每个展点 4 道选择题，即时评分，满分可预约纪念品
- **留言墙** — 提交留言（需审核），查看已通过留言
- **纪念品预约** — 答题满分后预约对应奖品，四展点全满分解锁礼盒
- **成就系统** — 打卡/答题/献花进度追踪，成就勋章展示
- **荣誉证书** — 完成所有展点打卡后生成电子证书
- **统一昵称** — 全站共享昵称，支持修改，自动生成默认昵称
- **庆祝动画** — 打卡成功飘星、献花成功飘花瓣全屏动画

### 管理端

- **数据看板** — 总访问量、今日/昨日 PV/UV、近 7 日趋势图、时段分布
- **留言审核** — 通过/拒绝/删除留言
- **答题记录** — 查看各展点答题统计与记录
- **展点管理** — 编辑展点内容/题目，iframe 实时预览，CSV 导入导出
- **纪念品管理** — 查看预约列表，标记已领取
- **操作日志** — 记录管理操作
- **数据导出** — 打卡/献花/答题/全部数据 CSV 导出
- **系统工具** — 一键生成演示数据、清空测试数据

## 安装和运行

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

## 项目结构

```
project/
├── server.js              # 主服务入口（API 路由 + 数据库初始化）
├── package.json           # 项目配置与依赖
├── data/
│   └── data.json          # 展点内容与题目数据
├── server/
│   ├── admin/
│   │   ├── index.html     # 管理后台单页应用
│   │   └── admin.css      # 管理后台样式
│   └── routes/            # 路由模块（预留拆分）
├── js/
│   ├── common.js          # 全局昵称管理 + 庆祝动画
│   ├── api.js             # API 请求封装
│   ├── index.js           # 首页逻辑（时间轴、地图、动态）
│   ├── detail.js          # 展点详情（打卡、献花、答题、预约）
│   ├── messages.js        # 留言墙
│   ├── checkin.js         # 打卡逻辑
│   ├── flowers.js         # 献花逻辑
│   ├── certificate.js     # 证书生成
│   ├── achievement.js     # 成就系统
│   └── ...                # 其他功能模块
├── css/
│   ├── style.css          # 主样式
│   ├── achievement.css    # 成就页样式
│   ├── certificate.css    # 证书页样式
│   └── flowers.css        # 献花页样式
├── images/                # 展点图片资源
├── audio/                 # 展点语音讲解
├── video/                 # 展点视频资源
├── index.html             # 首页
├── detail.html            # 展点详情页
├── flower-wall.html       # 留言墙
├── achievement.html       # 成就页
├── certificate.html       # 证书页
└── qr.html                # 二维码入口页
```

## 数据库表结构

| 表名 | 说明 |
|------|------|
| `visits` | 打卡记录（user_identifier + exhibit_id 唯一） |
| `flowers` | 献花记录（user_identifier + exhibit_id 唯一） |
| `quiz_records` | 答题记录（nickname + exhibit_id 唯一） |
| `messages` | 留言（status: 0待审核/1通过/2拒绝） |
| `page_views` | 页面访问记录（page + session_id + visit_time） |
| `souvenir_orders` | 纪念品预约（status: 0待领取/1已领取） |
| `admin_logs` | 管理操作日志 |
