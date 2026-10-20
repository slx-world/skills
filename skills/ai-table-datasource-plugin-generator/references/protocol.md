# 钉钉数据源协议基线

来源：[开发指南](https://alidocs.dingtalk.com/i/nodes/1OQX0akWmBejogd0TAlmRyQGVGlDd3mE)，2026-10-20 阅读；页面显示上次编辑 09-29。下述为协议整理，示例为本技能原创。章节标题保留指南的编号（其部分编号不连续）。

## 前端（指南 2.1.2）

插件在 iframe 中运行。使用 `dingtalk-docs-cool-app` 的 `initView({onReady,onError})` 初始化通讯。指南推荐仓库的 package.json 使用 SDK `0.3.2`，这是模板基线，不代表最新版本。

初始化后调用 `Dingdocs.base.host.saveConfigAndGoNext(config)` 保存自定义键值对象并进入平台提供的字段同步设置页。不要自己模拟下一步宿主行为。缺少宿主时显示须在钉钉中打开，不假装保存成功。宿主容器默认 300×450，可配置尺寸；页面适配窄屏。正式前端资源需为 HTTPS。

模板兼容性处理：实际检查 SDK 0.3.2 包发现其 dist-web/index.js 还从 @oclif/core 导出 run，esbuild 浏览器构建会解析 Node 内置模块并失败。因此固定版本模板直接引用已存在的 `dingtalk-docs-cool-app/dist-web/initView.js`。这是经过构建验证的适配，不是指南要求；SDK 升级时应重新检查导出和构建方式。

可在插件 URL 使用 `$CORPID$`，例如 `https://plugin.example/?corpId=$CORPID$`。平台替换为 AI 表格组织的 corpId；URL 参数本身不作为服务器可信授权依据。

需要免登时调用 `Dingdocs.base.host.getAuthCode(corpId)`，将返回的免登信息交给服务端，再按[钉钉开放接口](https://open.dingtalk.com/document/orgapp/obtain-the-userid-of-a-user-by-using-the-log-free)换取身份。指南没有在这里定义该 SDK 返回值的完整类型，不臆测结构。账号托管另行查阅当前说明，不用猜测的 API 实现。

## 共同请求与响应

两个回调均为 POST，JSON UTF-8。例子路径 `/api/sheet_meta`、`/api/records` 可在平台配置，但服务端实现和配置必须一致。回调由 AI 表格服务器访问，生产服务必须可达；无需为了服务器回调开放浏览器 CORS。

请求包含：

```json
{"requestId":"request-1","params":"{\"connectionId\":\"demo\"}","context":{"corpId":"example-corp","unionId":"example-user","futureField":null}}
```

`params` 是前端保存的配置序列化后的 **JSON string**；不是把它误认为顶层对象。`context` 必须兼容新增字段。不要丢弃原始字节后才验签。

响应 envelope 使用 `code`（数字）、`msg`（字符串，可省略）、`data`（成功时必需）。0 表示成功；文档列明 10001 参数错误、10002 配置错误、10003 权益不足、10004 身份校验失败、10005 三方系统异常。失败消息应能帮助用户定位问题，避免返回密钥或上游原始堆栈。指南未指定 HTTP 状态映射，模板使用 200 + 业务 code，超大请求/未知路由另返回适当 HTTP 状态。

## sheet_meta（指南 2.1.3.2）

平台超时 10 秒。返回表名称与字段列表：

```json
{"code":0,"msg":"","data":{"sheetName":"订单","fields":[{"id":"order_id","name":"订单号","type":"text","isPrimary":true,"property":{},"description":"订单唯一编号"},{"id":"amount","name":"金额","type":"number","isPrimary":false,"property":{}}]}}
```

`id`、`name`、`type`、`isPrimary` 必填；`property` 可选；恰好一列为主键字段。字段类型、属性和记录值结构应查阅[对象模型文档 4.1 字段类型枚举](https://alidocs.dingtalk.com/i/nodes/G1DKw2zgV2KnvL4kFNq3rdMyJB5r9YAn?utm_scene=team_space&iframeQuery=anchorId%3Duu_maq71k6rox7iqpx5v1e)。本技能基线只确认指南示例中的 `text`、`number`（示例 formatter 为 `INT`），不把未核实的布尔、日期、人员、附件类型名称或属性当成平台枚举。可无损转文本时说明映射，否则先核实官方类型。

## records（指南 2.1.3.3）

平台超时 20 秒。在共同请求基础上增加 `maxResults`（默认 300）、`nextToken`（首次省略或为空）。每页条数不得超过本次请求上限。不要把上游 page 参数与平台 nextToken 混为一谈。

```json
{"code":0,"msg":"","data":{"records":[{"id":"O-101","fields":{"order_id":"O-101","amount":42.5}}],"hasMore":false,"nextToken":"","total":1}}
```

`records`、`hasMore` 必填；每条的 `id` 是稳定 string，`fields` 用字段 ID 作键。`nextToken` 和 `total` 可选；`hasMore:true` 时必须提供可继续且会前进的 token，结束时 false 且省略或清空 token。指南的 `total` 注释写“字段总数”，同时描述为同步进度；不要据此将它实现为列数。不能确认总记录量时省略它。

## 签名（指南 2.1.3.4）

双方约定 secretKey；请求头 `Ding-Docs-Timestamp` 和 `Ding-Docs-Signature`。HTTP 头名称不区分大小写。

```text
signature = Base64(HMAC-SHA256(key=UTF8(secretKey), message=rawBodyBytes || UTF8(timestamp)))
```

这里无换行、冒号、排序或额外分隔符。先验签再解析 JSON；使用网络收到的全部原始 Body，不可反序列化后重新序列化，未知字段、null、空格、中文和键顺序都不得改写。签名用定时安全比较。指南将签名配置列为可选，模板作为实现选择默认要求配置密钥，不声称它是平台的必填项。

指南没有明确时间戳单位、有效期或重放窗口。原样使用头值拼接；如需时效校验，先核实平台单位和容差，再显式配置。

## context（指南 2.1.3.5）

通用：`unionId` 操作用户、`corpId` 目标组织、`credentials` 账号托管传入的明文凭证对象、`locale` 语言、`docKey` 文档、`sheetId` 工作表。

records 额外：`syncInstanceId` 同步实例（和同步表绑定）、`taskId` 单次同步任务、`fields` 本次实际同步字段信息、`maxImportRowCount` 平台表最大行数。示例有时也在 sheet_meta 中列出任务字段，因此均按可选上下文处理。语言表使用 `zh-CN`/`en-US`，代码注释有 `zh_CN`/`en_US`，兼容处理，不用严格枚举拒收合法请求。

多企业使用时以通过认证的 context 和服务端权限映射来隔离连接，不能只相信前端传来的 corpId/connectionId。按需投影字段；`fields` 元素的完整结构在此指南未给出，应查实时示例，不能猜。最大行数是整张同步表预算，不是每页各返回这么多条。
