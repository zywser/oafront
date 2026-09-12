# oafront —— OA 办公系统前端

基于 **Vue3 + Vite5 + Element Plus** 的企业 OA 办公系统前端，对接后端 `OAback`（Django + DRF）。包含登录、首页统计、员工管理、通知、请假、AI 智能助手（RAG 知识问答）等模块。

---

## 一、技术栈

| 类别 | 选型 | 说明 |
|---|---|---|
| 框架 | Vue 3.4（`<script setup>`） | 组合式 API |
| 构建 | Vite 5.2 | 开发服务器 + 生产构建 |
| UI | Element Plus 2.14 + `@element-plus/icons-vue` | 组件库与图标 |
| 状态 | Pinia 2 | `src/stores/` |
| 路由 | Vue Router 4（hash 模式） | `#/...` 形式 |
| HTTP | axios 1.6 | `src/api/http.js` 统一封装 |
| 图表 | ECharts 6 | 首页统计图表 |
| 富文本 | @wangeditor/editor-for-vue | 通知发布编辑器 |
| 测试工具 | playwright（devDependencies） | 页面自动化验证 |

---

## 二、目录结构

```
oafront/
├── package.json
├── vite.config.js          # @ 别名指向 src
├── .env.development        # 开发环境（VITE_BASE_URL=http://127.0.0.1:8000）
├── .env.production         # 生产环境（VITE_BASE_URL=""，同域部署）
├── index.html
└── src/
    ├── main.js             # 入口：创建 app、注册 Pinia/Router/Element Plus
    ├── App.vue
    ├── api/                # 接口封装（每个后端模块一个文件）
    │   ├── http.js         # axios 实例：JWT 头、60s 超时、错误兜底
    │   ├── authHttp.js     # 认证：登录、改密
    │   ├── absentHttp.js   # 请假
    │   ├── informHttp.js   # 通知
    │   ├── staffHttp.js    # 员工
    │   ├── homeHttp.js     # 首页统计
    │   └── agentHttp.js    # 智能助手（含 SSE 流式 askStream）
    ├── components/         # 通用组件
    │   ├── OAmain.vue      # 主布局容器
    │   ├── OADialog.vue    # 对话框封装
    │   ├── OAPagination.vue# 分页组件
    │   └── OApageHeader.vue# 页面头部
    ├── router/
    │   ├── index.js        # 路由实例 + 登录守卫
    │   ├── frame.js        # 主框架路由（首页/助手/考勤/通知/员工）
    │   └── login.js        # 登录页路由
    ├── stores/
    │   ├── auth.js         # 登录态、token、用户信息、权限
    │   └── counter.js      # 示例 store（可删）
    ├── utils/
    │   └── timeFormatter.js# 时间格式化
    └── views/
        ├── Login/login.vue # 登录页
        ├── main/frame.vue  # 主框架（侧边栏 + 顶栏 + 内容区）
        ├── home/home.vue   # 首页（部门员工统计图表 + 最新通知/请假）
        ├── agent/index.vue # 智能助手（知识问答 + 知识库管理）
        ├── absent/         # 考勤：index（入口）/ my（个人考勤）/ sub（下属考勤）
        ├── inform/         # 通知：index / publish（发布）/ list（列表）/ detail（详情）
        └── staff/          # 员工：index / add（新增）/ list（列表）
```

---

## 三、环境配置

### `.env.development`

```
VITE_BASE_URL = "http://127.0.0.1:8000"
```

开发模式**直连后端**（`vite.config.js` 未配置 proxy），依赖后端开启 CORS（后端已 `CORS_ALLOW_ALL_ORIGINS=True`）。

### `.env.production`

```
VITE_BASE_URL = ""
```

生产构建后前后端同域部署（如 Nginx 把 `/api` 与静态资源指向同一域名）。

---

## 四、启动与构建

