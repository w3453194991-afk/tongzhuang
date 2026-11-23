// 本地静态服务（零依赖）。用途：让浏览器以 http 方式打开，localStorage / 打印 / 下载更稳。
// 支持 Range（大文件拖动/秒开必须）、HEAD、Content-Length。
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT) || 8765;
/* 监听地址：默认只听本机；要放到服务器上给别人访问，用 HOST=0.0.0.0 启动 */
const HOST = process.env.HOST || '127.0.0.1';
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
  '.csv': 'text/csv; charset=utf-8',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.db': 'application/octet-stream', '.zip': 'application/zip',
  '.md': 'text/markdown; charset=utf-8'
};

/* ---------- RedFox MCP 代理（浏览器无法直连，走本地服务中转） ---------- */
const RF_BASE = 'https://mcp.redfox.hk';
const RF_PLATFORMS = ['douyin', 'xiaohongshu', 'gongzhonghao', 'kuaishou', 'shipinhao', 'bilibili',
  'jinritoutiao', 'tiktok', 'twitter', 'youtube', 'instagram'];

/* RedFox Key 只放服务端：优先环境变量 REDFOX_KEY，其次 tools/redfox-key.txt（已 gitignore） */
const RF_KEY_FILE = path.join(__dirname, 'redfox-key.txt');
const RF_NO_KEY = '服务端还没配 RedFox Key：把 Key 写进 tools/redfox-key.txt，或用环境变量 REDFOX_KEY 启动服务';
function rfKey() {
  if (process.env.REDFOX_KEY) return String(process.env.REDFOX_KEY).trim();
  try { return fs.readFileSync(RF_KEY_FILE, 'utf8').trim(); } catch (e) { return ''; }
}

function sseJson(text) {
  const out = [];
  String(text).split(/\r?\n/).forEach(line => {
    const m = /^data:\s*(.+)$/.exec(line.trim());
    if (!m) return;
    try { out.push(JSON.parse(m[1])); } catch (e) { }
  });
  return out;
}

async function rfRpc(platform, key, method, params, id) {
  const url = RF_BASE + '/' + platform + '/mcp';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'REDFOX_API_KEY': key || ''
    },
    body: JSON.stringify(Object.assign({ jsonrpc: '2.0', method }, id ? { id } : {}, { params: params || {} })),
    signal: AbortSignal.timeout(30000)
  });
  const text = await res.text();
  return { status: res.status, msgs: sseJson(text), text };
}

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

