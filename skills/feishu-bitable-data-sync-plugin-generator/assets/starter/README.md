# 飞书多维表格同步插件工程

这是固定订单样例，尚未接入真实数据库/API。服务端使用 Node.js 20.6+ 内置模块，前端使用飞书 connector-api 0.1.1 与 esbuild 0.25.12。

1. 在根目录执行 `npm test`，不需要安装服务端依赖。
2. 复制 `.env.example` 为 `.env`，填写 BASE_VERIFICATION_TOKEN，并把 CONFIG_UI_URL 改为实际的 HTTPS 配置页地址。样例域名 `.invalid` 仅为示意，不可用于飞书联调。
3. 在 `frontend/` 执行 `npm install`、`npm run build`，保存 lockfile。
4. 返回根目录执行 `npm start`。本地页面是 `http://127.0.0.1:8788/`；公开配置 `GET /meta.json`；同步接口 `POST /api/table_meta`、`POST /api/records`；健康检查 `GET /health`。
5. 由 Codex 替换 `server/adapter.mjs`，接入已授权真实源，并补充连接与业务测试。
6. 部署到你选择的平台可达 HTTPS 环境，再从飞书多维表格“从其他数据源同步 → 自定义同步应用”进入调试。填写的后端服务地址不带末尾 `/`。

默认 HOST=127.0.0.1、PORT=8788；不会自动开隧道或部署。meta 的配置页 URL 来自 CONFIG_UI_URL，公开 meta 不含 Verification token。meta.json 的初始窗口520×300；最小宽420，最小高226。

普通浏览器缺少飞书宿主，配置按钮不可用或出现从飞书打开的提示是预期行为。浏览器 GET 成功不等于带签名 POST 或飞书同步成功。

飞书签名是 SHA1(timestamp + nonce + secretKey + 原始Body) 的小写十六进制，不是 HMAC。回调的 params、context 及 params.datasourceConfig 都是 JSON 字符串。msg 错误信息也必须为含 zh/en 的 JSON 字符串。

示例分页只适合固定数据，token 绑定了事务和身份信息；真实源要实现稳定分页、权限校验及快照策略。不要将固定样例、hash绑定或本地测试等同于真实生产集成。
