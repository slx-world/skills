# Skills

用于集中维护个人 Codex 技能的仓库。每个技能独立存放在 `skills/<技能名>/`，包含 `SKILL.md`、参考资料，以及执行工作流需要的脚本或模板。

## 技能目录

| 技能 | 用途 | 使用说明 |
| --- | --- | --- |
| [AI 表格数据源插件生成器](skills/ai-table-datasource-plugin-generator/) | 为钉钉 AI 表格生成数据源同步插件，包括配置页面、同步接口、签名校验与数据库/API适配代码 | [详细指南](skills/ai-table-datasource-plugin-generator/README.md) |

当前生成器是根据钉钉开发指南制作的 Codex 自定义技能，不是千问办公官方技能的转载。它提供经过本地验证的示例工程；实际数据源的接入和钉钉端联调按具体需求完成。

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

私有仓库需要本机具有对应仓库的 GitHub 访问权限。连接 GitHub 插件与本机 Git/CLI 登录是不同的访问方式，安装脚本若无法读取私有仓库，可使用已登录的 GitHub CLI 克隆后按下面的方法安装。不要把访问令牌写进聊天或仓库。

安装完成后，在下一轮对话中调用技能。

### 方式二：克隆后手动安装（Windows PowerShell）

先进入用于保存仓库的目录：

```powershell
gh repo clone slx-world/skills
Set-Location skills

$skillHome = if ($env:CODEX_HOME) {
    Join-Path $env:CODEX_HOME 'skills'
} else {
    Join-Path $env:USERPROFILE '.codex\skills'
}
$skillTarget = Join-Path $skillHome 'ai-table-datasource-plugin-generator'
if (Test-Path -LiteralPath $skillTarget) {
    throw '该技能已存在。请先备份或合并本地修改，再执行更新。'
}
New-Item -ItemType Directory -Path $skillHome -Force | Out-Null
Copy-Item -LiteralPath '.\skills\ai-table-datasource-plugin-generator' -Destination $skillTarget -Recurse
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

## 仓库结构

```text
skills/
├── README.md
├── CONTRIBUTING.md
└── skills/
    └── ai-table-datasource-plugin-generator/
        ├── README.md             # 人类阅读的使用指南
        ├── SKILL.md              # Codex 工作流入口
        ├── agents/openai.yaml    # 技能名称与调用示例
        ├── references/           # 协议、适配器、发布说明
        ├── scripts/scaffold.py   # 本地工程生成脚本
        └── assets/starter/       # 前后端示例与协议测试
```

## 维护与更新

仓库版本和已经安装到本机的版本互相独立，`git pull` 不会自动更新用户技能目录。更新时先拉取仓库，再检查差异并同步整个技能目录，保留自己的修改。技能的版本记录在 `SKILL.md` 的 `metadata.version`。

添加新技能、目录要求和提交前检查见 [CONTRIBUTING.md](CONTRIBUTING.md)。
