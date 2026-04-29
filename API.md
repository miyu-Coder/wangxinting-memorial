# API 文档

基础地址：`http://localhost:3000`

通用返回格式：

```json
{ "success": true, ... }
{ "success": false, "message": "错误描述" }
```

---

## 一、打卡

### POST /api/checkin

展点打卡签到。

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

查询当前用户是否已在指定展点打卡。用户标识通过 Cookie `user_id` 自动获取。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| exhibitId | Integer | 是 | 展点 ID（1-4），路径参数 |

成功返回：

```json
{ "success": true, "hasCheckedIn": true, "visited_at": "2026-04-23 10:30:00" }
{ "success": true, "hasCheckedIn": false, "visited_at": null }
```

---

## 二、献花

### POST /api/flower

向指定展点献花。每个用户每个展点只能献花一次。

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

## 三、答题

### POST /api/quiz/submit

提交答题记录。同一用户同一展点只能答题一次。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| nickname | String | 是 | 用户昵称，不能为空 |
| exhibitId | Integer | 是 | 展点 ID（1-4） |
| score | Integer | 是 | 得分（0-4） |

成功返回：

```json
{ "success": true, "message": "答题记录已保存" }
```

错误返回：

```json
{ "success": false, "message": "昵称不能为空" }
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

## 四、留言

### POST /api/messages

提交留言，默认待审核（status=0）。

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
{ "success": false, "message": "内容不能超过200字" }
```

### GET /api/messages

获取已审核通过的留言列表（分页）。

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

## 五、统计

### GET /api/stats/overview

获取访问统计概览。

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

## 六、页面访问追踪

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

---

## 七、活动动态

### GET /api/activity/recent

获取最近活动动态（打卡、献花、答题混合时间线）。

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

## 八、纪念品预约

### POST /api/souvenir/order

提交纪念品预约。同一用户同一奖品只能预约一次。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| nickname | String | 是 | 用户昵称 |
| exhibitId | Integer | 是 | 展点 ID（0=礼盒, 1=徽章, 2=手环, 3=证书, 4=书签） |
| name | String | 是 | 真实姓名 |
| phone | String | 是 | 手机号（11 位，1 开头） |

成功返回：

```json
{ "success": true, "message": "预约成功" }
```

错误返回：

```json
{ "success": false, "message": "您已预约过该奖品", "already": true }
{ "success": false, "message": "手机号格式不正确" }
```

---

## 九、管理端

### POST /api/admin/login

管理员登录验证。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| password | String | 是 | 管理密码 |

成功返回：

```json
{ "success": true, "message": "登录成功" }
```

错误返回：

```json
{ "success": false, "message": "密码错误" }
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

审核拒绝留言（status → 2）。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | Integer | 是 | 留言 ID，路径参数 |

成功返回：

```json
{ "success": true }
```

### DELETE /api/admin/messages/:id

删除留言。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | Integer | 是 | 留言 ID，路径参数 |

成功返回：

```json
{ "success": true }
```

### GET /api/admin/souvenir/list

获取纪念品预约列表。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | String | 否 | 筛选状态：`0` 待领取 / `1` 已领取 |

成功返回：

```json
{
  "success": true,
  "list": [
    { "id": 1, "nickname": "小红", "exhibit_id": 1, "name": "张三", "phone": "13800001234", "status": 0, "souvenir_name": "🏅 将军纪念徽章", "created_at": "2026-04-23 10:00:00" }
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

---

## 十、展点管理

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

成功返回：CSV 文件下载（`exhibits.csv`）

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

## 十一、数据导出

### GET /api/admin/export/checkins

导出打卡数据为 CSV。

成功返回：CSV 文件下载（`checkins.csv`），列：用户标识, 展点, 打卡时间

### GET /api/admin/export/flowers

导出献花数据为 CSV。

成功返回：CSV 文件下载（`flowers.csv`），列：用户标识, 展点, 献花时间

### GET /api/admin/export/quiz

导出答题数据为 CSV。

成功返回：CSV 文件下载（`quiz.csv`），列：昵称, 展点, 得分, 答题时间

### GET /api/admin/export/all

导出所有数据为合并 CSV。

成功返回：CSV 文件下载（`all_data.csv`），包含打卡、献花、答题三个区块

---

## 十二、系统

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

一键生成演示数据。自动生成打卡、献花、答题、留言、纪念品预约、页面访问等测试数据。

成功返回：

```json
{
  "success": true,
  "message": "演示数据生成成功",
  "stats": {
    "visits": 61,
    "flowers": 68,
    "quizzes": 44,
    "messages": 32,
    "souvenirs": 24,
    "pageViews": "30天"
  }
}
```

### POST /api/admin/clear-test-data

清空所有测试数据（保留展点内容和题目）。

成功返回：

```json
{ "success": true, "message": "测试数据已全部清空" }
```

---

## 纪念品映射

| exhibitId | 奖品名称 |
|-----------|----------|
| 1 | 🏅 将军纪念徽章 |
| 2 | 📿 红色传承手环 |
| 3 | 📜 荣誉纪念证书 |
| 4 | 🔖 军工主题书签 |
| 0 | 🎁 将军纪念礼盒（四件套精装版） |

## 展点名称映射

| exhibitId | 名称 |
|-----------|------|
| 1 | 陈列馆 |
| 2 | 故居 |
| 3 | 广场 |
| 4 | 装备展区 |

## 留言状态

| status | 含义 |
|--------|------|
| 0 | 待审核 |
| 1 | 已通过 |
| 2 | 已拒绝 |

## 纪念品预约状态

| status | 含义 |
|--------|------|
| 0 | 待领取 |
| 1 | 已领取 |
