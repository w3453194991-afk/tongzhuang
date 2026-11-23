/* 选款流程冒烟：填查询 → 点「解析并选款」→ 截图。
 * node build/test-match.mjs "奶油小方 圆领卫衣 110 码 300 件" _shots/match.png
 */
const [, , q = '奶油小方 圆领卫衣 110 码 300 件', out = '_shots/match.png'] = process.argv;

const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const page = list.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const waiters = new Map();
ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && waiters.has(m.id)) { waiters.get(m.id)(m); waiters.delete(m.id); } });
const send = (method, params = {}) => new Promise(res => { const mid = ++id; waiters.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
await new Promise(r => ws.addEventListener('open', r, { once: true }));
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1200, deviceScaleFactor: 1, mobile: false });
const base = process.env.BASE || 'http://127.0.0.1:8765';
const ev = async e => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value;

await send('Page.navigate', { url: base + '/index.html#/select' });
await sleep(1600);
await ev(`(() => { try { localStorage.setItem('gy_lang','zh'); } catch(e){} ; if (window.AUTH && AUTH.loginDemo) AUTH.loginDemo('staff'); return true; })()`);
await sleep(1000);
await ev(`(() => { ['gateMask','langMask'].forEach(i=>{const e=document.getElementById(i); if(e) e.classList.remove('on');}); return true; })()`);

const filled = await ev(`(() => {
  const ta = document.querySelector('#p-select textarea') || document.querySelector('textarea');
  if (!ta) return 'no-textarea';
  ta.value = ${JSON.stringify(q)};
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  const btn = [...document.querySelectorAll('#p-select button, button')].find(b => /解析|选款/.test(b.textContent));
  if (!btn) return 'no-button';
  btn.click();
  return 'ok';
})()`);
console.log('fill ->', filled, '| query:', q);
await sleep(1500);

// 滚动到结果区
await ev(`(() => { const el = document.querySelector('#p-select .card:nth-of-type(3), #p-select .match, #p-select .res'); if (el) el.scrollIntoView({block:'start'}); else window.scrollTo(0,320); return true; })()`);
await sleep(500);

const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
(await import('node:fs')).writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
// 同时把识别结果文本打出来
const txt = await ev(`(() => { const s = document.querySelector('#p-select'); return s ? s.innerText.slice(0, 1200) : ''; })()`);
console.log('--- page text ---\n' + String(txt).replace(/\n{2,}/g, '\n'));
console.log('saved', out);
ws.close(); process.exit(0);

