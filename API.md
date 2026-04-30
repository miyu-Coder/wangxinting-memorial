# API 文档

基础地址：`http://localhost:3000`

通用返回格式：

```json
{ "success": true, ... }
{ "success": false, "message": "错误描述" }
```

---

## 一、打卡（3 个）

### POST /api/checkin

展点打卡签到。同一用户同一展点只能打卡一次（UNIQUE 约束去重）。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| exhibitId | Integer | 是 | 展点 ID（1-4） |
| nickname | String | 否 | 用户昵称 |

成功返回：

```json
{ "success": true, "message": "打卡成功" }
```

错误返回：

```json
{ "success": false, "message": "展点 ID 必须为 1-4" }
{ "success": false, "message": "您已在该展点打卡" }
```

### GET /api/checkin/stats

各展点打卡人数统计。

成功返回：

```json
{
  "success": true,
  "stats": { "1": 12, "2": 8, "3": 10, "4": 6 }
}
```

### GET /api/checkin/:exhibitId

查询当前用户是否已在指定展点打卡。用户标识通过 IP+UA 指纹自动获取。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| exhibitId | Integer | 是 | 展点 ID（1-4），路径参数 |

成功返回：

```json
{ "success": true, "hasCheckedIn": true, "visited_at": "2026-04-23 10:30:00" }
{ "success": true, "hasCheckedIn": false, "visited_at": null }
```

---

## 二、献花（4 个）

### POST /api/flower

向指定展点献花。每个用户每个展点只能献花一次（UNIQUE 约束去重）。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| exhibitId | Integer | 是 | 展点 ID（1-4） |
| nickname | String | 否 | 用户昵称 |

成功返回：

```json
{ "success": true, "message": "献花成功" }
```

错误返回：

```json
{ "error": "展点 ID 必须为 1-4" }
{ "error": "您已在该展点献花过了" }
```

### GET /api/flower/:exhibitId

获取指定展点献花总数。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| exhibitId | Integer | 是 | 展点 ID（1-4），路径参数 |

成功返回：

```json
{ "exhibitId": 1, "totalCount": 35 }
```

### GET /api/flower/user/:exhibitId

查询当前用户是否已在指定展点献花。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| exhibitId | Integer | 是 | 展点 ID（1-4），路径参数 |

成功返回：

```json
{ "exhibitId": 1, "hasFlowered": true }
```

### GET /api/flower/recent/:exhibitId

获取指定展点最近献花用户昵称列表。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| exhibitId | Integer | 是 | 展点 ID（1-4），路径参数 |
| limit | Integer | 否 | 返回条数，默认 5，最大 20 |

成功返回：

```json
{ "success": true, "exhibitId": 1, "names": ["小红", "老兵张建国"] }
```

---

## 三、答题（3 个）

### POST /api/quiz/submit

提交答题记录。同一昵称同一展点只能答题一次（业务层去重）。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| nickname | String | 是 | 用户昵称，不能为空 |
| exhibitId | Integer | 是 | 展点 ID（1-4） |
| score | Integer | 是 | 得分（0-4） |
| completedAt | String | 否 | 答题完成时间（ISO 格式） |
| timeCost | Integer | 否 | 答题用时（秒） |

成功返回：

```json
{ "success": true, "message": "答题记录已保存" }
```

错误返回：

```json
{ "success": false, "message": "昵称不能为空" }
{ "success": false, "message": "展点 ID 必须为 1-4" }
{ "success": false, "message": "您已完成过答题" }
```

### GET /api/quiz/records

获取答题记录列表。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| exhibitId | Integer | 否 | 按展点筛选（1-4） |

成功返回：

```json
{
  "success": true,
  "data": [
    { "id": 1, "nickname": "小红", "exhibit_id": 1, "score": 4, "created_at": "2026-04-23 10:00:00" }
  ]
}
```

### GET /api/quiz/stats

各展点答题统计。

成功返回：

```json
{
  "success": true,
  "stats": {
    "1": { "avgScore": 3.2, "totalCount": 15, "fullScoreCount": 5 },
    "2": null
  }
}
```

---

## 四、留言（2 个）