async function redfoxApi(req, res) {
  const u = url.parse(req.url, true);
  const key = rfKey();
  const platform = String(u.query.platform || '').toLowerCase();

  /* ---- Key 状态 / 写入（页面上不显示 Key，只在服务端保存） ---- */
  if (u.pathname === '/api/redfox/status') {
    return sendJson(res, 200, {
      ok: true, keySet: !!key,
      source: process.env.REDFOX_KEY ? 'env' : (fs.existsSync(RF_KEY_FILE) ? 'file' : 'none')
    });
  }
  if (u.pathname === '/api/redfox/key' && req.method === 'POST') {
    let body = '';
    try {
      await new Promise((resolve, reject) => {
        req.on('data', c => { body += c; if (body.length > 1e5) reject(new Error('请求体过大')); });
        req.on('end', resolve);
        req.on('error', reject);
      });
      const k = String((JSON.parse(body || '{}') || {}).key || '').trim();
      if (!k) {
        try { fs.unlinkSync(RF_KEY_FILE); } catch (e) { }
        return sendJson(res, 200, { ok: true, keySet: false });
      }
      fs.writeFileSync(RF_KEY_FILE, k, { encoding: 'utf8', mode: 0o600 });
      return sendJson(res, 200, { ok: true, keySet: true, tail: k.slice(-4) });
    } catch (e) {
      return sendJson(res, 200, { ok: false, error: String(e && e.message || e) });
    }
  }
  if (!key) return sendJson(res, 200, { ok: false, error: RF_NO_KEY });

  /* ---- REST 直连代理：/api/redfox/rest ---- */
  if (u.pathname === '/api/redfox/rest' && req.method === 'POST') {
    try {
      let body = '';
      await new Promise((resolve, reject) => {
        req.on('data', c => { body += c; if (body.length > 2e6) reject(new Error('请求体过大')); });
        req.on('end', resolve);
        req.on('error', reject);
      });
      const p = JSON.parse(body || '{}');
      const apiPath = String(p.path || '');
      // 白名单：只允许打到 redfox 的故事线接口，避免变成任意请求转发器
      if (!/^\/story\/api\/[A-Za-z0-9_\/.-]+$/.test(apiPath)) {
        return sendJson(res, 400, { ok: false, error: '非法接口路径' });
      }
      const r = await (async () => {
        let lastErr;
        for (let i = 0; i < 2; i++) {
          try {
            return await fetch('https://redfox.hk' + apiPath, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-API-KEY': key, 'User-Agent': 'QoderWork/1.0' },
              body: JSON.stringify(p.payload || {}),
              signal: AbortSignal.timeout(60000)
            });
          } catch (e) {
            lastErr = e;
            if (i === 0) await new Promise(r2 => setTimeout(r2, 800));
          }
        }
        throw lastErr;
      })();
      const text = await r.text();
      let data;
      try { data = JSON.parse(text); } catch (e) { data = text; }
      if (r.status !== 200) return sendJson(res, 200, { ok: false, error: 'HTTP ' + r.status, data });
      if (data && data.code !== undefined && data.code !== 2000) {
        return sendJson(res, 200, { ok: false, error: data.msg || ('code=' + data.code), code: data.code, data });
      }
      return sendJson(res, 200, { ok: true, platform, path: apiPath, data });
    } catch (e) {
      return sendJson(res, 200, { ok: false, error: String(e && e.message || e) });
    }
  }

  if (!RF_PLATFORMS.includes(platform)) return sendJson(res, 400, { ok: false, error: '未知平台: ' + platform });

  try {
    if (u.pathname === '/api/redfox/tools') {
      await rfRpc(platform, key, 'initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'xm-kids', version: '1' } }, 1);
      const r = await rfRpc(platform, key, 'tools/list', {}, 2);
      const msg = r.msgs.find(x => x.id === 2) || r.msgs[0] || {};
      if (msg.error) return sendJson(res, 200, { ok: false, error: msg.error.message || 'tools/list 失败' });
      const tools = (msg.result && msg.result.tools) || [];
      return sendJson(res, 200, { ok: true, platform, count: tools.length, tools });
    }
    if (u.pathname === '/api/redfox/call' && req.method === 'POST') {
      let body = '';
      await new Promise((resolve, reject) => {
        req.on('data', c => { body += c; if (body.length > 2e6) reject(new Error('请求体过大')); });
        req.on('end', resolve);
        req.on('error', reject);
      });
      const p = JSON.parse(body || '{}');
      const tool = String(p.tool || '');
      if (!tool) return sendJson(res, 400, { ok: false, error: '缺少 tool' });
      await rfRpc(platform, key, 'initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'xm-kids', version: '1' } }, 1);
      const r = await rfRpc(platform, key, 'tools/call', { name: tool, arguments: p.args || {} }, 2);
      const msg = r.msgs.find(x => x.id === 2) || r.msgs[0] || {};
      if (msg.error) return sendJson(res, 200, { ok: false, error: msg.error.message || '调用失败' });
      const result = msg.result || {};
      const structured = result.structuredContent;
      if (structured && structured.error) return sendJson(res, 200, { ok: false, error: structured.message || structured.error, code: structured.code });
      const raw = (result.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n');
      let data = raw;
      try { data = JSON.parse(raw); } catch (e) { }
      return sendJson(res, 200, { ok: true, platform, tool, data });
    }
    return sendJson(res, 404, { ok: false, error: 'not found' });
  } catch (e) {
    return sendJson(res, 200, { ok: false, error: String(e && e.message || e) });
  }
}

/* ---- 款号查询：/api/lookup?q=xxx ---- */
function decodeDdg(href) {
  const m = /uddg=([^&]+)/.exec(href || '');
  if (m) { try { return decodeURIComponent(m[1]); } catch (e) { return href; } }
  if (href.indexOf('//') === 0) return 'https:' + href;
  return href;
}
function stripTags(s) {
  return String(s || '').replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}
async function lookupApi(req, res) {
  const u = url.parse(req.url, true);
  const q = String(u.query.q || '').trim().slice(0, 120);
  if (!q) return sendJson(res, 200, { ok: false, error: '缺少关键词' });
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
  /* 款号多是纯代码，搜索词补一句上下文，免得搜到显示器、电池等同名结果 */
  const qq = /kids|children|童装|款号/i.test(q) ? q : q + ' kids clothing';
  try {
    /* 先 DuckDuckGo（返回干净，无广告） */
    let items = [];
    try {
      const r = await fetch('https://html.duckduckgo.com/html/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
        body: 'q=' + encodeURIComponent(qq),
        signal: AbortSignal.timeout(20000)
      });
      const html = await r.text();
      const re = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
      let m;
      while ((m = re.exec(html)) && items.length < 10) {
        items.push({ title: stripTags(m[2]), url: decodeDdg(m[1]), snippet: stripTags(m[3]), site: '' });
      }
    } catch (e) { /* 落到 Bing */ }
    /* Bing 兜底 */
    if (!items.length) {
      const r2 = await fetch('https://www.bing.com/search?q=' + encodeURIComponent(qq) + '&setlang=zh-CN', {
        headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000)
      });
      const html2 = await r2.text();
      const re2 = /<li[^>]*class="b_algo"[\s\S]*?<h2[^>]*><a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/g;
      let m2;
      while ((m2 = re2.exec(html2)) && items.length < 10) {
        items.push({ title: stripTags(m2[2]), url: m2[1], snippet: stripTags(m2[3]), site: '' });
      }
    }
    items.forEach(it => {
      try { it.site = new URL(it.url).hostname.replace(/^www\./, ''); } catch (e) { }
    });
    return sendJson(res, 200, { ok: true, q, items });
  } catch (e) {
    return sendJson(res, 200, { ok: false, error: String((e && e.message) || e) });
  }
}

