# 飞书多维表格数据同步插件生成器

根据[飞书开发者指南](https://feishu.feishu.cn/docx/GwBXdq7cmoZahfx8faQchcS2nXf)制作的 Codex 自定义技能，用于生成外部系统到飞书多维表格的单向同步插件。版本1.0.0，协议核对日期2026-10-20。

## 内容与能力

包含配置前端、`GET /meta.json`、`POST /api/table_meta`、`POST /api/records`、原始请求体验签、固定订单适配器、协议校验与测试，以及字段映射、认证、真实数据源适配和联调发布说明。

可让 Codex 根据具体需求编写 MySQL、PostgreSQL、SQL Server 或 HTTP API 适配器。模板没有预装这些数据库驱动，也未接入真实业务数据。它与仓库中的钉钉生成器是两个独立技能，不能混用协议。

## 安装到 Codex

向 Codex 发送：

```text
使用 $skill-installer，安装
https://github.com/slx-world/skills/tree/master/skills/feishu-bitable-data-sync-plugin-generator
```

本仓库已公开，无需登录即可读取和克隆。也可克隆仓库后，将整个技能目录复制到 `$CODEX_HOME/skills/`，未设置 CODEX_HOME 时为 `~/.codex/skills/`。不要仅复制 SKILL.md；已有安装先检查和备份本地修改，安装后下一轮对话调用。

## 调用示例

```text
使用 $feishu-bitable-data-sync-plugin-generator，
帮我生成一个同步 MySQL 订单表到飞书多维表格的插件。
订单号是稳定唯一键，同步订单号、金额和下单时间。
连接凭据通过服务端环境变量配置，先完成示例与本地验证。
```

```text
使用 $feishu-bitable-data-sync-plugin-generator，
根据我提供的官方 ERP API 文档生成库存同步插件。
请实现认证、分页和错误映射，并说明哪些步骤还需要飞书内联调。
```

建议提供数据源/API文档、目标实体、字段、稳定唯一键、过滤条件和部署环境。密码和长期 token 直接配置在服务端，不发到聊天或上传仓库。

## 手动生成并运行样例

Python3.9+用于脚本，Node.js20.6+和npm用于工程。在仓库根目录执行（PowerShell）：

```powershell
python .\skills\feishu-bitable-data-sync-plugin-generator\scripts\scaffold.py `
  --output .\work\my-feishu-plugin --name my-feishu-plugin
Set-Location .\work\my-feishu-plugin
npm test
Copy-Item .env.example .env
# 在编辑器中填写 .env 中的 Verification token 与实际 HTTPS 配置页 URL
Set-Location frontend
npm install
npm run build
Set-Location ..
npm start
```

生成目录必须不存在，项目名仅使用小写字母、数字和单连字符。脚本不会覆盖已有工程。查看生成工程的 README 以了解完整配置。

| 配置项 | 含义 | 默认/要求 |
| --- | --- | --- |
| BASE_VERIFICATION_TOKEN | 与飞书调试窗口一致的签名密钥 | 无默认值，必须填写 |
| CONFIG_UI_URL | 实际配置页 URL | 必须为HTTPS，样例 .invalid 域名不可用于联调 |
| HOST | 本地服务监听地址 | 127.0.0.1 |
| PORT | 服务端口 | 8788 |

前端依赖固定 connector-api0.1.1 和 esbuild0.25.12。更新 SDK 前核对 API 导出和类型声明，重新构建并在宿主内验证。

## 协议要点

- 飞书使用 SHA-1 小写hex签名，顺序为 timestamp、nonce、Verification token、原始Body，无分隔符。
- 请求的 params/context 是JSON字符串；params.datasourceConfig也为JSON字符串。transactionID/pageToken/maxPageSize位于params中。
- 元数据使用 tableName 和 fieldID/fieldName/fieldType；记录使用 primaryID/data 和 nextPageToken。
- fieldID最长50，primaryID和nextPageToken最长100，仅能包含英文字母、数字、下划线。
- 数字字段类型枚举与普通开放平台Bitable API不同；错误msg是包含zh/en的JSON字符串。

详见 [protocol.md](references/protocol.md)、[fields.md](references/fields.md)。真实源适配见 [adapters.md](references/adapters.md)，来源和不一致项见 [sources.md](references/sources.md)。

## 联调与发布

本地测试和前端构建后，配置平台可达的HTTPS前后端地址，在有管理权限的多维表格中从“从其他数据源同步 → 自定义同步应用”进入，填写服务地址与Verification token。先确认meta和配置页，再验证表结构、分页和结果。

普通浏览器不具备飞书bridge，下一步禁用或提示从飞书打开属于预期。真实数据库连接、飞书宿主联调和上架各是独立阶段，不能由样例测试替代。

原指南内嵌旧发布表单已显示停用。上架前需要核对当前同步插件渠道，不直接提交其工作流插件替代表单。详见 [release.md](references/release.md)。

## 常见问题

| 现象 | 排查 |
| --- | --- |
| 缺少BASE_VERIFICATION_TOKEN | 从示例创建.env并填写真实值 |
| CONFIG_UI_URL错误 | 使用实际HTTPS配置页，不能留占位域名用于联调 |
| 1254403 | 检查原始请求体、三个X-Base-*签名头和双方约定的token；真实适配器还需检查用户权限 |
| 1254400 | 检查三层JSON字符串、配置、事务与分页参数 |
| 下一步一直禁用 | 需在飞书宿主内加载配置页，检查SDK通讯与前端地址 |
| 分页失败/记录重复 | 检查合法token、事务绑定、稳定排序与primaryID |
| 元数据格式错误 | 使用同步插件的数字fieldType和fieldID规则，不套用钉钉或开放平台记录API |

初始交付验证覆盖签名向量、原始Body、嵌套字符串、元数据约束、分页漏重、跨事务/租户token隔离及双语错误。真实业务源与飞书内联调需要具体项目的授权环境。
