# 飞书数据同步插件协议

核对来源：[开发者指南](https://feishu.feishu.cn/docx/GwBXdq7cmoZahfx8faQchcS2nXf)，2026-10-20 阅读。以下是协议整理与原创示例，不是全文镜像。

## 配置前端

SDK 为 `@lark-base-open/connector-api`，导入 `bitable`。使用 `getConfig(): Promise<Record<string,any>>` 恢复配置，`saveConfigAndGoNext(config)` 保存并进入平台字段配置。指南另列 `getBaseUserId()` 和 `getTenantKey()`；context 说明又引用 `getUserId()`。已核对锁定的 SDK 0.1.1 的 dist/index.d.ts：实际提供 `getUserId()`、`getTenantKey()`，没有 `getBaseUserId()`。当前版本应使用实际导出，升级后重新核对，不能假设两个名称都存在。Base 用户标识与开放平台 OpenUserId 不通用。

前后端均需平台可访问的 HTTPS 部署地址。管理页面的运行服务地址不带末尾 `/`；前端 URI 放在 meta 的 extraData.dataSourceConfigUiUri。前端窗口宽度范围 420–840、高度 226–606，模板采用 520×300。

## GET /meta.json

根目录提供元信息，指南规定 10 秒超时。它是公开配置，不用同步回调的签名保护，也不含 secret：

```json
{"schemaVersion":1,"version":"1.0.0","type":"data_connector","extraData":{"disabledPeriodicSync":false,"dataSourceConfigUiUri":"https://plugin.example.invalid/","initHeight":300,"initWidth":520},"protocol":{"type":"http","httpProtocol":{"uris":[{"type":"tableMeta","uri":"/api/table_meta"},{"type":"records","uri":"/api/records"}]}}}
```

schemaVersion=1、type=data_connector、protocol.type=http 是固定值；version 必填，uris 对应类型与路径非空。指南正文有 tableMetaURI/recordsURI 的文字称呼，模板按其实际 JSON 示例的 protocol.httpProtocol.uris 配置，不新增这两个顶层键。

## POST /api/table_meta

请求体中 params、context 均为 JSON 字符串。params 内 datasourceConfig 再次为 JSON 字符串，即前端保存的配置。正确构造方式：

```js
const body = {
  params: JSON.stringify({ datasourceConfig: JSON.stringify({ connectionId: 'demo' }) }),
  context: JSON.stringify({ tenantKey: 'tenant_example', scriptArgs: { baseOpenID: 'user_example' } })
};
```

成功响应：

```json
{"code":0,"msg":"","data":{"tableName":"示例订单","fields":[{"fieldID":"order_id","fieldName":"订单号","fieldType":1,"isPrimary":true},{"fieldID":"amount","fieldName":"金额","fieldType":2,"isPrimary":false,"property":{"formatter":"0.00"}}]}}
```

字段数量 1–299；fieldID 长度1–50、仅 ASCII字母/数字/下划线；fieldName 最长300且不含方括号。tableName 最长100，不能包含 `/\?*[]:`。description 最长1000。恰好一列 isPrimary=true，只有文本、数字、日期、条码、货币、电话、超链接可作为此索引列。isPrimary 是显示/索引列，不能替代记录 primaryID 的唯一性。

## POST /api/records

分页接口，平台超时20秒。params 包含 datasourceConfig、transactionID（同次同步的多页一致）、pageToken（首次为空，后续为上次的 nextPageToken）、maxPageSize（最大可接受条数）。分页参数在 params 字符串内部，不在顶层。context 形式同上。

```json
{"code":0,"msg":"","data":{"nextPageToken":"","hasMore":false,"records":[{"primaryID":"order_101","data":{"order_id":"O-101","amount":42.5}}]}}
```

records 数量不超过 maxPageSize。primaryID 最长100且只能包含字母/数字/下划线；每条 data 的 key 必须是元数据中的 fieldID。nextPageToken 最长100、仅上述字符；hasMore 为必填 boolean。结束时 false 且清空或省略 token；还有数据时 token 必须有效且前进。不要使用包含 `:`、`-`、`=` 的原始 offset/Base64 token。

## envelope 与错误

code=0 成功。错误码：1254400 配置错误，1254403 访问权限异常，1254500 系统异常，1254501 限流，1254505 付费异常。错误 msg 是包含中文和英文的 **JSON 字符串**，例如 `JSON.stringify({zh:'配置无效',en:'Invalid configuration'})`；不要返回普通字符串或对象冒充该字段。成功 msg 可为空。

## 请求签名

读取 X-Base-Request-Timestamp、X-Base-Request-Nonce、X-Base-Signature；HTTP头大小写不敏感。Verification token 就是双方约定的 secretKey。

```text
signature = lowercaseHex(SHA1(UTF8(timestamp) || UTF8(nonce) || UTF8(secretKey) || rawBodyBytes))
```

无分隔符，不排序，不用 HMAC，不用 Base64；不能替换为钉钉的验签。使用原始 Body，先验签再解析 JSON，恒定时间比较摘要。指南文字和 Go 示例明确使用原始 body，但 Node 示例用了 JSON.stringify(req.body)；模板遵循原始体规则以兼容空白、未知字段、null、中文和顺序变化。

指南未明确时间戳单位、时效窗口和 nonce 保存期限。模板不宣称防重放已实现；若需要，应先核对平台约定，再设计时效和 nonce 策略。

## context 与外部授权

context 内含 bitable.token/logID、packID、type、tenantKey、userTenantKey、bizInstanceID、scriptArgs.projectURL/baseOpenID。配置尚未创建时 bizInstanceID 可以是0。接受未知字段，不强制所有可选字段存在。

同步时可能额外包含 syncType=manual/auto/event、syncStrategy。其 supportType=manual/periodic/fixed_time/event，interval 单位分钟、-1可代表不适用；fixedTimeInfo 包含 type=day/week/month、minOfHour、hourOfDay、dayOfWeek（0周日）、dayOfMonth。不同字段可能缺省或为空；这不是可忽略业务授权的依据，也不证明当前账号具备所有触发能力。

Base 不保存外部系统的授权结果。服务端需要绑定可信 tenantKey + baseOpenID 与用户的外部账号。签名验证的是平台请求来源，不等于该用户有权访问所有连接。不要把 context.bitable.token 当作第三方系统访问令牌。