### POST /api/messages

提交留言，默认待审核（status=0）。使用 `Array.from()` 正确计数 Unicode 字符。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| nickname | String | 是 | 昵称，最多 20 字 |
| content | String | 是 | 留言内容，最多 200 字 |

成功返回：

```json
{ "success": true }
```

错误返回：

```json
{ "success": false, "message": "昵称不能为空" }
{ "success": false, "message": "昵称不能超过20字" }
{ "success": false, "message": "内容不能超过200字" }
```

### GET /api/messages

获取已审核通过（status=1）的留言列表（分页）。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | Integer | 否 | 页码，默认 1 |
| limit | Integer | 否 | 每页条数，默认 20 |

成功返回：

```json
{
  "success": true,
  "list": [
    { "id": 1, "nickname": "小红", "content": "向将军致敬！", "created_at": "2026-04-23 10:00:00" }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3,
    "hasMore": true
  }
}
```

---

## 五、统计（3 个）

### GET /api/stats/overview

获取访问统计概览，含展点转化率分析。

成功返回：

```json
{
  "success": true,
  "totalVisits": 1783,
  "todayVisits": 66,
  "todayUV": 20,
  "todayFlowers": 5,
  "yesterdayVisits": 56,
  "yesterdayUV": 16,
  "yesterdayFlowers": 3,
  "weekAgoVisits": 52,
  "totalFlowers": 68,
  "weekAgoFlowers": 2,
  "hotExhibit": {
    "id": "1",
    "name": "陈列馆",
    "checkinCount": 15,
    "viewCount": 120,
    "conversionRate": 12.5
  }
}
```

### GET /api/stats/daily-trend

获取近 7 日访问趋势（PV/UV）。

成功返回：

```json
{
  "success": true,
  "data": [
    { "date": "2026-04-17", "pv": 52, "uv": 16 },
    { "date": "2026-04-18", "pv": 75, "uv": 23 }
  ]
}
```

### GET /api/stats/hourly-today

获取今日 24 小时访问时段分布。

成功返回：

```json
{
  "success": true,
  "data": [
    { "hour": 0, "pv": 0 },
    { "hour": 8, "pv": 5 },
    { "hour": 9, "pv": 12 }
  ]
}
```

---

## 六、页面追踪（1 个）

### POST /api/track/page

记录页面访问。同一 session 同一页面 10 分钟内不重复记录。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | String | 是 | 页面标识：`index` / `detail_1` / `detail_2` / `detail_3` / `detail_4` / `flower-wall` |
| session_id | String | 是 | 会话 ID |

成功返回：

```json
{ "success": true, "message": "访问已记录" }
{ "success": true, "message": "10分钟内已记录，跳过" }
```

错误返回：

```json
{ "success": false, "message": "无效的页面标识" }
{ "success": false, "message": "缺少 session_id" }
```

---

## 七、活动动态（1 个）

### GET /api/activity/recent

获取最近活动动态（打卡、献花、答题混合时间线，按时间倒序）。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| limit | Integer | 否 | 返回条数，默认 10，最大 30 |

成功返回：

```json
{
  "success": true,
  "list": [
    { "type": "checkin", "nickname": "小红", "exhibit": "陈列馆", "time": "2026-04-23 10:00:00" },
    { "type": "flower", "nickname": "老兵张建国", "exhibit": "故居", "time": "2026-04-23 09:30:00" },
    { "type": "quiz", "nickname": "团委李老师", "exhibit": "广场", "time": "2026-04-23 09:00:00" }
  ]
}
```

---

## 八、纪念品预约（1 个）

### POST /api/souvenir/order

提交纪念品预约。支持展点预约和排行榜预约两种类型，prize_name 自动填充。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| nickname | String | 是 | 用户昵称 |
| exhibitId | Integer | 是 | 展点 ID（0=礼盒, 1=徽章, 2=手环, 3=证书, 4=书签） |
| name | String | 是 | 真实姓名 |
| phone | String | 是 | 手机号（11 位，1 开头） |
| orderType | String | 否 | 预约类型：`exhibit`（默认）/ `ranking` |
| rank | Integer | 否 | 排名（排行榜预约时必填） |
| prizeName | String | 否 | 奖品名称（不传则自动填充） |