```bash
npm install          # 安装依赖
npm run dev          # 开发模式（默认 http://localhost:5173，热更新）
npm run build        # 生产构建（产物输出到 dist/）
npm run preview      # 本地预览 dist/ 产物
```

> 修改 `.env.*` 后需重启 dev server 生效。

---

## 五、路由结构

| 路由 | 名称 | 页面 | 说明 |
|---|---|---|---|
| `/login` | login | 登录页 | 未登录访问任意页面会重定向至此 |
| `/` | frame | 主框架 | 侧边栏 + 顶栏布局容器 |
| `/`（子路由） | home | 首页 | 部门员工统计、最新通知/请假 |
| `/agent`（子路由） | agent | 智能助手 | 知识问答 + 知识库管理 |
| `/absent`、`/absent/my`、`/absent/sub` | absent | 考勤 | 个人/下属考勤 |
| `/inform`、`/inform/publish`、`/inform/list`、`/inform/detail/:pk` | inform | 通知 | 发布/列表/详情 |
| `/staff`、`/staff/add`、`/staff/list` | staff | 员工 | 员工管理 |

**路由守卫**（`router/index.js`）：`beforeEach` 检查 Pinia 的 `authStore.is_loging`（localStorage 中 token 与用户信息），未登录访问非登录页 → 跳转 `/login`。

---

## 六、API 封装

### `http.js`（axios 统一封装）

- baseURL 取 `import.meta.env.VITE_BASE_URL`
- 请求拦截器：自动附加 `Authorization: JWT <token>`（从 `useAuthStore().token` 取）
- **timeout: 60000**（60 秒）——联网问答链路（内部检索 + 联网搜索 + LLM 生成）可达 20~40s，超时不能设太短
- 所有方法（post/get/put/delete/downloadFile）统一 Promise 包装：
  - 成功 → resolve `result.data`
  - 失败 → reject `err?.response?.data?.detail || "网络错误"`（超时等无 response 的错误也走兜底文案）

### 各业务 API 模块

| 模块 | 后端前缀 | 主要方法 |
|---|---|---|
| `authHttp.js` | `/auth` | `login`、`resetPwd` |
| `absentHttp.js` | `/absent` | 请假 CRUD、类型、审批人 |
| `informHttp.js` | `/inform` | 通知 CRUD、标记已读 |
| `staffHttp.js` | `/staff` | 部门、员工 CRUD、Excel 导入导出、激活 |
| `homeHttp.js` | `/home` | 最新通知/请假、部门员工统计 |
| `agentHttp.js` | `/agent` | 配置、问答、流式问答、知识库、会话、反馈、统计 |

### `agentHttp.js` 的 `askStream`（SSE 流式核心）

对话流式输出**不走 axios**（XHR 无法边收边渲染），改用浏览器原生 `fetch` + `ReadableStream` 逐块解析 SSE：

```js
askStream(data, handlers = {})
```

- 手动携带 `Authorization: JWT <token>`
- 解析 `data: {json}\n\n` 事件，按 `event.type` 分派回调：
  - `onStart` → 拿到 `conversation_id` / `message_id` / `references`
  - `onDelta` → 逐字追加回答（打字机效果）
  - `onUsage` → 记录 token 用量
  - `onDone` → 用真实 message_id / answer / sources 替换临时气泡
  - `onError` → 出错处理
- 内置 `AbortController`，90 秒兜底超时

> 注意：该函数是对话流式输出的唯一正确入口。历史遗留的 `ask_stream`（axios 版）已移除导出，不要使用。

---

## 七、智能助手页面说明（`views/agent/index.vue`）

布局：左栏（会话列表 + 新会话）｜ 中栏（知识问答聊天）｜ 右栏（知识库管理 tab）。

### 知识问答

