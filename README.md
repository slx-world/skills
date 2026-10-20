# Skills

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

用于集中维护个人 Codex 技能的仓库。每个技能独立存放在 `skills/<技能名>/`，包含 `SKILL.md`、参考资料，以及执行工作流需要的脚本或模板。

## 技能目录

| 技能 | 用途 | 使用说明 |
| --- | --- | --- |
| [AI 表格数据源插件生成器](skills/ai-table-datasource-plugin-generator/) | 为钉钉 AI 表格生成数据源同步插件，包括配置页面、同步接口、签名校验与数据库/API适配代码 | [详细指南](skills/ai-table-datasource-plugin-generator/README.md) |
| [飞书多维表格数据同步插件生成器](skills/feishu-bitable-data-sync-plugin-generator/) | 为飞书 Base 生成配置页面、meta.json、表结构/分页记录接口与飞书签名校验 | [详细指南](skills/feishu-bitable-data-sync-plugin-generator/README.md) |

两个生成器分别根据对应平台的开发指南制作，提供经过本地验证的原创示例工程。它们是 Codex 自定义技能，真实数据源接入和对应宿主的联调按具体需求完成。飞书与钉钉的 SDK、签名、字段枚举和分页结构不同，不能互换。

## 安装到 Codex

### 方式一：让 Codex 安装

将下面的请求发给 Codex：

```text
使用 $skill-installer，从 https://github.com/slx-world/skills 安装
skills/ai-table-datasource-plugin-generator 这个技能。
```

也可以直接提供技能目录链接：

```text
请安装 https://github.com/slx-world/skills/tree/master/skills/ai-table-datasource-plugin-generator
```

安装飞书版本时使用：

```text
请安装 https://github.com/slx-world/skills/tree/master/skills/feishu-bitable-data-sync-plugin-generator
```

本仓库公开提供，无需 GitHub 登录即可浏览、下载或通过 Git 克隆。向仓库推送修改仍需对应写入权限。不要把访问令牌写进聊天或仓库。

安装完成后，在下一轮对话中调用技能。

### 方式二：克隆后手动安装（Windows PowerShell）

先进入用于保存仓库的目录：

```powershell
git clone https://github.com/slx-world/skills.git
Set-Location skills

$skillHome = if ($env:CODEX_HOME) {
    Join-Path $env:CODEX_HOME 'skills'
} else {
    Join-Path $env:USERPROFILE '.codex\skills'
}
$skillName = 'feishu-bitable-data-sync-plugin-generator' # 钉钉版本可改为 ai-table-datasource-plugin-generator
$skillTarget = Join-Path $skillHome $skillName
if (Test-Path -LiteralPath $skillTarget) {
    throw '该技能已存在。请先备份或合并本地修改，再执行更新。'
}
New-Item -ItemType Directory -Path $skillHome -Force | Out-Null
Copy-Item -LiteralPath (Join-Path '.\skills' $skillName) -Destination $skillTarget -Recurse
```

应复制整个技能文件夹，保留 `references/`、`scripts/` 和 `assets/`，不能只复制 `SKILL.md`。默认用户技能目录是 `~/.codex/skills/`；设置 `CODEX_HOME` 时使用其下的 `skills/`。

## 使用示例

```text
使用 $ai-table-datasource-plugin-generator，
帮我生成一个同步 MySQL 订单表的钉钉 AI 表格数据源插件。
订单号作为稳定唯一键，金额保持精度。先生成可运行工程和本地测试，
数据库连接凭据通过服务端环境变量配置。
```

技能也可以根据自然语言自动匹配。显式使用 `$ai-table-datasource-plugin-generator` 可以明确指定它。

飞书示例：

```text
使用 $feishu-bitable-data-sync-plugin-generator，
根据我提供的 ERP 官方 API 文档生成库存同步到飞书多维表格的插件，
包含 meta.json、飞书验签、分页、配置前端和本地验证。
```

## 仓库结构

```text
skills/
├── README.md
├── CONTRIBUTING.md
└── skills/
    ├── ai-table-datasource-plugin-generator/          # 钉钉
    └── feishu-bitable-data-sync-plugin-generator/    # 飞书
        ├── README.md             # 人类阅读的使用指南
        ├── SKILL.md              # Codex 工作流入口
        ├── agents/openai.yaml    # 技能名称与调用示例
        ├── references/           # 协议、字段、适配、来源和发布说明
        ├── scripts/scaffold.py   # 本地工程生成脚本
        └── assets/starter/       # 前后端示例与协议测试
```

## 维护与更新

仓库版本和已经安装到本机的版本互相独立，`git pull` 不会自动更新用户技能目录。更新时先拉取仓库，再检查差异并同步整个技能目录，保留自己的修改。技能的版本记录在 `SKILL.md` 的 `metadata.version`。

添加新技能、目录要求和提交前检查见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 开源许可

本仓库的原创技能说明、脚本和模板采用 [MIT License](LICENSE)。允许使用、修改、分发及商业使用，分发时保留版权和许可声明；软件按原样提供。

引用的飞书、钉钉官方文档及工程所依赖的第三方软件仍适用各自的许可与使用条款，本仓库的许可不替代它们。