成功返回：

```json
{ "success": true, "message": "预约成功" }
```

错误返回：

```json
{ "success": false, "message": "请填写完整信息" }
{ "success": false, "message": "展点 ID 无效" }
{ "success": false, "message": "手机号格式不正确" }
{ "success": false, "message": "您已预约过该奖品", "already": true }
```

prize_name 自动填充规则：

| orderType | 条件 | prize_name |
|---|---|---|
| ranking | rank=1 | 第1名·将军纪念礼盒 |
| ranking | rank=2-3 | 第2-3名·任选两件纪念品 |
| ranking | rank=4-10 | 第4-10名·任选一件纪念品 |
| exhibit | exhibitId=0 | 将军纪念礼盒（四件套精装版） |
| exhibit | exhibitId=1 | 将军纪念徽章 |
| exhibit | exhibitId=2 | 红色传承手环 |
| exhibit | exhibitId=3 | 荣誉纪念证书 |
| exhibit | exhibitId=4 | 军工主题书签 |

---

## 九、排行榜（1 个）

### GET /api/rankings/quiz

答题排行榜。SQL 子查询先按 nickname+exhibit_id 取最高分去重，再聚合计算排名分。

排名分 = 得分率×50% + 完成度×30% + 速度分×20%

排序规则：先按 completed_exhibits 降序，再按 ranking_score 降序。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| nickname | String | 否 | 查询指定用户的排名 |

成功返回：

```json
{
  "success": true,
  "rankings": [
    {
      "rank": 1,
      "nickname": "小红",
      "total_score": 16,
      "completed_exhibits": 4,
      "total_time_cost": 320,
      "ranking_score": 93.8
    }
  ],
  "myRank": {
    "rank": 5,
    "nickname": "老兵张建国",
    "total_score": 12,
    "completed_exhibits": 4,
    "total_time_cost": 480,
    "ranking_score": 78.3
  }
}
```

---

## 十、管理端（11 个）

### POST /api/admin/login

管理员登录验证。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| password | String | 是 | 管理密码（默认 admin123，可通过 .env 配置） |

成功返回：

```json
{ "success": true, "message": "登录成功" }
```

错误返回：

```json
{ "success": false, "message": "请输入密码" }
{ "success": false, "message": "密码错误" }
```

### GET /api/admin/messages

获取全部留言（含待审核和已拒绝）。

成功返回：

```json
{
  "success": true,
  "list": [
    { "id": 1, "nickname": "小红", "content": "向将军致敬！", "status": 0, "created_at": "2026-04-23 10:00:00" }
  ]
}
```

### POST /api/admin/messages/:id/approve

审核通过留言（status → 1）。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | Integer | 是 | 留言 ID，路径参数 |

成功返回：

```json
{ "success": true }
```

### POST /api/admin/messages/:id/reject

审核拒绝留言（status → 2，软删除）。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | Integer | 是 | 留言 ID，路径参数 |

成功返回：

```json
{ "success": true }
```

### DELETE /api/admin/messages/:id

物理删除留言。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | Integer | 是 | 留言 ID，路径参数 |

成功返回：

```json
{ "success": true }
```

### GET /api/admin/souvenir/list

获取纪念品预约列表。若 prize_name 为空，自动根据 order_type 和 exhibit_id 补充并回写数据库。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | String | 否 | 筛选状态：`0` 待领取 / `1` 已领取 |

成功返回：

```json
{
  "success": true,
  "list": [
    {
      "id": 1,
      "nickname": "小红",
      "exhibit_id": 1,
      "name": "张三",
      "phone": "13800001234",
      "status": 0,
      "order_type": "exhibit",
      "prize_name": "将军纪念徽章",
      "souvenir_name": "将军纪念徽章",
      "created_at": "2026-04-23 10:00:00"
    }
  ]
}
```

### POST /api/admin/souvenir/:id/deliver

标记纪念品为已领取（status → 1）。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | Integer | 是 | 预约记录 ID，路径参数 |

成功返回：