/* ---- 汇率：/api/fx ---- */
let FX_CACHE = { at: 0, body: null };
async function fxApi(req, res) {
  if (FX_CACHE.body && Date.now() - FX_CACHE.at < 3600e3) return sendJson(res, 200, FX_CACHE.body);
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/USD', {
      headers: { 'User-Agent': 'QoderWork/1.0' }, signal: AbortSignal.timeout(12000)
    });
    const j = await r.json();
    if (!j || j.result !== 'success' || !j.rates) throw new Error('汇率源返回异常');
    const body = { ok: true, base: 'USD', rates: j.rates, updated: j.time_last_update_utc || '', source: 'open.er-api.com' };
    FX_CACHE = { at: Date.now(), body };
    return sendJson(res, 200, body);
  } catch (e) {
    return sendJson(res, 200, { ok: false, error: String((e && e.message) || e) });
  }
}

/* ---- 版本：/api/version（告诉页面当前磁盘上的代码是什么时候的，用来识破浏览器缓存） ---- */
function versionApi(req, res) {
  try {
    const st = fs.statSync(path.join(ROOT, 'assets/app.js'));
    const d = new Date(st.mtimeMs);
    const p = n => String(n).padStart(2, '0');
    return sendJson(res, 200, {
      ok: true,
      at: d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()),
      size: st.size
    });
  } catch (e) {
    return sendJson(res, 200, { ok: false, error: String((e && e.message) || e) });
  }
}

/* ---------- 共享数据仓库：/api/store ----------
   放服务器上跑的时候，询价 / 报价 / 结算单 / 售后 存这里，所有人看到的是同一份。
   落盘到 data/store.json（原子写：先写 .tmp 再改名），最多保留每类 3000 条。 */
const STORE_DIR = path.join(ROOT, 'data');
const STORE_FILE = path.join(STORE_DIR, 'store.json');
const COLLS = ['inquiries', 'quotes', 'settlements', 'aftersales'];
const COLL_MAX = 3000;
let STORE = null, STORE_T = null;

