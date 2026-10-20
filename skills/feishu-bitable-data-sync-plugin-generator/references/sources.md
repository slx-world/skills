# 来源与核对记录

核对日期：2026-10-20。主指南页面显示最新修改时间09月03日。

| 来源 | 用途 | 记录 |
| --- | --- | --- |
| [飞书开发者指南](https://feishu.feishu.cn/docx/GwBXdq7cmoZahfx8faQchcS2nXf) | 前端SDK、meta、两条回调、签名、字段、调试与发布 | 本技能协议依据 |
| [官方前端模板](https://replit.com/@lark-base/data-sync-fe-demo) | 指南推荐示例工程 | 地址保留供参考，不将旧Replit项目可访问性当成必需条件 |
| [官方后端模板](https://replit.com/@lark-base/data-sync-be-demo) | 指南推荐 Node 示例 | 以当前主指南的实际协议为准 |
| [SDK npm 页面](https://www.npmjs.com/package/@lark-base-open/connector-api) | 版本、导出和类型声明 | 2026-10-20 核对registry元数据并安装0.1.1；dist/index.d.ts确认getConfig/saveConfigAndGoNext/getUserId/getTenantKey，前端构建通过 |

只整理与复用工作流有关的协议和原创模板，不复制整份云文档、评论或第三方附件。未知事项明确标记，不把页面评论当作官方说明。

## 已观察到的不一致

- 签名文字及 Go 示例使用原始请求体，Node 示例用 JSON.stringify。模板保留原始字节。
- SDK章节写 getBaseUserId，context章节写 getUserId。已核对0.1.1类型声明，仅有getUserId；核心配置页不依赖身份方法，需要身份时使用实际导出，升级后复查。
- 文中将 tableMetaURI/recordsURI 作为路径称呼，实际 meta 示例使用 protocol.httpProtocol.uris。
- 一些 JSON 展示示例缺逗号或有注释，不能直接用作有效 JSON 文件。模板生成严格 JSON。
- 内嵌发布表单已停用，不能照搬旧入口；其工作流替代表单不直接适用于同步插件。
- 页面评论包含早期字段/事件能力经验，与当前正文列举范围不同；不能据评论宣称支持或不支持，具体工程需要宿主验证。