```json
{ "success": true, "message": "已标记为领取" }
```

### GET /api/admin/logs

获取操作日志。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| action | String | 否 | 按操作类型筛选 |

成功返回：

```json
{
  "success": true,
  "list": [
    { "id": 1, "action": "审核通过", "target": "留言#5", "detail": "留言ID 5 审核通过", "created_at": "2026-04-23 10:00:00" }
  ]
}
```

### GET /api/admin/quiz/time-stats

答题时长统计。

成功返回：

```json
{
  "success": true,
  "avgTime": 95,
  "fastestTime": 32,
  "fastestUser": "小红",
  "exhibitTimes": [
    { "exhibit_id": 1, "avg_time": 85 },
    { "exhibit_id": 2, "avg_time": 102 }
  ],
  "exhibitCounts": [
    { "exhibit_id": 1, "count": 25 },
    { "exhibit_id": 2, "count": 18 }
  ]
}
```

### GET /api/admin/quiz/advanced-stats

答题高级统计。

成功返回：

```json
{
  "success": true,
  "avgCompletionTime": 85000,
  "fastestCompletionTime": 28000,
  "totalRecords": 120,
  "uniqueUsers": 85,
  "completionRate": 71,
  "fullScoreCount": 35
}
```

### GET /api/quiz/time-by-user

获取指定用户各展点答题用时。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| nickname | String | 是 | 用户昵称 |

成功返回：

```json
{
  "success": true,
  "times": {
    "1": 85,
    "2": 102,
    "3": 68,
    "4": 95
  }
}
```

---

## 十一、展点管理（6 个）

### GET /api/admin/exhibits

获取所有展点列表（简要信息）。

成功返回：

```json
{
  "success": true,
  "list": [
    { "id": 1, "title": "王新亭将军生平陈列馆", "routeShort": "陈列馆" }
  ]
}
```

### GET /api/admin/exhibits/:id

获取单个展点完整详情。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | Integer | 是 | 展点 ID（1-4），路径参数 |

成功返回：

```json
{
  "success": true,
  "exhibit": {
    "id": 1,
    "title": "王新亭将军生平陈列馆",
    "routeShort": "陈列馆",
    "summary": "展点简介",
    "text": "展点详细内容",
    "audio": "audio/exhibit-1.mp3",
    "video": "",
    "quiz": { "questions": [...] },
    "updated_at": "2026-04-23T10:00:00.000Z"
  }
}
```

### POST /api/admin/exhibits/:id

更新展点内容。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | Integer | 是 | 展点 ID（1-4），路径参数 |
| title | String | 是 | 展点标题 |
| routeShort | String | 否 | 简短名称 |
| summary | String | 是 | 展点简介 |
| text | String | 是 | 展点详细内容 |
| audio | String | 否 | 音频路径 |
| video | String | 否 | 视频路径 |

成功返回：

```json
{ "success": true, "message": "保存成功" }
```

### POST /api/admin/exhibits/:id/quiz

更新展点题目。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | Integer | 是 | 展点 ID（1-4），路径参数 |
| questions | Array | 是 | 题目数组 |

成功返回：

```json
{ "success": true, "message": "题目保存成功" }
```

### GET /api/admin/export-exhibits

导出展点数据为 CSV 文件。

成功返回：CSV 文件下载（`exhibits.csv`），列：ID, 标题, 简短名称, 简介, 详细内容, 音频路径, 视频路径

### POST /api/admin/import-exhibits

导入展点 CSV 数据。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| (body) | text/csv | 是 | CSV 内容，格式：ID,标题,简短名称,简介,详细内容,音频路径,视频路径 |

成功返回：

```json
{ "success": true, "message": "导入成功" }
```

---

## 十二、数据导出（5 个）

### GET /api/admin/export/checkins

导出打卡数据为 CSV。

成功返回：CSV 文件下载（`checkins.csv`），UTF-8 BOM 编码，列：用户标识, 展点, 打卡时间

### GET /api/admin/export/flowers

导出献花数据为 CSV。

成功返回：CSV 文件下载（`flowers.csv`），UTF-8 BOM 编码，列：用户标识, 展点, 献花时间

