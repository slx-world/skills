import { bitable } from '@lark-base-open/connector-api';
const button = document.querySelector('button');
const status = document.querySelector('[role="status"]');
const select = document.querySelector('select');
let ready = false;
const timeout = setTimeout(() => {
  if (!ready) status.textContent = '请在飞书多维表格的自定义同步应用中打开。';
}, 5000);
async function initialize() {
  try {
    const config = await bitable.getConfig();
    clearTimeout(timeout);
    if (config?.connectionId === 'demo') select.value = config.connectionId;
    ready = true;
    button.disabled = false;
    status.textContent = '请选择数据连接';
  } catch {
    clearTimeout(timeout);
    status.textContent = '初始化失败，请从飞书多维表格重新打开。';
  }
}
initialize();
button.addEventListener('click', async () => {
  if (!ready) return;
  button.disabled = true;
  try {
    await bitable.saveConfigAndGoNext({ connectionId: select.value });
    status.textContent = '配置已提交';
  } catch { status.textContent = '保存失败，请检查飞书环境后重试。'; }
  finally { button.disabled = false; }
});
