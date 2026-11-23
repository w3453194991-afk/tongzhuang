/* 身份与行为：两套界面（员工 / 客户）+ 客户浏览记录
   为保证零安装，数据存在本机 localStorage；跨设备需要后续的小服务端。 */
window.AUTH = (function () {
  const KEY = 'gy_users_v1';
  const SES = 'gy_session_v1';
  const STAFF_CODE = 'XM2026';
  const BOSS_CODE = 'XMBOSS';
  const CONTACT_TYPES = ['WhatsApp', 'Phone', 'Email', 'WeChat', 'Telegram', 'Viber', 'Other'];

  const now = () => Date.now();
  const min = m => now() - m * 60000;
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  let db = load();
  let session = readSession();

  function load() {
    try {
      const r = localStorage.getItem(KEY);
      if (r) {
        const o = JSON.parse(r);
        if (o && Array.isArray(o.users)) return o;
      }
    } catch (e) { }
    return seed();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { }
  }
  /** 另一个窗口改了数据：重读 db，但保留本标签页的登录身份（两个窗口可以一个是员工一个是客户） */
  function reload() { db = load(); return db; }
  function readSession() {
    /* 先看本标签页自己的身份：同一个浏览器开两个窗口（一个员工一个客户）时互不顶掉 */
    try { const s = sessionStorage.getItem(SES); if (s) return s; } catch (e) { }
    try { return localStorage.getItem(SES) || null; } catch (e) { return null; }
  }
  function writeSession(id) {
    session = id || null;
    try { session ? localStorage.setItem(SES, id) : localStorage.removeItem(SES); } catch (e) { }
    try { session ? sessionStorage.setItem(SES, id) : sessionStorage.removeItem(SES); } catch (e) { }
  }

  function seed() {
    const users = [
      {
        id: 'U1', role: 'customer', name: 'Carlos Mendoza', company: 'Transportes Mendoza', country: '墨西哥',
        contact: { type: 'WhatsApp', value: '+52 55 1234 5678' }, tags: ['车队', '墨西哥', 'A 类'],
        created: min(60 * 24 * 9), lastSeen: min(35),
        events: [
          { t: min(60 * 5), type: 'search', d: { q: 'también necesitamos pastillas traseras 200 sets' } },
          { t: min(60 * 5 - 2), type: 'view', d: { code: 'SW2601047' } },
          { t: min(60 * 4), type: 'search', d: { q: 'HOWO A7 pastillas traseras' } },
          { t: min(60 * 4 - 3), type: 'view', d: { code: 'SW2601047' } },
          { t: min(60 * 3), type: 'view', d: { code: 'DR2601001' } },
          { t: min(120), type: 'addCart', d: { code: 'SW2601047' } },
          { t: min(60), type: 'quote' },
          { t: min(35), type: 'pack' }
        ]
      },
      {
        id: 'U2', role: 'customer', name: 'Ahmed Al-Sayed', company: 'Al-Sayed Auto Parts', country: '沙特阿拉伯',
        contact: { type: 'WhatsApp', value: '+966 55 987 6543' }, tags: ['批发', '中东', 'B 类'],
        created: min(60 * 24 * 21), lastSeen: min(60 * 26),
        events: [
          { t: min(60 * 26), type: 'search', d: { q: 'فحمات فرامل HOWO 457' } },
          { t: min(60 * 25), type: 'view', d: { code: 'TS2601087' } },
          { t: min(60 * 25 - 4), type: 'view', d: { code: 'SW2601047' } },
          { t: min(60 * 24), type: 'quote' }
        ]
      },
      {
        id: 'U3', role: 'customer', name: 'Nguyen Van Minh', company: 'Minh Phat Trucking', country: '越南',
        contact: { type: 'Phone', value: '+84 90 123 4567' }, tags: ['终端', '东南亚', 'C 类'],
        created: min(60 * 24 * 6), lastSeen: min(60 * 8),
        events: [
          { t: min(60 * 9), type: 'search', d: { q: 'má phanh HOWO A7' } },
          { t: min(60 * 8), type: 'view', d: { code: 'SW2601047' } }
        ]
      },
      {
        id: 'U4', role: 'customer', name: 'José Silva', company: 'Frenos Brasil Ltda', country: '巴西',
        contact: { type: 'Email', value: 'jose@frenosbrasil.com.br' }, tags: ['进口商', '南美', 'A 类'],
        created: min(60 * 24 * 30), lastSeen: min(60 * 47),
        events: [
          { t: min(60 * 48), type: 'search', d: { q: 'pastilha de freio 29087 preço' } },
          { t: min(60 * 47), type: 'view', d: { code: 'TS2601087' } },
          { t: min(60 * 47 - 6), type: 'addCart', d: { code: 'TS2601087' } }
        ]
      }
    ];
    return { users };
  }

  function normContact(v) { return (v || '').replace(/[\s\-().]/g, '').toLowerCase(); }
  function me() { return db.users.find(u => u.id === session) || null; }
  function isDemoStaff() { const u = me(); return !!u && (u.role === 'staff' || u.role === 'boss') && !!u.demo; }
  function isBoss() { const u = me(); return !!u && u.role === 'boss'; }
  function isStaff() { const u = me(); return !!u && (u.role === 'staff' || u.role === 'boss'); }

  function validContact(type, value) {
    const v = (value || '').trim();
    if (!v) return '请填写联系方式';
    if (type === 'Email' || v.includes('@')) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : '邮箱格式不正确';
    const digits = v.replace(/[^\d]/g, '');
    if (digits.length < 7) return '号码至少 7 位';
    return '';
  }

  function login(o) {
    o = o || {};
    if (o.role === 'boss') {
      if ((o.code || '').trim().toUpperCase() !== BOSS_CODE) return { ok: false, msg: '老板访问码不正确' };
      let u = db.users.find(x => x.role === 'boss' && !x.demo);
      if (!u) {
        u = {
          id: 'B1', role: 'boss', name: o.name || '老板', company: 'XIAOMAN KIDS', country: '中国',
          contact: { type: 'Email', value: o.value || 'boss@xiaomankids.com' }, tags: [], created: now(), lastSeen: now(), events: []
        };
        db.users.push(u);
      }
      u.lastSeen = now(); save(); writeSession(u.id);
      return { ok: true, user: u };
    }
    if (o.role === 'staff') {
      if ((o.code || '').trim().toUpperCase() !== STAFF_CODE) return { ok: false, msg: '访问码不正确' };
      let u = db.users.find(x => x.role === 'staff' && !x.demo);
      if (!u) {
        u = {
          id: 'S1', role: 'staff', name: o.name || '销售顾问', company: 'XIAOMAN KIDS', country: '中国',
          contact: { type: 'Email', value: o.value || 'sales@xiaomankids.com' }, tags: [], created: now(), lastSeen: now(), events: []
        };
        db.users.push(u);
      }
      u.lastSeen = now(); save(); writeSession(u.id);
      return { ok: true, user: u };
    }
    const bad = validContact(o.type, o.value);
    if (bad) return { ok: false, msg: bad };
    const key = normContact(o.value);
    let u = db.users.find(x => x.role === 'customer' && !x.demo && normContact(x.contact.value) === key);
    if (!u) {
      u = {
        id: 'U' + Math.random().toString(36).slice(2, 7).toUpperCase(),
        role: 'customer', name: (o.name || '').trim() || 'Customer',
        company: (o.company || '').trim(), country: (o.country || '').trim(),
        contact: { type: o.type || 'WhatsApp', value: o.value.trim() },
        tags: ['新客户'], created: now(), lastSeen: now(), events: []
      };
      db.users.push(u);
    } else {
      if (o.name) u.name = o.name.trim();
      if (o.company) u.company = o.company.trim();
      u.lastSeen = now();
    }
    u.events.push({ t: now(), type: 'login', d: {} });
    save(); writeSession(u.id);
    return { ok: true, user: u };
  }

  /** 客户提交询价（前台点「询价」） */
  function submitInquiry(items, note) {
    const u = me();
    if (!u || u.role !== 'customer') return { ok: false, msg: '请先登录' };
    if (!items || !items.length) return { ok: false, msg: '没有型号' };
    u.events = u.events || [];
    const seq = u.events.filter(e => e.type === 'inquiry').length + 1;
    const d = new Date();
    const no = 'RFQ-' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '-' + String(seq).padStart(3, '0');
    u.events.push({ t: now(), type: 'inquiry', d: { no, items, note: note || '' } });
    u.lastSeen = now(); save();
    return { ok: true, no };
  }

  /** 所有客户的询价，最新在前 */
  function inquiries() {
    const out = [];
    db.users.filter(u => u.role === 'customer').forEach(u => {
      (u.events || []).forEach(e => {
        if (e.type !== 'inquiry' || !e.d || !Array.isArray(e.d.items) || !e.d.items.length) return;
        out.push({ user: u, no: e.d.no, items: e.d.items.slice(), note: e.d.note || '', t: e.t });
      });
    });
    return out.sort((x, y) => y.t - x.t);
  }

  /** 体验版：不填联系方式 / 不输访问码，一键进入；记录照常，但带「体验」标记 */
  function loginDemo(role) {
    const boss = role === 'boss';
    const staff = role === 'staff';
    const id = boss ? 'DEMO-B' : staff ? 'DEMO-S' : 'DEMO';
    let u = db.users.find(x => x.id === id);
    if (!u) {
      u = boss
        ? {
          id, role: 'boss', demo: true, name: '体验老板', company: '小满童装（体验）', country: '中国',
          contact: { type: 'Demo', value: 'demo.boss@xiaomankids.local' }, tags: ['体验版'],
          created: now(), lastSeen: now(), events: []
        }
        : staff
        ? {
          id, role: 'staff', demo: true, name: '体验员工', company: '小满童装（体验）', country: '中国',
          contact: { type: 'Demo', value: 'demo.staff@xiaomankids.local' }, tags: ['体验版'],
          created: now(), lastSeen: now(), events: []
        }
        : {
          id, role: 'customer', demo: true, name: '体验账号', company: 'Demo visitor', country: '',
          contact: { type: 'Demo', value: 'demo@xiaomankids.local' }, tags: ['体验版'],
          created: now(), lastSeen: now(), events: []
        };
      db.users.push(u);
    }
    u.lastSeen = now();
    u.events = u.events || [];
    u.events.push({ t: now(), type: 'login', d: { demo: true } });
    save(); writeSession(u.id);
    return { ok: true, user: u };
  }

  function logout() { writeSession(null); }

  function track(type, d) {
    const u = me();
    if (!u || u.role !== 'customer') return;
    u.events = u.events || [];
    u.events.push({ t: now(), type, d: d || {} });
    if (u.events.length > 400) u.events = u.events.slice(-400);
    u.lastSeen = now();
    save();
  }

  function stats(u) {
    const ev = (u.events || []).slice();
    const views = ev.filter(e => e.type === 'view');
    const searches = ev.filter(e => e.type === 'search');
    const carts = ev.filter(e => e.type === 'addCart');
    const orders = ev.filter(e => e.type === 'quote' || e.type === 'pack');
    const last = ev.length ? Math.max(...ev.map(e => e.t)) : u.lastSeen;
    let score = 0;
    if (last > now() - 86400000) score += 25;
    else if (last > now() - 7 * 86400000) score += 12;
    score += Math.min(28, views.length * 7) + Math.min(12, searches.length * 4) + Math.min(20, carts.length * 10) + Math.min(10, orders.length * 5);
    if ((u.tags || []).some(t => /A 类|A|终端/.test(t))) score += 6;
    return { views: views.length, searches: searches.length, carts: carts.length, orders: orders.length, last, score: Math.min(99, score), events: ev };
  }

  function customers() {
    return db.users.filter(u => u.role === 'customer').map(u => Object.assign({}, u, { stat: stats(u) }))
      .sort((a, b) => b.stat.last - a.stat.last);
  }

  function sendUrl(u, text) {
    const c = (u && u.contact) || {};
    const v = (c.value || '').trim();
    const digits = v.replace(/[^\d]/g, '');
    if (v.includes('@')) return 'mailto:' + v + '?subject=' + encodeURIComponent('XIAOMAN KIDS brake pads') + '&body=' + encodeURIComponent(text);
    if (digits) return 'https://wa.me/' + digits + '?text=' + encodeURIComponent(text);
    return '';
  }

  function setTag(uid, tag) {
    const u = db.users.find(x => x.id === uid);
    if (!u) return;
    u.tags = u.tags || [];
    if (!u.tags.includes(tag)) u.tags.push(tag);
    save();
  }

  /** 员工录入客户（手动填 / 拍名片识别后确认）：同联系方式视为同一客户，更新不新增 */
  function addCustomer(o) {
    o = o || {};
    const name = (o.name || '').trim();
    const type = o.type || 'WhatsApp';
    const value = (o.value || '').trim();
    if (!name) return { ok: false, msg: '请填写联系人姓名' };
    const bad = validContact(type, value);
    if (bad) return { ok: false, msg: bad };
    const key = normContact(value);
    const tags = (o.tags || []).filter(Boolean);
    let u = db.users.find(x => x.role === 'customer' && normContact(x.contact.value) === key);
    const isNew = !u;
    if (!u) {
      u = {
        id: 'U' + Math.random().toString(36).slice(2, 7).toUpperCase(),
        role: 'customer', name,
        company: (o.company || '').trim(), country: (o.country || '').trim(),
        contact: { type, value }, tags: tags.length ? tags : ['新客户'],
        note: (o.note || '').trim(), source: o.source || 'manual',
        created: now(), lastSeen: now(), events: []
      };
      db.users.push(u);
    } else {
      u.name = name;
      if (o.company) u.company = o.company.trim();
      if (o.country) u.country = o.country.trim();
      u.contact = { type, value };
      if (tags.length) u.tags = [...new Set((u.tags || []).concat(tags))];
      if (o.note) u.note = o.note.trim();
      u.source = o.source || u.source || 'manual';
      u.lastSeen = now();
    }
    const by = (me() || {}).name || '';
    u.events = u.events || [];
    u.events.push({ t: now(), type: 'create', d: { source: u.source, by } });
    save();
    return { ok: true, user: u, isNew };
  }

  return {
    CONTACT_TYPES, STAFF_CODE, BOSS_CODE,
    me, isStaff, isBoss, isDemoStaff, login, loginDemo, logout, track, stats, customers, sendUrl, setTag, submitInquiry, inquiries, addCustomer,
    reload, KEY,
    all: () => db.users
  };
})();