### GET /api/admin/export/quiz

导出答题数据为 CSV。

成功返回：CSV 文件下载（`quiz.csv`），UTF-8 BOM 编码，列：昵称, 展点, 得分, 答题时间

### GET /api/admin/export/souvenir

导出纪念品预约数据为 CSV。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | String | 否 | 筛选状态：`0` 待领取 / `1` 已领取 / `all` 全部（默认） |

成功返回：CSV 文件下载（`纪念品预约数据.csv`），UTF-8 BOM 编码，列：昵称, 展点, 奖品名称, 姓名, 手机号, 状态, 预约时间

### GET /api/admin/export/all

导出所有数据为合并 CSV。

成功返回：CSV 文件下载（`all_data.csv`），UTF-8 BOM 编码，包含打卡、献花、答题三个区块

---

## 十三、系统（3 个）

### GET /api/system/status

获取系统运行状态。

成功返回：

```json
{
  "success": true,
  "status": "running",
  "uptime": "5 天 3 小时",
  "dbSize": "1.25 MB"
}
```

### POST /api/admin/generate-demo-data

一键生成演示数据。自动生成打卡、献花、答题、留言、纪念品预约、30天页面访问等测试数据。

数据特征：
- 昵称池 65 个（含地域/职业/军事色彩），Fisher-Yates 洗牌后轮询选取
- 留言池 50 条，洗牌后轮询选取
- 展点访问加权分布（陈列馆30%、故居25%、广场25%、装备20%）
- 答题分数加权分布（满分30%、3分35%、2分25%、1分10%）
- 答题时间 30-180 秒/展点，同一用户同一展点只生成一条
- 周末访问量自动上浮 30%-50%
- 留言 80% 通过、20% 待审核/拒绝

成功返回：

```json
{
  "success": true,
  "message": "演示数据生成成功",
  "stats": {
    "visits": 110,
    "flowers": 95,
    "quizzes": 80,
    "messages": 48,
    "souvenirs": 18,
    "pageViews": "30天"
  }
}
```

### POST /api/admin/clear-test-data

清空所有测试数据（visits、flowers、quiz_records、messages、souvenir_orders、page_views），保留展点内容和题目。

成功返回：

```json
{ "success": true, "message": "测试数据已全部清空" }
```

---

## 附录

### 纪念品映射

| exhibitId | 展点预约奖品名称 |
|-----------|----------|
| 0 | 将军纪念礼盒（四件套精装版） |
| 1 | 将军纪念徽章 |
| 2 | 红色传承手环 |
| 3 | 荣誉纪念证书 |
| 4 | 军工主题书签 |

### 排行榜奖品映射

| 排名 | 排行榜预约奖品名称 |
|---|---|
| 第1名 | 第1名·将军纪念礼盒 |
| 第2-3名 | 第2-3名·任选两件纪念品 |
| 第4-10名 | 第4-10名·任选一件纪念品 |

### 展点名称映射

| exhibitId | 名称 |
|-----------|------|
| 1 | 陈列馆 |
| 2 | 故居 |
| 3 | 广场 |
| 4 | 装备展区 |

### 留言状态

| status | 含义 |
|--------|------|
| 0 | 待审核 |
| 1 | 已通过 |
| 2 | 已拒绝（软删除） |

### 纪念品预约状态

| status | 含义 |
|--------|------|
| 0 | 待领取 |
| 1 | 已领取 |

### 预约类型

| orderType | 含义 | 去重规则 |
|---|---|---|
| exhibit | 展点预约 | 同一昵称+同一展点+exhibit类型 |
| ranking | 排行榜预约 | 同一昵称+ranking类型 |

### 排行榜算法

```
排名分 = 得分率 × 50% + 完成度 × 30% + 速度分 × 20%

得分率 = (总分 / 16) × 100
完成度 = (已完成展点数 / 4) × 100
速度分 = (最快完成时间 / 用户完成时间) × 100

排序规则：先按 completed_exhibits 降序，再按 ranking_score 降序
总分上限：16（每展点最高4分 × 4展点，子查询取每展点最高分去重）
```
