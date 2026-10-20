// SDK 0.3.2 root also re-exports a Node CLI. Import the inspected web module.
import { initView } from 'dingtalk-docs-cool-app/dist-web/initView.js';
const button = document.querySelector('button');
const status = document.querySelector('[role="status"]');
const select = document.querySelector('select');
let ready = false;
const timer = setTimeout(() => { if (!ready) status.textContent = '请在钉钉 AI 表格的数据源插件中打开此页面。'; }, 5000);
try {
  initView({
    onReady: () => { clearTimeout(timer); ready = true; button.disabled = false; status.textContent = '请选择数据连接'; },
    onError: () => { clearTimeout(timer); status.textContent = '初始化失败，请从钉钉 AI 表格重新打开。'; },
  });
} catch { clearTimeout(timer); status.textContent = '当前环境无法初始化，请从钉钉 AI 表格打开。'; }
button.addEventListener('click', async () => {
  if (!ready) return;
  button.disabled = true;
  try {
    const host = window.Dingdocs?.base?.host;
    if (typeof host?.saveConfigAndGoNext !== 'function') throw new Error('宿主不可用');
    await host.saveConfigAndGoNext({ connectionId: select.value });
    status.textContent = '配置已提交';
  } catch { status.textContent = '保存失败，请检查钉钉环境后重试。'; }
  finally { button.disabled = false; }
});
