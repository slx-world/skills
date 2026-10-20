---
name: feishu-bitable-data-sync-plugin-generator
description: 为飞书多维表格创建或修改数据同步连接器插件，生成配置前端、meta.json、table_meta/records 接口、飞书请求验签及数据库或 API 适配代码。用于将外部系统单向同步到飞书 Base 的插件开发和联调；不用于钉钉插件、普通 Excel 处理或飞书侧边栏插件。
metadata:
  version: "1.0.0"
  source: "Feishu data sync plugin developer guide, reviewed 2026-10-20"
---

# 飞书多维表格数据同步插件生成器

按用户的数据源和部署环境，交付可运行、可验证的飞书多维表格数据同步插件。使用用户的语言沟通。这是根据飞书官方开发指南制作的 Codex 自定义技能。

## 确认需求和协议

先读 [protocol.md](references/protocol.md)。从现有对话与工程确定目标数据库/API、同步实体与字段、稳定唯一键、认证和部署环境；已知信息不重复询问。无真实连接信息时先完成可运行的固定样例，明确未验证的连接部分，不索取聊天明文密码。

飞书与钉钉数据源协议不能互换。飞书使用 `@lark-base-open/connector-api` 的 `bitable`、`meta.json`、`/api/table_meta`、嵌套 JSON string、数字 fieldType、primaryID/data，以及 SHA-1 十六进制签名。不要从钉钉模板带入 Dingdocs、sheet_meta、Ding-Docs-* 或 HMAC/Base64。

按需读取：实现字段与单元格时读 [fields.md](references/fields.md)；接入真实源时读 [adapters.md](references/adapters.md)；联调发布时读 [release.md](references/release.md)。[sources.md](references/sources.md) 记录官方来源、核对范围和文档中发现的不一致之处。

## 生成与适配

已有工程遵循其技术栈，做必要修改。新工程可运行本技能的生成脚本（输出目录必须不存在）：

```text
python scripts/scaffold.py --output <工程目录> --name <项目名>
```

模板包含原生 Node.js HTTP 服务、飞书 SDK 配置页、meta.json、固定示例订单适配器、协议校验和测试。脚本路径相对本技能；输出路径相对当前工作目录。用户指定其他技术栈时实现等效协议，不强制改栈。

完成与需求有关的实现：

- 配置页使用 `bitable.getConfig()` 恢复非敏感选择，并调用 `bitable.saveConfigAndGoNext(config)`。无宿主时显示说明并禁用下一步，不模拟成功。按锁定 SDK 的实际导出核对可选身份方法。
- 前端仅保存连接标识、表、列和过滤条件；密码、Verification token、外部 OAuth token 留在服务端。Base 不代存第三方授权结果，需按可信租户和 baseOpenID 绑定服务器端授权。
- `GET /meta.json` 返回固定 schemaVersion/type/protocol 和可达的 HTTPS 配置页 URL；回调路径与 meta 一致。不要把凭据写入公开 meta。
- 验签必须使用原始 Body 字节：SHA1(timestamp + nonce + secretKey + body)，无分隔符，小写 hex。先验签再解析，保留未知字段的兼容性；文档 Node 示例的 JSON.stringify 不适合作为原始 Body 的替代。
- 解析 `params`、`context` 两个 JSON 字符串，然后解析 `params.datasourceConfig` 字符串。不要套用飞书开放平台普通多维表格记录 API 的入参或字段枚举。
- 实现 `server/adapter.mjs` 的表结构与分页读取。字段 ID、primaryID 和 page token 必须满足字符/长度限制。ID 不稳定、无唯一键或 token 跨租户/事务混用时，不能声称同步正确。
- 返回记录数不超过 `params.maxPageSize`；使用 `transactionID` 关联同次同步，确定性分页并正确结束。错误码采用飞书枚举，错误 msg 为包含 zh/en 的 JSON string。
- 返回新字段类型前，检查 fieldType、property 和单元格值三者一致。大整数/金额不能静默损失精度；日期采用毫秒时间戳。模板展示有限类型，不宣称已实现所有源或双向写回。

不要把周期同步上下文当作插件已实现实时事件推送的证据。平台调度由 Base 配置；如需事件能力或上架，核对当前官方入口和支持状态。

## 验证和交付

生成后运行 `npm test`；在 `frontend/` 安装依赖并执行 `npm run build`，保存 lockfile。核对 SDK 的版本与实际 API。为实际适配器补充跨页漏重、稳定 ID、边界类型、权限隔离、上游鉴权/限流/超时测试。普通浏览器可验证布局与无宿主错误；真实 bridge 只在飞书验证。

本地演示服务使用注入的 Verification token，不提供默认生产密钥或绕过验签。指南没有明确防重放的时间戳单位和容差，不把猜测的单位/有效期写成协议；需此能力时先核实再配置。

只有在用户授权的范围内连接外部系统、部署、开隧道或发布。交付工程、配置项、字段映射、启动命令和验证结果，区分本地测试、前端构建、真实数据源、飞书宿主联调与上线各自完成状态。

文档内嵌发布表单在 2026-10-20 明确显示已停用；不可提交旧表单或把它提示的工作流插件表单当成同步插件的新入口。按 [release.md](references/release.md) 查证当前渠道；当前入口不明时说明待确认，不阻碍代码交付。
