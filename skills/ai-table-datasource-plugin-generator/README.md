# AI 表格数据源插件生成器

为钉钉 AI 表格创建外部数据源同步插件的 Codex 技能。根据[钉钉开发指南](https://alidocs.dingtalk.com/i/nodes/1OQX0akWmBejogd0TAlmRyQGVGlDd3mE)整理，协议核对日期为 **2026-10-20**，当前技能版本 **1.0.0**。

## 能做什么

- 生成数据源配置页面，并通过钉钉宿主保存配置、进入下一步。
- 实现 `POST /api/sheet_meta` 表结构接口与 `POST /api/records` 分页记录接口。
- 校验钉钉回调签名，保留原始请求体和新增上下文字段的兼容性。
- 根据实际需求编写 MySQL、PostgreSQL、SQL Server 或 HTTP API 的数据适配器。
- 提供字段映射、分页、稳定 ID、错误处理、本地测试和发布联调说明。

附带模板使用固定示例订单，可以直接运行。真实数据库驱动、外部系统认证和业务查询由 Codex 在生成具体插件时实现；模板本身未预装多种数据库适配器。

本技能用于钉钉数据源同步插件开发。普通 Excel 数据处理、AI 字段插件和边栏插件应使用对应工作流。

## 安装

参见[仓库安装说明](../../README.md#安装到-codex)。安装时保留整个文件夹，安装后下一轮对话即可调用。

## 让 Codex 生成插件

MySQL 示例：

```text
使用 $ai-table-datasource-plugin-generator，创建同步 MySQL 订单表的钉钉插件。
数据表为 orders，同步订单号、下单时间和金额；订单号唯一且不变。
请生成配置前端、两个同步接口、签名校验和测试。
真实连接信息通过服务端环境变量配置，先用样例数据验证协议。
```

HTTP API / ERP 示例：

```text
使用 $ai-table-datasource-plugin-generator，
根据我提供的官方 API 文档生成一个同步库存数据的钉钉插件。
请核实上游认证、分页和限流规则，保证多页数据不漏不重。
先完成工程和本地 mock 验证，凭据由服务端配置。
```

提供以下信息可以减少返工：数据源类型或官方 API 文档、目标表/实体、要同步的字段、稳定唯一键、过滤条件、预期数据量、部署环境。没有凭据时也能先生成工程；不要在聊天中提供数据库密码或长期 token。

## 手动生成示例工程

Python 3.9+ 可以运行生成脚本。生成目录必须不存在，脚本会拒绝覆盖已有目录。以下命令从本仓库根目录执行：

```powershell
python .\skills\ai-table-datasource-plugin-generator\scripts\scaffold.py `
  --output .\work\my-datasource-plugin `
  --name my-datasource-plugin
Set-Location .\work\my-datasource-plugin
```

项目名只使用小写字母、数字和连字符。生成结果包括：

```text
my-datasource-plugin/
├── .env.example
├── package.json
├── README.md
├── server/
│   ├── server.mjs       # HTTP 路由、原始 Body、响应封装
│   ├── signature.mjs    # HMAC-SHA256/Base64 校验
│   └── adapter.mjs      # 固定示例订单，替换为实际数据源
├── frontend/
│   ├── package.json
│   ├── build.mjs
│   └── src/
└── test/protocol.test.mjs
```

## 本地运行与验证

环境要求：Node.js **20.6+**（推荐使用仍受维护的 LTS 版本）、npm、Python 3.9+。服务端只使用 Node 内置模块；前端依赖 SDK 和 esbuild。

在生成的工程根目录执行：

```powershell
# 服务端协议测试，不需要先 npm install
npm test

# 配置服务端环境变量
Copy-Item .env.example .env
# 使用文本编辑器设置 .env 中的 DINGDOCS_SECRET，保持与钉钉配置一致

# 安装并构建前端
Set-Location frontend
npm install
npm run build
Set-Location ..

# 启动前后端服务
npm start
```

访问 `http://127.0.0.1:8787/` 查看配置页，健康检查为 `GET /health`。服务端默认只监听本机；没有 `DINGDOCS_SECRET` 时拒绝启动。

| 环境变量 | 作用 | 默认值 |
| --- | --- | --- |
| `DINGDOCS_SECRET` | 与钉钉约定的回调签名密钥 | 无，必须配置 |
| `HOST` | 服务端监听地址 | `127.0.0.1` |
| `PORT` | 服务端监听端口 | `8787` |

普通浏览器没有钉钉宿主，出现“请从钉钉 AI 表格重新打开”并禁用下一步是预期行为。页面能打开不代表钉钉桥接已经验证。平台回调接口需要发送带有效签名的 JSON POST，不能通过地址栏的 GET 验证。

## 接入真实数据源

让 Codex 修改 `server/adapter.mjs`，实现 `getMeta(params, context)` 与 `getRecords(params, options)`。配置页保存非敏感连接标识，凭据保留在服务端。

实现时要保证：字段 ID 和记录 ID 稳定、只有一列 `isPrimary: true`、记录字段以字段 ID 为键、分页能正常结束。金额、大整数和时间应有明确的精度/时区映射；多企业插件需根据可信上下文校验连接权限。

具体方法和检查项见 [adapters.md](references/adapters.md)。SQL 查询、API 认证方式和驱动版本应以目标数据源的当前官方文档为准。

## 钉钉联调与发布

完成本地验证后，将前端与后端部署到平台可访问的环境，前端必须使用 HTTPS。在钉钉开发者平台配置数据同步酷应用的前端 URL、服务端地址、回调路径和签名密钥，限定测试可见范围，再到 AI 表格数据连接中心验证配置、元数据与多页同步。

步骤见 [release.md](references/release.md)。真实数据源连接、钉钉内联调和发布是独立检查阶段，代码生成和本地测试不会自动完成这些操作。

## 常见问题

| 现象 | 排查方法 |
| --- | --- |
| `DINGDOCS_SECRET is required` | 从示例创建 `.env`，填写双方约定的密钥，并从工程根目录启动 |
| 签名校验失败 | 使用完整原始 Body + 时间戳，不加入分隔符，不重新序列化 JSON，检查签名头与密钥 |
| `params` 参数错误 | 回调的 `params` 应为配置序列化后的 JSON 字符串 |
| 普通浏览器中下一步不可用 | 属于预期行为，保存配置需要钉钉宿主 bridge |
| 前端提示尚未构建 | 到 `frontend/` 安装依赖并执行 `npm run build` |
| 构建时出现 Node 内置模块解析错误 | 确认使用模板中已验证的 SDK 0.3.2 浏览器模块路径；不要将 SDK 根入口导出的 CLI 打入浏览器包 |
| 数据重复、遗漏或无法结束分页 | 检查稳定排序、唯一键、token 前进逻辑以及整次任务的行数上限 |
| 平台访问不到本机服务 | `localhost` 只用于本地检查，需要用户选择并授权的可访问部署环境 |

## 已验证范围

技能初始制作时通过了格式校验、9 项服务端协议测试、前端构建和 300×450 容器检查。测试包括中文原始体签名、未知上下文字段、错误签名拒绝、跨页完整性和累计行数预算。未使用真实业务凭据，没有将示例部署为企业应用。

协议与平台要求可能更新。详细缓存说明见 [protocol.md](references/protocol.md)，来源包括[钉钉指南](https://alidocs.dingtalk.com/i/nodes/1OQX0akWmBejogd0TAlmRyQGVGlDd3mE)、[前端 demo](https://github.com/dingdocs-notable/datasource-plugin-demo) 和[服务端 demo](https://github.com/dingdocs-notable/datasource-plugin-node-demo)。
