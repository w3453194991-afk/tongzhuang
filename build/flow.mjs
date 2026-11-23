/* 端到端冒烟：搜索 → 加入报价 → 报价单 → 资料包，并收集控制台错误。
 * node build/flow.mjs
 */
const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const page = list.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const waiters = new Map(); const errs = [];
ws.addEventListener('message', ev => {
  const m = JSON.parse(ev.data);
  if (m.id && waiters.has(m.id)) { waiters.get(m.id)(m); waiters.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') errs.push('EXC ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push('CONSOLE ' + m.params.args.map(a => a.value || a.description).join(' '));
});
const send = (method, params = {}) => new Promise(res => { const mid = ++id; waiters.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
await new Promise(r => ws.addEventListener('open', r, { once: true }));
await send('Runtime.enable'); await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
const base = process.env.BASE || 'http://127.0.0.1:8799';
const ev = async e => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value;

await send('Page.navigate', { url: base + '/index.html' });
await sleep(1500);
await ev("(() => { try{localStorage.setItem('gy_lang','zh');}catch(e){} if(window.AUTH&&AUTH.loginDemo) AUTH.loginDemo('staff'); return 1; })()");
await sleep(900);
await ev("(() => { ['gateMask','langMask'].forEach(i=>{const e=document.getElementById(i); if(e) e.classList.remove('on');}); return 1; })()");

// 搜索
await ev("(() => { const i=document.getElementById('gsearch'); i.value='奶油小方 圆领卫衣 110 码 300 件'; i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); return 1; })()");
await sleep(1500);
// 加入报价（第一个候选）
const added = await ev("(() => { const b=[...document.querySelectorAll('#p-select button')].find(x=>/加入报价/.test(x.textContent)); if(!b) return 'no btn'; b.click(); return 'added'; })()");
console.log('add ->', added);
await sleep(800);
// 报价单
await ev("(() => { const b=[...document.querySelectorAll('[data-act=\"tab\"]')].find(x=>x.dataset.id==='quote'); if(b) b.click(); return 1; })()");
await sleep(1200);
await send('Page.captureScreenshot', { format: 'png' }).then(async r => {
  const fs = await import('node:fs');
  fs.writeFileSync('_shots/quote-filled.png', Buffer.from(r.result.data, 'base64'));
});
const qtext = await ev("(() => { const s=document.querySelector('#p-quote'); return s? s.innerText.replace(/\\s+/g,' ').slice(0,500):''; })()");
console.log('quote text:', qtext);

// 资料包
await ev("(() => { const b=[...document.querySelectorAll('[data-act=\"tab\"]')].find(x=>x.dataset.id==='pack'); if(b) b.click(); return 1; })()");
await sleep(1200);
await send('Page.captureScreenshot', { format: 'png' }).then(async r => {
  const fs = await import('node:fs');
  fs.writeFileSync('_shots/pack.png', Buffer.from(r.result.data, 'base64'));
});
console.log('errors:', errs.length ? errs.slice(0, 8).join('\n') : 'none');
ws.close(); process.exit(0);