function storeLoad() {
  if (STORE) return STORE;
  STORE = { v: 1, seq: 0 };
  COLLS.forEach(c => { STORE[c] = []; });
  try {
    const o = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
    STORE.seq = Number(o.seq) || 0;
    COLLS.forEach(c => { if (Array.isArray(o[c])) STORE[c] = o[c]; });
  } catch (e) { /* 首次运行没有文件，正常 */ }
  return STORE;
}
function storeFlush() {
  if (STORE_T) return;
  STORE_T = setTimeout(() => {
    STORE_T = null;
    try {
      fs.mkdirSync(STORE_DIR, { recursive: true });
      const tmp = STORE_FILE + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(STORE), 'utf8');
      fs.renameSync(tmp, STORE_FILE);
    } catch (e) { console.error('[store] 写盘失败:', e.message); }
  }, 150);
}
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let n = 0; const chunks = [];
    req.on('data', c => {
      n += c.length;
      if (n > (limit || 4 * 1024 * 1024)) { reject(new Error('body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (e) { reject(new Error('bad json')); }
    });
    req.on('error', reject);
  });
}
function storeAdd(coll, item) {
  const st = storeLoad();
  if (!COLLS.includes(coll)) throw new Error('unknown collection: ' + coll);
  const it = Object.assign({}, item);
  st.seq += 1;
  it.seq = st.seq;
  it.id = it.id || (coll.slice(0, 2) + '_' + st.seq);
  it.t = it.t || Date.now();
  st[coll].push(it);
  if (st[coll].length > COLL_MAX) st[coll] = st[coll].slice(-COLL_MAX);
  storeFlush();
  return it;
}
async function storeApi(req, res) {
  const u = url.parse(req.url, true);
  const p = u.pathname.replace(/\/+$/, '');
  try {
    if (p === '/api/store/all' || p === '/api/store/ping') {
      const st = storeLoad();
      if (p === '/api/store/ping') return sendJson(res, 200, { ok: true, mode: 'server', seq: st.seq });
      const data = {};
      COLLS.forEach(c => { data[c] = st[c]; });
      return sendJson(res, 200, { ok: true, seq: st.seq, data });
    }
    if (req.method === 'POST' && p === '/api/store/add') {
      const b = await readBody(req);
      const it = storeAdd(String(b.coll || ''), b.item || {});
      return sendJson(res, 200, { ok: true, item: it });
    }
    if (req.method === 'POST' && p === '/api/store/patch') {
      const b = await readBody(req);
      const st = storeLoad();
      const arr = st[String(b.coll || '')];
      if (!Array.isArray(arr)) return sendJson(res, 200, { ok: false, error: 'unknown collection' });
      const it = arr.find(x => x.id === b.id || String(x.seq) === String(b.id));
      if (!it) return sendJson(res, 200, { ok: false, error: 'not found' });
      Object.assign(it, b.patch || {});
      storeFlush();
      return sendJson(res, 200, { ok: true, item: it });
    }
    if (req.method === 'POST' && p === '/api/store/del') {
      const b = await readBody(req);
      const st = storeLoad();
      const arr = st[String(b.coll || '')];
      if (!Array.isArray(arr)) return sendJson(res, 200, { ok: false, error: 'unknown collection' });
      const i = arr.findIndex(x => x.id === b.id);
      if (i >= 0) arr.splice(i, 1);
      storeFlush();
      return sendJson(res, 200, { ok: true, removed: i >= 0 });
    }
    return sendJson(res, 404, { ok: false, error: 'no such store endpoint' });
  } catch (e) {
    return sendJson(res, 200, { ok: false, error: String((e && e.message) || e) });
  }
}

http.createServer((req, res) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  if (req.url.indexOf('/api/redfox') === 0) return redfoxApi(req, res);
  if (req.url.indexOf('/api/lookup') === 0) return lookupApi(req, res);
  if (req.url.indexOf('/api/fx') === 0) return fxApi(req, res);
  if (req.url.indexOf('/api/version') === 0) return versionApi(req, res);
  if (req.url.indexOf('/api/store') === 0) return storeApi(req, res);
  let rel = decodeURIComponent(url.parse(req.url).pathname);
  if (rel === '/') rel = '/index.html';
  /* 不进静态目录：数据与工具（含 Key）不能被浏览器直接下载 */
  if (/^\/data\//i.test(rel) || /^\/tools\//i.test(rel) || /^\/\./.test(rel) || /\/(\.git|\.env)/i.test(rel)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('404 Not Found: ' + rel);
  }
  const fp = path.join(ROOT, rel);
  // 防目录穿越
  if (!fp.startsWith(ROOT)) { res.writeHead(403); return res.end('403'); }
  fs.stat(fp, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Not Found: ' + rel);
    }
    const type = MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream';
    const total = st.size;
    const base = {
      'Content-Type': type,
      'Cache-Control': 'no-cache',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
      'Accept-Ranges': 'bytes',
      'Content-Length': total
    };

    const range = req.headers.range;
    if (range && /^bytes=/.test(range)) {
      const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
      let start = m && m[1] ? parseInt(m[1], 10) : 0;
      let end = m && m[2] ? parseInt(m[2], 10) : total - 1;
      if (!m) { res.writeHead(200, base); return fs.createReadStream(fp).pipe(res); }
      if (start >= total || end < start) {
        res.writeHead(416, { 'Content-Range': `bytes */${total}` });
        return res.end();
      }
      if (end >= total) end = total - 1;
      res.writeHead(206, {
        'Content-Type': type,
        'Cache-Control': 'no-cache',
        'Accept-Ranges': 'bytes',
        'Content-Range': `bytes ${start}-${end}/${total}`,
        'Content-Length': end - start + 1
      });
      if (req.method === 'HEAD') return res.end();
      return fs.createReadStream(fp, { start, end }).pipe(res);
    }

    res.writeHead(200, base);
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(fp).pipe(res);
  });
}).listen(PORT, HOST, () => {
  console.log('');
  console.log('  小满童装 · 选款与报价中台已启动');
  console.log('  监听: ' + HOST + ':' + PORT);
  console.log('  本机打开： http://127.0.0.1:' + PORT + '/index.html');
  if (HOST !== '127.0.0.1') console.log('  局域网/服务器访问： http://<这台机器的IP>:' + PORT + '/index.html');
  console.log('  共享数据文件： ' + STORE_FILE);
  console.log('  关闭本窗口即停止服务。');
  console.log('');
});
