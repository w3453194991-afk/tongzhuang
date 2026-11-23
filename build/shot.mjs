/* Edge 无头 + CDP 截图：node build/shot.mjs <hash> <out.png> [staff|boss|cust|none] [clickSelector]
 * 例：node build/shot.mjs '#/products' _shots/products.png staff
 * 需 Edge 以 --remote-debugging-port=9222 启动；服务端口用 BASE 环境变量指定。
 */
const [, , hash = '', out = 'shot.png', action = 'staff', clickSel = ''] = process.argv;

const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const page = list.find(t => t.type === 'page');
if (!page) { console.error('no page target'); process.exit(1); }

const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const waiters = new Map();
ws.addEventListener('message', ev => {
  const msg = JSON.parse(ev.data);
  if (msg.id && waiters.has(msg.id)) { waiters.get(msg.id)(msg); waiters.delete(msg.id); }
});
const send = (method, params = {}) => new Promise(res => {
  const mid = ++id;
  waiters.set(mid, res);
  ws.send(JSON.stringify({ id: mid, method, params }));
});
const sleep = ms => new Promise(r => setTimeout(r, ms));

await new Promise(r => ws.addEventListener('open', r, { once: true }));
await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 980, deviceScaleFactor: 1, mobile: false });

const base = process.env.BASE || 'http://127.0.0.1:8765';
const evaluate = async expr => {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  return r.result && r.result.result && r.result.result.value;
};

await send('Page.navigate', { url: base + '/index.html' });
await sleep(1200);
await evaluate(`(() => { try { localStorage.setItem('gy_lang','zh'); localStorage.setItem('gy_lang_remember','1'); } catch(e){} return true; })()`);

await send('Page.navigate', { url: base + '/index.html' + hash });
await sleep(1600);

if (action !== 'none') {
  const role = action === 'boss' ? 'boss' : action === 'cust' ? 'cust' : 'staff';
  const ok = await evaluate(`(() => {
    try { if (window.AUTH && AUTH.loginDemo) { AUTH.loginDemo('${role}'); return 'login:' + (AUTH.me() ? AUTH.me().role : 'none'); } } catch(e) { return 'err:' + e.message; }
    return 'noauth';
  })()`);
  console.log('login ->', ok);
}
await sleep(900);

await evaluate(`(() => {
  ['gateMask','langMask','modalMask','drawerMask','permMask'].forEach(id => { const e = document.getElementById(id); if (e) e.classList.remove('on'); });
  const p = document.getElementById('chatPanel'); if (p) p.classList.remove('on');
  return true;
})()`);

if (clickSel) {
  const r = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(clickSel)}); if (!el) return 'missing'; el.click(); return 'ok'; })()`);
  console.log('click', clickSel, r);
  await sleep(1200);
}
await sleep(400);

const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
const fs = await import('node:fs');
fs.writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
console.log('saved', out);
ws.close();
process.exit(0);