- **提问**：输入问题发送，`sendQuestion` 走 `askStream` 流式渲染，回答逐字出现
- **联网搜索开关**：聊天区底部"联网搜索"开关（默认开启），控制请求 `web_search` 字段：开 → 后端强制 Tavily 联网；关 → 纯知识库检索
- **Markdown 渲染**：回答中 `**标题**`（含行首 `- **标题**` 列表形式）渲染为 `<h3>` 标题，行内 `**粗体**` 渲染为 `<strong>`，渲染前先 HTML 转义（防 XSS）
- **引用角标**：回答中的 `[n]` 编号渲染为角标——在引用总数范围内的**蓝色可点击**（点击打开引用弹窗）；超范围的**灰色划线**（表示引用编号对不上、不可信）
- **引用证据**：
  - 消息下方"引用证据"按钮 + 前 2 条最相关预览
  - 弹窗展示**按相关度排序后的前 5 条**（内部 + 联网合并排序，超过 5 条时顶部提示"已按相关度展示最相关的 5 条"）
  - 来源类型彩色标签（通知蓝/上传绿/手动紫/联网橙），每条带相关度分数
  - **联网来源可点击跳转原文**（标题变蓝色链接 + ↗，新标签页打开）
- **反馈**：每条回答底部"有帮助 / 需改进"

### 知识库管理（右栏 tab）

- 知识源表格：勾选列、展开预览、标题/类型/状态/片段/操作
- 表格底部操作区：
  - **批量删除**：勾选后删除多个知识源（红色按钮，确认弹窗）
  - **重建失败项**：一键重建所有"失败"状态的知识源（无需勾选）
  - **重建选中**：勾选后重建；未勾选时按钮置灰并提示"请先勾选"
  - **已选 N 项**：实时显示勾选数量
- 行操作：单行"重建" + 删除
- 顶部：导入知识（上传文件）、同步通知（把通知同步为知识源）、筛选/重置

---

## 八、登录与权限（`stores/auth.js`）

- 登录成功后保存 `token` 与用户信息到 Pinia（持久化到 localStorage：`OA_TOKEN_KEY` / `OA_USER_KEY`）
- `is_loging` computed：用户信息非空且 token 非空
- 权限常量 `PermissionChoices`：Staff / Leader / Boarder 等，路由 `meta.perpermissions` 控制菜单可见性
- 用户信息含 `department`（部门对象），页面据此判断董事会/部门负责人等角色能力

---

## 九、与后端对接要点

1. **请求头**：所有请求自动带 `Authorization: JWT <token>`，后端 `LoginCheckMiddleware` 校验，未登录返回 403
2. **跨域**：开发模式前端 5173 直连后端 8000，依赖后端 `CORS_ALLOW_ALL_ORIGINS=True`
3. **超时**：全局 60s；流式问答用 `askStream`（fetch SSE），不要用 axios
4. **错误处理**：接口失败统一 reject `detail` 文案，页面用 `ElMessage.error(detail)` 提示
5. **文件下载**：`http.downloadFile` 以 blob 方式接收（员工 Excel 导出）
6. **生产部署**：`npm run build` 后把 `dist/` 部署到 Nginx/静态目录，`VITE_BASE_URL` 留空走同域

---

## 十、常见问题

| 现象 | 原因与处理 |
|---|---|
| 页面进不去、白屏 | 检查浏览器 console 是否有 JS 报错（如 `xx is not defined`）；确认 `npm run dev` 正常、`dist/` 为最新构建 |
| 登录后跳回登录页 | localStorage 中 token/user 丢失或格式异常；重新登录 |
| 联网问答报"网络错误" | 后端是否已重启（`.env` 改动需重启）；`TAVILY_API_KEY` 是否已配置；前端 60s 超时是否足够 |
| 引用弹窗最后一张卡片被裁切 | 弹窗内容区已设 `max-height: 74vh; overflow-y: auto`，超高内部滚动 |
| 表格出现横向滚动条 | 已调整列宽（非固定列合计 < 容器宽），如再出现说明面板更窄，需继续收窄列宽 |
