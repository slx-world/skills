# 数据源适配器

模板接口为 `getTableMeta(config, context)` 和 `getRecords(config, {transactionID,pageToken,maxPageSize,context})`。返回 envelope 内的 data，错误用带飞书错误码和 zh/en 信息的 Error。固定示例只支持 connectionId=demo，不能当成真实数据库接入。

## 数据库

按目标环境选择官方驱动，例如 MySQL 的 mysql2、PostgreSQL 的 pg、SQL Server 的 mssql。查询驱动当前官方文档后再实现连接池、TLS、查询超时和参数化值。表/列标识符必须从受允许的 schema 元数据验证后引用，不能直接拼接前端输入。

稳定唯一键驱动 primaryID；不使用页内行号、随机 UUID 或可变显示名。优先固定排序的 keyset 分页；有变化的数据要求一致视图时按 transactionID 绑定源快照/版本边界。offset 只适合固定样例或稳定快照，不把它当作动态数据的可靠通用分页。

字段 ID 与源列之间保持持久映射，重命名不改变 ID。大整数、金额、日期按 [fields.md](fields.md) 处理。无唯一业务键时先确定复合键，不静默声称增量同步或记录关联正确。

## HTTP API / ERP

读取用户提供的官方文档，分别核实源认证/签名、字段类型、分页、速率限制和错误。飞书平台验签与外部 API 自身认证是两套机制，不得混用。Base 只保存非敏感配置，外部授权结果由插件服务端管理并绑定租户/用户。

外部页号或 cursor 映射为合法 nextPageToken；原生 cursor 包含非法字符或过长时，可存于服务端并返回合法的短 opaque ID。token 绑定 transactionID、配置、租户和身份范围，敏感状态不明文放进 token。上游一页多于 maxPageSize 时正确保留未返回记录，不能截断后丢数据。

单次 records 调用预算20秒，源调用、重试和转换都需留出返回余量。只对幂等读取做有限重试。上游401/403映射访问权限错误、429映射限流；日志与响应不泄漏凭据或原始异常堆栈。

## 认证和测试

以已验签 context 中的 tenantKey、scriptArgs.baseOpenID 等信息与服务端授权表核对连接权限，不仅相信 config.connectionId。Base 用户 ID 不等于开放平台 OpenUserId，不能随意替代。

验证：多于一页的数据 ID 无漏重；空源与恰好一页能结束；ID 跨请求稳定；非法 token、跨事务 token、无权连接、租户边界、上游限流和超时能正确报错；fieldID 与 data 键一致。只有在用户已授权的目标上做真实连接测试，没有凭据时使用 mock 并明确说明。
