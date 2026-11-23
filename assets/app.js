/* 小满童装 · 选款与报价中台 —— 界面层 */
(function () {
  const D = window.DB, E = window.Engine;
  const esc = E.esc, money = E.money, norm = E.norm;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ================= 状态 ================= */
  const KEY = 'gy_hub_v1';
  const S = {
    tab: 'home',
    q: '',
    heroQ: '',
    match: null,
    cart: [],
    customerId: D.customers[0].id,
    leads: D.leads.map(l => ({ ...l, product: l.product || [] })),
    quotes: [],
    overrides: {},
    draftFits: [],
    filters: { cat: '', brand: '', mat: '', q: '', onlyFit: false, sort: '' },
    packCfg: { cover: true, quote: true, spec: true, test: true, confirm: true },
    content: { pid: (D.products.find(p => p.code === 'SW2601047') || D.products[0]).id, market: '墨西哥', lang: 'ES', platform: 'TikTok', seconds: 30, pain: '同系列拿错尺码，买错就退、就压货' },
    script: null,
    chat: { open: false, msgs: [], auto: true, idx: 0 },
    custMsgs: [],
    addCust: { name: '', company: '', country: '', type: 'WhatsApp', value: '', tags: '', note: '', photo: '', scanning: false, ocr: false },
    fuMute: {},
    fuFlags: {},
    fuNotes: {},
    fuFilter: 'all',
    leadsOwner: '',
    /* 售后服务：客户提交后各存一份，员工删自己的、老板删自己的，互不影响 */
    asStaff: [],
    asBoss: [],
    /* 工具书 */
    tax: { country: 'US', hs: '', qty: 0 },
    model: { q: '', res: [], busy: false, err: '' },
    fx: { amt: 10000, from: 'USD', to: 'CNY', rates: {}, at: '', busy: false, err: '' },
    /* 客户提交过的结算单：存提交那一刻的价格快照 */
    myOrders: [],
    quoteMeta: { no: '', date: new Date().toISOString().slice(0, 10), incoterm: '', pay: '', note: '' }
  };
  let storageOK = true;
  let VIEWQ = null;
  /* 跨窗口同步用：记下本标签页最后写入的内容，避免自己写自己读形成循环 */
  let LAST_HUB = '', LAST_USERS = '', SYNCING = false;
  /* 记住上一次的登录身份：只有真正换人时才跳回首页，否则深链接会被打断 */
  let LAST_UID;
  let RQ = null;
  let PRICE_ROWS = [];
  /** 名片识别演示：定时器与样例索引（识别结果仅演示，接口接上后换成真 OCR） */
  let OCR_T = null, OCR_I = 0;

  function save() {
    try {
      const json = JSON.stringify({
        cart: S.cart, customerId: S.customerId, leads: S.leads, quotes: S.quotes,
        overrides: S.overrides, draftFits: S.draftFits, quoteMeta: S.quoteMeta, custMsgs: S.custMsgs, deals: S.deals,
        fuMute: S.fuMute, fuFlags: S.fuFlags, fuNotes: S.fuNotes,
        /* 新增：售后服务两份独立清单 + 税务查询上次所选市场 */
        asStaff: S.asStaff, asBoss: S.asBoss, tax: S.tax, myOrders: S.myOrders, fx: { amt: S.fx.amt, from: S.fx.from, to: S.fx.to }
      });
      localStorage.setItem(KEY, json);
      LAST_HUB = json;
    } catch (e) { storageOK = false; }
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const o = JSON.parse(raw);
      Object.assign(S, o);
      S.leads = S.leads.map(l => ({ ...l, product: l.product || [] }));
    } catch (e) { storageOK = false; }
    // 覆盖产品字段
    Object.keys(S.overrides || {}).forEach(pid => { const p = E.byId.get(pid); if (p) Object.assign(p, S.overrides[pid]); });
    // 草稿适穿并入
    (S.draftFits || []).forEach(f => {
      if (!E.byId.has(f.pid)) return;
      D.fitments.push({
        id: f.id, vid: f.vid, aid: f.aid, pid: f.pid, pos: f.pos, fit: f.fit, conf: f.conf, src: f.src, q: f.q || [],
        vName: (D.vehicles.find(v => v.id === f.vid) || {}).brand ? `${(D.vehicles.find(v => v.id === f.vid)).brand} ${D.vehicles.find(v => v.id === f.vid).series} ${D.vehicles.find(v => v.id === f.vid).model}` : '通用',
        aName: (D.axles.find(a => a.id === f.aid) || {}).brand ? `${(D.axles.find(a => a.id === f.aid)).brand} ${D.axles.find(a => a.id === f.aid).model}` : '按旧款确认'
      });
    });
  }
  load();

  /* ================= 跨窗口同步 =================
     同一个浏览器开两个窗口（一个员工、一个客户）时，两个窗口各有一份内存数据。
     一边提交询价 / 改购物车，另一边靠 storage 事件重读并重绘，不用手动刷新。
     注意：只重读数据，不改本窗口的登录身份——两个窗口才能同时一个员工一个客户。 */
  LAST_HUB = (function () { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } })();
  LAST_USERS = (function () { try { return localStorage.getItem(A.KEY) || ''; } catch (e) { return ''; } })();
  function syncRender() {
    clearTimeout(syncRender._t);
    syncRender._t = setTimeout(() => {
      if (SYNCING) return;
      SYNCING = true;
      try { render(); } catch (e) { }
      setTimeout(() => { SYNCING = false; }, 600);
    }, 120);
  }
  window.addEventListener('storage', e => {
    try {
      if (!e.key) return;
      if (e.key === A.KEY) {
        const nvUsers = (function () { try { return localStorage.getItem(A.KEY) || ''; } catch (err) { return ''; } })();
        if (nvUsers === LAST_USERS) return;
        LAST_USERS = nvUsers;
        const before = (A.inquiries() || []).length;
        A.reload();
        const after = (A.inquiries() || []).length;
        if (A.isStaff() && after > before) {
          const q = A.inquiries()[0];
          if (q) toast('收到新询价 ' + (q.no || '') + (q.user ? ' · ' + q.user.name : ''));
        }
        syncRender();
        return;
      }
      if (e.key === KEY) {
        const nvHub = (function () { try { return localStorage.getItem(KEY) || ''; } catch (err) { return ''; } })();
        if (nvHub === LAST_HUB) return;
        LAST_HUB = nvHub;
        load();
        syncRender();
      }
    } catch (err) { }
  });

  const customer = () => {
    const base = D.customers.find(c => c.id === S.customerId) || D.customers[0];
    const u = A.me();
    if (u && u.role === 'customer') {
      return Object.assign({}, base, {
        name: u.company || u.name,
        country: u.country || base.country,
        type: LZ('客户端客户', 'Portal customer')
      });
    }
    return base;
  };
  const cartRows = () => S.cart.map(it => ({ ...it, product: E.byId.get(it.pid) })).filter(r => r.product);
  const pendingCount = () => D.fitments.filter(f => f.conf !== '已确认').length + S.draftFits.length;

  /* ================= 通用 UI ================= */
  function tag(text, cls) { return `<span class="tag ${cls || 'n'}">${text}</span>`; }
  const confTag = c => {
    const M = { '高': 'High', '中': 'Medium', '低': 'Low', '已确认': 'Verified' };
    return `<span class="tag ${E.confTag(c)}">${I.getLang() === 'zh' ? c : (M[c] || c)}</span>`;
  };
  const SRC_EN = {
    '官网产品目录': 'Official catalogue', '官网产品目录（同款多编号）': 'Official catalogue (multi-code)',
    '系统生成': 'System', '工厂码': 'Factory code', '客户提供': 'Customer provided', '行业资料': 'Industry data'
  };
  function srcI18n(v) { return I.getLang() === 'zh' ? v : (SRC_EN[v] || v); }

  function drawer(title, body, footer) {
    $('#drawerTitle').innerHTML = title;
    $('#drawerBody').innerHTML = body;
    $('#drawerFoot').innerHTML = footer || '';
    $('#drawer').classList.add('on'); $('#drawerMask').classList.add('on');
  }
  function closeDrawer() { $('#drawer').classList.remove('on'); $('#drawerMask').classList.remove('on'); }
  function modal(title, body, footer, wide) {
    $('#modalTitle').innerHTML = title;
    $('#modalBody').innerHTML = body;
    $('#modalFoot').innerHTML = footer || '';
    $('#modal').style.maxWidth = wide ? '1080px' : '900px';
    $('#modalMask').classList.add('on');
  }
  function closeModal() { $('#modalMask').classList.remove('on'); }
  window.__toast = (m) => toast(m);
  function toast(msg, kind) {
    const t = document.createElement('div');
    t.className = 'toast ' + (kind || '');
    t.textContent = msg;
    $('#toasts').appendChild(t);
    setTimeout(() => { t.style.opacity = 0; setTimeout(() => t.remove(), 300); }, 2200);
  }
  function printHTML(html) {
    $('#printRoot').innerHTML = html;
    window.print();
  }

  /* ---- 成交台账示例数据（首次打开时生成，可删） ---- */
  function isoDay(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function seedDeals() {
    const C = [
      ['Distribuidora Infantil Mendoza', '墨西哥'],
      ['Al-Sayed Kids Trading', '沙特阿拉伯'],
      ['Minh Phat Kids', '越南'],
      ['Moda Bebê Brasil', '巴西']
    ];
    const RAW = [
      ['SW2601047', 1200, '已成交', 4, '李娜', 0, '奶油小方 圆领卫衣 110，第三次复购'],
      ['DR2601001', 600, '已成交', 9, '李娜', 3, '小满花园 碎花连衣裙 110，随资料包一起'],
      ['SW2601047', 800, '谈判中', 12, '李娜', 0, '要加绒版本，等样品确认'],
      ['XM-DR-2605', 1500, '已成交', 18, '张伟', 1, '沙特批发，先走一个柜'],
      ['XM-SW-2608', 400, '已报价', 21, '张伟', 1, '价格卡在 4.2，等对方回'],
      ['PT2601167', 900, '已成交', 27, '张伟', 1, '老客户补单'],
      ['XM-TS-2612', 2000, '已成交', 33, '王强', 2, '越南母婴连锁，年单第一笔'],
      ['BD2601253', 300, '已丢单', 39, '王强', 2, '对手便宜 8%，价格没跟上'],
      ['TS2601087', 700, '谈判中', 44, '王强', 2, '想先要质检报告'],
      ['ST2601205', 500, '已成交', 52, '张伟', 1, ''],
      ['XM-DR-2610', 1000, '已成交', 61, '李娜', 3, '巴西进口商，走海运'],
      ['JK2601131', 350, '已报价', 70, '张伟', 1, '等对方确认款式系列']
    ];
    return RAW.map((r, i) => {
      const p = D.products.find(x => x.code === r[0]) || {};
      const dt = new Date(); dt.setDate(dt.getDate() - r[3]);
      return {
        id: 'D' + (100 + i), code: r[0], pname: p.nameEn || '', qty: r[1],
        price: p.price || 0, amount: Math.round(r[1] * (p.price || 5) * 100) / 100,
        status: r[2], date: isoDay(dt), staff: r[4], customer: C[r[5]][0],
        country: C[r[5]][1], note: r[6]
      };
    });
  }
  function ensureDeals() {
    if (!Array.isArray(S.deals)) { S.deals = seedDeals(); save(); }
  }

  /* ================= 路由 ================= */
  const TABS = [
    ['home', '工作台', '◱'], ['select', '智能选款', '◎'], ['products', '产品库', '▤'],
    ['graph', '尺码适配图谱', '⋔'], ['quote', '报价单', '￥'], ['pack', '资料包', '❐'],
    ['visits', '客户浏览', '👁'], ['leads', '询盘线索', '✉'], ['network', '用户画像', '◉'], ['content', '获客内容', '▶'],
    ['import', '数据导入', '⇪']
  ];
  // 客户能看的：首页 / 选款 / 产品库 / 我的报价 / 自定义定制
  const CUST_TABS = ['home', 'select', 'products', 'quote', 'custom', 'aftersale'];
  // 员工视角的基础页（比客户多一个「资料包」）
  const STAFF_TABS = ['home', 'select', 'products', 'quote', 'pack'];
  /** 仅员工可见的 9 个页面，按用途收进 2 个分组菜单（14 个入口一个不丢） */
  const NAV_GROUPS = [
    // 客户管理：客户提的需求 + 客户在我方站内的行为 + 我们要主动找的人
    { key: 'clues', label: 'nav.g.clues', items: ['addcust', 'inquiries', 'aftersales', 'leads', 'visits', 'network', 'deals', 'redfox'] },
    // 工具书：查税率、查库里没有的款号
    { key: 'tools', label: 'nav.g.tools', items: ['tax', 'model', 'fx'] },
    // 款号数据：都是「补充 / 校正款号与适穿」的维护动作
    { key: 'data', label: 'nav.g.data', items: ['xref', 'graph', 'import'] }
  ];
  const STAFF_ONLY = NAV_GROUPS.reduce((a, g) => a.concat(g.items), []);
  /** 分组菜单末尾的外部系统入口：新窗口打开，不进本站路由 */
  const NAV_EXT = [
    {
      group: 'clues', zh: '转单云', en: 'Zhuandan Cloud', href: 'https://admin.hqsmartcloud.com/#/home',
      tipZh: '外部系统 · 转单云后台（新窗口打开）', tipEn: 'External · Zhuandan Cloud admin (opens in a new tab)'
    }
  ];
  /** 分组菜单展开状态（纯 UI，不落 localStorage） */
  let navOpen = '';
  /** 获客的三种视图都收进「用户画像」这一个入口 */
  const ACQ_PAGES = ['network', 'search', 'content'];
  /** 客户只看选款、产品、报价、资料包；其余是员工端 */
  function allowedTab(k) {
    if (A.isBoss()) return true;
    if (A.isStaff()) return k !== 'boss';
    return CUST_TABS.includes(k);
  }
  /** 等宽铺满后，最右侧分组的菜单可能顶出屏幕 —— 展开时按视口夹一下位置 */
  function clampNavMenu() {
    if (!navOpen) return;
    const flyEl = document.querySelector('.nav-fly.open');
    if (!flyEl) return;
    const menu = flyEl.querySelector('.nav-menu');
    if (!menu) return;
    // 先复位到默认（贴分组按钮起始边），再按需平移
    menu.style.left = ''; menu.style.right = '';
    const vr = menu.getBoundingClientRect();
    const fr = flyEl.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const pad = 10;
    let dx = 0;
    if (vr.right > vw - pad) dx = (vw - pad) - vr.right;
    if (vr.left + dx < pad) dx = pad - vr.left;
    if (dx) {
      menu.style.left = Math.round(vr.left - fr.left + dx) + 'px';
      menu.style.right = 'auto';
    }
  }
  /** 客户端换几个更好懂的名字 */
  const CUST_LABEL = { home: 'nav.homeCust', quote: 'nav.cart', aftersale: 'nav.aftersale' };
  /** 客户端只有「选购」一个入口：首页也收进同一个菜单里 */
  const CUST_MENU = [
    ['home', '⌂', '看类别、找款号、进客服', 'Categories, search and chat'],
    ['select', '◎', '款式系列 / 尺码段 / 编号 → 候选款号', 'Series, size band or code to candidates'],
    ['products', '▤', '全部款号，尺码 · 面料 · 图片', 'All styles with sizes and photos'],
    ['custom', '✂', '非标尺寸 / 面料 / 包装 / 打标', 'Non-standard size, mix, packing, marking'],
    ['quote', '￥', '已选款号，核对金额后提交结算', 'Your picks — check the amount and submit'],
    ['aftersale', '☎', '试穿问题、退换、索赔都在这儿提', 'Try-on issues, returns and claims']
  ];
  /** 顶栏真实高度 → 导航吸顶位置，避免被压住 */
  function syncTopbarH() {
    const tb = document.querySelector('.topbar');
    if (tb) document.documentElement.style.setProperty('--topbar-h', tb.offsetHeight + 'px');
  }
  window.addEventListener('resize', syncTopbarH);
  function renderNav() {
    syncTopbarH();
    const staff = A.isStaff();
    const label = k => T((!staff && CUST_LABEL[k]) || ('nav.' + k));
    const badge = k => k === 'leads' ? S.leads.filter(l => l.status === '待跟进').length
      : (k === 'inquiries') ? A.inquiries().length
        : (k === 'quote' || k === 'pack') ? S.cart.length : 0;
    const isOn = k => (S.tab === k) || (k === 'network' && ACQ_PAGES.indexOf(S.tab) > 0);
    const btn = k => {
      const n = badge(k);
      return `<button data-act="tab" data-id="${k}" class="${isOn(k) ? 'on' : ''}">${label(k)}${n ? `<span class="badge">${n}</span>` : ''}</button>`;
    };
    const grp = (keys) => keys.filter(allowedTab).map(btn).join('');
    if (!staff) {
      // 客户端：保留「选购」单一下拉（菜单里含首页），触发器显示当前所在页
      const navBar0 = document.querySelector('nav.nav');
      if (navBar0) navBar0.classList.add('has-drop');
      $('#nav').classList.add('has-drop');
      const cz = I.getLang() === 'zh';
      const cur = CUST_MENU.find(m => m[0] === S.tab) || CUST_MENU[0];
      const items = CUST_MENU.map(m => {
        const n = badge(m[0]);
        const on = S.tab === m[0];
        return '<button data-act="tab" data-id="' + m[0] + '" class="' + (on ? 'on' : '') + '">' +
          '<span class="nd-ico">' + m[1] + '</span>' +
          '<span class="nd-txt"><b>' + label(m[0]) + (n ? ' <span class="badge">' + n + '</span>' : '') + '</b>' +
          '<i>' + (cz ? m[2] : m[3]) + '</i></span></button>';
      }).join('');
      $('#nav').innerHTML =
        '<div class="nav-drop" id="navDrop">' +
          '<button class="nav-drop-t" data-act="navDrop" aria-haspopup="true" aria-expanded="false">' +
            label(cur[0]) +
            '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>' +
          '</button>' +
          '<div class="nav-drop-p">' + items + '</div>' +
        '</div>';
      return;
    }
    // 员工侧：9 个页面收进 2 个下拉分组，分组标题本身也能点开看成员
    let first = true;
    const fly = g => {
      const items = g.items.filter(allowedTab);
      if (!items.length) return '';
      const sum = items.reduce((n, k) => n + badge(k), 0);
      const active = items.indexOf(S.tab) >= 0 ? S.tab : '';
      const sepCls = first ? ' divided' : '';
      first = false;
      const ext = NAV_EXT.filter(x => x.group === g.key).map(x =>
        `<a class="nav-ext" role="menuitem" href="${esc(x.href)}" target="_blank" rel="noopener noreferrer" title="${esc(LZ(x.tipZh, x.tipEn))}">${esc(LZ(x.zh, x.en))}<span class="ext" aria-hidden="true">↗</span></a>`).join('');
      return `<div class="nav-fly${sepCls}${navOpen === g.key ? ' open' : ''}" data-fly="${g.key}">
        <button class="nav-fly-btn${active ? ' cur' : ''}" data-act="navGroup" data-id="${g.key}"
          aria-haspopup="true" aria-expanded="${navOpen === g.key}">${T(g.label)}${sum ? `<span class="badge">${sum}</span>` : ''}<span class="caret">▾</span></button>
        <div class="nav-menu" role="menu">
          ${items.map(k => `<button role="menuitem" data-act="tab" data-id="${k}" class="${isOn(k) ? 'on' : ''}">${label(k)}${badge(k) ? `<span class="badge">${badge(k)}</span>` : ''}${active === k ? '<span class="tick">✓</span>' : ''}</button>`).join('')}${ext}
        </div></div>`;
    };
    // 老板页签同样走 .nav-fly，才能融进 Grid 等分
    const bossGrp = A.isBoss() ? `<div class="nav-fly divided"><button data-act="tab" data-id="boss" class="nav-fly-btn boss-only${isOn('boss') ? ' cur' : ''}">${LZ('业绩总览', 'Owner')}</button></div>` : '';
    // 扁平结构 + Grid 等分：每个顶层项都占同样宽度，不会因嵌套 flex 差几像素
    $('#nav').innerHTML = grp(STAFF_TABS) + NAV_GROUPS.map(fly).join('') + bossGrp;
    clampNavMenu();
  }
  /** 权限一览弹层 */
  const PERM_CUST = [
    ['首页', '看类别、找款号、提交询价'],
    ['智能选款', '报款式系列 / 尺码段 / 旧款编号，出候选款号'],
    ['产品库', '看尺码、面料、编号、图片'],
    ['我的报价', '自己组的单子，阶梯价 + 运费'],
    ['我的资料', '把报价 + 产品页 + 质检打包下载'],
    ['提交询价', '填数量，等员工回价（2 小时内）']
  ];
  const PERM_STAFF = [
    ['客户询价', '收到客户清单 → 一键载入报价'],
    ['增加客户', '手动录入，或拍名片识别后确认保存'],
    ['客户浏览', '谁在看、看了什么、意向分'],
    ['询盘线索', '跟进状态、下一步动作'],
    ['用户画像', '画像 + 客户搜索 + 获客内容，一个入口三段切换'],
    ['尺码适配图谱', '款式系列 → 尺码段 → 款号的对应关系'],
    ['数据导入', 'Excel 批量导入款号 / 适穿'],
    ['热门追踪', 'TikTok / IG / YouTube 热门内容 → 选题与线索'],
    ['转单云（外部）', '「客户管理」菜单最后一项，新窗口打开转单云后台'],
    ['报价与资料', '同上，但可回写客户档案']
  ];
  function openPerm() {
    const zh = I.getLang() === 'zh';
    const row = (a, b) => `<div class="perm-row"><b>${esc(a)}</b><span>${esc(b)}</span></div>`;
    $('#permBody').innerHTML = `
      <div class="perm-col">
        <div class="perm-h cust"><span class="dot"></span> ${zh ? '客户登录后能做' : 'What the customer can do'}</div>
        ${PERM_CUST.map(([a, b]) => row(a, b)).join('')}
      </div>
      <div class="perm-col">
        <div class="perm-h staff"><span class="dot"></span> ${zh ? '员工端才有的' : 'Staff only'}</div>
        ${PERM_STAFF.map(([a, b]) => row(a, b)).join('')}
      </div>`;
    $('#permMask').classList.add('on');
  }
  function closePerm() { $('#permMask').classList.remove('on'); }
  /* ================= 服务器共享区 =================
     跑在服务器上时，询价/报价/结算单/售后 都以服务端为准，本地只当缓存。
     客户和员工在不同电脑上，靠这个把数据连起来。 */
  function custKeyOf(u) {
    const x = u || {};
    const name = String(x.company || x.name || '').trim().toLowerCase();
    const tel = String(((x.contact || {}).value) || '').replace(/[\s\-().+]/g, '');
    return name + '|' + tel;
  }
  function netReady() { return !NO_NET && !!(window.SYN && SYN.available() && SYN.on()); }
  function mergeNet() {
    if (!netReady()) return false;
    let changed = false;
    const seen = (arr, item, key) => {
      if (arr.some(x => key(x) === key(item))) return false;
      arr.push(item); return true;
    };
    (SYN.list('quotes') || []).forEach(q => {
      if (seen(S.quotes, q, x => (x.no || '') + '|' + (x.customer || ''))) changed = true;
    });
    (SYN.list('settlements') || []).forEach(o => {
      S.myOrders = S.myOrders || [];
      if (seen(S.myOrders, o, x => x.no || x.id)) changed = true;
    });
    const role = A.isBoss() ? 'boss' : 'staff';
    (SYN.list('aftersales') || []).forEach(a => {
      if ((a.deletedBy || []).indexOf(role) >= 0) return;
      S.asStaff = S.asStaff || []; S.asBoss = S.asBoss || [];
      if (seen(S.asStaff, a, x => x.id)) changed = true;
      S.asBoss = S.asBoss || [];
      if (seen(S.asBoss, a, x => x.id)) changed = true;
    });
    if (changed) save();
    return changed;
  }
  /** 所有询价 = 本机（离线/演示）+ 服务器共享区 */
  function inquiriesAll() {
    const local = (A.inquiries() || []);
    if (!netReady()) return local;
    const out = local.slice();
    (SYN.list('inquiries') || []).forEach(q => {
      if (out.some(x => x.no === q.no)) return;
      out.push({
        user: {
          id: q.userId || ('net_' + q.id), name: q.userName || q.custKey || '—',
          company: q.company || '', demo: !!q.demo,
          contact: q.contact || { type: '—', value: '' }
        },
        no: q.no, items: q.items || [], note: q.note || '', t: q.t || 0, net: true
      });
    });
    return out.sort((a, b) => (b.t || 0) - (a.t || 0));
  }

  function render() {
    renderNav();
    // 容错：缺页面容器时自动补上（旧版 index.html 有 8 个 section）
    if (!document.getElementById('p-' + S.tab)) {
      const sec = document.createElement('section');
      sec.className = 'page';
      sec.id = 'p-' + S.tab;
      $('.wrap').appendChild(sec);
    }
    $$('.page').forEach(p => p.classList.toggle('on', p.id === 'p-' + S.tab));
    ({ home: vHome, select: vSelect, products: vProducts, graph: vGraph, quote: vQuote, pack: vPack, inquiries: vInquiries, search: vSearch, xref: vXref, redfox: vRedfox, deals: vDeals, boss: vBoss, visits: vVisits, leads: vLeads, network: vNetwork, content: vContent, import: vImport, custom: vCustom, addcust: vAddCustomer, tax: vTax, model: vModel, fx: vFx, aftersale: vAfterSale, aftersales: vAfterSales }[S.tab])();
    if (S.tab === 'content') { const el = $('#p-content'); if (el) el.insertAdjacentHTML('afterbegin', acquireBar('content')); }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  /* ================= 自定义定制（独立页面） ================= */
  let CU_SENT = null;
  function vCustom() {
    const cu = A.me() || {};
    const contact = cu.contact ? cu.contact.value : '';
    const zh = I.getLang() === 'zh';
    const caps = [
      ['尺寸', '衣长 / 胸围 / 袖长按尺寸表做，公差 ±0.5cm', 'Size', 'Body length, chest and sleeve to the size chart, ±0.5cm'],
      ['面料', '6 种面料可换，克重 110–340 g/m² 可调', 'Fabric', '6 fabrics, 110–340 g/m² adjustable'],
      ['包装', '挂装 / 独立包装 / 一箱几件，贴标自定义', 'Packing', 'Hanging or poly bag, pcs per carton, labels'],
      ['打标', '织唛、丝印 logo、水洗标编号', 'Marking', 'Woven label, silk-screen logo, care-label code'],
      ['打样', '7 天出样，样品费下单可抵', 'Sampling', 'Sample in 7 days, cost credited to the order']
    ];
    const sentRows = (S.custMsgs || []).filter(m => m.from === 'me' && /^定制需求/.test(m.text)).slice(-3).reverse();
    $('#p-custom').innerHTML = `
      <h1>${T('nav.custom')}</h1>
      <p class="muted" style="margin:-4px 0 16px">${zh ? '非标尺寸、面料、包装、打标都能做。填完提交，2 小时内回你方案和打样价。' : 'Non-standard size, material, packing or marking — fill this in and we reply within 2 hours.'}</p>
      ${CU_SENT ? `<div class="cu-ok"><b>${zh ? '已提交' : 'Submitted'}</b><span>${esc(CU_SENT.prod)} × ${CU_SENT.qty}</span><i>${esc(CU_SENT.need)}</i></div>` : ''}
      <div class="cu-grid">
        <div class="card">
          <div class="field"><label>${zh ? '要定制的产品' : 'Product'}</label>
            <input id="cuProd" placeholder="${zh ? '如 SW2601047 圆领卫衣 / 加绒外套 / 连体衣' : 'e.g. SW2601047 crewneck sweatshirt'}"></div>
          <div class="field"><label>${zh ? '数量' : 'Quantity'}</label>
            <input id="cuQty" type="number" min="1" value="200"></div>
          <div class="field"><label>${zh ? '改哪里（尺寸 / 面料 / 包装 / 打标）' : 'What to change'}</label>
            <textarea id="cuNeed" rows="4" placeholder="${zh ? '如：克重加到 260g，改成 4 件一箱，箱面印我们的 logo' : 'e.g. 260 g/m², 4 pcs per carton, our logo on the box'}"></textarea></div>
          <div class="field"><label>${zh ? '联系方式' : 'Contact'}</label>
            <input id="cuContact" value="${esc(contact)}"></div>
          <div class="cu-act">
            <button class="btn primary" data-act="customSubmit">${zh ? '提交定制需求' : 'Send request'}</button>
            <button class="btn" data-act="tab" data-id="products">${zh ? '先看常规款号' : 'Browse standard styles'}</button>
          </div>
        </div>
        <div class="card cu-side">
          <div class="cu-h">${zh ? '我们能做' : 'What we can do'}</div>
          ${caps.map(c => `<div class="cu-row"><b>${zh ? c[0] : c[2]}</b><span>${zh ? c[1] : c[3]}</span></div>`).join('')}
          ${sentRows.length ? `<div class="cu-h" style="margin-top:14px">${zh ? '最近提交' : 'Recent'}</div>` + sentRows.map(m => `<div class="cu-row"><b>${esc(m.time || '')}</b><span>${esc(m.text.slice(0, 60))}</span></div>`).join('') : ''}
        </div>
      </div>`;
  }

  /* ================= 工作台 ================= */
  function vHome() {
    const st = D.stats;
    const cu = A.me();
    const isCust = !!cu && cu.role === 'customer';
    const todo = isCust
      ? A.stats(cu).events.filter(e => e.type === 'view' && e.d && e.d.code).slice(-3).reverse()
        .map(e => ({ n: '👁', t: e.d.code, tab: 'products' }))
      : [
        { n: S.leads.filter(l => l.status === '待跟进').length, t: T('home.t1'), tab: 'leads' },
        { n: pendingCount(), t: T('home.t2'), tab: 'graph' },
        { n: S.cart.length, t: T('home.t3'), tab: 'quote' },
        { n: S.quotes.length, t: T('home.t4'), tab: 'quote' }
      ].filter(x => x.n > 0);

    $('#p-home').innerHTML = window.HOME_HTML({
      st, isCust, isBoss: A.isBoss(), todo, ex: examples(), T, LZ, esc, I18N: I, confTag, tests: D.tests.length, cartCount: S.cart.length
    });

    if (window.HOME_INIT) window.HOME_INIT();
    const hq = $('#heroQ');
    if (hq) {
      hq.value = S.heroQ || '';
      hq.oninput = e => { S.heroQ = e.target.value; };
      hq.onkeydown = e => { if (e.key === 'Enter') ACT.heroMatch(); };
    }
  }

  /* ================= 社媒热度（按点赞量排序） ================= */
  const fmtN = n => {
    const zh = I.getLang() === 'zh';
    if (zh) return n >= 10000 ? (n / 10000).toFixed(1).replace(/\.0$/, '') + '万' : String(n);
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
  };
  function contentOfCode(code) {
    const n = norm(code);
    const ps = (SOCIAL.posts || []).filter(x => norm(x.code) === n);
    const vs = (SOCIAL.videos || []).filter(x => norm(x.model) === n);
    const likes = ps.reduce((s, x) => s + x.likes, 0) + vs.reduce((s, x) => s + x.likes, 0);
    return { posts: ps, videos: vs, likes, count: ps.length + vs.length };
  }
  function vehicleHeat(vid) {
    const ps = (SOCIAL.posts || []).filter(x => x.vid === vid);
    const codes = new Set((E.fitsByV.get(vid) || []).map(f => norm(f.code)));
    const vs = (SOCIAL.videos || []).filter(x => codes.has(norm(x.model)));
    const likes = ps.reduce((s, x) => s + x.likes, 0) + vs.reduce((s, x) => s + x.likes, 0);
    const all = ps.map(x => ({ ...x, kind: 'post' })).concat(vs.map(x => ({ ...x, kind: 'video' })));
    all.sort((a, b) => b.likes - a.likes);
    return { posts: ps, videos: vs, likes, count: all.length, top: all[0] || null };
  }
  /** 官网标题里的系列标签 → 库里已建档的款式系列（用于没有逐条适穿关系时兜底） */
  const APP_VEH = {
    '奶油小方': ['V-SW-01'],
    '小恐龙': ['V-SW-02'],
    '跳跳糖': ['V-SW-03'],
    '小满亲子': ['V-SW-04'],
    '云朵泡泡': ['V-DR-01'],
    '小满花园': ['V-DR-02'],
    '海盐苏打': ['V-DR-03'],
    '森系棉麻': ['V-DR-04'],
    '小满日常': ['V-TS-01'],
    '彩虹条纹': ['V-TS-02'],
    '小足球': ['V-TS-03'],
    '花花领': ['V-TS-04'],
    '森林熊': ['V-JK-01'],
    '小满出街': ['V-JK-02'],
    '冬日暖阳': ['V-JK-03'],
    '布丁裤': ['V-PT-01'],
    '牛仔星球': ['V-PT-02'],
    '小熊口袋': ['V-PT-03'],
    '花边短裤': ['V-PT-04'],
    '校园蓝': ['V-ST-01'],
    '花仙子': ['V-ST-02'],
    '球场小将': ['V-ST-03'],
    '星星睡衣': ['V-LG-01'],
    '竹节棉': ['V-LG-02'],
    '云朵爬服': ['V-BD-01'], '小羊咩': ['V-BD-02']
  };
  /** 某款号的常用款式系列：先取已建适穿关系，再用官网标题的系列推断兜底，按点赞量从高到低 */
  function productVehicles(p) {
    const fits = E.fitsByP.get(p.id) || [];
    const map = new Map();
    fits.forEach(f => {
      if (!f.vid) return;
      const e = map.get(f.vid) || { vid: f.vid, vName: f.vName, axles: new Set(), pos: new Set(), codes: new Set(), conf: f.conf, inferred: false };
      if (f.aName) e.axles.add(f.aName);
      e.pos.add(f.pos);
      e.codes.add(f.code);
      if (f.conf === '已确认') e.conf = '已确认';
      map.set(f.vid, e);
    });
    // 兜底：官网标题里写了适穿哪个系列，但没有逐条适穿关系
    (p.apps || []).forEach(app => {
      (APP_VEH[app] || []).forEach(vid => {
        if (map.has(vid)) return;
        const v = D.vehicles.find(x => x.id === vid);
        if (!v) return;
        map.set(vid, {
          vid, vName: `${v.brand} ${v.series} ${v.model}`.replace(/\s+/g, ' ').trim(),
          axles: new Set(), pos: new Set(), codes: new Set([p.code]), conf: '低', inferred: true
        });
      });
    });
    return [...map.values()].map(e => ({ ...e, heat: vehicleHeat(e.vid) }))
      .sort((a, b) => (b.heat.likes - a.heat.likes) || (Number(a.inferred) - Number(b.inferred)));
  }
  function heatTable(p) {
    const rows = productVehicles(p);
    if (!rows.length) {
      return `<div class="notice warn" style="font-size:12px">${I.getLang() === 'zh' ? '这个款号既没有适穿关系，官网标题里也没有可识别的系列。请在「尺码适配图谱 → 新增适穿关系」补一条，或先用「三步定位法」让客户确认身高。' : 'No size link and no series in the catalog title. Add a size link, or confirm the height with the customer first.'}</div>`;
    }
    const max = Math.max(...rows.map(r => r.heat.likes), 1);
    const anyInferred = rows.some(r => r.inferred);
    return `<table class="heat-tbl">
      <thead><tr><th style="width:34px">#</th><th>${T('h.apps')}</th><th>${I.getLang() === 'zh' ? '尺码段 / 版型' : 'Size band / fit'}</th><th>${T('h.code')}</th><th class="right">${T('nav.content')}</th><th class="right">${T('h.likes')}</th><th style="width:110px">${I.getLang() === 'zh' ? '热度' : 'Heat'}</th></tr></thead>
      <tbody>${rows.map((r, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `<span class="muted">${i + 1}</span>`;
        const pct = Math.max(4, Math.round(r.heat.likes / max * 100));
        return `<tr${r.inferred ? ' style="background:#fcfcfd"' : ''}>
          <td class="center">${medal}</td>
          <td><b>${esc(I.getLang() === 'zh' ? r.vName : vehEn(r.vName))}</b> ${r.inferred ? `<span class="tag n" title="${LZ('依据官网标题里的系列推断，尚未逐系列确认', 'Inferred from the catalogue title series, not confirmed per style')}">${LZ('推断', 'inferred')}</span>` : confTag(r.conf)}
            ${r.heat.top ? `<div class="tiny muted">${esc(r.heat.top.author)} · ${esc(r.heat.top.platform)} · ${fmtN(r.heat.top.likes)} ${LZ('赞', 'likes')}</div>` : `<div class="tiny muted">${LZ('暂无内容', 'No content')}</div>`}</td>
          <td class="small">${esc([...r.axles].join(' / ') || (r.inferred ? LZ('按款式系列确认', 'confirm by series') : LZ('按旧款', 'by old style')))}<div class="tiny muted">${r.pos.size ? esc([...r.pos].join('/')) + LZ('版', ' fit') : '—'}</div></td>
          <td class="mono tiny">${esc([...r.codes].join(' / '))}</td>
          <td class="right small">${r.heat.count || '—'}</td>
          <td class="right mono b">${r.heat.likes ? fmtN(r.heat.likes) : '0'}</td>
          <td><span class="heat-bar"><i style="width:${pct}%"></i></span></td>
        </tr>`;
      }).join('')}</tbody></table>
      <div class="tiny muted" style="padding:6px 2px 0">${T('sel.heatNote')}</div>`;
  }
  function productHeat(p) {
    const rows = productVehicles(p);
    return rows.length ? rows.reduce((s, r) => s + r.heat.likes, 0) : contentOfCode(p.code).likes;
  }
  function relatedChips(p) {
    const codes = D.codes.filter(c => c.pid === p.id).length;
    const tests = (E.testsByP.get(p.id) || []).length;
    const rows = productVehicles(p);
    const others = new Set();
    rows.forEach(r => (E.fitsByV.get(r.vid) || []).forEach(f => { if (f.code !== p.code) others.add(f.code); }));
    const c = contentOfCode(p.code);
    const likes = rows.reduce((s, r) => s + r.heat.likes, 0);
    const zhL = I.getLang() === 'zh';
    const cnt = (n, zhUnit, enUnit) => n + (zhL ? ' ' + zhUnit : ' ' + enUnit);
    return [
      [zhL ? '编号' : 'Codes', cnt(codes, '条', 'items')],
      [zhL ? '质检' : 'Tests', cnt(tests, '条', 'reports')],
      [zhL ? '适穿款式系列' : 'Fits', cnt(rows.length, '个', 'styles')],
      [zhL ? '同款式系列其他款号' : 'Same series, other codes', cnt(others.size, '个', 'codes')],
      [zhL ? '社媒内容' : 'Social posts', cnt(c.count, '条', 'posts')],
      [zhL ? '款式系列点赞' : 'Likes', likes ? fmtN(likes) : '0']
    ].map(([k, v]) => `<span class="chip"><span class="muted">${k}</span> <b>${v}</b></span>`).join('');
  }

  function otherModels(p) {
    const rows = productVehicles(p), m = new Map();
    rows.forEach(r => (E.fitsByV.get(r.vid) || []).forEach(f => {
      if (f.code !== p.code && f.pid) m.set(f.code, f.pid);
    }));
    return [...m.entries()];
  }

  /* ================= 智能选款 ================= */
  const EXAMPLES = {
    zh: ['奶油小方 圆领卫衣 110 码 300 件', '男童 卫衣 2-4岁 200 件 加绒', '女童 碎花连衣裙 110 120 150 件', '婴童 连体衣 66-73 500 件', 'XM-SW-2601', '孩子身高 108 要穿多大码', '小恐龙 连帽卫衣 100 件', '摇粒绒外套 130-150 200 件', '花仙子 纱裙套装 演出 50 套', '客户说：幼儿园毕业照要穿什么'],
    en: ['Cream crewneck sweatshirt size 110, 300 pcs', 'Boys hoodie 2-4Y, 200 pcs fleece', 'Girls floral dress 110/120, 150 pcs', 'Baby bodysuit 66-73, 500 pcs', 'XM-SW-2601', 'My kid is 108cm, which size?', 'Dino hoodie, 100 pcs', 'Fleece jacket 130-150, 200 pcs', 'Tulle dress set for a recital, 50 sets', 'Customer: what do kids wear for a graduation photo?'],
    es: ['Sudadera cuello redondo Crema talla 110, 300 pzas', 'Sudadera con capucha niño 2-4 años, 200 pzas polar', 'Vestido floral niña 110/120, 150 pzas', 'Body bebé 66-73, 500 pzas', 'XM-SW-2601', 'Mi hijo mide 108 cm, ¿qué talla usa?', 'Sudadera dinosaurio, 100 pzas', 'Chaqueta polar 130-150, 200 pzas', 'Conjunto de tul para recital, 50 conjuntos', 'Cliente: ¿qué se pone para la foto de graduación?'],
    pt: ['Moletom gola redonda Creme tamanho 110, 300 pçs', 'Moletom com capuz menino 2-4 anos, 200 pçs fleece', 'Vestido floral menina 110/120, 150 pçs', 'Body bebê 66-73, 500 pçs', 'XM-SW-2601', 'Meu filho tem 108 cm, qual tamanho?', 'Moletom dinossauro, 100 pçs', 'Jaqueta fleece 130-150, 200 pçs', 'Conjunto de tule para apresentação, 50 conjuntos', 'Cliente: o que vestir para a foto de formatura?'],
    ar: ['سويت شيرت بياقة دائرية كريمي مقاس 110، 300 قطعة', 'هودي أولادي 2-4 سنوات، 200 قطعة فليس', 'فستان زهري بناتي 110/120، 150 قطعة', 'بودي أطفال 66-73، 500 قطعة', 'XM-SW-2601', 'طفلي طوله 108 سم، أي مقاس يلبس؟', 'هودي ديناصور، 100 قطعة', 'جاكيت فليس 130-150، 200 قطعة', 'طقم تول للعرض، 50 طقماً', 'العميل: ماذا يلبس الطفل لصورة التخرج؟'],
    ru: ['Свитшот с круглым воротом кремовый размер 110, 300 шт', 'Худи для мальчика 2-4 года, 200 шт флис', 'Платье с цветочным принтом для девочки 110/120, 150 шт', 'Боди для малыша 66-73, 500 шт', 'XM-SW-2601', 'Ребёнок 108 см, какой размер брать?', 'Худи с динозавром, 100 шт', 'Флисовая куртка 130-150, 200 шт', 'Комплект из тюля для выступления, 50 компл.', 'Клиент: что надеть на выпускную фотографию?'],
    id: ['Sweatshirt crewneck Krem ukuran 110, 300 pcs', 'Hoodie anak laki-laki 2-4 th, 200 pcs fleece', 'Dress floral anak perempuan 110/120, 150 pcs', 'Bodysuit bayi 66-73, 500 pcs', 'XM-SW-2601', 'Anak saya 108 cm, pakai ukuran apa?', 'Hoodie dinosaurus, 100 pcs', 'Jaket fleece 130-150, 200 pcs', 'Setelan rok tulle untuk pentas, 50 set', 'Pelanggan: pakai apa untuk foto wisuda?'],
    vi: ['Áo sweatshirt cổ tròn Kem size 110, 300 cái', 'Áo hoodie bé trai 2-4 tuổi, 200 cái nỉ', 'Váy hoa bé gái 110/120, 150 cái', 'Bộ liền thân em bé 66-73, 500 cái', 'XM-SW-2601', 'Bé cao 108 cm mặc size nào?', 'Áo hoodie khủng long, 100 cái', 'Áo khoác nỉ 130-150, 200 cái', 'Bộ váy voan cho bé biểu diễn, 50 bộ', 'Khách: mặc gì chụp ảnh tốt nghiệp?'],
    th: ['เสื้อสเวตเตอร์คอกลม สีครีม ไซซ์ 110, 300 ตัว', 'ฮู้ดเด็กชาย 2-4 ขวบ, 200 ตัว ผ้าฟลีซ', 'เดรสลายดอกไม้เด็กหญิง 110/120, 150 ตัว', 'บอดี้สูทเด็กอ่อน 66-73, 500 ตัว', 'XM-SW-2601', 'ลูกสูง 108 ซม. ใส่ไซซ์ไหน', 'ฮู้ดไดโนเสาร์, 100 ตัว', 'แจ็คเก็ตฟลีซ 130-150, 200 ตัว', 'ชุดกระโปรงทูลสำหรับแสดง, 50 ชุด', 'ลูกค้า: ใส่ชุดอะไรถ่ายรูปรับปริญญา?'],
    tr: ['Bisiklet yaka sweatshirt Krem 110 beden, 300 adet', 'Erkek çocuk kapüşonlu 2-4 yaş, 200 adet polar', 'Kız çocuk çiçekli elbise 110/120, 150 adet', 'Bebek body 66-73, 500 adet', 'XM-SW-2601', 'Çocuğum 108 cm, hangi beden olur?', 'Dinozor kapüşonlu, 100 adet', 'Polar ceket 130-150, 200 adet', 'Gösteri için tül elbise takımı, 50 takım', 'Müşteri: mezuniyet fotoğrafı için ne giydirmeli?']
  };
  const examples = () => EXAMPLES[I.getLang()] || EXAMPLES.en;

  function vSelect() {
    const m = S.match;
    $('#p-select').innerHTML = `
    <div class="grid" style="grid-template-columns:1.15fr .85fr">
      <div class="card">
        <div class="card-h"><h3>${T('sel.in')}</h3><span class="sub">${T('sel.inSub')}</span></div>
        <div class="card-b">
          <textarea id="q" placeholder="${T('sel.ph')}">${esc(S.q)}</textarea>
          <div class="row wrap-gap mt-s">
            <button class="btn primary" data-act="doMatch">${T('sel.go')}</button>
            <button class="btn" data-act="clearMatch">${T('sel.clear')}</button>
            <span class="flex1"></span>
            <span class="tiny muted">${D.stats.products} ${T('nav.products')} · ${D.stats.codes} ${T('h.codes')} · ${D.stats.fitments} 条适穿关系</span>
          </div>
          <div class="row wrap-gap mt-s" style="gap:6px">
            ${examples().slice(0, 6).map(x => `<span class="chip" data-act="example" data-id="${esc(x)}">${esc(x)}</span>`).join('')}
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-h"><h3>${T('home.steps')}</h3><span class="sub">${T('home.stepsSub')}</span></div>
        <div class="card-b small" style="line-height:1.75">
          <div>${T('home.s1')}</div>
          <div>${T('home.s2')}</div>
          <div>${T('home.s3')}</div>
          ${I.getLang() === 'zh' ? '<div class="notice mt-s">把这段存成话术，客户说不清款号时直接发过去，比反复追问体面得多。</div>' : ''}
        </div>
      </div>
    </div>
    <div id="matchOut" class="mt">${m ? renderMatch(m) : `<div class="card"><div class="empty"><div class="ic">◎</div>${I.getLang() === 'zh' ? '输入款式系列、尺码段、编号或客户原话，开始匹配' : 'Enter a series, size band, style code or the customer\'s words.'}</div></div>`}</div>`;
    const ta = $('#q');
    if (ta) { ta.oninput = e => { S.q = e.target.value; }; }
  }

  function renderMatch(m) {
    const top = m.top;
    if (!top) {
      return `<div class="card"><div class="card-b"><div class="notice warn">${I.getLang() === 'zh' ? '没有匹配到款号。建议：① 换成尺码段（如 110、130-150）② 直接粘贴水洗标上的编号 ③ 让客户拍水洗标照片。' : 'No match. Try the size band (110 / 130-150), paste the number on the care label, or ask for a photo.'}</div>
      <div class="mt-s"><button class="btn sm" data-act="tab" data-id="products">${T('nav.products')}</button></div></div></div>`;
    }
    const p = top.product;
    const mat = D.materials.find(x => x.id === p.material) || D.materials[0];
    const price100 = E.priceOf(p.id, 100, customer());
    return `
    <div class="card" style="border-color:#f6c9a8">
      <div class="card-h">
        <h3>${T('sel.res')}</h3><span class="sub">${T('sel.resSub', { n: m.candidates.length })}</span>
        <span class="flex1"></span>
        <span class="tag ${m.grade.c === 'c-hi' ? 'g' : m.grade.c === 'c-mid' ? 'y' : 'r'}">${m.grade.l}</span>
      </div>
      <div class="card-b">
        <div class="ents">
          ${m.entities.map(e => `<div class="ent ${e.k === '输入' ? '' : 'hit'}"><div class="k">${esc(e.k)}</div><div class="v">${esc(e.v)}</div><div class="c">${esc(e.c)}</div></div>`).join('')}
        </div>
        ${m.questions.length ? `<div class="qbox"><div class="t">⚠ ${T('sel.q')}</div><ul>${m.questions.map(q => `<li>${q}</li>`).join('')}</ul></div>` : `<div class="notice ok mt-s">${T('sel.enough')}</div>`}
      </div>
    </div>

    ${m.candidates.map((c, i) => {
      const pr = c.product;
      const m2 = D.materials.find(x => x.id === pr.material) || D.materials[0];
      const ts = E.testsByP.get(pr.id) || [];
      const fs = E.fitsByP.get(pr.id) || [];
      const sc = Math.min(100, Math.round(c.score));
      const price100 = E.priceOf(pr.id, 100, customer());
      return `<div class="result ${i === 0 ? 'best' : ''}">
        <div class="res-h">
          <div class="res-img">${pr.img ? `<img src="${esc(pr.img)}" alt="">` : '<span class="muted tiny">无图</span>'}</div>
          <div class="res-main">
            <div class="res-title">${esc(pr.code)} <span class="res-code">${esc(pr.sku)}</span>
              ${i === 0 ? tag('首选', 'o') : ''} ${pr.dim ? tag(pr.dim, 'n') : tag('尺寸待补', 'y')}
              ${ts.length ? tag('有质检报告', 'b') : ''}
            </div>
            <div class="muted small" style="margin-top:2px">${esc(pr.nameEn.slice(0, 88))}</div>
            <div class="res-meta">
              <span>${esc(pCat(pr))}</span><span>${esc(mName(m2))} · 克重 ${esc(m2.mu)}</span>
              <span>MOQ ${pr.moq}</span><span>参考价 <b>$${money(price100)}</b>/件（100 件档）</span>
            </div>
            <div class="reasons">${c.reasons.map(r => `<div class="reason"><i>✓</i><span>${r}</span></div>`).join('')}</div>
            ${c.note ? `<div class="notice warn mt-s" style="font-size:12px">${c.note}</div>` : ''}
          </div>
          <div class="conf">
            <div style="text-align:right">
              <div class="v ${sc >= 90 ? 'c-hi' : sc >= 70 ? 'c-mid' : 'c-lo'}">${sc}</div>
              <div class="tiny muted">匹配分</div>
            </div>
          </div>
        </div>
        <div class="res-body">
          <div class="row wrap-gap" style="gap:8px">
            <input type="number" min="1" value="${m.parsed.qty || 100}" style="width:90px" id="qty-${pr.id}">
            <button class="btn primary sm" data-act="addCart" data-id="${pr.id}">加入报价</button>
            <button class="btn sm" data-act="openProduct" data-id="${pr.id}">产品详情</button>
            <button class="btn sm" data-act="detailPack" data-id="${pr.id}">生成资料页</button>
            <button class="btn sm" data-act="copyAnswer" data-id="${pr.id}">复制回复话术</button>
          </div>
        </div>
      </div>`;
    }).join('')}

    ${(() => {
      const p = m.top.product, rows = productVehicles(p);
      return `<div class="card mt" style="border-color:#e8d5c4">
      <div class="card-h"><h3>「${esc(p.code)}」${T('sel.heat')}</h3>
        <span class="sub">${rows.length ? T('sel.heatSub', { n: rows.length }) : T('sel.heatEmpty')}</span>
        <span class="flex1"></span>
        <button class="btn sm" data-act="contentFor" data-id="${p.id}">${T('sel.videos')}</button>
        <button class="btn sm" data-act="copyHeat" data-id="${p.id}">${T('sel.copyList')}</button></div>
      <div class="card-b" style="padding:6px 14px 10px">
        <div class="row wrap-gap" style="gap:6px;margin:2px 0 8px">${relatedChips(p)}</div>
        ${heatTable(p)}
        ${otherModels(p).length ? `<div class="row wrap-gap" style="gap:6px;margin-top:8px;align-items:center">
          <span class="tiny muted">${T('sel.other')}:</span>
          ${otherModels(p).slice(0, 8).map(([code, pid]) => `<span class="chip" data-act="openProduct" data-id="${pid}">${esc(code)}</span>`).join('')}
        </div>` : ''}
        ${!rows.length ? `<div class="row" style="margin-top:8px"><button class="btn sm" data-act="newFit">补一条适穿关系</button></div>` : ''}
      </div></div>`;
    })()}

    ${m.parsed.vehicle ? `<div class="card mt">
      <div class="card-h"><h3>${esc(m.parsed.vehicle.brand + ' ' + m.parsed.vehicle.series + ' ' + m.parsed.vehicle.model)} · 尺码段对应表</h3>
      <span class="sub">同一个款式系列，不同尺码段 → 不同款号</span></div>
      <div class="card-b" style="padding:0">
        <table><thead><tr><th>尺码段</th><th>版型</th><th>款号</th><th>尺码</th><th>适穿</th><th>置信度</th><th>来源</th><th></th></tr></thead><tbody>
        ${E.matrix(m.parsed.vehicle.id).map(x => `<tr>
          <td>${x.axle ? esc(x.axle.brand + ' ' + x.axle.model) : '<span class="muted">按旧款确认</span>'}</td>
          <td>${esc(x.pos)}</td><td class="mono b">${esc(x.code)}</td>
          <td>${esc(x.axle ? x.axle.spec : '—')}</td><td>${esc(x.fit)}</td><td>${confTag(x.conf)}</td>
          <td class="tiny muted">${esc(x.src)}</td>
          <td><button class="btn xs" data-act="addCart" data-id="${x.pid}">加入</button></td>
        </tr>`).join('')}
        </tbody></table>
      </div>
    </div>` : ''}`;
  }

  function doMatch(q) {
    const qEl = $('#q');
    if (q == null && qEl && typeof qEl.value === 'string') q = qEl.value;
    if (q != null) S.q = q;
    const text = (S.q || '').trim();
    if (!text) { toast('请输入款式系列、尺码段或编号'); return; }
    S.match = E.match(text);
    A.track('search', { q: text, top: S.match.top ? S.match.top.product.code : '' });
    render();
  }

  /* ================= 产品库 ================= */
  function filtered() {
    const f = S.filters, q = norm(f.q);
    const list = D.products.filter(p => {
      if (f.cat && p.cat !== f.cat) return false;
      if (f.brand && p.brand !== f.brand) return false;
      if (f.mat && p.material !== f.mat) return false;
      if (f.onlyFit && !E.fitsByP.has(p.id)) return false;
      if (!q) return true;
      return norm(p.code + p.nameEn + p.sku).includes(q) || D.codes.some(c => c.pid === p.id && c.norm.includes(q));
    });
    if (f.sort === 'likes') list.sort((a, b) =>
      (productHeat(b) - productHeat(a)) ||
      (contentOfCode(b.code).likes - contentOfCode(a.code).likes) ||
      ((E.fitsByP.get(b.id) || []).length - (E.fitsByP.get(a.id) || []).length));
    else if (f.sort === 'fit') list.sort((a, b) => (E.fitsByP.get(b.id) || []).length - (E.fitsByP.get(a.id) || []).length);
    else if (f.sort === 'price') list.sort((a, b) => b.price - a.price);
    return list;
  }
  function vProducts() {
    const list = filtered();
    $('#p-products').innerHTML = `
    <div class="row wrap-gap" style="justify-content:space-between;margin-bottom:12px">
      <div><h1 style="margin:0">${T('prod.title')}</h1><div class="muted small">${T('prod.sub', { p: D.stats.products, c: D.stats.codes })}</div></div>
      <div class="row">
        <button class="btn sm" data-act="exportProducts">${T('prod.export')}</button>
      </div>
    </div>
    <div class="card mb">
      <div class="card-b row wrap-gap">
        <div class="field" style="width:240px"><label>${T('prod.ph')}</label><input type="text" id="fq" value="${esc(S.filters.q)}" placeholder="XM-SW-2601 / 卫衣 / 110"></div>
        <div class="field" style="width:150px"><label>${T('prod.cat')}</label><select id="fcat"><option value="">${T('c.all')}</option>${[...new Set(D.products.map(p => p.cat))].map(c => `<option value="${esc(c)}" ${S.filters.cat === c ? 'selected' : ''}>${esc(catLabel(c))}</option>`).join('')}</select></div>
        <div class="field" style="width:130px"><label>${T('prod.brand')}</label><select id="fbrand"><option value="">${T('c.all')}</option>${D.brands.map(b => `<option value="${b.id}" ${S.filters.brand === b.id ? 'selected' : ''}>${b.name}</option>`).join('')}</select></div>
        <div class="field" style="width:130px"><label>${T('prod.mat')}</label><select id="fmat"><option value="">${T('c.all')}</option>${D.materials.map(m => `<option value="${m.id}" ${S.filters.mat === m.id ? 'selected' : ''}>${esc(mName(m))}</option>`).join('')}</select></div>
        <div class="field" style="justify-content:flex-end"><label>&nbsp;</label><label class="chk"><input type="checkbox" id="ffit" ${S.filters.onlyFit ? 'checked' : ''}> ${T('prod.only')}</label></div>
        <div class="field" style="width:140px"><label>${T('prod.sort')}</label><select id="fsort">
          <option value="" ${!S.filters.sort ? 'selected' : ''}>${T('prod.def')}</option>
          <option value="likes" ${S.filters.sort === 'likes' ? 'selected' : ''}>${T('prod.likes')}</option>
          <option value="fit" ${S.filters.sort === 'fit' ? 'selected' : ''}>${T('prod.fit')}</option>
          <option value="price" ${S.filters.sort === 'price' ? 'selected' : ''}>${T('prod.price')}</option>
        </select></div>
        <div style="margin-inline-start:auto;align-self:flex-end" class="muted small">${T('prod.res')} <b>${list.length}</b></div>
      </div>
    </div>
    <div class="card"><div class="tbl-wrap" style="max-height:calc(100vh - 300px)">
      <table><thead><tr><th style="width:46px"></th><th>${T('h.code')}</th><th>${T('h.name')}</th><th>${T('h.apps')}</th><th>${T('prod.cat')}</th><th>${T('h.spec')}</th><th>${T('prod.mat')}</th><th>${T('h.codes')}</th><th>适穿</th><th class="right" title="likes of related styles (demo)">${T('h.likes')}</th><th class="right">${T('h.price')}</th><th>${LZ('成交', 'Deals')}</th><th></th></tr></thead><tbody>
      ${list.slice(0, 400).map(p => {
        const nCodes = D.codes.filter(c => c.pid === p.id).length;
        const nFit = (E.fitsByP.get(p.id) || []).length;
        const apps = appsOf(p);
        const likes = productHeat(p);
        return `<tr class="click" data-act="openProduct" data-id="${p.id}">
          <td><div class="thumb">${p.img ? `<img src="${esc(p.img)}" loading="lazy" alt="">` : ''}</div></td>
          <td class="mono b">${esc(p.code)}</td>
          <td class="small muted" style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(pName(p))}</td>
          <td class="small" style="max-width:220px">${apps.length ? esc(appsJoin(apps, 2)) + (apps.length > 2 ? ` +${apps.length - 2}` : '') : `<span class="tiny muted">${LZ('待补', 'TBD')}</span>`}</td>
          <td class="small">${esc(pCat(p))}</td><td class="small">${esc(p.dim || '—')}</td>
          <td class="small">${esc(p.material)}</td><td class="small">${nCodes}</td>
          <td>${nFit ? `<span class="tag b">${nFit}</span>` : '<span class="tiny muted">—</span>'}</td>
          <td class="right mono small">${likes ? fmtN(likes) : '<span class="tiny muted">—</span>'}</td>
          <td class="right mono">$${money(p.price)}</td>
          <td class="small">${(() => {
            const ds = (S.deals || []).filter(d => d.code === p.code);
            if (!ds.length) return '<span class="tiny muted">—</span>';
            const won = ds.filter(d => d.status === '已成交').length;
            return '<span class="tag ' + (won ? 'g' : 'y') + '">' + won + ' 单</span>';
          })()}</td>
          <td><button class="btn xs" data-act="addCart" data-id="${p.id}">${T('c.add')}</button></td>
        </tr>`;
      }).join('')}
      </tbody></table>
      ${list.length > 400 ? '<div class="muted small center" style="padding:10px">仅显示前 400 条，请细化筛选</div>' : ''}
      ${!list.length ? `<div class="empty">${T('c.empty')}</div>` : ''}
    </div></div>`;
    const bind = (id, ev, fn) => { const n = $('#' + id); if (n) n[ev] = fn; };
    bind('fq', 'oninput', e => { S.filters.q = e.target.value; vProducts(); });
    bind('fcat', 'onchange', e => { S.filters.cat = e.target.value; vProducts(); });
    bind('fbrand', 'onchange', e => { S.filters.brand = e.target.value; vProducts(); });
    bind('fmat', 'onchange', e => { S.filters.mat = e.target.value; vProducts(); });
    bind('ffit', 'onchange', e => { S.filters.onlyFit = e.target.checked; vProducts(); });
    bind('fsort', 'onchange', e => { S.filters.sort = e.target.value; vProducts(); });
  }

  /* ================= 尺码适配图谱 ================= */
  function vGraph() {
    const vs = D.vehicles.slice().sort((a, b) => (b.fitCount || 0) - (a.fitCount || 0));
    $('#p-graph').innerHTML = `
    <div class="row wrap-gap" style="justify-content:space-between;margin-bottom:12px">
      <div><h1 style="margin:0">${T('nav.graph')}</h1><div class="muted small">${LZ('款式系列 → 尺码段 → 款号。新增关系进入「待复核」队列，复核后才对外生效。','Series → size band → style code. New links wait for pattern-room review.')}</div></div>
      <button class="btn primary" data-act="newFit">${LZ('新增适穿关系','Add size link')}</button>
    </div>
    <div class="split">
      <div class="card"><div class="card-h"><h3>${T('h.apps')}（${D.vehicles.length}）</h3><span class="sub">${LZ('按适穿条数排序','Sorted by size-link count')}</span></div>
        <div class="card-b" style="padding:8px 10px;max-height:calc(100vh - 240px);overflow:auto">
        ${vs.map(v => `
          <div class="tree-node">
            <div class="h">
              <b>${esc(v.brand + ' ' + v.series + ' ' + v.model)}</b>
              <span class="tiny muted">${esc(v.years)}</span>
              <span class="flex1"></span>
              ${v.fitCount ? `<span class="tag b">${v.fitCount} 条</span>` : '<span class="tag n">未建关系</span>'}
            </div>
            <div class="tiny muted" style="margin-top:3px">${esc(v.cls)} · ${esc(v.note || '')}</div>
            ${v.fitCount ? `<div class="branch">${E.matrix(v.id).map(x => `
              <div class="leaf">
                <span class="mono" style="width:120px">${x.axle ? esc(x.axle.brand + ' ' + x.axle.model) : '按旧款'}</span>
                <span class="arrow">→</span><b class="mono" style="width:96px">${esc(x.code)}</b>
                <span class="muted tiny">${esc(x.pos)} ${esc(x.fit)}</span>
                <span class="flex1"></span>${confTag(x.conf)}
              </div>`).join('')}</div>` : ''}
          </div>`).join('')}
        </div>
      </div>
      <div>
        <div class="card">
          <div class="card-h"><h3>${LZ('尺码段主数据','Size band master')}（${D.axles.length}）</h3></div>
          <div class="card-b" style="padding:0">
            <table><thead><tr><th>${LZ('尺码段','Size band')}</th><th>${LZ('型式','Type')}</th><th>${T('h.spec')}</th><th>${T('h.apps')}</th></tr></thead><tbody>
            ${D.axles.map(a => {
              const n = new Set(D.fitments.filter(f => f.aid === a.id).map(f => f.vid)).size;
              return `<tr><td><b>${esc(a.brand)}</b><div class="tiny muted">${esc(a.model)}</div></td>
                <td class="small">${esc(a.type)}<div class="tiny muted">${esc(a.cap)}</div></td>
                <td class="small">${esc(a.spec)}</td><td>${n ? `<span class="tag b">${n}</span>` : '<span class="tiny muted">—</span>'}</td></tr>`;
            }).join('')}
            </tbody></table>
          </div>
        </div>
        <div class="card mt">
          <div class="card-h"><h3>${LZ('待复核队列','Review queue')}（${pendingCount()}）</h3><span class="sub">${LZ('研发确认后转「已确认」','Becomes confirmed after R&D review')}</span></div>
          <div class="card-b" style="padding:0">
            <table><thead><tr><th>${T('h.apps')}</th><th>${T('h.code')}</th><th>${LZ('置信度','Confidence')}</th><th></th></tr></thead><tbody>
            ${D.fitments.filter(f => f.conf !== '已确认').slice(0, 10).map(f => `<tr>
              <td class="small">${esc(f.vName)}<div class="tiny muted">${esc(f.aName)}</div></td>
              <td class="mono">${esc(f.code)}</td><td>${confTag(f.conf)}</td>
              <td><button class="btn xs" data-act="confirmFit" data-id="${f.id}">${LZ('确认','OK')}</button></td></tr>`).join('') || '<tr><td colspan="4" class="empty small">队列为空</td></tr>'}
            </tbody></table>
            ${S.draftFits.length ? `<div class="card-b small muted">另有 ${S.draftFits.length} 条本次新增，等待导出给研发。</div>` : ''}
          </div>
        </div>
      </div>
    </div>`;
  }

  /* ================= 报价单 ================= */
  function vQuote() {
    const c = customer();
    const rows = cartRows();
    const calc = E.quoteCalc(rows.map(r => ({ pid: r.pid, qty: r.qty, mat: r.mat })), c);
    /* 客户看的是结算单：只核对款号、数量、金额，不出现阶梯价公式和报价单号 */
    if (A.me() && A.me().role === 'customer') return vSettle(c, rows, calc);
    const meta = S.quoteMeta;
    $('#p-quote').innerHTML = `
    <div class="row wrap-gap" style="justify-content:space-between;margin-bottom:12px">
      <div><h1 style="margin:0">${T('qt.title')}</h1><div class="muted small">${T('qt.sub')}</div></div>
      <div class="qt-actions">
        <div class="qt-tools">
          <button class="qt-btn" data-act="tab" data-id="select" title="${T('sel.go')}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
            <span class="qt-lbl">${T('sel.go')}</span>
          </button>
          <span class="qt-div"></span>
          <button class="qt-btn" data-act="printQuote" title="${T('qt.gen')}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M7 9V3.5h10V9"/><rect x="3.5" y="9" width="17" height="7.5" rx="2"/><path d="M7 16.5h10V21H7z"/></svg>
            <span class="qt-lbl">${LZ('生成报价单', 'Quote PDF')}</span>
          </button>
        </div>
        ${A.isStaff()
          ? `<button class="qt-cta" data-act="priceOpen">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M21.5 2.5 10.8 13.2"/><path d="M21.5 2.5 15 21.5l-4.2-8.3-8.3-4.2 19-6.5Z"/></svg>
               ${LZ('报价', 'Send price')}</button>`
          : `<button class="qt-cta" data-act="askPrice">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M21.5 2.5 10.8 13.2"/><path d="M21.5 2.5 15 21.5l-4.2-8.3-8.3-4.2 19-6.5Z"/></svg>
               ${LZ('询价', 'Ask price')}</button>`}
      </div>
    </div>
    <div class="split">
      <div>
        <div class="card">
          <div class="card-h"><h3>${T('qt.cust')}</h3></div>
          <div class="card-b grid" style="grid-template-columns:1fr 1fr;gap:10px">
            <div class="field"><label>${LZ('客户','Customer')}</label>${A.me() && A.me().role === 'customer'
              ? `<input type="text" value="${esc(A.me().company || A.me().name)} · ${esc(A.me().contact.value)}" disabled>`
              : `<select id="qCustomer">${D.customers.map(x => `<option value="${x.id}" ${x.id === S.customerId ? 'selected' : ''}>${esc(x.name)}（${esc(x.country)} · ${esc(x.type)}）</option>`).join('')}</select>`}</div>
            <div class="field"><label>${LZ('报价单号','Quote No.')}</label><input type="text" id="qNo" value="${esc(meta.no || autoNo())}"></div>
            <div class="field"><label>${LZ('日期','Date')}</label><input type="text" id="qDate" value="${esc(meta.date)}"></div>
            <div class="field"><label>${LZ('贸易术语','Incoterm')}</label><input type="text" id="qInco" value="${esc(meta.incoterm || c.incoterm)}"></div>
            <div class="field"><label>${LZ('付款方式','Payment')}</label><input type="text" id="qPay" value="${esc(meta.pay || c.pay)}"></div>
            <div class="field"><label>${LZ('价格等级','Price level')}</label><input type="text" value="${esc(c.grade + ' 类 · ' + c.priceLevel)}" disabled></div>
          </div>
        </div>
        <div class="card mt">
          <div class="card-h"><h3>${T('qt.items')}（${rows.length}）</h3><span class="flex1"></span>
            <button class="btn sm" data-act="clearCart">${T('sel.clear')}</button></div>
          <div class="card-b" style="padding:0">
            ${rows.length ? `<table><thead><tr><th style="width:44px"></th><th>${T('h.code')}</th><th>${T('prod.mat')}</th><th class="right">${LZ('数量','Qty')}</th><th class="right">${LZ('单价','Unit')}</th><th class="right">${LZ('金额','Amount')}</th><th></th></tr></thead><tbody>
            ${calc.rows.map((r, i) => `<tr>
              <td><div class="thumb sm">${r.product.img ? `<img src="${esc(r.product.img)}" loading="lazy" alt="">` : ''}</div></td>
              <td><b class="mono">${esc(r.product.code)}</b><div class="tiny muted">${esc(r.tier)}</div></td>
              <td><select data-act="setMat" data-id="${i}" style="width:112px;padding:3px 6px;font-size:12px">${D.materials.map(m => `<option value="${m.id}" ${((r.mat || r.product.material) === m.id) ? 'selected' : ''}>${esc(mName(m))}</option>`).join('')}</select></td>
              <td class="right"><input type="number" min="1" data-act="setQty" data-id="${i}" value="${r.qty}" style="width:82px;text-align:right;padding:3px 6px"></td>
              <td class="right mono">$${money(r.unit)}</td>
              <td class="right mono b">$${money(r.amt)}</td>
              <td><button class="btn xs" data-act="rmCart" data-id="${r.pid}">×</button></td>
            </tr>`).join('')}
            </tbody></table>` : `<div class="empty">${T('qt.empty')}</div>`}
          </div>
        </div>
      </div>
      <div>
        <div class="card">
          <div class="card-h"><h3>${LZ('金额','Amount')}</h3></div>
          <div class="card-b">
            <table style="font-size:13px">
              <tr><td class="muted">${T('qt.amount')}</td><td class="right mono">$${money(calc.amount)}</td></tr>
              <tr><td class="muted">${T('qt.freight')}</td><td class="right mono">$${money(calc.freight)}</td></tr>
              <tr><td class="b" style="font-size:15px">${T('qt.total')} USD</td><td class="right mono b" style="font-size:20px">$${money(calc.total)}</td></tr>
            </table>
            <div class="hr"></div>
            <div class="tiny muted">${LZ('阶梯价规则：', 'Volume tiers: ')}${E.TIERS.slice().reverse().map(t => `${t.min}+ → ×${t.f}`).join(' · ')}${LZ('。客户等级与价格等级再乘系数。', '. Customer and price level factors apply.')}</div>
            <div class="mt-s row wrap-gap">
              <button class="btn sm" data-act="saveQuote">${T('qt.save')}</button>
              <button class="btn sm" data-act="tab" data-id="pack">${T('nav.pack')} →</button>
            </div>
          </div>
        </div>
        <div class="card mt">
          <div class="card-h"><h3>${T('qt.recent')}</h3></div>
          <div class="card-b" style="padding:0">
            <table><thead><tr><th>${LZ('单号','No.')}</th><th>${LZ('客户','Customer')}</th><th class="right">${LZ('金额','Amount')}</th><th></th></tr></thead><tbody>
            ${(S.quotes || []).slice(-6).reverse().map(q => `<tr><td class="mono small">${esc(q.no)}</td><td class="small">${esc(q.customer)}</td><td class="right mono">$${money(q.total)}</td>
              <td><button class="btn xs" data-act="loadQuote" data-id="${q.id}">${LZ('载入','Load')}</button></td></tr>`).join('') || `<tr><td colspan="4" class="empty small">${T('c.empty')}</td></tr>`}
            </tbody></table>
          </div>
        </div>
      </div>
    </div>`;
    const bind = (id, ev, fn) => { const n = $('#' + id); if (n) n[ev] = fn; };
    bind('qCustomer', 'onchange', e => { S.customerId = e.target.value; save(); vQuote(); });
    bind('qNo', 'oninput', e => { S.quoteMeta.no = e.target.value; });
    bind('qDate', 'oninput', e => { S.quoteMeta.date = e.target.value; });
    bind('qInco', 'oninput', e => { S.quoteMeta.incoterm = e.target.value; });
    bind('qPay', 'oninput', e => { S.quoteMeta.pay = e.target.value; });
  }

  /* ---- 结算单文档：当前购物车和历史记录共用同一套排版 ---- */
  function settleDocHtml(d) {
    const e2 = s => String(s == null ? '' : s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
    return '<div style="padding:26px 30px;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #111;padding-bottom:10px">' +
      '<div><div style="font-size:22px;font-weight:800">' + LZ('结算单', 'SETTLEMENT') + '</div>' +
      '<div style="font-size:12px;color:#666;margin-top:2px">XIAOMAN KIDS · ' + LZ('湖州小满童装有限公司', 'HUZHOU XIAOMAN KIDS APPAREL CO., LTD.') + '</div></div>' +
      '<div style="font-size:12px;text-align:right;color:#333">' + LZ('单号', 'No.') + ' <b>' + e2(d.no) + '</b><br>' + e2(d.at) + '</div></div>' +
      '<table style="width:100%;font-size:12px;margin-top:12px">' +
      '<tr><td style="color:#666;padding:2px 0">' + LZ('客户', 'Customer') + '</td><td>' + e2(d.cust) + '</td>' +
      '<td style="color:#666;padding:2px 0">' + LZ('联系方式', 'Contact') + '</td><td>' + e2(d.contact) + '</td></tr>' +
      '<tr><td style="color:#666;padding:2px 0">' + LZ('贸易术语', 'Incoterm') + '</td><td>' + e2(d.incoterm) + '</td>' +
      '<td style="color:#666;padding:2px 0">' + LZ('付款方式', 'Payment') + '</td><td>' + e2(d.pay) + '</td></tr></table>' +
      '<table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:14px">' +
      '<thead><tr style="background:#f3f4f6">' +
      '<th style="text-align:left;padding:7px 8px;border:1px solid #ddd">' + LZ('款号', 'Style code') + '</th>' +
      '<th style="text-align:left;padding:7px 8px;border:1px solid #ddd">' + LZ('面料', 'Material') + '</th>' +
      '<th style="text-align:right;padding:7px 8px;border:1px solid #ddd">' + LZ('数量', 'Qty') + '</th>' +
      '<th style="text-align:right;padding:7px 8px;border:1px solid #ddd">' + LZ('单价', 'Unit') + '</th>' +
      '<th style="text-align:right;padding:7px 8px;border:1px solid #ddd">' + LZ('金额', 'Amount') + '</th></tr></thead><tbody>' +
      d.rows.map(r => '<tr>' +
        '<td style="padding:6px 8px;border:1px solid #ddd"><b>' + e2(r.code) + '</b></td>' +
        '<td style="padding:6px 8px;border:1px solid #ddd">' + e2(r.mat) + '</td>' +
        '<td style="padding:6px 8px;border:1px solid #ddd;text-align:right">' + r.qty + '</td>' +
        '<td style="padding:6px 8px;border:1px solid #ddd;text-align:right">$' + money(r.unit) + '</td>' +
        '<td style="padding:6px 8px;border:1px solid #ddd;text-align:right"><b>$' + money(r.amt) + '</b></td></tr>').join('') +
      '</tbody></table>' +
      '<table style="width:320px;margin-left:auto;font-size:12px;margin-top:10px">' +
      '<tr><td style="color:#666;padding:3px 0">' + LZ('商品金额', 'Goods') + '</td><td style="text-align:right">$' + money(d.amount) + '</td></tr>' +
      '<tr><td style="color:#666;padding:3px 0">' + LZ('运费（预估）', 'Freight (est.)') + '</td><td style="text-align:right">$' + money(d.freight) + '</td></tr>' +
      '<tr style="border-top:1px solid #111"><td style="padding:6px 0;font-weight:700">' + LZ('应付总额 USD', 'Total due USD') + '</td>' +
      '<td style="text-align:right;font-weight:800;font-size:15px">$' + money(d.total) + '</td></tr></table>' +
      '<div style="margin-top:16px;font-size:11px;color:#777;line-height:1.7">' +
      LZ('本单为结算预估，运费按目的地与体积重最终核定；正式合同以双方确认为准。', 'This is an estimated settlement. Freight is finalised by destination and volumetric weight; the contract prevails.') +
      '</div></div>';
  }

  function showSettleDoc(title, html) {
    modal(title, '<div style="background:#fff">' + html + '</div>',
      '<button class="btn" data-act="closeModal">' + LZ('关闭', 'Close') + '</button><button class="btn primary" data-act="printNow">' + LZ('打印 / 另存 PDF', 'Print / PDF') + '</button>', true);
  }

  /* ---- 我的结算记录 ---- */
  function ordersCard() {
    const u = A.me() || {};
    const mine = custKeyOf(u);
    let list = S.myOrders || [];
    if (netReady()) list = list.filter(o => !o.custKey || o.custKey === mine);
    list = list.slice().sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
    return `<div class="card mt">
      <div class="card-h"><h3>${LZ('我的结算记录', 'My settlements')}</h3>
        <span class="sub">${list.length ? list.length + LZ(' 单 · 提交后自动留档', ' records · saved automatically') : LZ('提交后自动留档，随时能查', 'Saved automatically after you submit')}</span></div>
      <div class="card-b" style="padding:0">
        ${list.length ? `<div class="tbl-wrap"><table><thead><tr>
          <th>${LZ('单号', 'No.')}</th><th>${LZ('时间', 'Date')}</th>
          <th class="right">${LZ('款数', 'Items')}</th><th class="right">${LZ('数量', 'Qty')}</th>
          <th class="right">${LZ('金额', 'Amount')}</th><th>${LZ('状态', 'Status')}</th><th></th></tr></thead><tbody>
          ${list.map(o => {
      const qty = o.rows.reduce((s, r) => s + Number(r.qty || 0), 0);
      return `<tr>
            <td class="mono b">${esc(o.no)}</td>
            <td class="small mono muted">${esc(o.at)}</td>
            <td class="right mono small">${o.rows.length}</td>
            <td class="right mono small">${qty}</td>
            <td class="right mono b">$${money(o.total)}</td>
            <td>${tag(o.status || '已提交', 'o')}</td>
            <td><div class="row" style="gap:6px;justify-content:flex-end">
              <button class="btn xs" data-act="reorderOrder" data-id="${o.id}">${LZ('再来一单', 'Reorder')}</button>
              <button class="btn xs" data-act="printOrder" data-id="${o.id}">${LZ('打印', 'Print')}</button>
            </div></td></tr>`;
    }).join('')}
        </tbody></table></div>` : `<div class="card-b muted small" style="padding:18px">${LZ('还没有结算记录。提交后会在这里留档，随时能查、能再下一单。', 'No settlements yet — once you submit one it is kept here.')}</div>`}
      </div>
    </div>`;
  }
  /* ---- 客户侧：收到的员工报价 ---- */
  function quotesCard() {
    const u = A.me() || {};
    const mine = custKeyOf(u);
    const myName = String(u.company || u.name || '').trim();
    const seenNo = {};
    const list = (S.quotes || []).filter(q => {
      const hit = q.customerId === u.id
        || (q.custKey && q.custKey === mine)
        || (!!myName && String(q.customer || '').trim() === myName);
      if (!hit) return false;
      const k = q.no || q.id;
      if (seenNo[k]) return false;
      seenNo[k] = 1;
      return true;
    }).slice().reverse();
    if (!list.length) return '';
    return `<div class="card mt">
      <div class="card-h"><h3>${LZ('收到的报价', 'Quotes from sales')}</h3>
        <span class="sub">${list.length} ${LZ('份 · 点开看明细', 'quotes · click to open')}</span></div>
      <div class="card-b" style="padding:0">
        <div class="tbl-wrap"><table><thead><tr>
          <th>${LZ('报价单号', 'Quote No.')}</th><th>${LZ('日期', 'Date')}</th>
          <th class="right">${LZ('款数', 'Items')}</th><th class="right">${LZ('合计', 'Total')}</th>
          <th>${LZ('状态', 'Status')}</th><th></th></tr></thead><tbody>
          ${list.map(q => `<tr>
            <td class="mono b">${esc(q.no)}</td>
            <td class="small mono muted">${esc(q.date || '')}</td>
            <td class="right mono small">${(q.items || []).length}</td>
            <td class="right mono b">$${money(q.total)}</td>
            <td><span class="tag o">${LZ('已报价', 'Quoted')}</span></td>
            <td><div class="row" style="gap:6px;justify-content:flex-end">
              <button class="btn xs" data-act="viewQuote" data-id="${esc(q.id)}">${LZ('看明细', 'Details')}</button>
              <button class="btn xs primary" data-act="acceptQuote" data-id="${esc(q.id)}">${LZ('按此下单', 'Order this')}</button>
            </div></td></tr>`).join('')}
        </tbody></table></div>
      </div>
    </div>`;
  }
  /* ================= 客户结算单 ================= */
  function vSettle(c, rows, calc) {
    const u = A.me() || {};
    const money2 = n => (Math.round(n * 100) / 100).toLocaleString();
    $('#p-quote').innerHTML = `
    <div class="row wrap-gap" style="justify-content:space-between;margin-bottom:12px">
      <div><h1 style="margin:0">${LZ('结算单', 'Settlement')}</h1>
      <div class="muted small">${LZ('核对款号、数量和金额，确认无误后提交，销售会按这张单回复交期和运费。', 'Check the styles, quantity and amount, then submit — sales replies with lead time and freight.')}</div></div>
      <div class="qt-actions">
        <div class="qt-tools">
          <button class="qt-btn" data-act="tab" data-id="select" title="${LZ('继续选款', 'Keep matching')}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
            <span class="qt-lbl">${LZ('继续选款', 'Keep matching')}</span>
          </button>
          <span class="qt-div"></span>
          <button class="qt-btn" data-act="printSettle" title="${LZ('打印结算单', 'Print settlement')}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M7 9V3.5h10V9"/><rect x="3.5" y="9" width="17" height="7.5" rx="2"/><path d="M7 16.5h10V21H7z"/></svg>
            <span class="qt-lbl">${LZ('打印结算单', 'Print')}</span>
          </button>
        </div>
        <button class="qt-cta" data-act="askPrice">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M21.5 2.5 10.8 13.2"/><path d="M21.5 2.5 15 21.5l-4.2-8.3-8.3-4.2 19-6.5Z"/></svg>
          ${LZ('提交结算单', 'Submit')}</button>
      </div>
    </div>
    <div class="split">
      <div>
        <div class="card">
          <div class="card-h"><h3>${LZ('收货与结算信息', 'Billing & delivery')}</h3><span class="sub">${LZ('已有默认值，可以直接改', 'Defaults filled in — edit as needed')}</span></div>
          <div class="card-b grid" style="grid-template-columns:1fr 1fr;gap:10px">
            <div class="field"><label>${LZ('客户', 'Customer')}</label>
              <input type="text" value="${esc(u.company || u.name || '')}" disabled></div>
            <div class="field"><label>${LZ('联系方式', 'Contact')}</label>
              <input type="text" value="${esc((u.contact || {}).value || '')}" disabled></div>
            <div class="field"><label>${LZ('结算单号', 'Settlement No.')}</label><input type="text" value="${esc(S.quoteMeta.no || autoNo())}" disabled></div>
            <div class="field"><label>${LZ('日期', 'Date')}</label><input type="text" value="${esc(S.quoteMeta.date)}" disabled></div>
            <div class="field"><label>${LZ('贸易术语', 'Incoterm')}</label><input type="text" id="qInco" value="${esc(S.quoteMeta.incoterm || c.incoterm)}"></div>
            <div class="field"><label>${LZ('付款方式', 'Payment')}</label><input type="text" id="qPay" value="${esc(S.quoteMeta.pay || c.pay)}"></div>
          </div>
        </div>
        <div class="card mt">
          <div class="card-h"><h3>${LZ('结算明细', 'Items')}（${rows.length}）</h3><span class="flex1"></span>
            <button class="btn sm" data-act="clearCart">${LZ('清空', 'Clear')}</button></div>
          <div class="card-b" style="padding:0">
            ${rows.length ? `<table><thead><tr><th style="width:44px"></th><th>${LZ('款号', 'Style code')}</th><th>${LZ('面料', 'Material')}</th><th class="right">${LZ('数量', 'Qty')}</th><th class="right">${LZ('单价', 'Unit')}</th><th class="right">${LZ('金额', 'Amount')}</th><th></th></tr></thead><tbody>
            ${calc.rows.map((r, i) => `<tr>
              <td><div class="thumb sm">${r.product.img ? `<img src="${esc(r.product.img)}" loading="lazy" alt="">` : ''}</div></td>
              <td><b class="mono">${esc(r.product.code)}</b></td>
              <td><select data-act="setMat" data-id="${i}" style="width:112px;padding:3px 6px;font-size:12px">${D.materials.map(m => `<option value="${m.id}" ${((r.mat || r.product.material) === m.id) ? 'selected' : ''}>${esc(mName(m))}</option>`).join('')}</select></td>
              <td class="right"><input type="number" min="1" data-act="setQty" data-id="${i}" value="${r.qty}" style="width:82px;text-align:right;padding:3px 6px"></td>
              <td class="right mono">$${money(r.unit)}</td>
              <td class="right mono b">$${money(r.amt)}</td>
              <td><button class="btn xs" data-act="rmCart" data-id="${r.pid}">×</button></td>
            </tr>`).join('')}
            </tbody></table>` : `<div class="empty">${LZ('结算单还是空的，先去产品库挑款号。', 'Nothing here yet — pick styles from the catalog first.')}</div>`}
          </div>
        </div>
      </div>
      <div>
        <div class="card">
          <div class="card-h"><h3>${LZ('应付金额', 'Amount due')}</h3><span class="sub">USD</span></div>
          <div class="card-b">
            <table style="font-size:13px">
              <tr><td class="muted">${LZ('商品金额', 'Goods')}</td><td class="right mono">$${money(calc.amount)}</td></tr>
              <tr><td class="muted">${LZ('运费（预估）', 'Freight (est.)')}</td><td class="right mono">$${money(calc.freight)}</td></tr>
              <tr><td class="b" style="font-size:15px">${LZ('应付总额', 'Total due')}</td><td class="right mono b" style="font-size:22px">$${money(calc.total)}</td></tr>
            </table>
            <div class="hr"></div>
            <div class="tiny muted" style="line-height:1.8">
              · ${LZ('单价已按您的采购量和等级折算，数量越大单价越低。', 'Unit prices already reflect your volume and price level — bigger runs cost less per piece.')}<br>
              · ${LZ('运费为预估值，实际按目的地和体积重结算。', 'Freight is an estimate; the final figure depends on destination and volumetric weight.')}<br>
              · ${LZ('提交后销售会回复交期、船期和付款条件，确认前不产生任何费用。', 'No charge until sales confirms lead time, schedule and payment terms.')}
            </div>
            <div class="mt-s">
              <button class="btn primary" data-act="askPrice" style="width:100%">${LZ('提交结算单', 'Submit settlement')}</button>
            </div>
          </div>
        </div>
        <div class="card mt">
          <div class="card-h"><h3>${LZ('下一步', 'Next')}</h3></div>
          <div class="card-b small" style="line-height:1.9">
            <div>1. ${LZ('提交结算单', 'Submit the settlement')}</div>
            <div>2. ${LZ('销售核对库存与交期', 'Sales checks stock and lead time')}</div>
            <div>3. ${LZ('确认后出正式合同 / 形式发票', 'We issue the contract or proforma invoice')}</div>
          </div>
        </div>
      </div>
    </div>
    ${quotesCard()}
    ${ordersCard()}`;
    const bind = (id, ev, fn) => { const n = $('#' + id); if (n) n[ev] = fn; };
    bind('qInco', 'oninput', e => { S.quoteMeta.incoterm = e.target.value; });
    bind('qPay', 'oninput', e => { S.quoteMeta.pay = e.target.value; });
  }
  function autoNo() {
    const d = new Date(), p = n => String(n).padStart(2, '0');
    return `XM${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}-${String((S.quotes.length || 0) + 1).padStart(3, '0')}`;
  }

  /* ================= 资料包 ================= */
  function vPack() {
    const rows = cartRows();
    const cfg = S.packCfg;
    const testN = rows.reduce((s, r) => s + (E.testsByP.get(r.pid) || []).length, 0);
    $('#p-pack').innerHTML = `
    <div class="row wrap-gap" style="justify-content:space-between;margin-bottom:12px">
      <div><h1 style="margin:0">${T('pk.title')}</h1><div class="muted small">${T('pk.sub')}</div></div>
      <div class="row">
        <button class="btn" data-act="zipPack">${T('pk.zip')}</button>
        <button class="btn primary" data-act="printPack">${T('pk.print')}</button>
      </div>
    </div>
    <div class="split">
      <div class="card">
        <div class="card-h"><h3>${T('pk.contents')}</h3><span class="sub">${LZ('按客户视角组织，可直接转发','Organised for the customer, ready to forward')}</span></div>
        <div class="card-b">
          ${[['cover', LZ('封面与选款依据','Cover & basis'), LZ('客户名 / 编号 / 款号清单 / 免责说明','Customer, style list, disclaimer')],
            ['quote', LZ('报价单','Quotation'), LZ('条款、阶梯价、运费估算','Terms, volume price, freight')],
            ['spec', LZ('产品数据页','Data sheets') + ` × ${rows.length}`, LZ('图片、尺码、面料、编号对照、适穿、质检摘要','Images, size, fabric, cross-reference, size link')],
            ['test', LZ('质检报告摘要','Test summary') + ` ${testN}`, 'GB 31701 / GB 18401 / OEKO-TEX 100'],
            ['confirm', LZ('发货前确认页','Pre-shipment check'), LZ('把「同系列不同尺码段」的风险前置到发货前','Catch the wrong-size risk before shipping')]].map(([k, t, d]) => `
            <label class="chk" style="align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--line-2)">
              <input type="checkbox" data-act="packCfg" data-id="${k}" ${cfg[k] ? 'checked' : ''}>
              <span><b>${t}</b><div class="tiny muted">${d}</div></span>
            </label>`).join('')}
          ${LZ('<div class="notice mt-s">提示：产品页里的图片在本机文件夹内，打印/另存 PDF 时会一起带出；ZIP 内为 HTML + CSV（体积小、可邮件发送）。</div>', '<div class="notice mt-s">Images are local files and print with the PDF. The ZIP contains HTML + CSV, small enough to email.</div>')}
        </div>
      </div>
      <div class="card">
        <div class="card-h"><h3>${T('pk.items')}（${rows.length}）</h3></div>
        <div class="card-b" style="padding:0">
          ${rows.length ? `<table><thead><tr><th style="width:44px"></th><th>${T('h.code')}</th><th>${T('h.spec')}</th><th>${LZ('质检','Tests')}</th><th></th></tr></thead><tbody>
          ${rows.map(r => `<tr><td><div class="thumb sm">${r.product.img ? `<img src="${esc(r.product.img)}" loading="lazy" alt="">` : ''}</div></td><td class="mono b">${esc(r.product.code)}</td><td class="small">${esc(r.product.dim || LZ('待补','TBD'))}</td>
            <td>${(E.testsByP.get(r.pid) || []).length ? tag((E.testsByP.get(r.pid) || []).length + ' 条', 'b') : '<span class="tiny muted">—</span>'}</td>
            <td><button class="btn xs" data-act="rmCart" data-id="${r.pid}">×</button></td></tr>`).join('')}
          </tbody></table>` : `<div class="empty">${T('pk.empty')}</div>`}
        </div>
      </div>
    </div>
    ${rows.length ? `<div class="card mt"><div class="card-h"><h3>${LZ('预览（打印版式）','Print preview')}</h3></div><div class="card-b"><div style="background:#fff;border:1px solid var(--line);border-radius:6px;padding:14px;transform-origin:top left">
      <div style="font-size:11px;color:var(--muted)">A4 · ${1 + (cfg.quote ? 1 : 0) + (cfg.spec ? rows.length : 0) + (cfg.confirm ? 1 : 0)} 页左右</div>
      <div style="font-size:22px;font-weight:800;margin:6px 0 2px">${LZ('产品与报价资料包','Product & quotation pack')}</div>
      <div class="muted small">${esc(customer().name)} · ${rows.map(r => esc(r.product.code)).join(' · ')}</div>
      <div class="hr"></div>
      <div class="row wrap-gap">${rows.slice(0, 6).map(r => `<div style="width:110px"><div class="imgbox" style="aspect-ratio:1">${r.product.img ? `<img src="${esc(r.product.img)}">` : ''}</div><div class="tiny center mono">${esc(r.product.code)}</div></div>`).join('')}</div>
    </div></div></div>` : ''}`;
  }

  /* ================= 询盘线索 ================= */
  function vLeads() {
    const own = S.leadsOwner || '';
    const rows = S.leads.filter(l => !own || (l.owner || '') === own).slice().sort((a, b) => (b.score || 0) - (a.score || 0));
    const isBoss = A.isBoss();
    $('#p-leads').innerHTML = `
    <div class="row wrap-gap" style="justify-content:space-between;margin-bottom:12px">
      <div><h1 style="margin:0">${T('ld.title')}</h1><div class="muted small">${T('ld.sub')}</div></div>
      <div class="row wrap-gap">
        ${own ? `<button class="chip on" data-act="leadsOwnerClear">只看：${esc(own)} ✕</button>` : ''}
        <button class="btn primary" data-act="newLead">+ ${T('ld.new')}</button>
      </div>
    </div>
    <div class="card"><div class="tbl-wrap">
      <table><thead><tr><th>${LZ('线索','Lead')}</th><th>${LZ('来源','Source')}</th><th>${LZ('需求','Need')}</th>${isBoss ? `<th>${LZ('跟进人','Owner')}</th>` : ''}<th>${LZ('客户类型','Type')}</th><th>${LZ('当地时间','Local time')}</th><th>${LZ('状态','Status')}</th><th class="right">${LZ('评分','Score')}</th><th></th></tr></thead><tbody>
      ${rows.map(l => {
        const sc = E.scoreLead(l), t = E.localTime(l.tz);
        return `<tr class="click" data-act="openLead" data-id="${l.id}">
          <td><b>${esc(l.company)}</b><div class="tiny muted">${esc(l.country)} · ${esc(l.contact)}</div></td>
          <td class="small">${esc(l.src)}<div class="tiny muted">${esc((l.created || '').slice(0, 16))}</div></td>
          <td class="small" style="max-width:300px">${esc(l.needZh || l.need).slice(0, 54)}</td>
          ${isBoss ? `<td class="small b">${esc(l.owner || '—')}</td>` : ''}
          <td>${tag(sc.trading ? LZ('贸易商','Trader') : sc.terminal ? LZ('终端','End user') : LZ('待甄别','Verify'), sc.trading ? 'n' : sc.terminal ? 'g' : 'y')}</td>
          <td class="small"><span class="mono">${t.text}</span> <span class="tiny ${t.working ? '' : 'muted'}">${t.working ? '● 可联系' : '○ 休息'}</span></td>
          <td>${tag(l.status, l.status === '待跟进' ? 'o' : l.status === '已报价' ? 'b' : 'n')}</td>
          <td class="right"><div class="row" style="justify-content:flex-end;gap:6px">
            <span class="mono b ${sc.score >= 75 ? 'c-hi' : sc.score >= 55 ? 'c-mid' : 'c-lo'}">${sc.score}</span>
            <span class="tag ${sc.tier.c}">${sc.tier.l.split(' ')[0]}</span></div></td>
          <td><button class="btn xs" data-act="leadMatch" data-id="${l.id}">匹配款号</button></td>
        </tr>`;
      }).join('')}
      </tbody></table>
    </div></div>
    <div class="split mt">
      <div class="card"><div class="card-h"><h3>评分规则</h3><span class="sub">为什么这条是 A、那条是 C</span></div>
        <div class="card-b" style="padding:0">
          <table><thead><tr><th>维度</th><th>权重</th><th>说明</th></tr></thead><tbody>
          ${D.scoreRules.map(r => `<tr><td class="b">${esc(r.label)}</td><td class="mono">${r.w}</td><td class="small muted">${esc(r.desc)}</td></tr>`).join('')}
          </tbody></table>
        </div>
      </div>
      <div class="card"><div class="card-h"><h3>止损线：什么时候该放弃</h3></div>
        <div class="card-b small" style="line-height:1.8">
          <div>· 名称含 <b>Trading / Import &amp; Export / FZE</b>，且拿不出终端地址 → 只发目录，不投技术资源。</div>
          <div>· 只问价格、不给尺码段、不接受小样 → 比价客户，报价即可，不做方案。</div>
          <div>· 海关数据里<b>收货人</b>才是终端；发货人是贸易公司 → 顺着收货人找。</div>
          <div>· 社媒私信 48 小时无回复 → 移到「待甄别」，不占用跟进配额。</div>
        </div>
      </div>
    </div>`;
  }

  /* ================= 数据导入 ================= */
  function vImport() {
    $('#p-import').innerHTML = `
    <div class="row wrap-gap" style="justify-content:space-between;margin-bottom:12px">
      <div><h1 style="margin:0">${T('im.title')}</h1><div class="muted small">${T('im.sub')}</div></div>
      <div class="row"><button class="btn" data-act="exportJson">${LZ('导出全量快照','Export snapshot')}</button>
        <button class="btn" data-act="resetData">${LZ('恢复默认数据','Reset data')}</button></div>
    </div>
    <div class="split">
      <div class="card">
        <div class="card-h"><h3>导入 CSV</h3><span class="sub">首行为表头，逗号或制表符分隔</span></div>
        <div class="card-b">
          <div class="field"><label>数据类型</label>
            <select id="impType">
              <option value="fit">适穿关系（款式系列,尺码段,版型,款号,适穿类型,置信度,来源）</option>
              <option value="prod">产品更新（款号,尺码,面料,价格,MOQ）</option>
              <option value="lead">询盘线索（公司,国家,来源,需求,联系人,时区）</option>
              <option value="code">编号对照（款号,编号,类型,来源）</option>
            </select></div>
          <div class="field mt-s"><label>粘贴内容</label><textarea id="impText" style="min-height:180px;font-family:var(--mono);font-size:12px" placeholder="款式系列,尺码段,版型,款号,适穿类型,置信度,来源
奶油小方 圆领卫衣,110,宽松,SW2601047,同款,高,官网目录"></textarea></div>
          <div class="row mt-s"><button class="btn primary" data-act="runImport">校验并导入</button>
            <span class="tiny muted">导入后进入待复核队列，不直接影响对外报价</span></div>
          <div id="impOut" class="mt-s"></div>
        </div>
      </div>
      <div class="card">
        <div class="card-h"><h3>字段字典</h3><span class="sub">与 SQLite 库、Excel 模板一致</span></div>
        <div class="card-b" style="padding:0">
          <table style="font-size:12px"><thead><tr><th>表</th><th>关键字段</th><th>说明</th></tr></thead><tbody>
            <tr><td class="b">products</td><td class="mono tiny">code, sku, cat, dim, material, price, moq</td><td class="tiny muted">款号主数据</td></tr>
            <tr><td class="b">codes</td><td class="mono tiny">code, norm, type, pid, conf</td><td class="tiny muted">款号 / 条码 / 工厂编号 / 客户叫法</td></tr>
            <tr><td class="b">vehicles</td><td class="mono tiny">brand, series, model, alias[]</td><td class="tiny muted">款式系列及别名</td></tr>
            <tr><td class="b">axles</td><td class="mono tiny">brand, model, type, spec, alias[]</td><td class="tiny muted">尺码段主数据</td></tr>
            <tr><td class="b">fitments</td><td class="mono tiny">vid, aid, pos, pid, conf, q[]</td><td class="tiny muted">适穿关系 + 消歧问题</td></tr>
            <tr><td class="b">tests</td><td class="mono tiny">pid, std, item, result, no</td><td class="tiny muted">质检报告</td></tr>
            <tr><td class="b">leads</td><td class="mono tiny">company, country, need, score, tz</td><td class="tiny muted">询盘线索</td></tr>
          </tbody></table>
          <div class="card-b small muted">配套文件：<b>data/guanying.db</b>（SQLite，可直接给 IT / BI 用）、<b>data/导入模板.xlsx</b>（6 个 sheet）。</div>
        </div>
      </div>
    </div>`;
    const n = $('#impType'); if (n) n.onchange = () => { $('#impOut').innerHTML = ''; };
  }

  /* ================= 用户画像 / 关系网 ================= */
  S.personaId = S.personaId || null;
  function layoutNetwork() {
    const W = 920, H = 580, cx = W / 2, cy = H / 2 - 6;
    const pos = { A17: { x: cx, y: cy } };
    const comms = SOCIAL.communities;
    comms.forEach((c, i) => {
      const ang = -Math.PI / 2 + i * 2 * Math.PI / comms.length;
      const hx = cx + Math.cos(ang) * 195, hy = cy + Math.sin(ang) * 168;
      pos['C:' + c.id] = { x: hx, y: hy, comm: c };
      const members = SOCIAL.personas.filter(p => p.community === c.id);
      members.forEach((p, j) => {
        const a2 = ang + (j - (members.length - 1) / 2) * 0.62;
        const r = 74 + (j % 2) * 40;
        pos[p.id] = { x: hx + Math.cos(a2) * r, y: hy + Math.sin(a2) * r };
      });
    });
    return { pos, W, H, cx, cy };
  }
  function vNetwork() {
    const { pos, W, H } = layoutNetwork();
    const P = SOCIAL.personas;
    const byId = Object.fromEntries(P.map(p => [p.id, p]));
    const edges = SOCIAL.edges.filter(([a, b]) => pos[a] && pos[b]);
    const rOf = f => 6 + Math.sqrt(f) / 55;
    const ranked = P.slice().sort((a, b) => b.intent - a.intent);
    const totalFans = P.reduce((s, p) => s + p.followers, 0);
    const terminals = P.filter(p => /母婴连锁|童装店|批发商|采购|买手/.test(p.type)).length;

    $('#p-network').innerHTML = acquireBar('network') + `
    <div class="row wrap-gap" style="justify-content:space-between;margin-bottom:12px">
      <div><h1 style="margin:0">${T('nw.title')}</h1>
        <div class="muted small">${T('nw.sub')}</div></div>
      <div class="row"><button class="btn sm" data-act="tab" data-id="leads">与询盘池联动 →</button>
        <button class="btn sm primary" data-act="tab" data-id="content">用画像出内容 →</button></div>
    </div>
    <div class="kpis mb">
      <div class="kpi"><div class="n">${P.length}</div><div class="l">已建档账号</div><div class="d">${new Set(P.map(p => p.platform)).size} 个平台 · ${new Set(P.map(p => p.lang)).size} 种语言</div></div>
      <div class="kpi"><div class="n">${(totalFans / 1000).toFixed(0)}k</div><div class="l">粉丝覆盖（去重前）</div><div class="d">按账号粉丝数汇总</div></div>
      <div class="kpi"><div class="n">${terminals}</div><div class="l">终端型账号</div><div class="d">母婴连锁 / 童装店 / 批发商 / 采购</div></div>
      <div class="kpi"><div class="n">${P.filter(p => p.intent >= 75).length}</div><div class="l">高意向（≥75）</div><div class="d">优先私信与寄样</div></div>
      <div class="kpi"><div class="n">${edges.length}</div><div class="l">关注关系</div><div class="d">用于找「关键节点」</div></div>
    </div>
    <div class="split" style="grid-template-columns:1.55fr 1fr">
      <div class="card">
        <div class="card-h"><h3>关系网</h3><span class="sub">点节点看画像；线=关注关系</span>
          <span class="flex1"></span>
          ${SOCIAL.communities.map(c => `<span class="tag" style="background:${c.color}1a;color:${c.color}">${c.name}</span>`).join(' ')}
        </div>
        <div class="card-b" style="padding:8px">
          <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block">
            <rect x="0" y="0" width="${W}" height="${H}" fill="#fbfcfd" rx="8"></rect>
            ${edges.map(([a, b]) => {
              const A = pos[a], B = pos[b];
              const brand = b === 'A17' || a === 'A17';
              return `<line x1="${A.x.toFixed(1)}" y1="${A.y.toFixed(1)}" x2="${B.x.toFixed(1)}" y2="${B.y.toFixed(1)}"
                stroke="${brand ? '#f97316' : '#d3d9e1'}" stroke-width="${brand ? 1.1 : .8}" ${brand ? 'stroke-dasharray="3 3"' : ''} opacity="${brand ? .55 : .8}"></line>`;
            }).join('')}
            ${SOCIAL.communities.map(c => {
              const h = pos['C:' + c.id];
              return `<g><circle cx="${h.x}" cy="${h.y}" r="54" fill="${c.color}08" stroke="${c.color}33" stroke-dasharray="2 4"></circle>
                <text x="${h.x}" y="${h.y - 58}" text-anchor="middle" font-size="10" fill="${c.color}" font-weight="700">${c.name} · ${c.langs}</text></g>`;
            }).join('')}
            ${P.map(p => {
              const q = pos[p.id]; if (!q) return '';
              const r = rOf(p.followers);
              const c = p.id === 'A17' ? '#c2410c' : (SOCIAL.communities.find(x => x.id === p.community) || {}).color || '#666';
              return `<g data-act="persona" data-id="${p.id}" style="cursor:pointer">
                <circle cx="${q.x}" cy="${q.y}" r="${r + 3}" fill="#fff"></circle>
                <circle cx="${q.x}" cy="${q.y}" r="${r}" fill="${c}" opacity="${p.id === 'A17' ? .95 : .82}"></circle>
                ${p.intent >= 85 ? `<circle cx="${q.x}" cy="${q.y}" r="${r + 6}" fill="none" stroke="${c}" stroke-width="1" opacity=".45"></circle>` : ''}
                <text x="${q.x}" y="${q.y + r + 10}" text-anchor="middle" font-size="8.5" fill="#5a6472">${esc(p.handle)}</text>
              </g>`;
            }).join('')}
            <text x="${W - 10}" y="${H - 10}" text-anchor="end" font-size="9" fill="#98a1af">圆大小=粉丝量 · 外圈=高意向(≥85) · 橙色虚线=关注品牌号</text>
          </svg>
        </div>
      </div>
      <div class="card">
        <div class="card-h"><h3>按意向度排序</h3><span class="sub">先打谁，一目了然</span></div>
        <div class="card-b" style="padding:6px 10px;max-height:620px;overflow:auto">
          ${ranked.map(p => `<div style="display:flex;gap:9px;align-items:center;padding:8px 4px;border-bottom:1px solid var(--line-2);cursor:pointer" data-act="persona" data-id="${p.id}">
            <div style="width:26px;height:26px;border-radius:50%;background:${(SOCIAL.communities.find(c => c.id === p.community) || {}).color}1a;color:${(SOCIAL.communities.find(c => c.id === p.community) || {}).color};display:grid;place-items:center;font-size:11px;font-weight:700;flex:none">${esc(p.name.slice(0, 1).toUpperCase())}</div>
            <div style="min-width:0;flex:1">
              <div class="b small" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.name)}</div>
              <div class="tiny muted">${esc(p.platform)} · ${esc(p.country)} · ${(p.followers / 1000).toFixed(1)}k 粉</div>
            </div>
            <div style="text-align:right">
              <div class="mono b ${p.intent >= 75 ? 'c-hi' : p.intent >= 55 ? 'c-mid' : 'c-lo'}" style="font-size:13px">${p.intent}</div>
              <div class="tiny muted">${esc(p.type)}</div>
            </div>
          </div>`).join('')}
        </div>
      </div>
    </div>`;
  }

  function openPersona(id) {
    const p = SOCIAL.personas.find(x => x.id === id); if (!p) return;
    const c = SOCIAL.communities.find(x => x.id === p.community) || {};
    const fans = SOCIAL.edges.filter(e => e[1] === id).map(e => SOCIAL.personas.find(x => x.id === e[0])).filter(Boolean);
    const following = SOCIAL.edges.filter(e => e[0] === id).map(e => SOCIAL.personas.find(x => x.id === e[1])).filter(Boolean);
    const m = p.tags.length ? E.match(p.tags.join(' ')) : null;
    const skus = (p.tags || []).map(t => {
      const v = D.vehicles.find(v => (v.model + ' ' + v.alias.join(' ')).toUpperCase().includes(t.toUpperCase()));
      if (!v) return null;
      const f = (E.fitsByV.get(v.id) || [])[0];
      return f ? { v: v.model, code: f.code, pid: f.pid } : null;
    }).filter(Boolean);
    drawer(`<div><div style="font-size:16px;font-weight:750">${esc(p.name)}</div>
      <div class="tiny muted">${esc(p.handle)} · ${esc(p.platform)} · ${esc(p.country)} · ${esc(p.lang)}</div></div>`,
      `<div class="row wrap-gap" style="gap:8px;margin-bottom:10px">
        ${tag(p.type, 'b')}${tag(c.name || '', 'n')}
        <span class="flex1"></span><span class="muted small">意向度</span><b class="mono" style="font-size:20px">${p.intent}</b>
      </div>
      <div class="grid" style="grid-template-columns:repeat(4,1fr);gap:8px">
        <div class="card" style="padding:8px 10px;box-shadow:none"><div class="tiny muted">粉丝</div><div class="b">${(p.followers / 1000).toFixed(1)}k</div></div>
        <div class="card" style="padding:8px 10px;box-shadow:none"><div class="tiny muted">关注</div><div class="b">${p.following}</div></div>
        <div class="card" style="padding:8px 10px;box-shadow:none"><div class="tiny muted">作品</div><div class="b">${p.posts}</div></div>
        <div class="card" style="padding:8px 10px;box-shadow:none"><div class="tiny muted">互动率</div><div class="b">${p.engage}%</div></div>
      </div>
      <div class="sec-t">画像标签</div>
      <div class="row wrap-gap" style="gap:6px">${(p.tags.length ? p.tags : ['无明确款式系列']).map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div>
      <div class="notice mt-s">${esc(p.note)}</div>
      <div class="sec-t">关系网（粉丝 / 关注）</div>
      <div class="small muted">粉丝：${fans.length ? fans.map(f => esc(f.handle)).join('、') : '—'}</div>
      <div class="small muted mt-s">关注：${following.length ? following.map(f => esc(f.handle)).join('、') : '—'}</div>
      ${skus.length ? `<div class="sec-t">提到款式系列 → 可推款号</div>
        <table style="font-size:12px"><thead><tr><th>款式系列</th><th>款号</th><th>报价</th><th></th></tr></thead><tbody>
        ${skus.map(s => `<tr><td>${esc(s.v)}</td><td class="mono b">${esc(s.code)}</td><td class="mono">$${money(E.priceOf(s.pid, 100, customer()))}</td>
          <td><button class="btn xs" data-act="addCart" data-id="${s.pid}">加入</button></td></tr>`).join('')}
        </tbody></table>` : ''}
      <div class="sec-t">推荐动作</div>
      <div class="notice warn">${esc(p.action)}</div>`,
      `<button class="btn" data-act="dmPersona" data-id="${p.id}">生成私信</button>
       <button class="btn primary" data-act="addCart" data-id="${(skus[0] || {}).pid || 'P135'}">加入报价</button>`);
  }

  /* ================= 获客内容 ================= */
  function vContent() {
    const V = SOCIAL.videos;
    const cfg = S.content;
    const pr = E.byId.get(cfg.pid);
    const sc = S.script;
    const plats = [...new Set(V.map(v => v.platform))];
    $('#p-content').innerHTML = `
    <div class="row wrap-gap" style="justify-content:space-between;margin-bottom:12px">
      <div><h1 style="margin:0">${T('ct.title')}</h1>
        <div class="muted small">${T('ct.sub')}</div></div>
      <div class="row"><span class="tag o">演示数据</span><span class="tag n">接平台 API 后实时刷新</span></div>
    </div>
    <div class="kpis mb">
      <div class="kpi"><div class="n">${V.length}</div><div class="l">热门选题（近 7 天）</div><div class="d">${plats.length} 个平台 · ${new Set(V.map(v => v.lang)).size} 种语言</div></div>
      <div class="kpi"><div class="n">${(V.reduce((s, v) => s + v.views, 0) / 1e6).toFixed(1)}M</div><div class="l">合计播放</div><div class="d">选题侧需求已被验证</div></div>
      <div class="kpi"><div class="n">${V.filter(v => v.model).length}</div><div class="l">可直接挂款号</div><div class="d">选题 → SKU 一对多</div></div>
      <div class="kpi"><div class="n">7</div><div class="l">覆盖语种</div><div class="d">ES/PT/AR/EN/ID/VI/TR</div></div>
    </div>
    <div class="split" style="grid-template-columns:1.3fr 1fr">
      <div class="card">
        <div class="card-h"><h3>热门视频雷达</h3><span class="sub">按语种扒取，判断「那条片子为什么火」</span></div>
        <div class="card-b" style="padding:0;max-height:520px;overflow:auto">
          <table><thead><tr><th>平台 / 语种</th><th>选题</th><th class="right">播放</th><th class="right">互动</th><th>关联款号</th><th></th></tr></thead><tbody>
          ${V.map(v => `<tr>
            <td class="small"><b>${esc(v.platform)}</b><div class="tiny muted">${esc(v.lang)} · ${esc(v.country)}</div></td>
            <td class="small" style="max-width:250px">${esc(v.title)}<div class="tiny muted">${esc(v.angle)} · 趋势 ${esc(v.trend)}</div></td>
            <td class="right mono small">${(v.views / 1000).toFixed(0)}k</td>
            <td class="right small">${((v.likes + v.comments) / v.views * 100).toFixed(1)}%</td>
            <td class="mono tiny">${esc(v.model)}</td>
            <td><button class="btn xs" data-act="useTopic" data-id="${v.id}">用此选题</button></td>
          </tr>`).join('')}
          </tbody></table>
        </div>
      </div>
      <div class="card">
        <div class="card-h"><h3>脚本生成器</h3><span class="sub">中文分镜 + 本地语言口播</span></div>
        <div class="card-b">
          <div class="grid" style="grid-template-columns:1fr 1fr;gap:8px">
            <div class="field"><label>产品</label><select id="cPid">${D.products.filter(p => (p.appsAll || []).length).slice(0, 60).map(p => `<option value="${p.id}" ${cfg.pid === p.id ? 'selected' : ''}>${esc(p.code)} · ${esc(pCat(p))}</option>`).join('')}</select></div>
            <div class="field"><label>市场</label><input id="cMarket" value="${esc(cfg.market)}"></div>
            <div class="field"><label>语种</label><select id="cLang">${Object.entries(SOCIAL.LANG).map(([k, v]) => `<option value="${k}" ${cfg.lang === k ? 'selected' : ''}>${v.name}</option>`).join('')}</select></div>
            <div class="field"><label>平台</label><select id="cPlat">${['TikTok', 'Instagram', 'YouTube', 'Facebook'].map(x => `<option ${cfg.platform === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
            <div class="field"><label>时长（秒）</label><input id="cSec" type="number" value="${cfg.seconds}"></div>
            <div class="field"><label>核心痛点</label><input id="cPain" value="${esc(cfg.pain)}"></div>
          </div>
          <div class="row mt-s"><button class="btn primary" data-act="genScript">${T('ct.gen')}</button>
            <button class="btn" data-act="copyPrompt">复制 AI 提示词</button></div>
          <div class="tiny muted mt-s">生成的是「可拍的分镜稿 + 可配音的口播 + 一段 AI 提示词」，不是空泛文案；提示词下方可一键跳 Kling AI 出片。</div>
        </div>
      </div>
    </div>
    <div id="scriptOut" class="mt">${sc ? renderScript(sc) : ''}</div>`;
    ['cPid', 'cMarket', 'cLang', 'cPlat', 'cSec', 'cPain'].forEach(id => {
      const n = $('#' + id); if (!n) return;
      n.onchange = n.oninput = () => {
        S.content = { pid: $('#cPid').value, market: $('#cMarket').value, lang: $('#cLang').value, platform: $('#cPlat').value, seconds: Number($('#cSec').value) || 30, pain: $('#cPain').value };
      };
    });
  }
  function renderScript(sc) {
    return `<div class="card" style="border-color:#f6c9a8">
      <div class="card-h"><h3>${esc(sc.title)}</h3><span class="flex1"></span>
        <button class="btn sm" data-act="copyScript">复制全文</button>
        <button class="btn sm primary" data-act="copyPrompt">复制提示词</button></div>
      <div class="card-b">
        <div class="split" style="grid-template-columns:1fr 1fr">
          <div>
            <div class="sec-t" style="margin-top:0">分镜（${sc.board.length} 镜）</div>
            <div class="small" style="line-height:1.9">${sc.board.map(b => `<div style="padding:5px 0;border-bottom:1px dashed var(--line-2)">${esc(b)}</div>`).join('')}</div>
            <div class="sec-t">拍摄清单</div>
            <div class="row wrap-gap" style="gap:5px">${sc.shots.map(s => `<span class="chip">${esc(s)}</span>`).join('')}</div>
          </div>
          <div>
            <div class="sec-t" style="margin-top:0">口播 / 字幕</div>
            <div style="background:var(--panel-2);border:1px solid var(--line);border-radius:8px;padding:10px;font-size:12.5px;white-space:pre-wrap;line-height:1.7">${esc(sc.voice)}</div>
            <div class="sec-t">话题标签</div>
            <div class="row wrap-gap" style="gap:5px">${sc.tags.map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div>
          </div>
        </div>
        <div class="sec-t">AI 提示词<span class="tiny muted" style="font-weight:400;margin-left:8px">复制后粘到 Kling / 任意大模型，直接出片</span></div>
        <div id="promptBox" style="background:var(--panel-2);border:1px solid var(--line);border-radius:8px;padding:10px;font-size:12.5px;line-height:1.75;white-space:pre-wrap;max-height:160px;overflow:auto">${esc(sc.prompt)}</div>
        <div class="row wrap-gap mt-s">
          <button class="btn sm" data-act="copyPrompt">复制提示词</button>
          <a class="btn sm primary" id="klingGo" href="https://kling.ai/" target="_blank" rel="noopener noreferrer"
             title="${esc(LZ('在 Kling AI 新窗口打开，粘贴提示词出片', 'Open Kling AI, paste the prompt, generate the video'))}">${LZ('去 Kling AI 生成视频', 'Generate video on Kling AI')}<span aria-hidden="true" style="opacity:.75;font-size:11px">↗</span></a>
          <span class="tiny muted">先「复制提示词」，到 Kling 粘贴即可（视频按这个脚本出）</span>
        </div>
      </div>
    </div>`;
  }

  /* ================= 产品详情 ================= */
  function openProduct(pid) {
    const p = E.byId.get(pid); if (!p) return;
    A.track('view', { code: p.code, pid: p.id });
    const mat = D.materials.find(m => m.id === p.material) || D.materials[0];
    const codes = D.codes.filter(c => c.pid === p.id);
    const fits = E.fitsByP.get(p.id) || [];
    const ts = E.testsByP.get(p.id) || [];
    const c = customer();
    drawer(`<div><div style="font-size:16px;font-weight:750">${esc(p.code)}</div>
      <div class="tiny muted">${esc(p.sku)} · ${esc(pCat(p))} · ${esc(p.brand)}</div></div>`,
      `<div class="split" style="grid-template-columns:200px 1fr">
        <div>
          <div class="imgbox">${p.img ? `<img src="${esc(p.img)}">` : ''}</div>
          <div class="tiny muted mt-s">${LZ('图片来源：程序生成', 'Image: official product page')}</div>
        </div>
        <div>
          <dl class="kv">
            <dt>${LZ('中文名', 'Chinese name')}</dt><dd>${esc(p.nameZh || '')}</dd>
            <dt>${LZ('英文名', 'English name')}</dt><dd>${esc(p.nameEn)}</dd>
            <dt>${LZ('常用款式系列', 'Common series')}</dt><dd>${(p.appsAll || []).length ? esc(appsJoin(appsOf(p))) : LZ('待补', 'TBD')}</dd>
            <dt>${LZ('尺码', 'Size')}</dt><dd>${esc(p.dim || LZ('待补', 'TBD'))}${p.holes ? ` · ${p.holes} ${LZ('克重', 'gsm')}` : ''}</dd>
            <dt>${LZ('面料', 'Material')}</dt><dd>${esc(mName(mat))} · 克重 ${esc(mat.mu)} / 洗水 ${esc(mat.temp)}</dd>
            <dt>${LZ('版型', 'Fit')}</dt><dd>${esc(p.pos || LZ('按款式', 'by style'))}</dd>
            <dt>${LZ('包装', 'Packing')}</dt><dd>${esc(packText(p.pack.per))} · ${LZ('毛重', 'GW')} ${p.pack.gw} kg · ${p.pack.cbm} CBM</dd>
            <dt>MOQ</dt><dd>${p.moq}</dd>
            <dt>HS</dt><dd>${esc(p.hs)}</dd>
            <dt>${LZ('参考价', 'Price')}</dt><dd><b>$${money(p.price)}</b> ${LZ('基准', 'base')} · ${LZ('100 件报价', 'at 100 pcs')} $${money(E.priceOf(p.id, 100, c))}</dd>
          </dl>
          <div class="mt-s small muted">${esc(p.desc.slice(0, 300))}…</div>
        </div>
      </div>
      <div class="sec-t">${LZ('编号对照', 'Cross reference')}（${codes.length}）</div>
      <table style="font-size:12px"><thead><tr><th>${LZ('编号', 'Code')}</th><th>${LZ('类型', 'Type')}</th><th>${LZ('来源', 'Source')}</th><th>${LZ('置信度', 'Confidence')}</th></tr></thead><tbody>
      ${codes.map(x => `<tr><td class="mono">${esc(x.code)}</td><td>${esc(E.typeLabel(x.type))}</td><td class="tiny muted">${esc(srcI18n(x.source))}</td><td>${confTag(x.conf)}</td></tr>`).join('')}
      </tbody></table>
      <div class="sec-t">${LZ('常用款式系列', 'Common series')} · ${LZ('按点赞量排序', 'by popularity')}（${fits.length} ${LZ('条适穿', 'fits')}）</div>
      <div class="row wrap-gap" style="gap:6px;margin-bottom:6px">${relatedChips(p)}</div>
      ${heatTable(p)}
      ${otherModels(p).length ? `<div class="row wrap-gap" style="gap:6px;margin-top:8px;align-items:center">
        <span class="tiny muted">${LZ('同款式系列其他款号', 'Same series, other codes')}：</span>
        ${otherModels(p).slice(0, 8).map(([code, pid]) => `<span class="chip" data-act="openProduct" data-id="${pid}">${esc(code)}</span>`).join('')}
      </div>` : ''}
      <div class="sec-t">${LZ('质检报告', 'QC reports')}（${ts.length}）</div>
      ${ts.length ? `<table style="font-size:12px"><thead><tr><th>${LZ('标准', 'Standard')}</th><th>${LZ('项目', 'Item')}</th><th>${LZ('结果', 'Result')}</th><th>${LZ('报告号', 'Report No.')}</th></tr></thead><tbody>
      ${ts.map(t => `<tr><td>${esc(t.std)}</td><td>${esc(t.item)}</td><td>${esc(t.result)}</td><td class="tiny">${esc(t.no)}<div class="muted">${esc(t.lab)}</div></td></tr>`).join('')}
      </tbody></table>` : `<div class="muted small">${LZ('暂无质检报告。', 'No QC report yet.')}</div>`}`,
      `<button class="btn" data-act="detailPack" data-id="${p.id}">${LZ('生成资料页', 'Data sheet')}</button>
       <button class="btn" data-act="askPrice" data-id="${p.id}">${LZ('询价', 'Ask price')}</button>
       <button class="btn primary" data-act="addCart" data-id="${p.id}">${LZ('加入报价', 'Add to quote')}</button>`);
  }

  /* ================= 线索详情 ================= */
  function openLead(id) {
    const l = S.leads.find(x => x.id === id); if (!l) return;
    const sc = E.scoreLead(l), t = E.localTime(l.tz);
    const m = E.match(l.needZh || l.need);
    drawer(`<div><div style="font-size:16px;font-weight:750">${esc(l.company)}</div>
      <div class="tiny muted">${esc(l.id)} · ${esc(l.country)} · ${esc(l.src)} · ${esc((l.created || '').slice(0, 16))}</div></div>`,
      `<div class="row wrap-gap" style="gap:8px;margin-bottom:10px">
        ${tag(sc.tier.l, sc.tier.c)}${tag(sc.trading ? '贸易商特征' : sc.terminal ? '终端特征' : '待甄别', sc.trading ? 'n' : 'g')}
        ${tag('当地时间 ' + t.text, t.working ? 'g' : 'n')}
        <span class="flex1"></span><b class="mono" style="font-size:20px">${sc.score}</b>
      </div>
      <div class="sec-t">原始询盘</div>
      <div style="background:var(--panel-2);border:1px solid var(--line);border-radius:8px;padding:10px;font-size:13px">${esc(l.need)}</div>
      <div class="tiny muted mt-s">中文摘要：${esc(l.needZh || '—')}</div>
      <div class="sec-t">评分依据</div>
      <ul class="list-none small">${sc.reasons.map(r => `<li style="padding:2px 0">· ${esc(r)}</li>`).join('')}</ul>
      <div class="sec-t">自动匹配（依据询盘原文）</div>
      ${m.top ? `<div class="result best" style="margin:0">
        <div class="res-h"><div class="res-img">${m.top.product.img ? `<img src="${esc(m.top.product.img)}">` : ''}</div>
        <div class="res-main"><div class="res-title">${esc(m.top.product.code)} ${tag(Math.round(m.top.score) + ' 分', 'o')}</div>
        <div class="muted small">${esc(m.top.product.nameEn.slice(0, 70))}</div>
        <div class="reasons">${m.top.reasons.map(r => `<div class="reason"><i>✓</i><span>${r}</span></div>`).join('')}</div></div></div>
        ${m.questions.length ? `<div class="qbox" style="margin:0 16px 12px"><div class="t">需确认</div><ul>${m.questions.slice(0, 2).map(q => `<li>${q}</li>`).join('')}</ul></div>` : ''}
      </div>` : '<div class="muted small">原文中没有可识别的款式系列/尺码段/编号，建议用「三步定位法」索要照片。</div>'}
      <div class="sec-t">跟进</div>
      <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px">
        <div class="field"><label>状态</label><select id="lStatus">${['待跟进', '待甄别', '已报价', '已成交', '已放弃'].map(s => `<option ${l.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
        <div class="field"><label>下次动作</label><input id="lNext" value="${esc(l.next || '')}"></div>
      </div>
      <div class="row wrap-gap mt-s">
        <button class="btn sm" data-act="replyLead" data-id="${l.id}">生成回复</button>
        <button class="btn sm" data-act="leadToCart" data-id="${l.id}">加入报价</button>
        <button class="btn sm" data-act="saveLead" data-id="${l.id}">保存</button>
      </div>`,
      `<button class="btn" data-act="closeDrawer">关闭</button>`);
  }

  /* ================= 聊天浮窗（消息监听 + 款号提醒） ================= */
  function chatTime() { return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }); }

  function pushChat(silent) {
    if (S.chat.idx >= SOCIAL.chatQueue.length) { toast(CT('queueEnd')); return; }
    const m = SOCIAL.chatQueue[S.chat.idx++];
    const match = E.match(m.text + ' ' + (m.zh || ''));
    const item = { ...m, time: chatTime(), match };
    S.chat.msgs.push(item);
    if (!silent && match.top && S.chat.auto && A.isStaff()) showAlert(item);
    renderChat();
  }

  function showAlert(item) {
    const p = item.match.top.product;
    const box = $('#chatAlert');
    box.innerHTML = `<div class="ca-h"><span class="dot"></span> ${CT('alertTitle')}</div>
      <div class="ca-b"><b>${esc(item.from.split('（')[0])}</b> ${CT('alertAsks')} ${esc(item.match.entities.find(e => e.k === '款式系列' || e.k === 'series')?.v || item.match.entities.find(e => e.k === '尺码段' || e.k === 'size band')?.v || CT('matchedLabel'))}
        <div class="ca-p">→ <b class="mono">${esc(p.code)}</b> · $${money(E.priceOf(p.id, 100, customer()))}${CT('perSet')} · ${esc(p.dim || CT('specPending'))}</div></div>
      <div class="row" style="gap:6px;margin-top:6px"><button class="btn xs primary" data-act="chatAlertGo" data-id="${p.id}">${CT('alertOpen')}</button>
        <button class="btn xs" data-act="chatToggle">${CT('alertOpenSupport')}</button></div>`;
    box.classList.add('on');
    clearTimeout(showAlert._t);
    showAlert._t = setTimeout(() => box.classList.remove('on'), 9000);
    $('#chatBadge').textContent = S.chat.msgs.filter(m => m.match && m.match.top).length;
    $('#chatBadge').style.display = 'inline-block';
  }


  /** 客户端客服：本地规则回答（不联网），能识别款号就报款号和价 */
  function csSay(raw) {
    const text = String(raw || '').trim();
    if (!text) return;
    const zh = I.getLang() === 'zh';
    const t = () => chatTime();
    if (!Array.isArray(S.custMsgs)) S.custMsgs = [];
    /* 记上是谁问的：员工端「待跟进客户」靠 uid 认出这个客户问过价 */
    const _cu = A.me();
    S.custMsgs.push({ from: 'me', text, time: t(), t: Date.now(), uid: (_cu && _cu.role === 'customer') ? _cu.id : '' });

    const m = E.match(text);
    const top = m && m.top;
    const btn = (act, id, label, cls) => `<button class="btn xs ${cls || ''}" data-act="${act}"${id ? ` data-id="${id}"` : ''}>${label}</button>`;

    if (top && top.score >= 55) {
      const p = top.product;
      S.custMsgs.push({
        from: 'bot', time: t(),
        text: CT('replyMatch'),
        card: {
          id: p.id, code: p.code, score: top.score,
          name: pName(p), dim: p.dim,
          price: '$' + money(E.priceOf(p.id, 100, customer())) + CT('perSet')
        }
      });
    } else if (/价|多少钱|报价|price|cost|quote|precio|preço|preco|سعر|цена|harga|giá|ราคา|fiyat|fiyatı/i.test(text)) {
      S.custMsgs.push({
        from: 'bot', time: t(),
        text: CT('replyPrice'),
        acts: btn('askPrice', '', CT('sendInquiry'), 'primary') + btn('tab', 'select', CT('matchFirst'))
      });
    } else if (/现货|库存|交期|多久|发货|stock|lead ?time|delivery|existencia|estoque|disponib|متوفر|наличи|stok|kho|สต็อก/i.test(text)) {
      S.custMsgs.push({
        from: 'bot', time: t(),
        text: CT('replyStock'),
        acts: btn('tab', 'products', CT('viewCatalog'))
      });
    } else {
      S.custMsgs.push({
        from: 'bot', time: t(),
        text: CT('replyFallback'),
        acts: btn('tab', 'select', CT('smartMatch'), 'primary') + btn('askPrice', '', CT('sendInquiry'))
      });
    }
    save();
    renderChat();
    const inp = $('#csInput');
    if (inp) { inp.value = ''; inp.focus(); }
  }

  function renderChat() {
    const zh = I.getLang() === 'zh';
    const msgs = S.chat.msgs;
    const staff = A.isStaff();
    const panel = $('#chatPanel');
    panel.classList.toggle('on', S.chat.open);
    panel.classList.toggle('cust-mode', !staff);
    $('#chatFab').classList.toggle('on', S.chat.open);

    /* 外壳文字：10 种语言 */
    const fab = document.querySelector('#chatFab .fab-txt');
    if (fab) fab.textContent = CT('support');
    const title = $('#chatTitle');
    if (title) title.textContent = CT('support');
    const live = $('#chatLive');
    if (live) live.innerHTML = '<i></i> ' + CT('listening');
    const hbtn = $('#chatHistTxt');
    if (hbtn) hbtn.textContent = CT('history');
    const onl = $('#chatOnline');
    if (onl) onl.innerHTML = '<i></i> ' + CT('online').split('·')[0].trim();
    const chans = $('#chatChans');
    if (chans) { const d = chans.querySelector('.tiny'); if (d) d.textContent = CT('demoReplay'); }
    const ci = $('#csInput');
    if (ci) ci.placeholder = CT('placeholder');
    const sb = document.querySelector('[data-act="csSend"]');
    if (sb) sb.textContent = CT('send');
    const nb = document.querySelector('[data-act="chatNext"]');
    if (nb) nb.textContent = CT('simulate');
    const ab = $('#chatAutoBtn');
    if (ab) ab.textContent = S.chat.auto ? CT('autoOn') : CT('autoOff');
    const cb = document.querySelector('[data-act="chatClear"]');
    if (cb) cb.textContent = CT('clear');

    /* ---- 客户端：问答式客服 ---- */
    if (!staff) {
      $('#chatStat').textContent = CT('online');
      if (!Array.isArray(S.custMsgs)) S.custMsgs = [];
      const msgsC = S.custMsgs;
      const bubbles = msgsC.map(m => {
        const card = m.card ? `<div class="cs-card">
            <div class="cs-c-h"><b class="mono">${esc(m.card.code)}</b><span class="tag g">${Math.round(m.card.score)} ${CT('pts')}</span></div>
            <div class="tiny muted">${esc(m.card.name)} · ${esc(m.card.dim || CT('specPending'))} · ${m.card.price}</div>
            <div class="row" style="gap:6px;margin-top:6px">
              <button class="btn xs primary" data-act="chatAdd" data-id="${m.card.id}">${CT('addQuote')}</button>
              <button class="btn xs" data-act="openProduct" data-id="${m.card.id}">${CT('details')}</button>
            </div>
          </div>` : '';
        const acts = m.acts ? `<div class="row wrap-gap" style="margin-top:6px">${m.acts}</div>` : '';
        return `<div class="cs-msg ${m.from === 'me' ? 'me' : 'bot'}">
          <div class="cs-b">${esc(m.text)}</div>${card}${acts}
          <div class="cs-t">${esc(m.time)}</div>
        </div>`;
      }).join('');
      const greet = msgsC.length ? '' : `<div class="cs-greet">
          <div class="cs-hi">${CT('greetHi')}</div>
          <div class="tiny muted" style="margin-top:4px">${CT('greetSub')}</div>
          <div class="row wrap-gap" style="margin-top:10px">
            <button class="btn xs" data-act="csQuick" data-id="${esc(CT('q1query'))}">${CT('q1label')}</button>
            <button class="btn xs" data-act="csQuick" data-id="${esc(CT('q2query'))}">${CT('q2label')}</button>
          </div>
        </div>`;
      $('#chatBody').innerHTML = `${greet}<div class="cs-thread" id="csThread">${bubbles}</div>`;
      const comp = $('#csCompose');
      if (comp) comp.hidden = false;
      const th = $('#csThread');
      if (th) th.scrollTop = th.scrollHeight;
      return;
    }

    /* ---- 员工端：聊天雷达 ---- */
    { const c = $('#csCompose'); if (c) c.hidden = true; }
    $('#chatStat').textContent = `${msgs.length} ${CT('staffMsgs')} · ${msgs.filter(m => m.match && m.match.top).length} ${CT('staffMatched')}`;
    $('#chatBody').innerHTML = msgs.length ? msgs.slice().reverse().map((m, i) => {
      const hit = m.match && m.match.top;
      const p = hit ? m.match.top.product : null;
      return `<div class="chat-msg">
        <div class="cm-h"><span class="tag b">${esc(m.ch)}</span><b>${esc(m.from)}</b><span class="flex1"></span><span class="tiny muted">${esc(m.time)}</span></div>
        <div class="cm-t">${esc(m.text)}</div>
        ${m.zh ? `<div class="tiny muted">${CT('chinese')}：${esc(m.zh)}</div>` : ''}
        ${hit ? `<div class="chat-suggest">
          <div class="cs-h">${CT('matchedLabel')}：<b class="mono">${esc(p.code)}</b> <span class="tag ${m.match.top.score >= 80 ? 'g' : 'y'}">${Math.round(m.match.top.score)} ${CT('pts')}</span></div>
          <div class="tiny muted">${esc(pName(p))} · ${esc(p.dim || CT('specPending'))} · ${esc(pCat(p))}</div>
          <div class="row" style="gap:6px;margin-top:5px">
            <button class="btn xs primary" data-act="chatAdd" data-id="${p.id}">${CT('addQuote')}</button>
            <button class="btn xs" data-act="chatReply" data-id="${p.id}">${CT('copyReply')}</button>
            <button class="btn xs" data-act="openProduct" data-id="${p.id}">${CT('details')}</button>
          </div>
        </div>` : `<div class="chat-miss">${CT('noMatchText')}
          <div style="margin-top:4px"><button class="btn xs" data-act="chatAskPhoto">${CT('copyPhotoScript')}</button></div></div>`}
      </div>`;
    }).join('') : `<div class="empty" style="padding:30px 12px"><div class="ic">💬</div>${CT('emptyHint')}</div>`;
  }

  /* ================= 获客（搜索 + 内容 同一入口） ================= */
  function acquireBar(active) {
    const b = (k, txt) => `<button class="btn sm ${active === k ? 'primary' : ''}" data-act="tab" data-id="${k}">${txt}</button>`;
    return `<div class="acq-bar">
      <span class="acq-lab">${LZ('获客', 'Acquire')}</span>
      ${b('network', LZ('用户画像', 'Profiles'))}${b('search', LZ('客户搜索', 'Find buyers'))}${b('content', LZ('获客内容', 'Content studio'))}
      <span class="acq-hint">${LZ('一个入口：先看画像 → 再找客户 → 再做内容', 'One entry: profiles → find buyers → make content')}</span>
    </div>`;
  }

  /* ================= 客户搜索 / 编号对照 ================= */
  function vSearch() {
    const box = $('#p-search');
    box.innerHTML = acquireBar('search') + window.SEARCHX.html({ esc, LZ, T });
    const doc = document;
    ['sqMarket', 'sqProd', 'sqType', 'sqNarrow'].forEach(id => {
      const el = doc.getElementById(id);
      if (el) el.onchange = () => { window.SEARCHX.readForm(doc); vSearch(); };
    });
    const ex = doc.getElementById('sqExcl');
    if (ex) ex.onchange = () => { window.SEARCHX.readForm(doc); vSearch(); };
    const xq = doc.getElementById('xrefQ');
    if (xq) xq.onkeydown = e => { if (e.key === 'Enter') ACT.xrefGo(); };
    const inp = doc.getElementById('xrefQ');
    if (inp) inp.onkeydown = e => { if (e.key === 'Enter') ACT.xrefGo(); };
  }
  /* ---- 成交台账 / 业绩总览 ---- */
  function dealCtx() {
    return {
      list: S.deals || [], esc, LZ, me: A.me(), isBoss: A.isBoss(),
      customers: A.customers(), custMsgs: S.custMsgs || [],
      fuMute: S.fuMute || {}, fuFlags: S.fuFlags || {}, fuNotes: S.fuNotes || {},
      fuFilter: S.fuFilter || 'all',
      flags: S.fuFlags || {}, notes: S.fuNotes || {},
      codes: D.products.map(p => p.code)
    };
  }
  function vDeals() {
    $('#p-deals').innerHTML = window.DEALS.htmlDeals(dealCtx());
    const q = id => { const el = $('#' + id); return el ? el.value : ''; };
    const priceOf = code => {
      const p = D.products.find(x => x.code === String(code || '').trim());
      return p ? p.price : '';
    };
    const sync = () => {
      const qty = Number(q('dQty')) || 0, pr = Number(q('dPrice')) || 0;
      const amt = Math.round(qty * pr * 100) / 100;
      const el = $('#dAmount'); if (el && amt) el.value = amt;
    };
    const bind = (id, ev, fn) => { const node = $('#' + id); if (node) node[ev] = fn; };
    bind('dCode', 'onchange', () => { const pr = priceOf(q('dCode')); const el = $('#dPrice'); if (el && pr) { el.value = pr; sync(); } });
    bind('dQty', 'oninput', sync);
    bind('dPrice', 'oninput', sync);
  }
  function vBoss() {
    const ctx = dealCtx();
    /* 老板看得到全部：待跟进客户全表（只读）+ 员工跟进汇总 */
    $('#p-boss').innerHTML = window.DEALS.htmlBoss(ctx) +
      (window.DEALS.htmlFollowups ? '<div class="boss-fu-wrap">' + window.DEALS.htmlFollowups(ctx) + '</div>' : '') +
      (window.DEALS.htmlFollowupBoss ? window.DEALS.htmlFollowupBoss(ctx) : '');
    /* 老板端是只读的：小旗不能点、备注和登记按钮去掉；筛选和查看截图保留 */
    document.querySelectorAll('#p-boss .fu-flag[data-act]').forEach(el => {
      el.removeAttribute('data-act');
      el.style.cursor = 'default';
      el.title = LZ('员工标的紧急度（老板只读）', 'Staff-set urgency (read-only)');
    });
    ['fuNote', 'fuDeal', 'fuContact'].forEach(a => {
      document.querySelectorAll('#p-boss [data-act="' + a + '"]').forEach(el => el.remove());
    });
  }

  /** 只重绘「待跟进客户」卡片，不整页刷新（保住滚动位置和输入焦点） */
  function renderFollowupsInPlace() {
    /* 老板端整页由 vBoss 统一渲染（含只读处理），直接重跑它 */
    if (S.tab === 'boss') { vBoss(); return; }
    const card = document.querySelector('.fu-card');
    if (!card) { render(); return; }
    const html = window.DEALS.htmlFollowups(dealCtx());
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const fresh = tmp.firstElementChild;
    if (fresh) card.replaceWith(fresh);
  }

  function vRedfox() {
    const box = $('#p-redfox');
    box.innerHTML = window.REDFOX.html({ esc, LZ, T });
    window.REDFOX.sync(() => vRedfox());   // Key 状态由服务端提供，拿到后重绘一次
  }

  /* ================= 工具书：税务查询 / 款号查询 / 货币兑换 ================= */
  const L = (zh, en) => LZ(zh, en);

  /** 常用市场税率（童装 HS 6104.42 / 6110.20；仅作报价参考，正式报关以当地税则为准） */
  const TAX_MK = [
    { k: 'US', n: '美国', en: 'United States', duty: 2.5, vat: 0, vatName: 'Sales tax', vatZh: '销售税（州级另计）', note: '301 条款加征 25% 需另算', noteEn: 'Section 301 adds 25% on top' },
    { k: 'DE', n: '德国', en: 'Germany', duty: 4.5, vat: 19, vatName: 'VAT', vatZh: '增值税', note: '欧盟统一税则', noteEn: 'EU common tariff' },
    { k: 'ES', n: '西班牙', en: 'Spain', duty: 4.5, vat: 21, vatName: 'IVA', vatZh: '增值税', note: '欧盟统一税则', noteEn: 'EU common tariff' },
    { k: 'RU', n: '俄罗斯', en: 'Russia', duty: 10, vat: 20, vatName: 'НДС', vatZh: '增值税', note: 'EAEU 统一税则', noteEn: 'EAEU common tariff' },
    { k: 'SA', n: '沙特', en: 'Saudi Arabia', duty: 5, vat: 15, vatName: 'VAT', vatZh: '增值税', note: 'GCC 关税同盟', noteEn: 'GCC customs union' },
    { k: 'AE', n: '阿联酋', en: 'UAE', duty: 5, vat: 5, vatName: 'VAT', vatZh: '增值税', note: 'GCC 关税同盟', noteEn: 'GCC customs union' },
    { k: 'MX', n: '墨西哥', en: 'Mexico', duty: 10, vat: 16, vatName: 'IVA', vatZh: '增值税', note: '无自贸协定加征', noteEn: 'No FTA surcharge' },
    { k: 'BR', n: '巴西', en: 'Brazil', duty: 16, vat: 17, vatName: 'ICMS', vatZh: '州增值税', note: '另有 IPI / PIS / COFINS', noteEn: 'Plus IPI / PIS / COFINS' },
    { k: 'VN', n: '越南', en: 'Vietnam', duty: 20, vat: 10, vatName: 'VAT', vatZh: '增值税', note: 'ACFTA 可凭原产地证降税', noteEn: 'ACFTA cuts duty with a CO' },
    { k: 'TH', n: '泰国', en: 'Thailand', duty: 20, vat: 7, vatName: 'VAT', vatZh: '增值税', note: 'ACFTA 可降税', noteEn: 'ACFTA reduces duty' },
    { k: 'ID', n: '印尼', en: 'Indonesia', duty: 10, vat: 11, vatName: 'PPN', vatZh: '增值税', note: '进口需 SNI 认证', noteEn: 'SNI certification required' },
    { k: 'TR', n: '土耳其', en: 'Turkey', duty: 4.5, vat: 20, vatName: 'KDV', vatZh: '增值税', note: '另有反倾销附加税', noteEn: 'Plus anti-dumping duty' },
    { k: 'EG', n: '埃及', en: 'Egypt', duty: 30, vat: 14, vatName: 'VAT', vatZh: '增值税', note: '需 ACID 预申报', noteEn: 'ACID pre-declaration required' },
    { k: 'ZA', n: '南非', en: 'South Africa', duty: 20, vat: 15, vatName: 'VAT', vatZh: '增值税', note: 'SADC 内可优惠', noteEn: 'SADC preferential rates' },
    { k: 'NG', n: '尼日利亚', en: 'Nigeria', duty: 10, vat: 7.5, vatName: 'VAT', vatZh: '增值税', note: '需 SONCAP 认证', noteEn: 'SONCAP certification required' },
    { k: 'IN', n: '印度', en: 'India', duty: 15, vat: 28, vatName: 'GST', vatZh: '消费税', note: 'BIS 认证强制', noteEn: 'BIS certification mandatory' }
  ];
  const REBATE = 13; // 中国出口退税率（童装 6104 / 6110 类通常 13%）
  const mkName = m => (I.getLang() === 'zh' ? m.n : m.en);

  function vTax() {
    const m = TAX_MK.find(x => x.k === (S.tax.country || 'US')) || TAX_MK[0];
    const val = Number(S.tax.qty) || 0;
    const rebate = val * REBATE / 100;
    const duty = val * m.duty / 100;
    const vat = (val + duty) * m.vat / 100;
    const landed = val + duty + vat;
    const card = (lab, big, sub, cls) =>
      `<div class="rf-kpi"><span>${lab}</span><b class="${cls || ''}">${big}</b><i>${sub}</i></div>`;
    const vatName = I.getLang() === 'zh' ? m.vatZh : m.vatName;

    $('#p-tax').innerHTML = `
    <div class="row wrap-gap" style="justify-content:space-between;margin-bottom:12px">
      <div><h1 style="margin:0">${L('税务查询', 'Duty & tax')}</h1>
      <div class="muted small">${L('选市场 → 看进口关税、增值税和国内出口退税，报价时直接算进成本。', 'Pick a market to see import duty, local VAT and China export rebate — margin included in one view.')}</div></div>
      <div class="row wrap-gap">
        <label class="tiny muted" style="display:flex;align-items:center;gap:6px">${L('货值 USD', 'Value USD')}
          <input id="taxVal" type="number" min="0" step="100" value="${val || ''}" placeholder="10000" style="width:110px">
        </label>
      </div>
    </div>

    <div class="card"><div class="card-b">
      <div class="rf-plats" style="margin-bottom:0">
        ${TAX_MK.map(x => `<button class="rf-plat ${x.k === m.k ? 'on' : ''}" data-act="taxCty" data-id="${x.k}">${mkName(x)}</button>`).join('')}
      </div>
    </div></div>

    <div class="card"><div class="card-h"><h3>${esc(mkName(m))}</h3>
      <span class="sub">HS 8708.30 · ${esc(I.getLang() === 'zh' ? m.note : m.noteEn)}</span></div>
      <div class="card-b">
        <div class="rf-kpis">
          ${card(L('中国出口退税', 'China rebate'), REBATE + '%', val ? L('可退 $', 'refund $') + Math.round(rebate).toLocaleString() : L('按货值算', 'of invoice value'))}
          ${card(L('进口关税', 'Import duty'), m.duty + '%', val ? '$' + Math.round(duty).toLocaleString() : (I.getLang() === 'zh' ? m.note : m.noteEn))}
          ${card(vatName, m.vat + '%', val ? '$' + Math.round(vat).toLocaleString() : L('按 CIF + 关税计征', 'on CIF + duty'))}
          ${card(L('到岸总成本', 'Landed cost'), val ? '$' + Math.round(landed).toLocaleString() : '—', val ? L('货值 + 关税 + ', 'value + duty + ') + vatName : L('填货值后自动算', 'enter a value'), 'c-hi')}
        </div>
        <div class="tiny muted" style="line-height:1.9">
          · ${L(`关税 = 货值 × ${m.duty}%；${vatName} = (货值 + 关税) × ${m.vat}%；出口退税按 13% 退。`, `Duty = value × ${m.duty}%; ${vatName} = (value + duty) × ${m.vat}%; China rebate is 13%.`)}<br>
          · ${val ? L(`以 $${val.toLocaleString()} 货值计：出口可退 <b>$${Math.round(rebate).toLocaleString()}</b>，客户到岸成本 <b>$${Math.round(landed).toLocaleString()}</b>。`, `On $${val.toLocaleString()}: rebate <b>$${Math.round(rebate).toLocaleString()}</b>, landed cost <b>$${Math.round(landed).toLocaleString()}</b>.`) : L('填入货值可直接算出金额。', 'Enter a value to get the numbers.')}<br>
          · ${L('税率随原产地证、自贸协定、反倾销措施变化，正式报关前请让货代复核。', 'Rates move with certificates of origin, FTAs and anti-dumping measures — confirm with your forwarder before declaring.')}
        </div>
      </div>
    </div>

    <div class="card"><div class="card-h"><h3>${L('常用市场对照', 'Markets at a glance')}</h3><span class="sub">${L('点一行切换上方明细', 'Click a row to switch')}</span></div>
      <div class="tbl-wrap"><table><thead><tr><th>${L('市场', 'Market')}</th><th class="right">${L('进口关税', 'Duty')}</th><th class="right">${L('增值税', 'VAT')}</th><th class="right">${L('综合税负', 'Total')}</th><th>${L('备注', 'Notes')}</th></tr></thead><tbody>
      ${TAX_MK.map(x => {
      const comp = x.duty + (100 + x.duty) * x.vat / 100;
      return `<tr class="click ${x.k === m.k ? 'on' : ''}" data-act="taxCty" data-id="${x.k}">
          <td><b>${esc(mkName(x))}</b><div class="tiny muted">${esc(x.k)}</div></td>
          <td class="right mono">${x.duty}%</td>
          <td class="right mono">${x.vat}%<div class="tiny muted">${esc(I.getLang() === 'zh' ? x.vatZh : x.vatName)}</div></td>
          <td class="right mono b">${comp.toFixed(1)}%</td>
          <td class="small muted">${esc(I.getLang() === 'zh' ? x.note : x.noteEn)}</td></tr>`;
    }).join('')}
      </tbody></table></div>
    </div>`;

    const vi = $('#taxVal');
    if (vi) vi.onchange = () => { S.tax.qty = Number(vi.value) || 0; save(); vTax(); };
  }

  /* ================= 工具书：款号查询（联网） ================= */
  function vModel() {
    const st = S.model;
    const q = (st.q || '').trim();
    const local = q ? D.products.filter(p =>
      (p.code || '').toLowerCase().includes(q.toLowerCase()) ||
      (p.id || '').toLowerCase().includes(q.toLowerCase()) ||
      (p.codes || []).some(c => String(c).toLowerCase().includes(q.toLowerCase()))
    ).slice(0, 12) : [];

    $('#p-model').innerHTML = `
    <div class="row wrap-gap" style="justify-content:space-between;margin-bottom:12px">
      <div><h1 style="margin:0">${L('款号查询', 'Style lookup')}</h1>
      <div class="muted small">${L('先查本站款号库，库里没有就去互联网找。尺码适穿要自己复核，别直接照抄。', 'We search our own catalog first, then the web. Always re-check the size fit before quoting.')}</div></div>
    </div>

    <div class="card"><div class="card-b">
      <div class="rf-conn-row">
        <input id="mdQ" type="text" value="${esc(q)}" placeholder="${L('输入款号 / 条码 / 编号，例如 XM-SW-2601、DR2601001、110', 'Style code, barcode or number — e.g. XM-SW-2601, DR2601001, 110')}">
        <button class="btn primary" data-act="modelGo">${st.busy ? L('查询中…', 'Searching…') : L('查询', 'Search')}</button>
      </div>
      <div class="tiny muted" style="margin-top:8px">${L('站内库', 'Our catalog')}：${D.products.length} ${L('个款号', 'style codes')} · ${L('联网搜索走本地服务代理', 'web search goes through the local service')}</div>
      ${q ? `<div class="row wrap-gap" style="margin-top:10px;gap:6px">
        <span class="tiny muted">${L('在浏览器里搜：', 'Open in browser:')}</span>
        <a class="btn sm" target="_blank" rel="noopener" href="https://www.baidu.com/s?wd=${encodeURIComponent(q + ' 童装 款号')}">百度 ↗</a>
        <a class="btn sm" target="_blank" rel="noopener" href="https://www.google.com/search?q=${encodeURIComponent(q + ' kids clothing')}">Google ↗</a>
        <a class="btn sm" target="_blank" rel="noopener" href="https://www.bing.com/search?q=${encodeURIComponent(q + ' kids clothing')}">Bing ↗</a>
        <a class="btn sm" target="_blank" rel="noopener" href="https://s.1688.com/selloffer/offer_search.htm?keywords=${encodeURIComponent(q)}">1688 ↗</a>
      </div>` : ''}
    </div></div>

    ${q ? `
    <div class="card"><div class="card-h"><h3>${L('站内库', 'Our catalog')}</h3><span class="sub">${local.length} ${L('个匹配', 'matches')}</span></div>
      <div class="card-b" style="padding:0">
        ${local.length ? `<div class="tbl-wrap"><table><thead><tr><th>${L('款号', 'Style code')}</th><th>${L('编号', 'Codes')}</th><th>${L('面料', 'Material')}</th><th>${L('尺码', 'Size')}</th><th></th></tr></thead><tbody>
        ${local.map(p => `<tr><td class="mono b">${esc(p.code)}</td>
          <td class="small">${(p.codes || []).slice(0, 4).map(c => esc(c)).join(' · ') || '—'}</td>
          <td class="small">${esc(p.material || '—')}</td>
          <td class="small">${esc(p.size || '')}</td>
          <td><button class="btn xs" data-act="modelOpen" data-id="${esc(p.id)}">${L('看详情', 'Open')}</button></td></tr>`).join('')}
        </tbody></table></div>` : `<div class="card-b muted small">${L('本站库里没有找到，下面是互联网结果。', 'Not in our catalog — see the web results below.')}</div>`}
      </div>
    </div>` : ''}

    ${st.err ? `<div class="card"><div class="card-b rf-err">${esc(st.err)}</div></div>` : ''}

    ${st.res && st.res.length ? `
    <div class="card"><div class="card-h"><h3>${L('互联网结果', 'Web results')}</h3><span class="sub">${st.res.length} ${L('条 · 仅作线索', 'items · leads only')}</span></div>
      <div class="card-b" style="padding:0">
        ${st.res.map((r, i) => `<div class="rf-tool" style="padding:12px 15px;border-top:${i ? '1px solid var(--line-2)' : '0'}">
          <a href="${esc(r.url)}" target="_blank" rel="noopener" style="font-weight:600;color:#1d4ed8;text-decoration:none">${esc(r.title)}</a>
          <div class="small" style="margin-top:4px;line-height:1.6">${esc(r.snippet)}</div>
          <div class="tiny muted" style="margin-top:4px">${esc(r.site || '')}</div>
        </div>`).join('')}
      </div>
    </div>` : ''}
    `;

    const inp = $('#mdQ');
    if (inp) inp.onkeydown = e => { if (e.key === 'Enter') ACT.modelGo(); };
  }

  /* ================= 工具书：货币兑换 ================= */
  const FX_LIST = [
    ['USD', '美元', 'US dollar'], ['CNY', '人民币', 'Chinese yuan'], ['EUR', '欧元', 'Euro'],
    ['GBP', '英镑', 'Pound sterling'], ['JPY', '日元', 'Japanese yen'], ['RUB', '卢布', 'Russian ruble'],
    ['SAR', '沙特里亚尔', 'Saudi riyal'], ['AED', '迪拉姆', 'UAE dirham'], ['MXN', '墨西哥比索', 'Mexican peso'],
    ['BRL', '雷亚尔', 'Brazilian real'], ['VND', '越南盾', 'Vietnamese dong'], ['THB', '泰铢', 'Thai baht'],
    ['IDR', '印尼盾', 'Indonesian rupiah'], ['TRY', '里拉', 'Turkish lira'], ['EGP', '埃及镑', 'Egyptian pound'],
    ['ZAR', '兰特', 'South African rand'], ['INR', '卢比', 'Indian rupee'], ['NGN', '奈拉', 'Nigerian naira'],
    ['KRW', '韩元', 'Korean won'], ['AUD', '澳元', 'Australian dollar']
  ];
  /* 离线兜底：1 美元约合（2025 年前后的量级，联网后自动被真实汇率覆盖） */
  const FX_FALLBACK = {
    USD: 1, CNY: 7.2, EUR: 0.92, GBP: 0.79, JPY: 152, RUB: 92, SAR: 3.75, AED: 3.67, MXN: 17.5,
    BRL: 5.1, VND: 25400, THB: 36, IDR: 15800, TRY: 32.5, EGP: 47, ZAR: 18.5, INR: 83.5, NGN: 1500,
    KRW: 1340, AUD: 1.52
  };
  const fxName = c => { const f = FX_LIST.find(x => x[0] === c); return f ? (I.getLang() === 'zh' ? f[1] : f[2]) : c; };
  const fxRate = (from, to) => {
    const R = (S.fx && S.fx.rates && Object.keys(S.fx.rates).length) ? S.fx.rates : FX_FALLBACK;
    const a = Number(R[from]), b = Number(R[to]);
    if (!a || !b) return 0;
    return b / a;
  };
  const fxMoney = n => (n >= 1000 ? Math.round(n).toLocaleString() : (Math.round(n * 100) / 100).toString());

  function vFx() {
    const f = S.fx || (S.fx = { amt: 10000, from: 'USD', to: 'CNY', rates: {}, at: '', busy: false, err: '' });
    const r = fxRate(f.from, f.to);
    const out = (Number(f.amt) || 0) * r;
    const live = !!(f.rates && Object.keys(f.rates).length);
    const opts = sel => FX_LIST.map(c => `<option value="${c[0]}" ${c[0] === sel ? 'selected' : ''}>${c[0]} · ${fxName(c[0])}</option>`).join('');
    const notable = ['CNY', 'EUR', 'SAR', 'AED', 'MXN', 'BRL', 'VND', 'RUB'].filter(c => c !== f.from);

    $('#p-fx').innerHTML = `
    <div class="row wrap-gap" style="justify-content:space-between;margin-bottom:12px">
      <div><h1 style="margin:0">${L('货币兑换', 'Currency converter')}</h1>
      <div class="muted small">${L('报价前先算清汇率，报价单里别写错币种和数字。', 'Convert before quoting so the currency and the numbers line up.')}</div></div>
      <div class="row wrap-gap">
        <span class="rf-pill ${live ? 'on' : ''}">${live ? L('实时汇率', 'Live rates') : L('内置参考汇率', 'Built-in rates')}</span>
        <button class="btn sm" data-act="fxGo">${f.busy ? L('刷新中…', 'Refreshing…') : L('刷新汇率', 'Refresh')}</button>
      </div>
    </div>

    <div class="card"><div class="card-b">
      <div class="rf-form" style="grid-template-columns:1.2fr 1fr auto 1fr;align-items:end">
        <label>${L('金额', 'Amount')}<input id="fxAmt" type="number" min="0" step="100" value="${Number(f.amt) || 0}"></label>
        <label>${L('从', 'From')}<select id="fxFrom">${opts(f.from)}</select></label>
        <button class="btn" data-act="fxSwap" title="${L('对调', 'Swap')}" style="margin-bottom:2px">⇄</button>
        <label>${L('到', 'To')}<select id="fxTo">${opts(f.to)}</select></label>
      </div>
      <div class="rf-kpis" style="margin-top:14px;margin-bottom:0">
        <div class="rf-kpi" style="grid-column:span 2">
          <span>${Number(f.amt).toLocaleString()} ${f.from} =</span>
          <b style="font-size:30px">${fxMoney(out)} <span style="font-size:16px;color:#64748b">${f.to}</span></b>
          <i>1 ${f.from} = ${r ? r.toFixed(4) : '—'} ${f.to}</i>
        </div>
        <div class="rf-kpi"><span>${L('反向', 'Reverse')}</span><b>${r ? (1 / r).toFixed(4) : '—'}</b><i>1 ${f.to} = ? ${f.from}</i></div>
      </div>
      ${f.err ? `<div class="rf-err">${esc(f.err)}</div>` : ''}
      <div class="tiny muted" style="margin-top:10px">${live
        ? L('汇率来自 open.er-api.com，每天更新一次；实际结汇以银行牌价为准。', 'Rates from open.er-api.com, updated daily. Your bank rate is what actually settles.')
        : L('这是内置参考汇率（离线可用）。点「刷新汇率」联网取当天汇率。', 'These are built-in reference rates (works offline). Hit Refresh to pull today’s rates.')}</div>
    </div></div>

    <div class="card"><div class="card-h"><h3>${L('常用对照', 'Quick table')}</h3><span class="sub">1 ${f.from} = ?</span></div>
      <div class="tbl-wrap"><table><thead><tr><th>${L('币种', 'Currency')}</th><th class="right">${L('汇率', 'Rate')}</th><th class="right">${Number(f.amt).toLocaleString()} ${f.from}</th></tr></thead><tbody>
        ${notable.map(c => {
      const rr = fxRate(f.from, c);
      return `<tr class="click" data-act="fxPick" data-id="${c}">
          <td><b>${c}</b> <span class="muted small">${esc(fxName(c))}</span></td>
          <td class="right mono">${rr ? rr.toFixed(4) : '—'}</td>
          <td class="right mono b">${fxMoney((Number(f.amt) || 0) * rr)}</td></tr>`;
    }).join('')}
      </tbody></table></div>
    </div>`;

    const amt = $('#fxAmt'), from = $('#fxFrom'), to = $('#fxTo');
    if (amt) amt.onchange = () => { S.fx.amt = Number(amt.value) || 0; save(); vFx(); };
    if (from) from.onchange = () => { S.fx.from = from.value; save(); vFx(); };
    if (to) to.onchange = () => { S.fx.to = to.value; save(); vFx(); };
    /* 首次进入自动拉一次真实汇率，失败就留在内置参考汇率 */
    if (!live && !f.busy && !f.tried) { f.tried = true; setTimeout(() => ACT.fxGo(), 80); }
  }

  /* ================= 售后服务 ================= */
  const AS_TYPES = ['尺码不符', '色差', '起球', '掉色 / 缩水', '开线 / 破损', '少发 / 错发', '退货', '索赔', '其他'];
  const AS_STATUS = ['待处理', '处理中', '已关闭'];

  function vAfterSale() {          // 客户侧：提交
    const u = A.me() || {};
    const mine = (S.asStaff || []).filter(x => x.cust === (u.name || ''));
    $('#p-aftersale').innerHTML = `
    <div class="row wrap-gap" style="justify-content:space-between;margin-bottom:12px">
      <div><h1 style="margin:0">售后服务</h1>
      <div class="muted small">试穿问题、退换或索赔，填完提交，销售和老板那边都能看到，会尽快联系您。</div></div>
    </div>

    <div class="card"><div class="card-h"><h3>提交服务请求</h3><span class="sub">${esc(u.company || '')} · ${esc(u.name || '')}</span></div>
      <div class="card-b">
        <div class="rf-form">
          <label>款号 / 订单号 *<input id="asModel" placeholder="例如 XM-SW-2601 / XIAOMAN-2026-0871"></label>
          <label>款式系列 / 尺码段<input id="asVeh" placeholder="例如 奶油小方 圆领卫衣 / 110 码"></label>
          <label>问题类型<select id="asType">${AS_TYPES.map(t => `<option>${t}</option>`).join('')}</select></label>
          <label>涉及数量<input id="asQty" type="number" min="0" placeholder="例如 40"></label>
          <label>联系方式 *<input id="asContact" value="${esc((u.contact || {}).value || '')}" placeholder="WhatsApp / 微信 / 邮箱"></label>
        </div>
        <label style="display:block;margin-top:10px">情况说明 *
          <textarea id="asDesc" rows="4" style="width:100%;margin-top:4px" placeholder="什么时候收到的、洗过几次、具体问题（起球 / 掉色 / 缩水 / 开线 / 尺码）"></textarea>
        </label>
        <div class="row wrap-gap" style="margin-top:12px">
          <button class="btn primary" data-act="asSend">提交</button>
          <span class="tiny muted">提交后可在本页下方看到处理进度</span>
        </div>
      </div>
    </div>

    ${mine.length ? `<div class="card"><div class="card-h"><h3>我的记录</h3><span class="sub">${mine.length} 条</span></div>
      <div class="card-b" style="padding:0"><div class="tbl-wrap"><table>
        <thead><tr><th>时间</th><th>款号</th><th>类型</th><th>说明</th><th>状态</th></tr></thead><tbody>
        ${mine.map(x => `<tr><td class="small mono">${esc(x.at)}</td><td class="mono">${esc(x.model)}</td>
          <td class="small">${esc(x.type)}</td><td class="small" style="max-width:320px">${esc(x.desc)}</td>
          <td>${tag(x.status, x.status === '已关闭' ? 'n' : x.status === '处理中' ? 'b' : 'o')}</td></tr>`).join('')}
      </tbody></table></div></div></div>` : ''}`;
  }

  function vAfterSales() {         // 员工 / 老板侧：两个独立列表
    const boss = A.isBoss();
    const list = (boss ? S.asBoss : S.asStaff) || [];
    const open = list.filter(x => x.status !== '已关闭').length;
    $('#p-aftersales').innerHTML = `
    <div class="row wrap-gap" style="justify-content:space-between;margin-bottom:12px">
      <div><h1 style="margin:0">售后服务</h1>
      <div class="muted small">${boss ? '老板端' : '员工端'}的售后请求 · 与${boss ? '员工' : '老板'}那份分开存，这边删了不影响另一边。</div></div>
      <div class="rf-kpi" style="min-width:150px"><span>待处理</span><b>${open}</b><i>共 ${list.length} 条</i></div>
    </div>
    <div class="card"><div class="card-b" style="padding:0">
      ${list.length ? `<div class="tbl-wrap"><table>
        <thead><tr><th>时间</th><th>客户</th><th>款号</th><th>问题</th><th>说明</th><th>联系</th><th>状态</th><th></th></tr></thead><tbody>
        ${list.slice().reverse().map(x => `<tr>
          <td class="small mono">${esc(x.at)}</td>
          <td class="small"><b>${esc(x.cust)}</b><div class="tiny muted">${esc(x.company || '')}</div></td>
          <td class="mono small">${esc(x.model)}<div class="tiny muted">${esc(x.vehicle || '')}</div></td>
          <td class="small">${esc(x.type)}${x.qty ? '<div class="tiny muted">' + esc(String(x.qty)) + ' 件</div>' : ''}</td>
          <td class="small" style="max-width:280px">${esc(x.desc)}</td>
          <td class="small">${esc(x.contact)}</td>
          <td>${AS_STATUS.map(s => `<button class="btn xs ${x.status === s ? 'primary' : ''}" data-act="asSt" data-id="${x.id}" data-st="${s}">${s}</button>`).join(' ')}</td>
          <td><button class="btn xs" data-act="asDel" data-id="${x.id}">删除</button></td>
        </tr>`).join('')}
      </tbody></table></div>` : `<div class="card-b muted" style="padding:28px;text-align:center">还没有售后请求。客户在「售后服务」页提交后会出现在这里。</div>`}
    </div></div>`;
  }

  function vXref() {
    $('#p-xref').innerHTML = window.XREF.html({ esc, LZ, T });
    const box = $('#xrefQ');
    if (box) {
      box.onkeydown = e => { if (e.key === 'Enter') ACT.xrefGo(); };
      if (!window.__xrefFocused) { box.focus(); window.__xrefFocused = true; }
    }
  }

  /* ================= 交互动作 ================= */
  /** 体验版员工端：只读，不允许发送 / 导入 / 改数据 */
  const DEMO_BLOCK = new Set(['sendCustomer', 'pushLead', 'newFit', 'saveFit', 'confirmFit', 'runImport', 'resetData', 'saveQuote', 'priceSend', 'saveNewLead', 'saveLead', 'dealAdd', 'dealSet', 'dealDel', 'dealTo', 'dealToQuote', 'fuFlagCycle', 'fuSaveNote', 'addCustSave']);

  const ACT = {
    /** 首屏「选购」下拉 */
    heroPick() {
      const d = $('#heroPick'); if (!d) return;
      const open = d.classList.toggle('open');
      const t = d.querySelector('.hero-pick-t');
      if (t) t.setAttribute('aria-expanded', open ? 'true' : 'false');
    },
    navDrop() {
      const d = $('#navDrop'); if (!d) return;
      const open = d.classList.toggle('open');
      const t = d.querySelector('.nav-drop-t');
      if (t) t.setAttribute('aria-expanded', open ? 'true' : 'false');
    },
    tab(id) {
      if (!allowedTab(id)) { toast(LZ('这一页是员工端的', 'Staff only')); return; }
      S.tab = id; navOpen = ''; render();
      try { if (location.hash !== '#/' + id) history.replaceState(null, '', '#/' + id); } catch (e) { }
      if (id === 'home') window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    openGate() { openGate(); },
    closeGate() { closeGate(); if (window.__askLang) { window.__askLang = false; setTimeout(openLang, 40); } },
    gateRole(id) { gateRole = (id === 'staff' || id === 'boss') ? id : 'customer'; renderGate(); },
    gateDemo(role) {
      const r = A.loginDemo(role === 'boss' ? 'boss' : role === 'staff' ? 'staff' : 'customer');
      closeGate();
      applySession();
      if (r.user.role === 'boss') { toast(LZ('体验老板端已开启：可看业绩，不能改', 'Demo owner on: view only')); }
      else toast(r.user.role === 'staff'
        ? LZ('体验员工端已开启：可看，不能改', 'Demo staff on: view only')
        : LZ('体验版已开启：数据只保存在本机', 'Demo mode: data stays on this device'));
      if (window.__askLang) { window.__askLang = false; setTimeout(openLang, 40); }
    },
    gateLogin() {
      const v = id => { const el = $('#' + id); return el ? el.value : ''; };
      const area = gateRole;
      const r = A.login(area === 'boss'
        ? { role: 'boss', code: v('gCode'), name: v('gName'), value: v('gValue') }
        : area === 'staff'
        ? { role: 'staff', code: v('gCode'), name: v('gName'), value: v('gValue') }
        : { role: 'customer', type: v('gType') || 'WhatsApp', value: v('gValue'), name: v('gName'), company: v('gCompany'), country: v('gCountry') });
      if (!r.ok) { const e = $('#gErr'); if (e) e.textContent = r.msg; return; }
      closeGate();
      applySession();
      toast(roleName(r.user));
      if (window.__askLang) { window.__askLang = false; setTimeout(openLang, 40); }
    },
    logout() {
      A.logout();
      gateStaffMode = false; gateRole = 'customer';   // 退出后收起员工 / 老板入口，回到纯客户登录
      applySession(); renderGate(); toast(LZ('已退出登录', 'Signed out'));
    },
    openCustomer(id) { openCustomer(id); },
    sendCustomer(id) {
      const u = A.customers().find(x => x.id === id);
      if (!u) return;
      const ta = $('#sendMsg');
      const text = (ta ? ta.value : '') || '';
      const url = A.sendUrl(u, text);
      if (!url) { toast(LZ('这个联系方式没有可直接打开的 App', 'No direct app for this contact')); return; }
      A.setTag(u.id, LZ('已联系', 'Contacted'));
      window.open(url, '_blank');
      toast(LZ('已打开 ' + u.contact.type + '，确认内容后发送', 'Opened ' + u.contact.type + ' — review and send'));
    },
    pushLead(id) {
      const u = A.customers().find(x => x.id === id);
      if (!u) return;
      if (S.leads.some(l => l.contact === u.contact.value)) { toast(LZ('已经在询盘池里了', 'Already in leads')); return; }
      const st = A.stats(u);
      const q = (st.events.find(e => e.d && e.d.q) || { d: {} }).d.q || '';
      S.leads.push({
        id: 'L-' + Date.now(), created: new Date().toISOString().slice(0, 16).replace('T', ' '),
        company: u.company || u.name, country: u.country || '—', src: LZ('客户端登录', 'Customer portal') + ' · ' + u.contact.type,
        need: q, needZh: q, contact: u.contact.value, tz: 'Asia/Shanghai', status: '待跟进', owner: '未分配',
        product: [], score: st.score
      });
      save(); renderNav(); toast(LZ('已加入询盘池', 'Added to leads'));
    },
    openCat(cat) {
      S.filters.cat = cat;
      S.tab = 'products';
      render();
    },
    openProductByCode(code) {
      const p = D.products.find(x => x.code === code);
      if (p) { openProduct(p.id); return; }
      const c = D.codes.find(x => x.code === code);
      if (c && E.byId.get(c.pid)) openProduct(c.pid); else toast(LZ('没有这个款号', 'No such style'));
    },
    openLang() { openLang(); },
    /** 导航分组下拉：同一时间只开一个，再点同一个收起来 */
    navGroup(key) {
      navOpen = (navOpen === key) ? '' : key;
      renderNav();
    },
    pickLang(code) {
      I.setLang(code);
      applyLangChrome();
      renderLangGrid();
      renderNav();
      renderChat();
      render();
    },
    langConfirm() {
      closeLang();
      try {
        if ($('#langRemember') && $('#langRemember').checked) localStorage.setItem('gy_lang_remember', '1');
        else localStorage.setItem('gy_lang_remember', '0');
      } catch (e) { }
      render();
      toast(I.getLang() === 'zh' ? '界面语言：中文' : 'Language: ' + I.meta().native);
    },
    heroMatch() {
      const el = $('#heroQ');
      const v = ((el && el.value) || '').trim();
      if (!v) { toast('先输入款式系列、尺码段或旧款编号'); if (el) el.focus(); return; }
      S.q = v; S.tab = 'select'; doMatch(v);
    },
    example(id) { S.tab = 'select'; doMatch(id); },
    doMatch() { doMatch(); },
    clearMatch() { S.q = ''; S.match = null; vSelect(); },
    addCart(pid) {
      const p = E.byId.get(pid); if (!p) return;
      const qtyEl = $('#qty-' + pid);
      const qty = qtyEl ? Math.max(1, Number(qtyEl.value) || 100) : 100;
      const hit = S.cart.find(x => x.pid === pid);
      if (hit) hit.qty += qty; else S.cart.push({ pid, qty, mat: p.material });
      A.track('addCart', { code: p.code, pid: p.id });
      save(); toast(`已加入 ${p.code} × ${qty}`); renderNav();
      if (S.tab === 'quote' || S.tab === 'pack') render();
    },
    rmCart(pid) { S.cart = S.cart.filter(x => x.pid !== pid); save(); render(); },
    clearCart() { S.cart = []; save(); render(); },
    setQty(idx) { }, // handled via change 事件
    openProduct(pid) { openProduct(pid); },
    closeDrawer() { closeDrawer(); },
    detailPack(pid) {
      const p = E.byId.get(pid);
      modal('产品资料页预览', `<div style="background:#fff">${E.docProduct(p, { customer: customer() })}</div>`,
        `<button class="btn" data-act="closeModal">关闭</button><button class="btn primary" data-act="printNow">打印 / 另存 PDF</button>`, true);
    },
    printNow() { const html = $('#modalBody').innerHTML; closeModal(); printHTML(html); },
    closeModal() { closeModal(); },
    printQuote() {
      const rows = cartRows();
      if (!rows.length) { toast('先选款号'); return; }
      const c = customer();
      const html = E.docQuote({
        customer: c, items: rows.map(r => ({ pid: r.pid, qty: r.qty, mat: r.mat })),
        no: S.quoteMeta.no || autoNo(), date: S.quoteMeta.date, valid: '30 days',
        incoterm: S.quoteMeta.incoterm, pay: S.quoteMeta.pay
      });
      A.track('quote', {});
      modal('报价单预览', `<div style="background:#fff">${html}</div>`,
        `<button class="btn" data-act="closeModal">关闭</button><button class="btn primary" data-act="printNow">打印 / 另存 PDF</button>`, true);
    },
        /** 客户侧：打印当前结算单 */
    printSettle() {
      const rows = cartRows();
      if (!rows.length) { toast(LZ('先选款号', 'Add styles first')); return; }
      const c = customer();
      const calc = E.quoteCalc(rows.map(r => ({ pid: r.pid, qty: r.qty, mat: r.mat })), c);
      const u = A.me() || {};
      showSettleDoc(LZ('结算单预览', 'Settlement preview'), settleDocHtml({
        no: S.quoteMeta.no || autoNo(), at: S.quoteMeta.date,
        cust: u.company || u.name || '', contact: (u.contact || {}).value || '',
        incoterm: S.quoteMeta.incoterm || c.incoterm, pay: S.quoteMeta.pay || c.pay,
        rows: calc.rows.map(r => ({ code: r.product.code, mat: r.mat || r.product.material, qty: r.qty, unit: r.unit, amt: r.amt })),
        amount: calc.amount, freight: calc.freight, total: calc.total
      }));
      A.track('quote', {});
    },
    /** 客户侧：看某张报价的明细 */
    viewQuote(id) {
      const q = (S.quotes || []).find(x => x.id === id);
      if (!q) { toast(LZ('找不到这张报价', 'Quote not found')); return; }
      VIEWQ = q;
      const rows = q.items.map(it => {
        const p = D.products.find(x => x.id === it.pid) || { code: it.pid };
        return `<tr><td class="mono b">${esc(p.code)}</td><td class="mono">${it.qty}</td>
          <td class="right mono">$${money(it.price)}</td>
          <td class="right mono b">$${money(Math.round(it.price * it.qty * 100) / 100)}</td></tr>`;
      }).join('');
      modal(LZ('报价单 ' + q.no, 'Quote ' + q.no),
        `<div class="small muted mb">${esc(q.date || '')} · ${LZ('合计', 'Total')} <b>$${money(q.total)}</b>${q.note ? ' · ' + esc(q.note) : ''}</div>
         <table style="font-size:12.5px"><thead><tr>
           <th>${LZ('编号', 'Code')}</th><th>${LZ('数量', 'Qty')}</th>
           <th class="right">${LZ('单价', 'Unit')}</th><th class="right">${LZ('金额', 'Amount')}</th>
         </tr></thead><tbody>${rows}</tbody></table>
         <div class="small" style="margin-top:10px">${LZ('商品金额', 'Goods')} <b class="mono">$${money(q.amount)}</b> ＋ ${LZ('运费', 'Freight')} <b class="mono">$${money(q.freight)}</b></div>
         <div class="tiny muted" style="margin-top:8px">${LZ('确认要这批货就点「按此报价下单」，会填进结算单，可以核对后再提交。', 'Hit Order to load these lines into your settlement.')}</div>`,
        `<button class="btn" data-act="closeModal">${LZ('关闭', 'Close')}</button>
         <button class="btn" data-act="printQuoteDoc">${LZ('打印报价单', 'Print')}</button>
         <button class="btn primary" data-act="acceptQuote" data-id="${esc(q.id)}">${LZ('按此报价下单', 'Order this')}</button>`);
    },
    /** 客户侧：打印刚才查看的报价单 */
    printQuoteDoc() {
      const q = VIEWQ;
      if (!q) return;
      const html = E.docQuote({
        customer: customer(), items: q.items.map(it => ({ pid: it.pid, qty: it.qty, mat: it.mat })),
        no: q.no, date: q.date, valid: '30 days', incoterm: S.quoteMeta.incoterm, pay: S.quoteMeta.pay
      });
      modal(LZ('报价单预览', 'Quote preview'), `<div style="background:#fff">${html}</div>`,
        `<button class="btn" data-act="closeModal">${LZ('关闭', 'Close')}</button><button class="btn primary" data-act="printNow">${LZ('打印 / 另存 PDF', 'Print / PDF')}</button>`, true);
    },
    /** 客户侧：按报价单填进结算单 */
    acceptQuote(id) {
      const q = (S.quotes || []).find(x => x.id === id);
      if (!q) return;
      let n = 0;
      q.items.forEach(it => {
        const p = D.products.find(x => x.id === it.pid);
        if (!p) return;
        const hit = S.cart.find(x => x.pid === p.id);
        if (hit) hit.qty = it.qty;
        else S.cart.push({ pid: p.id, qty: it.qty, mat: it.mat || p.material });
        n++;
      });
      save(); closeModal(); vQuote();
      toast(LZ('已把 ' + n + ' 个款号填进结算单', 'Loaded ' + n + ' items into your settlement'));
    },    /** 客户侧：打印某一张历史结算单 */
    printOrder(id) {
      const o = (S.myOrders || []).find(x => x.id === id);
      if (!o) { toast(LZ('找不到这张单', 'Record not found')); return; }
      showSettleDoc(LZ('结算单预览', 'Settlement preview'), settleDocHtml(o));
    },
    /** 客户侧：按历史单再来一次 */
    reorderOrder(id) {
      const o = (S.myOrders || []).find(x => x.id === id);
      if (!o) return;
      const miss = [];
      o.rows.forEach(r => {
        const p = D.products.find(x => x.code === r.code);
        if (!p) { miss.push(r.code); return; }
        const hit = S.cart.find(x => x.pid === p.id);
        if (hit) hit.qty += Number(r.qty) || 1;
        else S.cart.push({ pid: p.id, qty: Number(r.qty) || 1, mat: p.material });
      });
      save(); vQuote();
      toast(miss.length
        ? LZ('已加回购物车；这些款号已下架：', 'Added back; discontinued: ') + miss.join('、')
        : LZ('已按原单加回购物车', 'Added back to your cart'));
    },
    printPack() {
      const rows = cartRows();
      if (!rows.length) { toast('先选款号'); return; }
      const html = E.docPack({ customer: customer(), items: rows.map(r => ({ pid: r.pid, qty: r.qty, mat: r.mat })), no: S.quoteMeta.no || autoNo(), date: S.quoteMeta.date });
      A.track('pack', {});
      modal('资料包预览（多页）', `<div style="background:#fff">${html}</div>`,
        `<button class="btn" data-act="closeModal">关闭</button><button class="btn primary" data-act="printNow">打印 / 另存为 PDF</button>`, true);
    },
    /** 报价：逐个款号改单价 → 发给客户 */
    priceOpen() {
      const rows = cartRows();
      if (!rows.length) { toast(LZ('先把款号加入报价，再报价', 'Add a style to the quote first')); return; }
      const c = customer();
      const calc = E.quoteCalc(rows.map(r => ({ pid: r.pid, qty: r.qty, mat: r.mat })), c);
      PRICE_ROWS = calc.rows.map(r => ({ ...r, price: r.unit }));
      const live = () => {
        let amt = 0;
        PRICE_ROWS.forEach((r, i) => {
          const el = $('#pp' + i);
          const v = el ? Math.max(0, Number(el.value) || 0) : r.price;
          const st = $('#pst' + i); if (st) st.textContent = '$' + money(Math.round(v * r.qty * 100) / 100);
          amt += v * r.qty;
        });
        const tot = $('#ppTotal');
        if (tot) tot.textContent = '$' + money(Math.round((amt + calc.freight) * 100) / 100);
      };
      modal(LZ('报价给客户', 'Send price'),
        `<div class="pp-hint">${LZ('单价已按阶梯价填好，可以逐个改。改完点「发给客户」，他在「客服解答」里能看到这张报价。', 'Prices are filled from your tiers — edit any line, then send. The customer sees it in their Support panel.')}</div>
        <table class="pp-tbl"><thead><tr>
          <th>${LZ('编号', 'Code')}</th><th class="r">${LZ('数量', 'Qty')}</th><th class="r">${LZ('原单价', 'List')}</th>
          <th class="r">${LZ('你的报价', 'Your price')}</th><th class="r">${LZ('小计', 'Subtotal')}</th>
        </tr></thead><tbody>
        ${PRICE_ROWS.map((r, i) => `<tr>
          <td class="mono b">${esc(r.product.code)}</td>
          <td class="r mono">${r.qty}</td>
          <td class="r mono muted">$${money(r.unit)}</td>
          <td class="r"><span class="pp-edit"><span class="pp-cur">$</span><input id="pp${i}" class="pp-in" type="number" min="0" step="0.01" value="${r.price}"></span></td>
          <td class="r mono b" id="pst${i}">$${money(Math.round(r.price * r.qty * 100) / 100)}</td>
        </tr>`).join('')}
        </tbody></table>
        <div class="pp-sum">
          <div class="pp-item"><span class="k">${LZ('运费（另计）', 'Freight (extra)')}</span><b class="mono">$${money(calc.freight)}</b></div>
          <span class="pp-vline"></span>
          <div class="pp-item pp-total"><span class="k">${LZ('合计', 'Total')}</span><b class="mono" id="ppTotal"></b></div>
        </div>
        <div class="field" style="margin-top:14px"><label>${LZ('备注（客户能看到）', 'Note (customer sees it)')}</label>
          <input id="ppNote" placeholder="${LZ('如：价格 30 天有效，FOB 上海', 'e.g. valid 30 days, FOB Shanghai')}"></div>
        <div class="pp-cust">${LZ('客户：', 'Customer: ')}${esc(c.name)} · ${LZ('报价单号：', 'Quote No. ')}${esc(S.quoteMeta.no || autoNo())}</div>`,
        `<button class="btn" data-act="closeModal">${LZ('取消', 'Cancel')}</button>
         <button class="btn primary lg" data-act="priceSend">${LZ('发给客户', 'Send to customer')}</button>`);
      PRICE_ROWS.forEach((r, i) => { const el = $('#pp' + i); if (el) el.oninput = live; });
      live();
    },
    priceSend() {
      const rows = PRICE_ROWS;
      if (!rows || !rows.length) { toast(LZ('没有可报价的款号', 'Nothing to price')); return; }
      const items = rows.map((r, i) => {
        const el = $('#pp' + i);
        const p = Math.max(0, Number(el ? el.value : r.price) || 0);
        return { pid: r.product.id, qty: r.qty, mat: r.mat, price: Math.round(p * 100) / 100 };
      });
      const c = customer();
      const calc = E.quoteCalc(items.map(it => ({ pid: it.pid, qty: it.qty, mat: it.mat })), c);
      const amount = Math.round(items.reduce((s, it) => s + it.price * it.qty, 0) * 100) / 100;
      const total = Math.round((amount + calc.freight) * 100) / 100;
      const note = ($('#ppNote') || {}).value || '';
      const no = S.quoteMeta.no || autoNo();
      const qid = 'Q' + Date.now();
      S.quotes.push({
        id: qid, no, customer: c.name, customerId: c.id, total, amount, freight: calc.freight,
        date: S.quoteMeta.date, items, note, sent: true
      });
      S.quoteMeta.no = '';
      if (!Array.isArray(S.custMsgs)) S.custMsgs = [];
      S.custMsgs.push({
        from: 'bot', time: chatTime(),
        text: LZ(`报价单 ${no}：${items.length} 个款号，合计 $${money(total)}（含运费 $${money(calc.freight)}）。${note ? '备注：' + note : ''}`,
          `Quotation ${no}: ${items.length} items, total $${money(total)} (freight $${money(calc.freight)}). ${note ? 'Note: ' + note : ''}`)
,
        acts: '<button class="btn xs primary" data-act="viewQuote" data-id="' + qid + '">' + LZ('查看报价单', 'View quote') + '</button>'
      });
      save();
      closeModal();
      vQuote();
      modal(LZ('报价已发给客户', 'Price sent to the customer'), `<div style="text-align:center;padding:8px 0">
        <div style="font-size:30px">✅</div>
        <div style="font-weight:700;font-size:15px;margin:8px 0">${LZ('报价已发给客户', 'Price sent to the customer')}</div>
        <div class="mono" style="font-size:20px;letter-spacing:1px">${esc(no)}</div>
        <div class="small muted" style="margin-top:8px">${esc(c.name)} · ${LZ('合计', 'Total')} <b>$${money(total)}</b></div>
        <div class="tiny muted" style="margin-top:10px">${LZ('客户登录后，在右下角「客服解答」里能看到这条报价。', 'The customer sees it in the Support panel after login.')}</div></div>`,
        `<button class="btn primary" data-act="closeModal">${LZ('知道了', 'Got it')}</button>`);
      toast(LZ('报价 ' + no + ' 已发送', 'Quote ' + no + ' sent'));
      if (!NO_NET && window.SYN && SYN.available()) {
        const o = (S.quotes || [])[S.quotes.length - 1];
        if (o) SYN.add('quotes', Object.assign({}, o, { custKey: custKeyOf(c), t: Date.now() }));
      }
      PRICE_ROWS = [];
    },
    askPrice(pid) {
      const items = pid ? [{ pid, qty: 100 }] : cartRows().map(r => ({ pid: r.pid, qty: r.qty }));
      if (!items.length) { toast(LZ('先把款号加入报价，再来询价', 'Add a style to the quote first')); return; }
      RQ = items;
      const rows = items.map((it, i) => {
        const p = D.products.find(x => x.id === it.pid);
        return `<tr><td class="mono b">${esc(p.code)}</td><td>${esc(pCat(p))}</td><td>${esc(p.dim || '—')}</td>
          <td><input id="rqQ${i}" type="number" min="1" step="1" value="${it.qty}" style="width:96px"></td></tr>`;
      }).join('');
      modal(`<div class="small muted mb">${LZ('填个数量就行，我们按阶梯价回你，不用猜款号。', 'Just give us a quantity; we reply with tier pricing.')}</div>
        <table style="font-size:12.5px"><thead><tr><th>款号</th><th>类型</th><th>尺码</th><th>${LZ('数量','Qty')}</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="field" style="margin-top:10px"><label>${LZ('备注 / 款式系列 / 目的地','Note / series / destination')}</label>
        <input id="rqNote" placeholder="${LZ('如：奶油小方 圆领卫衣 110 码，发墨西哥', 'e.g. Cream Crew sweatshirt size 110, to Mexico')}"></div>`,
        `<button class="btn" data-act="closeModal">${LZ('取消','Cancel')}</button>
         <button class="btn primary" data-act="sendInquiry">${LZ('提交询价','Send inquiry')}</button>`);
    },
    sendInquiry() {
      const items = (RQ || []).map((it, i) => {
        const el = $('#rqQ' + i);
        return { pid: it.pid, qty: Math.max(1, parseInt(el ? el.value : it.qty, 10) || 1) };
      });
      const note = ($('#rqNote') || {}).value || '';
      const r = A.submitInquiry(items, note);
      if (!r.ok) { toast(r.msg || '提交失败'); return; }
      const u = A.me();
      closeModal();
      modal(`<div style="text-align:center;padding:8px 0">
        <div style="font-size:30px">✅</div>
        <div style="font-weight:700;font-size:15px;margin:8px 0">${LZ('询价已提交','Inquiry sent')}</div>
        <div class="mono" style="font-size:20px;letter-spacing:1px">${esc(r.no)}</div>
        <div class="small muted" style="margin-top:8px">${LZ('我们会在 2 小时内回复到这个联系方式：','We will reply within 2 hours to:')}<br><b>${esc(u.contact.value)}</b></div>
        <div class="tiny muted" style="margin-top:12px">${LZ('数量按阶梯价计算，运费按目的地另算。','Tier pricing applies; freight depends on destination.')}</div></div>`,
        `<button class="btn primary" data-act="closeModal">${LZ('知道了','Got it')}</button>`);
      /* 客户侧留档：把当前价格算一遍存成快照，以后改价也不会改历史 */
      try {
        const uu = A.me() || {};
        const cl = E.quoteCalc(items.map(it => ({ pid: it.pid, qty: it.qty, mat: '' })), customer());
        (S.myOrders = S.myOrders || []).unshift({
          id: 'SO' + Date.now(), no: r.no,
          at: new Date().toISOString().slice(0, 16).replace('T', ' '),
          cust: uu.company || uu.name || '', contact: (uu.contact || {}).value || '',
          incoterm: S.quoteMeta.incoterm || customer().incoterm, pay: S.quoteMeta.pay || customer().pay,
          rows: cl.rows.map(x => ({ code: x.product.code, mat: mName(D.materials.find(m => m.id === (x.mat || x.product.material)) || { id: '', name: '' }) || (x.mat || x.product.material), qty: x.qty, unit: x.unit, amt: x.amt })),
          amount: cl.amount, freight: cl.freight, total: cl.total,
          note, status: '已提交'
        });
        save();
      } catch (e) { }
      /* 服务器模式：把这张单推到共享区，员工在别的电脑上也能看到 */
      if (window.SYN && SYN.available() && (A.me() || {}).role === 'customer') {
        const uu2 = A.me() || {};
        SYN.add('inquiries', {
          no: r.no, userId: uu2.id, userName: uu2.name || '', company: uu2.company || '',
          contact: uu2.contact || {}, demo: !!uu2.demo, custKey: custKeyOf(uu2),
          items: items, note: note, t: Date.now()
        }).then(function () {
          const o = (S.myOrders || [])[0];
          if (o) SYN.add('settlements', Object.assign({ custKey: custKeyOf(uu2) }, o));
        });
      }      /* 客户还停在结算页：立刻刷新，好让「我的结算记录」马上多一行 */
      if (A.me() && A.me().role === 'customer' && S.tab === 'quote') vQuote();
      toast(LZ('询价 ' + r.no + ' 已提交', 'Inquiry ' + r.no + ' sent'));
      A.track('inquiry', { no: r.no, n: items.length });
      RQ = null;
    },
    loadInquiry(no) {
      const q = inquiriesAll().find(x => x.no === no);
      if (!q) { toast('询价单不存在'); return; }
      S.cart = q.items.map(it => ({ pid: it.pid, qty: it.qty, mat: (D.products.find(p => p.id === it.pid) || {}).material }));
      save(); ACT.tab('quote');
      toast(LZ('已载入 ' + q.items.length + ' 个款号，可直接生成报价', 'Loaded ' + q.items.length + ' items'));
    },
    async zipPack() {
      const rows = cartRows();
      if (!rows.length) { toast('先选款号'); return; }
      const no = S.quoteMeta.no || autoNo();
      toast(LZ('正在打包，含图片…', 'Packing, including images…'));
      const files = await E.packFiles({ customer: customer(), items: rows.map(r => ({ pid: r.pid, qty: r.qty, mat: r.mat })), no, date: S.quoteMeta.date });
      A.track('download', {});
      E.download(E.makeZip(files), `${no}_资料包.zip`);
      const imgs = files.filter(f => f.name.startsWith('img/')).length;
      toast(LZ(`ZIP 已生成：${files.length} 个文件（含 ${imgs} 张图）`, `ZIP ready: ${files.length} files, ${imgs} images`));
    },
    saveQuote() {
      const rows = cartRows(); if (!rows.length) { toast('先选款号'); return; }
      const c = customer(), calc = E.quoteCalc(rows.map(r => ({ pid: r.pid, qty: r.qty, mat: r.mat })), c);
      const q = { id: 'Q' + Date.now(), no: S.quoteMeta.no || autoNo(), customer: c.name, total: calc.total, date: S.quoteMeta.date, items: rows.map(r => ({ pid: r.pid, qty: r.qty, mat: r.mat })) };
      S.quotes.push(q); S.quoteMeta.no = ''; save(); vQuote(); toast('已保存 ' + q.no);
    },
    loadQuote(id) {
      const q = S.quotes.find(x => x.id === id); if (!q) return;
      S.cart = q.items.map(i => ({ ...i })); S.quoteMeta.no = q.no; save(); render(); toast('已载入 ' + q.no);
    },
    newFit() {
      modal('新增适穿关系', `
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px">
          <div class="field"><label>款式系列</label><select id="nfV">${D.vehicles.map(v => `<option value="${v.id}">${esc(v.brand + ' ' + v.series + ' ' + v.model)}</option>`).join('')}</select></div>
          <div class="field"><label>尺码段（可空）</label><select id="nfA"><option value="">按旧款确认</option>${D.axles.map(a => `<option value="${a.id}">${esc(a.brand + ' ' + a.model)}</option>`).join('')}</select></div>
          <div class="field"><label>版型</label><select id="nfP"><option>宽松</option><option>标准</option><option>修身</option></select></div>
          <div class="field"><label>款号（编号）</label><input id="nfC" placeholder="如 XM-SW-2601"></div>
          <div class="field"><label>适穿类型</label><select id="nfF"><option>同款</option><option>通用</option><option>相似款</option><option>原厂配套</option></select></div>
          <div class="field"><label>置信度</label><select id="nfConf"><option>中</option><option>高</option><option>低</option><option>已确认</option></select></div>
        </div>
        <div class="field mt-s"><label>消歧问题（一行一条）</label><textarea id="nfQ" placeholder="身高 108 是拿 110 还是 120？"></textarea></div>
        <div class="notice mt-s">新增关系默认进入待复核队列；「已确认」需有试穿/质检依据。</div>`,
        `<button class="btn" data-act="closeModal">取消</button><button class="btn primary" data-act="saveFit">保存</button>`);
    },
    saveFit() {
      const code = $('#nfC').value.trim();
      if (!code) { toast('请填写款号或编号'); return; }
      const pid = (E.codeFlat.find(c => E.norm(c.code) === E.norm(code)) || {}).pid;
      if (!pid) { toast('库里没有这个编号：' + code); return; }
      const f = {
        id: 'D' + Date.now(), vid: $('#nfV').value, aid: $('#nfA').value || null, pos: $('#nfP').value,
        pid, fit: $('#nfF').value, conf: $('#nfConf').value, src: '销售/研发手动录入',
        q: $('#nfQ').value.split('\n').map(s => s.trim()).filter(Boolean)
      };
      S.draftFits.push(f);
      const v = D.vehicles.find(x => x.id === f.vid), a = D.axles.find(x => x.id === f.aid);
      D.fitments.push({ ...f, code, vName: `${v.brand} ${v.series} ${v.model}`, aName: a ? `${a.brand} ${a.model}` : '按旧款确认' });
      save(); closeModal(); render(); toast('已加入待复核队列');
    },
    confirmFit(id) {
      const f = D.fitments.find(x => x.id === id); if (!f) return;
      f.conf = '已确认'; save();
      const v = D.vehicles.find(x => x.id === f.vid);
      if (v) v.fitCount = D.fitments.filter(x => x.vid === v.id).length;
      render(); toast('已确认为「已确认」');
    },
    copyAnswer(pid) {
      const p = E.byId.get(pid); if (!p) return;
      const fs = E.fitsByP.get(p.id) || [];
      const txt = `款号：${p.code}\n尺码：${p.dim || '按旧款核对'}\n面料：${D.materials.find(m => m.id === p.material).name}\n适穿：${fs.slice(0, 3).map(f => f.vName + '/' + f.aName).join('；') || '按旧款确认'}\n报价：$${money(E.priceOf(p.id, 100, customer()))}/件（100 件，FOB）\n\n如需确认：请拍孩子平铺的同款衣服 + 水洗标特写 + 身高对照门框各一张，2 小时内回复准确款号。`;
      navigator.clipboard?.writeText(txt).then(() => toast('话术已复制'), () => toast('复制失败，请手动选择'));
    },
    openLead(id) { openLead(id); },
    leadMatch(id) { const l = S.leads.find(x => x.id === id); if (l) { S.tab = 'select'; doMatch(l.needZh || l.need); } },
    leadToCart(id) {
      const l = S.leads.find(x => x.id === id); if (!l) return;
      const m = E.match(l.needZh || l.need);
      if (m.top) { ACT.addCart(m.top.pid); closeDrawer(); }
    },
    saveLead(id) {
      const l = S.leads.find(x => x.id === id); if (!l) return;
      l.status = $('#lStatus').value; l.next = $('#lNext').value;
      save(); closeDrawer(); render(); toast('已保存');
    },
    replyLead(id) {
      const l = S.leads.find(x => x.id === id); if (!l) return;
      const m = E.match(l.needZh || l.need);
      const v = m.parsed.vehicle;
      const tpl = D.templates[0];
      const body = tpl.body
        .replace('{{contact}}', l.contact)
        .replace('{{vehicle}}', v ? `${v.brand} ${v.series} ${v.model}` : (l.needZh || '').slice(0, 30))
        .replace('{{axleCount}}', v ? String(new Set((E.fitsByV.get(v.id) || []).map(f => f.aid)).size || 1) : '2')
        .replace('{{owner}}', l.owner || 'Sales');
      modal('回复话术 · ' + l.company, `<div class="small muted mb">可直接复制到 WhatsApp / 邮件。已按该客户询盘自动填充款式系列与尺码段数量。</div>
        <textarea style="min-height:260px;font-size:13px" id="replyBox">${esc(body)}</textarea>`,
        `<button class="btn" data-act="closeModal">关闭</button><button class="btn primary" data-act="copyReply">复制</button>`);
    },
    copyReply() {
      const t = $('#replyBox');
      navigator.clipboard?.writeText(t.value).then(() => toast('已复制'), () => toast('复制失败'));
    },
    newLead() {
      modal('录入询盘', `<div class="grid" style="grid-template-columns:1fr 1fr;gap:10px">
        <div class="field"><label>公司</label><input id="nlCo" placeholder="如 Transportes del Norte"></div>
        <div class="field"><label>国家</label><input id="nlCo2" placeholder="墨西哥"></div>
        <div class="field"><label>来源</label><select id="nlSrc">${['官网表单', 'WhatsApp', 'Facebook 评论', 'LinkedIn', '海关数据', '展会名片', '阿里巴巴询盘', '邮件'].map(s => `<option>${s}</option>`).join('')}</select></div>
        <div class="field"><label>联系人</label><input id="nlCt" placeholder="姓名（职位）"></div>
        <div class="field"><label>时区</label><select id="nlTz">${['Asia/Shanghai', 'Asia/Dubai', 'Asia/Riyadh', 'Asia/Jakarta', 'Asia/Ho_Chi_Minh', 'Asia/Kolkata', 'America/Mexico_City', 'America/Santiago', 'America/Lima', 'America/Bogota', 'Europe/Berlin', 'Africa/Lagos'].map(s => `<option>${s}</option>`).join('')}</select></div>
        <div class="field"><label>负责人</label><input id="nlOw" value="Sophia"></div>
      </div>
      <div class="field mt-s"><label>询盘原文</label><textarea id="nlNeed" placeholder="粘贴客户原话，系统会自动识别款式系列/尺码段/数量"></textarea></div>
      <div class="notice mt-s">保存后自动评分，并识别是终端还是贸易商。</div>`,
        `<button class="btn" data-act="closeModal">取消</button><button class="btn primary" data-act="saveNewLead">保存并评分</button>`);
    },
    saveNewLead() {
      const need = $('#nlNeed').value.trim();
      if (!need) { toast('请填写询盘原文'); return; }
      const l = {
        id: 'L-' + String(Date.now()).slice(-6), created: new Date().toISOString().slice(0, 16).replace('T', ' '),
        src: $('#nlSrc').value, company: $('#nlCo').value || '（未命名）', contact: $('#nlCt').value || '—',
        country: $('#nlCo2').value || '—', tz: $('#nlTz').value, need, needZh: need.slice(0, 80),
        status: '待跟进', score: 0, owner: $('#nlOw').value, next: '首次回复', nextDate: new Date().toISOString().slice(0, 10), product: []
      };
      const m = E.match(need);
      l.product = m.top ? [m.top.product.code] : [];
      l.score = E.scoreLead(l).score;
      S.leads.push(l); save(); closeModal(); S.tab = 'leads'; render(); toast('已录入，评分 ' + l.score);
    },
    packCfg(k) { S.packCfg[k] = !S.packCfg[k]; vPack(); },
    exportProducts() {
      const rows = [['code', 'sku', 'cat', 'nameEn', 'dim', 'material', 'brand', 'moq', 'pack', 'price', 'hs']]
        .concat(D.products.map(p => [p.code, p.sku, p.cat, p.nameEn, p.dim, p.material, p.brand, p.moq, p.pack.per, p.price, p.hs]));
      E.download(new Blob(['\ufeff' + E.csv(rows)], { type: 'text/csv' }), '小满童装产品目录.csv');
    },
    exportJson() {
      const blob = new Blob([JSON.stringify({ meta: D.meta, stats: D.stats, products: D.products, codes: D.codes, vehicles: D.vehicles, axles: D.axles, fitments: D.fitments, tests: D.tests, leads: S.leads, quotes: S.quotes }, null, 1)], { type: 'application/json' });
      E.download(blob, 'guanying-snapshot.json');
    },
    resetData() {
      if (!confirm('将清空本机修改（线索、报价、手动适穿），恢复默认数据。继续？')) return;
      localStorage.removeItem(KEY); location.reload();
    },
    /* ---- 增加客户（手动 / 拍照名片） ---- */
    addCustSave() {
      const st = S.addCust;
      const tags = String(st.tags || '').split(/[,，;；]/).map(s => s.trim()).filter(Boolean);
      const r = A.addCustomer({
        name: st.name, company: st.company, country: st.country, type: st.type, value: st.value,
        tags, note: st.note, source: st.ocr ? 'card' : 'manual'
      });
      if (!r.ok) { toast(r.msg); return; }
      toast((r.isNew ? '已新增客户：' : '已更新客户：') + r.user.name + (st.ocr ? '（名片导入）' : '（手动录入）'));
      S.addCust = defaultAddCust();
      vAddCustomer();
    },
    addCustReset() { S.addCust = defaultAddCust(); vAddCustomer(); toast('已清空表单'); },
    addCustClearPhoto() {
      S.addCust.photo = ''; S.addCust.ocr = false; S.addCust.scanning = false;
      vAddCustomer();
    },
    addCustOcr() {
      const st = S.addCust;
      if (!st.photo) { toast('先拍照或选一张名片图片'); return; }
      st.scanning = true; st.ocr = false;
      vAddCustomer();
      clearTimeout(OCR_T);
      OCR_T = setTimeout(() => {
        const d = CARD_DEMO[OCR_I++ % CARD_DEMO.length];
        Object.assign(st, d, { scanning: false, ocr: true });
        vAddCustomer();
        toast('名片已识别（演示），核对左侧字段后点「保存客户」');
      }, 900);
    },
    /* ---- 画像 / 内容 ---- */
    persona(id) { openPersona(id); },
    dmPersona(id) {
      const p = SOCIAL.personas.find(x => x.id === id); if (!p) return;
      const sku = (p.tags[0] || 'XM-SW-2601');
      const txt = `Hi ${p.name.split(' ')[0]},\n\nI saw your post about ${p.tags.join(' / ') || 'kids clothing'} — that is exactly what we make.\n\nWe are XIAOMAN KIDS, a kids' apparel factory in Huzhou, China (GB 31701-2015, OEKO-TEX 100 for part of the range). For ${sku} we can offer $${money(E.priceOf((E.codeFlat.find(c => E.norm(c.code) === E.norm(sku)) || {}).pid || D.products[0].id, 100, customer()))}/pc at 100 pcs.\n\nIf you send a photo of the care label next to the garment, I will confirm the exact style code within 2 hours — no need to guess the size.\n\nWould you like our catalogue + QC report?\n\nBest,\n${p.country === '中国' ? 'XIAOMAN KIDS Team' : 'Sophia | HUZHOU XIAOMAN KIDS APPAREL'}`;
      modal('私信草稿 · ' + p.name, `<div class="small muted mb">按该账号的语种/市场/关注系列生成，可直接改。演示账号数据，接平台 API 后可自动带入最近作品。</div>
        <textarea style="min-height:280px;font-size:13px" id="dmBox">${esc(txt)}</textarea>`,
        `<button class="btn" data-act="closeModal">关闭</button><button class="btn primary" data-act="copyDm">复制</button>`);
    },
    copyDm() { const t = $('#dmBox'); navigator.clipboard?.writeText(t.value).then(() => toast('已复制'), () => toast('复制失败')); },
    useTopic(vid) {
      const v = SOCIAL.videos.find(x => x.id === vid); if (!v) return;
      const hit = E.codeFlat.find(c => E.norm(c.code) === E.norm(v.model));
      S.content.market = v.country; S.content.lang = v.lang; S.content.platform = v.platform;
      if (hit) S.content.pid = hit.pid;
      S.tab = 'content'; genScript(); toast('已按选题生成脚本');
    },
    genScript() {
      const cfg = S.content;
      S.script = SOCIAL.makeScript({ product: E.byId.get(cfg.pid) || D.products[0], lang: cfg.lang, platform: cfg.platform, market: cfg.market, pain: cfg.pain, seconds: cfg.seconds });
      if (S.tab === 'content') { vContent(); setTimeout(() => $('#scriptOut')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60); }
    },
    copyPrompt() {
      const sc = S.script || (genScript(), S.script);
      navigator.clipboard?.writeText(sc.prompt).then(() => toast('AI 提示词已复制，可粘贴到任意大模型'), () => toast('复制失败'));
    },
    copyScript() {
      const sc = S.script; if (!sc) return;
      const txt = `${sc.title}\n\n【中文分镜】\n${sc.board.join('\n')}\n\n【口播】\n${sc.voice}\n\n【拍摄清单】\n${sc.shots.join('、')}\n\n【标签】\n${sc.tags.join(' ')}`;
      navigator.clipboard?.writeText(txt).then(() => toast('脚本已复制'), () => toast('复制失败'));
    },
    /* ---- 聊天浮窗 ---- */
    csSend() { csSay($('#csInput') ? $('#csInput').value : ''); },
    sqBuild() { window.SEARCHX.readForm(document); vSearch(); },
    sqCopy(id) { window.SEARCHX.copy(+id); },
    sqCopyAll() { window.SEARCHX.copyAll(); },
    sqOpen(id) { const [i, eng] = String(id).split(':'); window.SEARCHX.open(+i, eng); },
    sqPreCopy(id) { window.SEARCHX.presetCopy(+id); },
    sqPreOpen(id) { const [i, eng] = String(id).split(':'); window.SEARCHX.presetOpen(+i, eng); },
    sqPreAll() { window.SEARCHX.presetAll(); },
    sqPreMode(id) { window.SEARCHX.setPresetMode(id); vSearch(); },
    sqSave() {
      const v = k => { const el = document.getElementById(k); return el ? el.value.trim() : ''; };
      const co = v('sqCo');
      if (!co) { toast('先填公司名'); return; }
      const lead = {
        id: 'L' + Date.now(), company: co, country: v('sqCountry') || '',
        contact: '', need: v('sqNote') || '', needZh: v('sqNote') || '',
        src: '检索式' + (v('sqUrl') ? ' · ' + v('sqUrl') : ''), kind: v('sqKind'),
        status: '待跟进', created: new Date().toISOString().slice(0, 16).replace('T', ' '),
        tz: 'Asia/Shanghai', score: 60, product: []
      };
      S.leads.unshift(lead);
      save();
      toast('已加入线索：' + co);
      ACT.tab('leads');
    },
    xrefGo() {
      const el = document.getElementById('xrefQ');
      window.XREF.setQ(el ? el.value : '');
      vXref();
    },
    xrefQuick(id) { window.XREF.setQ(id); vXref(); },
    dealAdd() {
      const v = id => { const el = $('#' + id); return el ? el.value : ''; };
      const code = String(v('dCode') || '').trim();
      if (!code) { toast('先填款号'); return; }
      const p = D.products.find(x => x.code === code);
      const custRaw = v('dCust') || '|';
      const customer = custRaw.split('|')[0], country = custRaw.split('|')[1] || '';
      const qty = Math.max(1, Number(v('dQty')) || 1);
      const price = Number(v('dPrice')) || (p ? p.price : 0);
      const amount = Number(v('dAmount')) || Math.round(qty * price * 100) / 100;
      const me = A.me() || {};
      S.deals.unshift({
        id: 'D' + Math.random().toString(36).slice(2, 8),
        code, pname: p ? (p.nameEn || '') : '', qty, price, amount,
        status: v('dStatus') || '已成交', date: v('dDate') || new Date().toISOString().slice(0, 10),
        staff: me.name || '未分配', customer, country, note: v('dNote') || ''
      });
      save(); toast('已登记：' + code + ' · ' + customer); vDeals();
    },
    /** 点开一条成交记录 → 看这一单的全部信息 */
    dealOpen(id) {
      const ctx = dealCtx();
      const v = window.DEALS.dealDetail ? window.DEALS.dealDetail(ctx, id) : null;
      if (!v) { toast(LZ('这条记录不存在了', 'This record no longer exists')); return; }
      modal(v.title, v.body, v.footer);
    },
    /** 详情里直接改状态（st 从按钮 data-st 取） */
    dealTo(id, el) {
      const st = (typeof el === 'string') ? el : (el && el.dataset ? el.dataset.st : '');
      const d = (S.deals || []).find(x => x.id === id);
      if (!d || !st) return;
      d.status = st;
      save();
      closeModal();
      render();
      toast(LZ('状态已改为：', 'Status: ') + st);
    },
    /** 详情里把这一单整体加进报价单 */
    dealToQuote(id) {
      const d = (S.deals || []).find(x => x.id === id);
      if (!d) return;
      const p = D.products.find(x => x.code === d.code);
      if (!p) { toast(LZ('产品库里没有这个款号', 'Not in the catalog')); return; }
      const qty = +d.qty || 100;
      const hit = S.cart.find(x => x.pid === p.id);
      if (hit) hit.qty += qty; else S.cart.push({ pid: p.id, qty, mat: p.material });
      save(); closeModal(); renderNav();
      toast(LZ('已加入报价单：', 'Added to quote: ') + p.code + ' × ' + qty);
      S.tab = 'quote'; render();
    },
    dealSet(id) {
      const el = document.querySelector('select[data-act="dealSet"][data-id="' + id + '"]');
      const d = (S.deals || []).find(x => x.id === id);
      if (!d || !el) return;
      d.status = el.value;
      save(); toast('状态已改为：' + el.value);
      if (S.tab === 'boss') vBoss(); else vDeals();
    },
    dealDel(id) {
      S.deals = (S.deals || []).filter(x => x.id !== id);
      save(); toast('已删除'); vDeals();
    },
    /** 待跟进客户 → 跟进：打开这个客户的浏览履历 + 带话术的发送框 */
    fuContact(uid) {
      openCustomer(uid);
    },
    /** 待跟进客户 → 登记：把客户信息填进下面的登记表 */
    fuDeal(uid) {
      const u = A.customers().find(x => x.id === uid);
      if (!u) { toast(LZ('这个客户不在了', 'Customer not found')); return; }
      const sel = $('#dCust');
      if (sel) {
        const want = (u.company || u.name) + '|' + (u.country || '');
        const hit = [...sel.options].find(o => o.value === want);
        if (hit) sel.value = want;
        else {
          const o = document.createElement('option');
          o.value = want; o.textContent = (u.company || u.name) + ' · ' + (u.country || '');
          sel.appendChild(o); sel.value = want;
        }
      }
      /* 带出他问过的第一个款号 */
      const f = window.DEALS.followups(dealCtx()).find(x => x.uid === uid);
      if (f && f.wantCodes.length) {
        const codeEl = $('#dCode');
        if (codeEl) { codeEl.value = f.wantCodes[0]; codeEl.dispatchEvent(new Event('change')); }
      }
      const box = $('#dCode');
      if (box && box.scrollIntoView) box.scrollIntoView({ block: 'center', behavior: 'smooth' });
      toast(LZ('已带到登记表：' + (u.company || u.name), 'Prefilled: ' + (u.company || u.name)));
    },
    /** 标记「这个客户不用跟了」 */
    fuMute(uid) {
      S.fuMute = S.fuMute || {};
      const on = !S.fuMute[uid];
      if (on) S.fuMute[uid] = 1; else delete S.fuMute[uid];
      save(); vDeals();
      toast(on ? LZ('已忽略，不再提醒', 'Muted') : LZ('已恢复跟进', 'Restored'));
    },
    /** 点截图放大看原图 */
    fuZoom(src) {
      if (!src) return;
      modal('<div class="small muted">' + LZ('聊天记录截图', 'Chat screenshot') + '</div>',
        '<img class="fu-note-preview" src="' + src + '" alt="chat">',
        '<button class="btn" data-act="closeModal">' + LZ('关闭', 'Close') + '</button>', true);
    },
    /** 点小旗循环切换紧急度：无 → 红(最急) → 黄(较急) → 蓝(一般) → 无 */
    fuFlagCycle(uid) {
      S.fuFlags = S.fuFlags || {};
      const seq = ['red', 'yellow', 'blue', ''];
      const cur = S.fuFlags[uid] || '';
      const next = seq[(seq.indexOf(cur) + 1) % seq.length];
      if (next) S.fuFlags[uid] = next; else delete S.fuFlags[uid];
      save();
      const FLAG = (window.DEALS && window.DEALS.FLAG) || {};
      const nm = next && FLAG[next] ? LZ(FLAG[next].l[0], FLAG[next].l[1]) : LZ('未标', 'none');
      toast(LZ('紧急度：', 'Urgency: ') + nm);
      renderFollowupsInPlace();
    },
    /** 按紧急度筛选 */
    fuFilter(k) {
      S.fuFilter = k || 'all';
      renderFollowupsInPlace();
    },
    /** 给客户加备注：文字 + 聊天截图（可多张） */
    fuNote(uid) {
      const u = A.customers().find(x => x.id === uid);
      if (!u) { toast(LZ('这个客户不在了', 'Customer not found')); return; }
      const old = (S.fuNotes || {})[uid];
      const oldTxt = old ? (old.text || '') : '';
      const oldImgs = (old && old.imgs) || [];
      modal(
        '<div class="small muted mb">' + LZ('记下沟通要点，或贴上别的平台（WhatsApp / 微信 / TikTok）的聊天截图。老板端能看到这些内容。',
          'Note key points or attach chat screenshots from WhatsApp / WeChat / TikTok. The owner sees this.') + '</div>' +
        '<div class="field"><label>' + LZ('备注文字', 'Note') + '</label>' +
        '<textarea id="fuNoteText" rows="5" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:9px;font-family:inherit;font-size:13px;resize:vertical" placeholder="' +
        LZ('如：客户要 500 件 奶油小方 圆领卫衣 110 码，压价到 4.2，答应下周给样品', 'e.g. wants 500 pcs Cream Crew sweatshirt size 110, price push to 4.2, sample next week') + '">' + esc(oldTxt) + '</textarea></div>' +
        '<div class="field" style="margin-top:10px"><label>' + LZ('聊天截图', 'Chat screenshots') + '</label>' +
        '<input id="fuNoteImgs" type="file" accept="image/*" multiple style="font-size:12px">' +
        '<div class="tiny muted" style="margin-top:4px">' + LZ('可多选；图片压到 900px 宽存本机，不占太多空间。',
          'Multiple files; resized to 900px and stored locally.') + '</div>' +
        '<div id="fuNotePrev" class="fu-shots" style="margin-top:8px"></div></div>' +
        (oldImgs.length ? '<div class="tiny muted" style="margin-top:8px">' + LZ('已有 ', 'Existing ') + oldImgs.length + LZ(' 张截图，保存后会被替换', ' screenshots will be replaced') + '</div>' : ''),
        '<button class="btn" data-act="closeModal">' + LZ('取消', 'Cancel') + '</button>' +
        '<button class="btn primary" data-act="fuSaveNote" data-id="' + esc(uid) + '">' + LZ('保存备注', 'Save note') + '</button>',
        true
      );
      /* 选图后即时预览 */
      setTimeout(() => {
        const inp = $('#fuNoteImgs');
        if (inp) inp.onchange = () => {
          const box = $('#fuNotePrev');
          if (!box) return;
          box.innerHTML = '';
          [...(inp.files || [])].slice(0, 6).forEach(f => {
            const img = document.createElement('img');
            img.className = 'fu-shot';
            img.src = URL.createObjectURL(f);
            box.appendChild(img);
          });
        };
      }, 30);
    },
    /** 保存备注：文字立即存；图片压到 900px 转 dataURL 存 localStorage */
    fuSaveNote(uid) {
      const txtEl = $('#fuNoteText');
      const txt = txtEl ? txtEl.value.trim() : '';
      const inp = $('#fuNoteImgs');
      const files = inp && inp.files ? [...inp.files].slice(0, 6) : [];
      const me = A.me() || {};
      const stamp = (() => {
        const d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' +
          String(d.getDate()).padStart(2, '0') + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
      })();

      const done = imgs => {
        if (!txt && !imgs.length) { toast(LZ('没有内容可存', 'Nothing to save')); return; }
        S.fuNotes = S.fuNotes || {};
        S.fuNotes[uid] = { text: txt, imgs, by: me.name || LZ('未署名', 'Unassigned'), at: stamp, role: me.role || '' };
        save();
        closeModal();
        toast(LZ('备注已保存，老板端可见', 'Note saved — visible to the owner'));
        renderFollowupsInPlace();
      };

      if (!files.length) {
        /* 没选新图：保留之前存的图 */
        const prev = (S.fuNotes || {})[uid];
        done((prev && prev.imgs) || []);
        return;
      }
      /* 压缩：最长边 900px，JPEG 0.72 */
      Promise.all(files.map(f => new Promise(res => {
        const rd = new FileReader();
        rd.onload = () => {
          const img = new Image();
          img.onload = () => {
            try {
              const max = 900;
              const sc = Math.min(1, max / Math.max(img.width, img.height));
              const cv = document.createElement('canvas');
              cv.width = Math.round(img.width * sc); cv.height = Math.round(img.height * sc);
              cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
              res(cv.toDataURL('image/jpeg', 0.72));
            } catch (e) { res(rd.result); }
          };
          img.onerror = () => res(rd.result);
          img.src = rd.result;
        };
        rd.onerror = () => res('');
        rd.readAsDataURL(f);
      }))).then(list => {
        const imgs = list.filter(Boolean);
        /* 存不下就提示，别静默失败 */
        const prevNotes = JSON.stringify(S.fuNotes || {});
        const test = imgs.reduce((n, s) => n + s.length, 0);
        if (prevNotes.length + test > 4.2 * 1024 * 1024) {
          toast(LZ('截图太大，超出本机存储上限，只存了文字', 'Images too large for local storage — text saved'));
          done([]);
          return;
        }
        done(imgs);
      }).catch(() => done([]));
    },
    rfPlat(id) { window.REDFOX.setPlatform(id); vRedfox(); },
    rfRetry() { window.REDFOX.retry(() => vRedfox()); },
    rfKind(id) { window.REDFOX.setKind(id); vRedfox(); },
    rfKeySet() { if (window.REDFOX.askKey()) window.REDFOX.sync(() => vRedfox(), true); },
    rfQuery() { window.REDFOX.runQuery(() => vRedfox()); },
    rfImportLead() {
      window.REDFOX.importLead({
        addLead: (lead) => { S.leads.unshift(lead); save(); renderNav(); }
      });
      vRedfox();
    },
    rfProfile(id) { window.REDFOX.openProfile(Number(id), { esc, LZ, modal }); },
    rfCopyName(id) { window.REDFOX.copyName(Number(id)); },
    rfLeadFrom(id) {
      window.REDFOX.leadFrom(Number(id), {
        addLead: (lead) => { S.leads.unshift(lead); save(); renderNav(); }
      });
    },
    rfSaveIdea() { window.REDFOX.saveIdea(); vRedfox(); },
    rfCopy() { window.REDFOX.copyJson(); },
    rfCopyMcp() { window.REDFOX.copyMcp(); },
    rfClearRes() { window.REDFOX.clearRes(); vRedfox(); },
    /* 工具书 */
    taxCty(id) { S.tax.country = id; save(); vTax(); },
    modelGo() {
      const i = $('#mdQ'); const q = i ? i.value.trim() : '';
      S.model.q = q; S.model.res = []; S.model.err = '';
      if (!q) { vModel(); return; }
      S.model.busy = true; vModel();
      fetch('/api/lookup?q=' + encodeURIComponent(q))
        .then(r => r.json())
        .then(j => {
          S.model.busy = false;
          if (!j.ok) { S.model.err = '联网查询失败：' + (j.error || '未知'); S.model.res = []; }
          else { S.model.res = j.items || []; S.model.err = (j.items && j.items.length) ? '' : '没搜到结果，换个写法试试'; }
          vModel();
        })
        .catch(e => { S.model.busy = false; S.model.err = '请求失败（本地服务没开？）: ' + e.message; vModel(); });
    },
    modelOpen(id) { S.filters.q = id; S.tab = 'products'; renderNav(); render(); },
    fxGo() {
      S.fx.busy = true; S.fx.err = ''; vFx();
      fetch('/api/fx')
        .then(r => r.json())
        .then(j => {
          S.fx.busy = false;
          if (j.ok) { S.fx.rates = j.rates || {}; S.fx.at = j.updated || ''; S.fx.err = ''; save(); }
          else S.fx.err = LZ('联网取汇率失败，仍在用内置参考汇率：', 'Live rates unavailable, still using built-in: ') + (j.error || '');
          vFx();
        })
        .catch(e => { S.fx.busy = false; S.fx.err = LZ('请求失败（本地服务没开？）: ', 'Request failed (is the local server running?): ') + e.message; vFx(); });
    },
    fxSwap() { const a = S.fx.from; S.fx.from = S.fx.to; S.fx.to = a; save(); vFx(); },
    fxPick(c) { S.fx.to = c; save(); vFx(); },
    /* 售后服务 */
    asSend() {
      const u = A.me() || {};
      const g = id2 => { const el2 = $('#' + id2); return el2 ? el2.value.trim() : ''; };
      const model = g('asModel'), contact = g('asContact'), desc = g('asDesc');
      if (!model || !contact || !desc) { toast(LZ('款号、联系方式、情况说明都要填', 'Style code, contact and description are required')); return; }
      const rec = {
        id: 'AS' + Date.now(), at: new Date().toISOString().slice(0, 16).replace('T', ' '),
        cust: u.name || '客户', company: u.company || '', model,
        vehicle: g('asVeh'), type: g('asType'), qty: g('asQty'), contact, desc, status: '待处理'
      };
      S.asStaff.push(Object.assign({}, rec));
      S.asBoss.push(Object.assign({}, rec));
      save(); vAfterSale();
      if (window.SYN && SYN.available()) SYN.add('aftersales', Object.assign({}, rec, { deletedBy: [] }));
      toast(LZ('已提交，销售和老板都会看到', 'Submitted — sales and owner can see it'));
    },
    asSt(id, t) {
      const st = t.dataset.st;
      const arr = A.isBoss() ? S.asBoss : S.asStaff;
      const r = arr.find(x => x.id === id);
      if (r) { r.status = st; save(); vAfterSales(); }
    },
    asDel(id) {
      const arr = A.isBoss() ? S.asBoss : S.asStaff;
      const i = arr.findIndex(x => x.id === id);
      if (i >= 0) {
        const rec = arr[i];
        arr.splice(i, 1); save(); vAfterSales();
        if (window.SYN && SYN.available() && rec.net !== undefined && rec.id) {
          const who = A.isBoss() ? 'boss' : 'staff';
          const cur = (SYN.list('aftersales') || []).find(x => x.id === rec.id);
          if (cur) SYN.patch('aftersales', rec.id, { deletedBy: (cur.deletedBy || []).concat([who]) });
        }
        toast(LZ('已删除（只删这边这份）', 'Deleted on this side only'));
      }
    },
    bossStaff(name) {
      if (!name) return;
      S.leadsOwner = String(name); S.tab = 'leads'; renderNav(); render();
      toast(LZ('只看 ' + name + ' 跟进的客户', 'Showing leads of ' + name));
    },
    leadsOwnerClear() { S.leadsOwner = ''; renderNav(); render(); },
    xrefAdd(id) {
      const p = E.byId.get(id); if (!p) return;
      const hit = S.cart.find(x => x.pid === id);
      if (hit) hit.qty += 100; else S.cart.push({ pid: id, qty: 100, mat: p.material });
      save(); toast(`已加入 ${p.code} × 100`); renderNav();
    },
    csQuick(id) { csSay(id); },
    openPerm() { openPerm(); },
    closePerm() { closePerm(); },
    chatToggle() { S.chat.open = !S.chat.open; renderChat(); },
    chatNext() { pushChat(false); },
    /** 客服解答：对话记录（只留聊天，不再混浏览足迹） */
    chatHistory() {
      const zh = I.getLang() === 'zh';
      const staff = A.isStaff();
      const me = A.me();
      const convo = staff ? (S.chat.msgs || []).slice() : (S.custMsgs || []).slice();
      const c0 = staff ? A.customers()[0] : null;
      const who = staff ? (c0 ? c0.name : '') : (me && me.name ? me.name : '');

      const convoHtml = convo.length ? convo.map(m => {
        const isMe = m.from === 'me';
        const label = isMe ? CT('custLabel') : CT('staffLabel');
        const head = staff
          ? '<span class="tag b" style="margin-right:6px">' + esc(m.ch || '—') + '</span>' + esc(m.from || '') + ' · ' + esc(m.time || '')
          : esc(m.time || '');
        const line = staff
          ? '<div class="hx-t"><span class="hx-who">' + head + '</span>' + esc(m.text || '') + '</div>'
          : '<span class="hx-who">' + label + '</span><span class="hx-t">' + esc(m.text || '') + '</span><span class="hx-time">' + esc(m.time || '') + '</span>';
        return '<div class="hx-row ' + (isMe ? 'me' : 'bot') + '">' + line + '</div>';
      }).join('') : '<div class="hx-empty">' + CT('histEmpty') + '</div>';

      modal(LZ('对话记录', 'Conversation'),
        '<div class="hx-sec"><div class="hx-h">' + CT('histTitle') + (who ? ' · ' + esc(who) : '') + '</div>' +
        '<div class="hx-thread">' + convoHtml + '</div></div>',
        '<button class="btn" data-act="closeModal">' + LZ('关闭', 'Close') + '</button>');
    },
    /** 「自定义定制」是一个独立页面 */
    customOpen() { ACT.tab('custom'); },
    customSubmit() {
      const v = id => { const el = $('#' + id); return el ? String(el.value || '').trim() : ''; };
      const prod = v('cuProd'), need = v('cuNeed');
      if (!prod || !need) { toast(LZ('产品和改动内容都要填', 'Product and requirement are required')); return; }
      const qty = Math.max(1, Number(v('cuQty')) || 100);
      const contact = v('cuContact');
      const txt = LZ('定制需求', 'Custom request') + '：' + prod + ' × ' + qty + '；' + need;
      if (!Array.isArray(S.custMsgs)) S.custMsgs = [];
      S.custMsgs.push({ from: 'me', text: txt, time: chatTime() });
      S.custMsgs.push({ from: 'bot', text: LZ('收到，定制需求已登记，工艺和打样价 2 小时内回你：', 'Logged. Tooling and sample price within 2 hours to: ') + contact, time: chatTime() });
      save();
      CU_SENT = { prod: prod, qty: qty, need: need, contact: contact, time: chatTime() };
      toast(LZ('已提交，客服会回你', 'Submitted — we will reply'));
      render();
    },
    chatClear() { S.chat.msgs = []; S.chat.idx = 0; $('#chatAlert').classList.remove('on'); renderChat(); $('#chatBadge').style.display = 'none'; },
    chatAuto() { S.chat.auto = !S.chat.auto; renderChat(); },
    chatAdd(pid) { ACT.addCart(pid, null, null); },
    chatReply(pid) {
      const p = E.byId.get(pid); if (!p) return;
      const txt = `Thanks for your message. For the item you mentioned, our code is ${p.code} — ${p.nameEn || pCat(p)}, ${p.dim || 'size per spec sheet'}, ${D.materials.find(m => m.id === p.material).name}.\nPrice: $${money(E.priceOf(p.id, 100, customer()))}/pc at 100 pcs, FOB Shanghai.\nIf you send a photo of the care label next to the garment, I will double-check the style code before you order.`;
      navigator.clipboard?.writeText(txt).then(() => toast('回复已复制'), () => toast('复制失败'));
    },
    chatAskPhoto() {
      const txt = '不用提供编号也能定：请拍 3 张照片 —— ① 孩子平铺的同款衣服 ② 水洗标特写 ③ 身高对照门框。照片回来 2 小时内给款号和价格。';
      navigator.clipboard?.writeText(txt).then(() => toast('话术已复制'), () => toast('复制失败'));
    },
    chatAlertGo(pid) { ACT.openProduct(pid); },
    /* ---- 热度 / 款式系列榜 ---- */
    contentFor(pid) {
      const p = E.byId.get(pid); if (!p) return;
      S.content.pid = pid; S.tab = 'content'; genScript(); toast(`已按 ${p.code} 生成内容选题`);
    },
    copyHeat(pid) {
      const p = E.byId.get(pid); if (!p) return;
      const rows = productVehicles(p);
      if (!rows.length) { toast('该款号暂无适穿款式系列'); return; }
      const txt = `【${p.code}】常用款式系列（按社媒点赞量排序）\n` + rows.map((r, i) =>
        `${i + 1}. ${r.vName}｜${[...r.axles].join('/') || '按旧款'}｜${[...r.pos].join('/')}版｜${[...r.codes].join('/')}｜点赞 ${r.heat.likes}（${r.heat.count} 条内容）`
      ).join('\n') + `\n\n数据来源：小满童装选款与报价中台（点赞为演示口径）`;
      navigator.clipboard?.writeText(txt).then(() => toast('款式系列清单已复制'), () => toast('复制失败'));
    },
    runImport() {
      const type = $('#impType').value, text = $('#impText').value.trim();
      if (!text) { toast('请粘贴内容'); return; }
      const lines = text.split(/\r?\n/).filter(Boolean);
      const out = [];
      let ok = 0, bad = 0;
      lines.slice(1).forEach((line, i) => {
        const cols = line.split(/\t|,/).map(s => s.trim().replace(/^"|"$/g, ''));
        try {
          if (type === 'fit') {
            const [vName, aName, pos, code, fit, conf, src] = cols;
            const v = D.vehicles.find(x => (x.brand + x.series + x.model).includes(vName) || vName.includes(x.model));
            const pid = (E.codeFlat.find(c => E.norm(c.code) === E.norm(code)) || {}).pid;
            if (!v || !pid) throw new Error(!pid ? '款号不存在：' + code : '款式系列不存在：' + vName);
            const a = D.axles.find(x => (x.brand + x.model).includes(aName) || aName.includes(x.model));
            S.draftFits.push({ id: 'I' + Date.now() + i, vid: v.id, aid: a ? a.id : null, pid, pos: pos || '标准', fit: fit || '通用', conf: conf || '中', src: src || 'CSV 导入', q: [] });
            D.fitments.push({ id: 'I' + Date.now() + i, vid: v.id, aid: a ? a.id : null, pid, pos: pos || '标准', fit: fit || '通用', conf: conf || '中', src: src || 'CSV 导入', q: [], code, vName: `${v.brand} ${v.series} ${v.model}`, aName: a ? `${a.brand} ${a.model}` : '按旧款确认' });
          } else if (type === 'prod') {
            const [code, dim, mat, price, moq] = cols;
            const p = D.products.find(x => E.norm(x.code) === E.norm(code));
            if (!p) throw new Error('款号不存在：' + code);
            if (dim) { p.dim = dim; p.dimStatus = '已录入'; }
            if (mat && D.materials.some(m => m.id === mat)) p.material = mat;
            if (price && !isNaN(price)) p.price = Number(price);
            if (moq && !isNaN(moq)) p.moq = Number(moq);
            S.overrides[p.id] = { dim: p.dim, material: p.material, price: p.price, moq: p.moq };
          } else if (type === 'lead') {
            const [company, country, src, need, contact, tz] = cols;
            const l = { id: 'L-' + Date.now() + i, created: new Date().toISOString().slice(0, 16).replace('T', ' '), company, country, src: src || 'CSV 导入', need, needZh: need, contact: contact || '—', tz: tz || 'Asia/Shanghai', status: '待跟进', owner: '未分配', next: '首次回复', product: [] };
            const m = E.match(need || ''); l.product = m.top ? [m.top.product.code] : []; l.score = E.scoreLead(l).score;
            S.leads.push(l);
          } else if (type === 'code') {
            const [code, xcode, xtype, src] = cols;
            const p = D.products.find(x => E.norm(x.code) === E.norm(code));
            if (!p) throw new Error('款号不存在：' + code);
            D.codes.push({ id: 'X' + Date.now() + i, code: xcode, norm: E.norm(xcode), pid: p.id, type: xtype || '客户叫法', source: src || 'CSV 导入', conf: '中', note: '' });
          }
          ok++;
        } catch (e) { bad++; out.push(`第 ${i + 2} 行：${e.message}`); }
      });
      save();
      $('#impOut').innerHTML = `<div class="notice ${bad ? 'warn' : 'ok'}">成功 ${ok} 条${bad ? `，失败 ${bad} 条` : ''}</div>
        ${out.length ? `<ul class="small" style="color:var(--danger);margin:6px 0 0;padding-left:16px">${out.slice(0, 8).map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}`;
      toast(`导入完成：${ok} 成功 / ${bad} 失败`);
      renderNav();
    }
  };

  /* ================= 界面语言 ================= */
  const I = window.I18N, T = (k, v) => I.t(k, v);
  /** 双语小标签：中文界面用中文，其它语言用英文 */
  const LZ = (zh, en) => (I.getLang() === 'zh' ? zh : en);
  /** 客服文案：10 种语言，缺键回落英文 */
  const CT = k => {
    const T2 = window.CHAT_I18N || {};
    const row = T2[I.getLang()] || {};
    return row[k] || (T2.en && T2.en[k]) || k;
  };
  /** 产品字段随界面语言切换：中文界用中文，其余用英文（缺英文时回落中文） */
  function pName(p) { return I.getLang() === 'zh' ? (p.nameZh || p.nameEn || p.name || '') : (p.nameEn || p.nameZh || p.name || ''); }
  function pCat(p) { return I.getLang() === 'zh' ? (p.cat || '') : (p.catEn || p.cat || ''); }
  function mName(m) { return I.getLang() === 'zh' ? (m.name || '') : (m.nameEn || m.name || ''); }
  /** 款式系列名：中文界面原样，其它语言按词典英文化 */
  const VEH_DICT = {
    '女童': 'Girls', '男童': 'Boys', '婴童': 'Baby', '中性': 'Unisex',
    '云朵泡泡': 'Cloud Bubble', '小满花园': 'Xiaoman Garden', '海盐苏打': 'Sea Salt Soda',
    '森系棉麻': 'Natural Linen', '奶油小方': 'Butter Cube', '小恐龙': 'Little Dino',
    '跳跳糖': 'Pop Candy', '小满亲子': 'Xiaoman Family', '小满日常': 'Xiaoman Daily',
    '彩虹条纹': 'Rainbow Stripe', '小足球': 'Little Soccer', '花花领': 'Petal Collar',
    '森林熊': 'Forest Bear', '小满出街': 'Xiaoman Street', '冬日暖阳': 'Winter Sun',
    '布丁裤': 'Pudding Pants', '牛仔星球': 'Denim Planet', '小熊口袋': 'Bear Pocket',
    '花边短裤': 'Lace Shorts', '校园蓝': 'Campus Blue', '花仙子': 'Flower Fairy',
    '球场小将': 'Court Star', '星星睡衣': 'Star Pajamas', '竹节棉': 'Slub Cotton',
    '云朵爬服': 'Cloud Romper', '小羊咩': 'Lamby',
    '连衣裙': 'Dress', '公主裙': 'Princess Dress', '连帽卫衣': 'Hooded Sweatshirt', '卫衣': 'Sweatshirt',
    '长袖': 'Long-sleeve', '短袖': 'Short-sleeve', '外套': 'Jacket', '长裤': 'Trousers', '短裤': 'Shorts',
    '衬衫两件套': 'Shirt Set', '纱裙两件套': 'Tulle Set', '运动三件套': 'Sports Set', '家居服': 'Loungewear',
    '连体衣': 'Bodysuit', '哈衣': 'Romper', '宽松': 'Loose', '标准': 'Regular', '修身': 'Slim',
    '系列': 'Series', '款式系列': 'Series', '尺码段': 'Size band'
  };
  const VEH_KEYS = Object.keys(VEH_DICT).sort((x, y) => y.length - x.length);
  function vehEn(a) {
    let t = ' ' + a + ' ';
    VEH_KEYS.forEach(k => { t = t.split(k).join(' ' + VEH_DICT[k] + ' '); });
    const parts = t.replace(/\s+/g, ' ').replace(/\s*\/\s*/g, ' / ').trim().split(' ');
    const out = [];
    parts.forEach(w => { if (!out.length || out[out.length - 1].toLowerCase() !== w.toLowerCase()) out.push(w); });
    return out.join(' ').trim();
  }
  function appsOf(p) {
    const list = p.appsAll || [];
    return I.getLang() === 'zh' ? list : list.map(vehEn);
  }
  function appsJoin(list, max) {
    const sep = I.getLang() === 'zh' ? '、' : ', ';
    const arr = max ? list.slice(0, max) : list;
    return arr.join(sep);
  }
  function packText(v) {
    if (I.getLang() === 'zh') return v || '';
    return String(v || '')
      .replace(/片/g, ' pcs').replace(/件/g, ' pcs').replace(/套/g, ' set').replace(/盒/g, ' box')
      .replace(/箱/g, ' carton').replace(/按箱/g, 'Per carton').replace(/\s*\/\s*/g, ' / ')
      .replace(/\s+/g, ' ').trim();
  }
  function catLabel(cat) {
    if (I.getLang() === 'zh') return cat;
    const p = D.products.find(x => x.cat === cat);
    return (p && p.catEn) || cat;
  }
  function renderLangGrid() {
    const grid = $('#langGrid');
    if (!grid) return;
    grid.innerHTML = I.LANGS.map(l => `<button class="lang-opt ${l.code === I.getLang() ? 'on' : ''}" data-act="pickLang" data-id="${l.code}">
      <span class="fl">${l.flag}</span>
      <span><span class="nm">${l.native}</span><br><span class="rg">${l.region}</span></span>
      <span class="tick">✓</span></button>`).join('');
  }
  function openLang() { renderLangGrid(); $('#langMask').classList.add('on'); }
  function closeLang() { $('#langMask').classList.remove('on'); }
  function applyLangChrome() {
    const m = I.meta();
    if ($('#langFlag')) $('#langFlag').textContent = m.flag;
    if ($('#langName')) $('#langName').textContent = m.native;
    if ($('#langBtn')) $('#langBtn').title = T('top.lang');
    if ($('#gsearch')) $('#gsearch').placeholder = T('top.searchPh');
    if ($('#langTitle')) $('#langTitle').textContent = T('m.title');
    if ($('#langSub')) $('#langSub').textContent = T('m.sub');
    if ($('#langRememberTxt')) $('#langRememberTxt').textContent = T('m.auto');
    if ($('#langGo')) $('#langGo').textContent = T('m.btn');
    document.title = I.getLang() === 'zh' ? '小满童装 · 选款与报价中台 · XIAOMAN Hub' : 'XIAOMAN KIDS · Style & Quotation Hub';
    const bt = document.querySelector('.brand-t');
    if (bt) bt.textContent = I.getLang() === 'zh' ? '选款与报价中台' : 'Style & Quotation Hub';
    const bh = $('#brandHome');
    if (bh) {
      const back = I.getLang() === 'zh' ? '回到首页' : 'Back to home';
      bh.title = back; bh.setAttribute('aria-label', back);
    }
  }

  /* ================= 入口（员工 / 客户） ================= */
  const A = window.AUTH;
  let gateRole = 'customer';
  /** 员工 / 老板入口默认隐藏：在登录窗顶部（Logo + 标题）双击解锁，避免客户看到管理入口 */
  let gateStaffMode = false;

  function roleName(u) {
    if (!u) return T('gate.none');
    return (u.role === 'boss' ? LZ('老板', 'Owner') : u.role === 'staff' ? T('gate.staff') : T('gate.cust')) + ' · ' + u.name;
  }
  function applySession() {
    const u = A.me();
    const chip = $('#userRole');
    if (chip) chip.textContent = u
      ? (u.demo ? (u.role === 'boss' ? LZ('体验版 · 老板', 'Demo · Owner') : u.role === 'staff' ? LZ('体验版 · 员工', 'Demo · Staff') : LZ('体验版 · 客户', 'Demo · Customer')) : roleName(u))
      : T('gate.none');
    const ub = $('#userBtn');
    if (ub) ub.classList.toggle('demo', !!(u && u.demo));
    const bar = $('#demoBar');
    if (bar) {
      bar.hidden = !(u && u.demo);
      if (u && u.demo) {
        bar.className = 'demo-bar' + (u.role === 'staff' ? ' staff' : u.role === 'boss' ? ' staff' : '');
        bar.innerHTML = u.role === 'boss'
          ? `<b>${LZ('体验版老板端', 'Demo owner')}</b><span>${LZ('可以看到员工成交与业绩总结，登记与改状态被禁用。', 'You can see the deal ledger and performance summary; edits are disabled.')}</span>
             <button class="btn xs" data-act="openGate">${LZ('退出体验', 'Leave demo')}</button>`
          : u.role === 'staff'
          ? `<b>${LZ('体验版员工端', 'Demo staff')}</b><span>${LZ('全部页面都能看，但发送、导入、改数据被禁用。切回正式员工请输入访问码。', 'Everything is viewable; sending, importing and edits are disabled. Use the access code for the real account.')}</span>
             <button class="btn xs" data-act="openGate">${LZ('退出体验', 'Leave demo')}</button>`
          : `<b>${LZ('体验版客户端', 'Demo customer')}</b><span>${LZ('这是客户看到的界面，数据只存在本机。', 'This is the customer view; data stays on this device.')}</span>
             <button class="btn xs" data-act="openGate">${LZ('退出体验', 'Leave demo')}</button>`;
      }
    }
    const b = $('#userBtn');
    if (b) b.title = u ? esc(u.contact.value) : T('gate.choose');
    // 只有真的换了身份才回首页；首次加载保持地址栏里的页面（深链接、取证链接）
    const _uid = u ? u.id : '';
    const _switched = LAST_UID !== undefined && LAST_UID !== _uid;
    LAST_UID = _uid;
    if (_switched) { S.tab = 'home'; S.match = null; }
    renderNav();
    render();
  }

  function renderGate() {
    const body = $('#gateBody');
    if (!body) return;
    const u = A.me();
    const gTitle = $('#gateTitle'), gSub = $('#gateSub');
    if (u) {
      if (gTitle) gTitle.textContent = LZ('当前账号', 'Your account');
      if (gSub) gSub.textContent = LZ('登录状态存在本机，可在这里切换身份或退出。', 'Session lives on this device; switch or sign out here.');
      body.innerHTML = `
      <div class="gate-roles" style="grid-template-columns:1fr">
        <div class="gate-role on" style="cursor:default">
          <div class="row wrap-gap" style="align-items:center;gap:8px">
            <span class="tag ${u.role === 'staff' ? 'b' : 'g'}">${u.role === 'staff' ? T('gate.staff') : T('gate.cust')}</span>${u.demo ? '<span class="tag y">' + LZ('体验版', 'Demo') + '</span>' : ''}
            <b>${esc(u.name)}</b><span class="tiny muted mono">${esc(u.contact.value)}</span>
          </div>
          <div class="d">${u.role === 'staff'
          ? LZ('可以看到客户浏览、跟进线索、编辑报价与资料包。', 'Can see customer activity, leads, quotes and data packs.')
          : LZ('你可以查看款号、测算价格；员工的报价与资料会发到这个联系方式。', 'You can browse styles and see prices; quotes will be sent to this contact.')}</div>
        </div>
      </div>
      <div class="gate-form" style="grid-template-columns:1fr">
        <div class="small muted">${LZ('登录状态保存在本机；换设备需要重新登录。', 'Session is stored on this device; log in again elsewhere.')}</div>
      </div>
      <div class="gate-foot">
        <button class="btn" data-act="logout">${T('gate.logout')}</button>
        <span class="flex1"></span>
        <button class="btn primary" data-act="closeGate">${LZ('继续', 'Continue')}</button>
      </div>`;
      return;
    }
    const modeStaff = gateStaffMode;
    const boss = modeStaff && gateRole === 'boss';
    const staff = modeStaff && gateRole === 'staff';
    if (gTitle) gTitle.textContent = modeStaff ? LZ('选择入口', 'Choose entry') : LZ('客户登录', 'Customer sign in');
    if (gSub) gSub.textContent = modeStaff
      ? LZ('客户直接登录；员工用访问码，老板用老板访问码。', 'Customers sign in directly; staff use the access code, owners the owner code.')
      : LZ('用手机号 / 邮箱 / WhatsApp 登录，看款号、看价格、收报价。', 'Sign in with phone, email or WhatsApp to browse styles and get quotes.');
    body.innerHTML = `
    ${modeStaff ? `<div class="gate-roles">
      <button class="gate-role ${gateRole === 'customer' ? 'on' : ''}" data-act="gateRole" data-id="customer">
        <div class="ic">🛒</div>
        <div class="t">${T('gate.cust')}</div>
        <div class="d">${T('gate.custSub')}</div>
      </button>
      <button class="gate-role ${gateRole === 'staff' ? 'on' : ''}" data-act="gateRole" data-id="staff">
        <div class="ic">🗂</div>
        <div class="t">${T('gate.staff')}</div>
        <div class="d">${T('gate.staffSub')}</div>
      </button>
      <button class="gate-role ${gateRole === 'boss' ? 'on' : ''}" data-act="gateRole" data-id="boss">
        <div class="ic">📊</div>
        <div class="t">${LZ('老板', 'Owner')}</div>
        <div class="d">${LZ('看员工业绩、成交、转化与产品结构', 'Staff performance, deals and product mix')}</div>
      </button>
    </div>` : ''}
    <div class="gate-form">
      ${boss ? `
        <div class="full"><label>${LZ('老板访问码', 'Owner code')}</label><input id="gCode" type="text" autocomplete="off" placeholder="XMBOSS"></div>
        <div><label>${T('gate.name')}</label><input id="gName" type="text" placeholder="Owner"></div>
        <div><label>${T('gate.contactValue')}</label><input id="gValue" type="text" placeholder="boss@xiaomankids.com"></div>
      ` : staff ? `
        <div class="full"><label>${T('gate.code')}</label><input id="gCode" type="text" autocomplete="off" placeholder="XM2026"></div>
        <div><label>${T('gate.name')}</label><input id="gName" type="text" placeholder="Sales"></div>
        <div><label>${T('gate.contactValue')}</label><input id="gValue" type="text" placeholder="sales@xiaomankids.com"></div>
      ` : `
        <div><label>${T('gate.contactType')}</label><select id="gType">${A.CONTACT_TYPES.map(t => `<option ${t === 'WhatsApp' ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
        <div><label>${T('gate.contactValue')}</label><input id="gValue" type="text" placeholder="+52 55 1234 5678"></div>
        <div><label>${T('gate.name')}</label><input id="gName" type="text" placeholder="Carlos"></div>
        <div><label>${T('gate.company')}</label><input id="gCompany" type="text" placeholder="Transportes Mendoza"></div>
        <div class="full"><label>${T('gate.country')}</label><input id="gCountry" type="text" placeholder="Mexico"></div>
      `}
      <div class="gate-err" id="gErr"></div>
    </div>
    <div class="gate-demo-wrap">
      <button class="gate-demo" data-act="gateDemo" data-id="customer">
        <span class="bolt">⚡</span>
        <span>${LZ('体验版 · 客户（不填联系方式）', 'Demo · Customer (no contact needed)')}</span>
        <span class="tiny muted">${LZ('随便点，数据只在本机', 'click anything, local only')}</span>
      </button>
      ${modeStaff ? `<button class="gate-demo staff" data-act="gateDemo" data-id="staff">
        <span class="bolt">⚡</span>
        <span>${LZ('体验版 · 员工（免访问码，只读）', 'Demo · Staff (no code, read-only)')}</span>
        <span class="tiny muted">${LZ('可看客户浏览，不能改数据', 'see activity, no edits')}</span>
      </button>
      <button class="gate-demo boss" data-act="gateDemo" data-id="boss">
        <span class="bolt">⚡</span>
        <span>${LZ('体验版 · 老板（免访问码，只读）', 'Demo · Owner (no code, read-only)')}</span>
        <span class="tiny muted">${LZ('看员工业绩与成交总结', 'staff performance summary')}</span>
      </button>` : ''}
    </div>
    <div class="gate-foot">
      <span class="tip">${boss ? LZ('演示访问码：XMBOSS', 'Demo owner code: XMBOSS') : staff ? LZ('演示访问码：XM2026', 'Demo access code: XM2026') : T('gate.tip')}</span>
      <span class="flex1"></span>
      <button class="btn primary" data-act="gateLogin">${T('gate.in')}</button>
    </div>`;
  }

  function openGate() { renderGate(); $('#gateMask').classList.add('on'); }
  function closeGate() { $('#gateMask').classList.remove('on'); }

  /* ================= 客户浏览（员工端） ================= */
  const EV_LABEL = {
    login: ['登录', 'Signed in'],
    search: ['搜索', 'Search'],
    view: ['查看款号', 'Viewed style'],
    addCart: ['加入报价单', 'Added to quote'],
    inquiry: ['提交询价', 'Asked for price'],
    quote: ['打开报价单', 'Opened quote'],
    pack: ['打开资料包', 'Opened data pack'],
    download: ['下载资料', 'Downloaded']
  };
  function evName(t) { const r = EV_LABEL[t] || [t, t]; return LZ(r[0], r[1]); }
  function ago(ms) {
    const d = Date.now() - ms, m = Math.floor(d / 60000);
    if (m < 1) return LZ('刚刚', 'just now');
    if (m < 60) return LZ(m + ' 分钟前', m + ' min ago');
    const h = Math.floor(m / 60);
    if (h < 24) return LZ(h + ' 小时前', h + ' h ago');
    const day = Math.floor(h / 24);
    return LZ(day + ' 天前', day + ' d ago');
  }
  function dayLabel(ms) {
    const d = new Date(ms);
    return d.getMonth() + 1 + '/' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  /* ================= 客户询价（员工端） ================= */
  function vInquiries() {
    const list = inquiriesAll();
    const el = $('#p-inquiries');
    if (!list.length) {
      el.innerHTML = `<h1>${T('nav.inquiries')}</h1>
        <div class="card"><div class="muted">${LZ('还没有客户询价。客户在客户端点「询价」提交后，这里会立刻出现。', 'No inquiries yet. They appear here the moment a customer sends one.')}</div></div>`;
      return;
    }
    const rows = list.map(q => {
      const items = q.items.map(it => {
        const p = D.products.find(x => x.id === it.pid);
        return `<span class="chip mono">${esc(p ? p.code : '?')} × ${it.qty}</span>`;
      }).join(' ');
      const pieces = q.items.reduce((n, it) => n + it.qty, 0);
      return `<tr>
        <td class="tiny muted">${esc(ago(q.t))}</td>
        <td><b>${esc(q.user.name)}</b>${q.user.demo ? ' <span class="tag y">' + LZ('体验','Demo') + '</span>' : ''}
          ${q.user.company ? `<div class="tiny muted">${esc(q.user.company)}</div>` : ''}</td>
        <td class="mono tiny">${esc(q.no)}<div class="tiny muted">${esc(q.items.length)} 款号 · ${pieces} 件</div></td>
        <td>${items}${q.note ? `<div class="tiny muted" style="margin-top:4px">📝 ${esc(q.note)}</div>` : ''}</td>
        <td class="tiny">${esc(q.user.contact.type)}<div class="muted">${esc(q.user.contact.value)}</div></td>
        <td><div class="row">
          <button class="btn xs primary" data-act="loadInquiry" data-id="${esc(q.no)}">${LZ('载入报价','Load quote')}</button>
          <button class="btn xs" data-act="openCustomer" data-id="${esc(q.user.id)}">${LZ('履历','History')}</button>
        </div></td></tr>`;
    }).join('');
    el.innerHTML = `<div class="row" style="justify-content:space-between;align-items:flex-end;margin-bottom:12px">
        <div><h1 style="margin:0">${T('nav.inquiries')}</h1>
        <div class="muted small">${LZ('客户在前台点「询价」提交的清单，带数量和留言；点「载入报价」直接生成正式报价单。', 'Requests submitted from the customer portal, with quantities and notes.')}</div></div>
        <span class="tag g">${list.length} 条待处理</span></div>
      <div class="card"><table><thead><tr><th>${LZ('时间','When')}</th><th>${LZ('客户','Customer')}</th><th>${LZ('询价号','No.')}</th><th>${LZ('要什么','Items')}</th><th>${LZ('联系方式','Contact')}</th><th></th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  }

  /* ================= 增加客户（手动录入 / 拍照名片） ================= */
  /** 名片识别演示结果：接真 OCR（腾讯云 / 阿里云 / GPT-4o）后换成接口返回 */
  const CARD_DEMO = [
    { name: 'Omar Haddad', company: 'Haddad Kids Wear', country: '阿联酋', type: 'WhatsApp', value: '+971 50 448 2210', tags: '名片导入, 中东, 批发', note: '迪拜童装批发商，先要目录 + OEKO-TEX 100 报告' },
    { name: 'Ricardo Alvarez', company: 'Moda Infantil del Norte', country: '墨西哥', type: 'Phone', value: '+52 81 3344 7788', tags: '名片导入, 墨西哥, 母婴连锁', note: '蒙特雷母婴连锁 60 家门店，问卫衣阶梯价' },
    { name: 'Budi Santoso', company: 'CV Sinar Jaya Kids', country: '印度尼西亚', type: 'WhatsApp', value: '+62 812 3344 5566', tags: '名片导入, 东南亚, 贸易商', note: '雅加达童装商，要尺码适穿表' },
    { name: 'Mehmet Yilmaz', company: 'Yilmaz Kids Tekstil', country: '土耳其', type: 'Email', value: 'mehmet@yilmazoto.com.tr', tags: '名片导入, 土耳其, 终端', note: '伊斯坦布尔批发商，关注 XM-SW-2601 / XM-DR-2601' }
  ];
  function defaultAddCust() {
    return { name: '', company: '', country: '', type: 'WhatsApp', value: '', tags: '', note: '', photo: '', scanning: false, ocr: false };
  }
  function vAddCustomer() {
    const st = S.addCust;
    const recent = A.customers().filter(c => !c.demo && c.created).sort((a, b) => (b.created || 0) - (a.created || 0)).slice(0, 6);
    const srcLabel = c => c.source === 'card' ? LZ('名片识别', 'From card') : c.source === 'manual' ? LZ('手动录入', 'Manual') : LZ('历史数据', 'Existing');
    $('#p-addcust').innerHTML = `
    <div class="row wrap-gap" style="justify-content:space-between;margin-bottom:12px">
      <div><h1 style="margin:0">${LZ('增加客户', 'Add customer')}</h1>
        <div class="muted small">${LZ('手动填，或拍一张名片自动带出字段。保存后进「客户浏览」，可以直接发目录 / 报价。', 'Type it in, or snap a business card to prefill. Saved customers land in Customer activity.')}</div></div>
      <div class="row"><span class="tag o">${LZ('演示识别', 'Demo OCR')}</span><span class="tag n">${LZ('接 OCR 后读真名片', 'Wire OCR to read real cards')}</span></div>
    </div>
    <div class="split">
      <div class="card">
        <div class="card-h"><h3>${LZ('手动录入', 'Manual entry')}</h3><span class="sub">${LZ('带 * 必填；联系方式已存在会更新老客户', 'Required *; an existing contact updates the old record')}</span></div>
        <div class="card-b">
          <div class="grid" style="grid-template-columns:1fr 1fr;gap:8px">
            <div class="field"><label>${LZ('联系人姓名 *', 'Contact name *')}</label><input id="cuName" value="${esc(st.name)}" placeholder="Carlos Mendoza"></div>
            <div class="field"><label>${LZ('公司', 'Company')}</label><input id="cuCompany" value="${esc(st.company)}" placeholder="Transportes Mendoza"></div>
            <div class="field"><label>${LZ('国家 / 地区', 'Country')}</label><input id="cuCountry" value="${esc(st.country)}" placeholder="墨西哥"></div>
            <div class="field"><label>${LZ('联系方式类型', 'Contact type')}</label><select id="cuType">${A.CONTACT_TYPES.map(t => `<option ${st.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
            <div class="field" style="grid-column:span 2"><label>${LZ('联系方式 *', 'Contact *')}</label><input id="cuValue" value="${esc(st.value)}" placeholder="+52 55 1234 5678 / buyer@company.com"></div>
            <div class="field" style="grid-column:span 2"><label>${LZ('标签（逗号分隔）', 'Tags (comma separated)')}</label><input id="cuTags" value="${esc(st.tags)}" placeholder="母婴连锁, 墨西哥, A 类"></div>
            <div class="field" style="grid-column:span 2"><label>${LZ('备注 / 需求', 'Note / need')}</label><input id="cuNote" value="${esc(st.note)}" placeholder="想要 XM-SW-2601 110 码 200 件，先要目录"></div>
          </div>
          <div class="row wrap-gap mt-s">
            <button class="btn primary" data-act="addCustSave">${LZ('保存客户', 'Save customer')}</button>
            <button class="btn" data-act="addCustReset">${LZ('清空', 'Clear')}</button>
            <span class="tiny muted">${LZ('保存后可在「客户浏览」里跟进，支持一键发 WhatsApp / 邮件。', 'Follow up from Customer activity; one-tap WhatsApp / email.')}</span>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-h"><h3>${LZ('拍照名片', 'Business card photo')}</h3><span class="sub">${LZ('手机直接拍，或上传图片', 'Shoot it or upload a photo')}</span></div>
        <div class="card-b">
          ${st.photo ? `
            <div class="card-photo">
              <img src="${st.photo}" alt="名片预览">
              ${st.scanning ? '<div class="scan"><i></i><span>识别中…</span></div>' : ''}
            </div>
            <div class="row wrap-gap mt-s">
              <button class="btn sm primary" data-act="addCustOcr">${st.ocr ? LZ('再识别一次', 'Read again') : LZ('识别名片', 'Read card')}</button>
              <label class="btn sm" for="cuPhoto">${LZ('换一张', 'Replace')}</label>
              <button class="btn sm ghost" data-act="addCustClearPhoto">${LZ('移除', 'Remove')}</button>
            </div>
            <div class="tiny muted mt-s">${st.ocr ? LZ('已把识别结果填到左边（演示数据），核对后保存。', 'Prefilled on the left (demo data) — review, then save.') : LZ('点「识别名片」读图并带出姓名 / 公司 / 国家 / 电话。', 'Read the card to fill name, company, country and phone.')}</div>
          ` : `
            <label class="photo-drop" for="cuPhoto">
              <span class="ic">📷</span>
              <b>${LZ('拍照 / 选名片图片', 'Shoot or choose a card')}</b>
              <span class="tiny muted">${LZ('手机端直接调相机；桌面点选或拖图', 'Camera on mobile; click or drop a file on desktop')}</span>
            </label>
            <div class="tiny muted mt-s">${LZ('演示版：识别结果是一组示例字段（可改）。接腾讯云 / 阿里云 OCR 或 GPT-4o 后，这里读的就是名片上的真字。', 'Demo: the read result is sample data you can edit. With a real OCR API this reads the actual card.')}</div>
          `}
          <input type="file" id="cuPhoto" accept="image/*" capture="environment" hidden>
        </div>
      </div>
    </div>
    <div class="card mt"><div class="card-h"><h3>${LZ('最近新增', 'Recently added')}</h3><span class="sub">${LZ('手动 + 名片，按创建时间倒序', 'Manual + card, newest first')}</span></div>
      <div class="tbl-wrap"><table><thead><tr>
        <th>${LZ('客户', 'Customer')}</th><th>${LZ('联系方式', 'Contact')}</th><th>${LZ('国家', 'Country')}</th>
        <th>${LZ('来源', 'Source')}</th><th>${LZ('创建时间', 'Created')}</th><th></th>
      </tr></thead><tbody>
      ${recent.map(c => `<tr class="click" data-act="openCustomer" data-id="${c.id}">
        <td><b>${esc(c.name)}</b>${c.company ? `<div class="tiny muted">${esc(c.company)}</div>` : ''}</td>
        <td class="small"><span class="tag n">${esc(c.contact.type)}</span><div class="tiny mono muted">${esc(c.contact.value)}</div></td>
        <td class="small">${esc(c.country || '—')}</td>
        <td class="small">${srcLabel(c)}</td>
        <td class="small">${c.created ? dayLabel(c.created) : '—'}</td>
        <td><button class="btn xs" data-act="openCustomer" data-id="${c.id}">${LZ('详情', 'Details')}</button></td>
      </tr>`).join('') || `<tr><td colspan="6" class="empty small">${LZ('还没有客户记录，保存一条试试。', 'No customers yet — save one.')}</td></tr>`}
      </tbody></table></div>
    </div>`;
    const bind = (id, key, ev) => {
      const n = $('#' + id); if (!n) return;
      n[ev || 'oninput'] = () => { S.addCust[key] = n.value; };
    };
    bind('cuName', 'name'); bind('cuCompany', 'company'); bind('cuCountry', 'country');
    bind('cuValue', 'value'); bind('cuTags', 'tags'); bind('cuNote', 'note');
    bind('cuType', 'type', 'onchange');
    const fi = $('#cuPhoto');
    if (fi) fi.onchange = () => {
      const f = fi.files && fi.files[0]; if (!f) return;
      if (!/^image\//.test(f.type || '')) { toast('请选图片文件（JPG / PNG）'); return; }
      if (f.size > 8 * 1024 * 1024) { toast('图片超过 8MB，换一张小一点的'); return; }
      const rd = new FileReader();
      rd.onload = () => { S.addCust.photo = String(rd.result); S.addCust.ocr = false; S.addCust.scanning = false; vAddCustomer(); };
      rd.onerror = () => toast('图片读取失败，换一张试试');
      rd.readAsDataURL(f);
    };
  }

  function vVisits() {
    const list = A.customers();
    const today = list.filter(c => c.stat.last > Date.now() - 86400000).length;
    const views = list.reduce((s, c) => s + c.stat.views, 0);
    const orders = list.reduce((s, c) => s + c.stat.orders, 0);
    $('#p-visits').innerHTML = `
    <div class="row wrap-gap" style="justify-content:space-between;margin-bottom:12px">
      <div><h1 style="margin:0">${LZ('客户浏览', 'Customer activity')}</h1>
        <div class="muted small">${LZ('客户在客户端搜了什么、看了哪些款号、有没有打开报价单——按最近活跃排序。', 'What customers searched, viewed and quoted — newest first.')}</div></div>
      <div class="row"><span class="tag ${list.length ? 'g' : 'n'}">${list.length} ${LZ('位客户', 'customers')}</span></div>
    </div>
    <div class="kpis mb">
      <div class="kpi"><div class="n">${today}</div><div class="l">${LZ('24 小时内活跃', 'Active in 24h')}</div></div>
      <div class="kpi"><div class="n">${views}</div><div class="l">${LZ('累计浏览款号', 'Style views')}</div></div>
      <div class="kpi"><div class="n">${orders}</div><div class="l">${LZ('打开报价 / 资料包', 'Quotes / packs opened')}</div></div>
      <div class="kpi"><div class="n">${list.filter(c => c.stat.score >= 60).length}</div><div class="l">${LZ('高意向待跟', 'Hot to follow up')}</div></div>
    </div>
    <div class="card"><div class="tbl-wrap">
      <table><thead><tr>
        <th>${LZ('客户', 'Customer')}</th><th>${LZ('联系方式', 'Contact')}</th><th>${LZ('国家', 'Country')}</th>
        <th>${LZ('最近活跃', 'Last seen')}</th><th class="right">${LZ('浏览', 'Views')}</th>
        <th class="right">${LZ('搜索', 'Searches')}</th><th class="right">${LZ('询价', 'Quote')}</th>
        <th class="right">${LZ('意向', 'Intent')}</th><th></th>
      </tr></thead><tbody>
      ${list.map(c => `<tr class="click" data-act="openCustomer" data-id="${c.id}">
        <td><b>${esc(c.name)}</b>${c.demo ? ' <span class="tag y">' + LZ('体验', 'Demo') + '</span>' : ''}${c.company ? `<div class="tiny muted">${esc(c.company)}</div>` : ''}</td>
        <td class="small"><span class="tag n">${esc(c.contact.type)}</span><div class="tiny mono muted">${esc(c.contact.value)}</div></td>
        <td class="small">${esc(c.country || '—')}</td>
        <td class="small">${ago(c.stat.last)}</td>
        <td class="right small">${c.stat.views || '—'}</td>
        <td class="right small">${c.stat.searches || '—'}</td>
        <td class="right small">${c.stat.orders || '—'}</td>
        <td class="right"><span class="tag ${c.stat.score >= 70 ? 'g' : c.stat.score >= 50 ? 'y' : 'n'}">${c.stat.score}</span></td>
        <td><button class="btn xs" data-act="sendCustomer" data-id="${c.id}">${LZ('发送', 'Send')}</button></td>
      </tr>`).join('') || `<tr><td colspan="9" class="empty small">${LZ('还没有客户登录记录。把本链接发给客户，他们登录后这里就有数据。', 'No customer sessions yet.')}</td></tr>`}
      </tbody></table>
    </div></div>`;
  }

  function openCustomer(uid) {
    const u = A.customers().find(x => x.id === uid);
    if (!u) return;
    const st = u.stat;
    const ev = st.events.slice().sort((a, b) => b.t - a.t);
    const searches = ev.filter(e => e.type === 'search' && e.d.q).map(e => e.d.q);
    const codes = [...new Set(ev.filter(e => e.d && e.d.code).map(e => e.d.code))];
    let lastDay = '';
    const rows = ev.slice(0, 40).map(e => {
      const day = new Date(e.t).toDateString();
      const head = day !== lastDay ? `<div class="tl-day">${dayLabel(e.t).split(' ')[0]}</div>` : '';
      lastDay = day;
      return head + `<div class="tl-item ${['addCart', 'quote', 'pack'].includes(e.type) ? 'hot' : ''}">
        <div class="tl-t">${evName(e.type)}${e.d && e.d.code ? ` <b class="mono">${esc(e.d.code)}</b>` : ''}</div>
        <div class="tl-d">${dayLabel(e.t)}${e.d && e.d.q ? ' · ' + esc(e.d.q) : ''}${e.d && e.d.top && !e.d.code ? ' · → ' + esc(e.d.top) : ''}</div>
      </div>`;
    }).join('');
    drawer(`<div><div class="b">${esc(u.name)}</div><div class="tiny muted">${esc(u.company || '')}${u.company && u.country ? ' · ' : ''}${esc(u.country || '')}</div></div>`,
      `<div class="row wrap-gap mb" style="gap:6px">
        <span class="tag n">${esc(u.contact.type)}</span>
        <span class="mono small">${esc(u.contact.value)}</span>
        <span class="flex1"></span>
        ${(u.tags || []).map(t => `<span class="tag b">${esc(t)}</span>`).join('')}
      </div>
      <div class="kpis" style="margin-bottom:12px">
        <div class="kpi"><div class="n">${st.score}</div><div class="l">${LZ('意向评分', 'Intent score')}</div></div>
        <div class="kpi"><div class="n">${st.views}</div><div class="l">${LZ('查看款号', 'Views')}</div></div>
        <div class="kpi"><div class="n">${st.searches}</div><div class="l">${LZ('搜索', 'Searches')}</div></div>
        <div class="kpi"><div class="n">${st.orders}</div><div class="l">${LZ('报价/资料', 'Quote/pack')}</div></div>
      </div>
      ${searches.length ? `<div class="sec-t">${LZ('他搜过什么', 'What they searched')}</div>
        <div class="row wrap-gap" style="gap:6px">${searches.slice(0, 6).map(q => `<span class="chip">${esc(q)}</span>`).join('')}</div>` : ''}
      ${codes.length ? `<div class="sec-t">${LZ('他看过哪些款号', 'Styles they viewed')}</div>
        <div class="row wrap-gap" style="gap:6px">${codes.map(c => `<span class="chip" data-act="openProductByCode" data-id="${esc(c)}">${esc(c)}</span>`).join('')}</div>` : ''}
      <div class="sec-t">${LZ('浏览轨迹', 'Timeline')}</div>
      <div class="tl">${rows || `<div class="muted small">${LZ('还没有记录', 'No events yet')}</div>`}</div>
      <div class="sec-t">${LZ('发给他的消息', 'Message to this customer')}</div>
      <textarea id="sendMsg" style="min-height:96px;font-size:12.5px">${esc(LZ('你好 ' + u.name + '，这里是小满童装（XIAOMAN KIDS）。你之前看过 ' + (codes.slice(0, 3).join(' / ') || '我们的童装') + '，我把尺码、适穿系列和价格一起发你，方便的话回复数量，我按阶梯价报给你。',
        'Hi ' + u.name + ', this is XIAOMAN KIDS. You looked at ' + (codes.slice(0, 3).join(' / ') || 'our kids clothing') + '. I can send sizes, size links and prices — just tell me the quantity.'))}</textarea>
      <div class="small muted mt-s">${LZ('发送后会打开 WhatsApp / 邮件客户端，内容可先编辑。', 'Opens WhatsApp or your mail app with the text above.')}</div>`,
      `<div class="row wrap-gap">
        <button class="btn primary" data-act="sendCustomer" data-id="${u.id}">${LZ('用 ' + u.contact.type + ' 发送', 'Send via ' + u.contact.type)}</button>
        <button class="btn" data-act="pushLead" data-id="${u.id}">${LZ('加入询盘池', 'Add to leads')}</button>
        <span class="flex1"></span>
        <button class="btn ghost" data-act="closeDrawer">${T('c.close')}</button>
      </div>`);
  }
  /* ================= 事件 ================= */
  // 图片兜底：加载失败时换成占位图，不留空白框
  document.addEventListener('error', e => {
    const el = e.target;
    if (el && el.tagName === 'IMG' && !el.dataset.fallback) {
      el.dataset.fallback = '1';
      el.src = 'assets/img/_placeholder.svg';
    }
  }, true);

  document.addEventListener('change', e => {
    const t = e.target.closest ? e.target.closest('select[data-act]') : null;
    if (!t) return;
    const act = t.dataset.act;
    if (!ACT[act]) return;
    if (DEMO_BLOCK.has(act) && A.isDemoStaff && A.isDemoStaff()) {
      toast(LZ('体验版是只读的，改不了状态', 'Demo mode is read-only'));
      return;
    }
    ACT[act](t.dataset.id, t, e);
  });

  document.addEventListener('click', e => {
    // 导航分组（员工侧）：点空白处自动收起
    if (navOpen && !(e.target.closest && e.target.closest('.nav-fly'))) {
      navOpen = ''; renderNav();
    }
    // 客户端「选购」下拉 与 首屏「选购」下拉：点空白处收起
    const nd = document.getElementById('navDrop');
    if (nd && nd.classList.contains('open') && !e.target.closest('#navDrop')) nd.classList.remove('open');
    const hp = document.getElementById('heroPick');
    if (hp && hp.classList.contains('open') && !e.target.closest('#heroPick')) hp.classList.remove('open');
    const shot = e.target.closest ? e.target.closest('img.fu-shot') : null;
    if (shot && shot.src) { e.preventDefault(); ACT.fuZoom(shot.src); return; }
    const t = e.target.closest('[data-act]');
    if (!t) return;
    const act = t.dataset.act;
    if (!ACT[act]) return;
    if (/^(INPUT|SELECT|TEXTAREA|LABEL)$/.test(t.tagName)) return;
    e.preventDefault(); e.stopPropagation();
    if (DEMO_BLOCK.has(act) && A.isDemoStaff && A.isDemoStaff()) {
      toast(LZ('体验版员工端是只读的，发送 / 导入 / 改数据都不能用', 'Demo staff is read-only: sending, importing and edits are disabled'));
      return;
    }
    ACT[act](t.dataset.id, t, e);
  });
  document.addEventListener('change', e => {
    const t = e.target.closest('[data-act]');
    if (!t) return;
    const act = t.dataset.act, id = t.dataset.id;
    if (act === 'setQty') { const r = cartRows()[Number(id)]; if (r) { r.qty = Math.max(1, Number(t.value) || 1); const c = S.cart.find(x => x.pid === r.pid); if (c) c.qty = r.qty; save(); vQuote(); } }
    if (act === 'setMat') { const r = cartRows()[Number(id)]; if (r) { r.mat = t.value; const c = S.cart.find(x => x.pid === r.pid); if (c) c.mat = t.value; save(); vQuote(); } }
    if (act === 'packCfg') ACT.packCfg(id);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeModal(); closeDrawer();
      if (navOpen) { navOpen = ''; renderNav(); }
      const nd = document.getElementById('navDrop'); if (nd) nd.classList.remove('open');
      const hp = document.getElementById('heroPick'); if (hp) hp.classList.remove('open');
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { if (S.tab === 'select') doMatch(); }
  });
  $('#gsearch').addEventListener('keydown', e => {
    if (e.key === 'Enter') { const v = e.target.value.trim(); if (v) { S.tab = 'select'; doMatch(v); e.target.value = ''; } }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target && e.target.id === 'csInput') { e.preventDefault(); csSay(e.target.value); }
  });
  $('#drawerMask').onclick = closeDrawer;
  $('#modalMask').onclick = e => { if (e.target.id === 'modalMask') closeModal(); };
  // 登录窗顶部（Logo + 标题）双击：解锁员工 / 老板登录入口，默认只给客户登录
  const gateHead = $('#gateHead');
  if (gateHead) gateHead.addEventListener('dblclick', () => {
    if (gateStaffMode) return;
    gateStaffMode = true; gateRole = 'staff'; renderGate();
    toast(LZ('员工 / 老板登录已解锁', 'Staff and owner sign-in unlocked'));
  });
  // 点左上角 Logo 回首页（键盘 Enter / 空格同样有效）
  const brandHome = $('#brandHome');
  if (brandHome) brandHome.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ACT.tab('home'); }
  });
  // 视口变化时（拖动窗口 / 手机转屏）把展开中的菜单重新夹回屏幕内
  window.addEventListener('resize', () => { clampNavMenu(); });

  /* ================= 启动 ================= */
  $('#tzNow').textContent = '本地 ' + E.localTime('Asia/Shanghai').text;
  /* 代码版本徽标：只在本地服务下显示，用来一眼识破「浏览器还跑着旧文件」 */
  (function showBuild() {
    const tag = $('#buildTag');
    if (!tag || location.protocol === 'file:') return;
    fetch('/api/version', { cache: 'no-store' })
      .then(r => r.json())
      .then(j => {
        if (!j || !j.ok) return;
        tag.textContent = '代码 ' + j.at.slice(5);
        tag.title = '当前加载的代码版本：assets/app.js 更新于 ' + j.at + (j.size ? '（' + j.size + ' 字节）' : '');
        tag.style.display = '';
      })
      .catch(() => { });
  })();
  let savedLang = null, rememberLang = '1';
  try {
    savedLang = localStorage.getItem('gy_lang');
    rememberLang = localStorage.getItem('gy_lang_remember') || '1';
  } catch (e) { }
  const browserLang = (navigator.language || 'zh').slice(0, 2).toLowerCase();
  I.setLang(savedLang || (I.ORDER.includes(browserLang) ? browserLang : 'en'));
  applyLangChrome();
  if ($('#langRemember')) $('#langRemember').checked = rememberLang === '1';
  /* 深链接：#/products 直接打开对应页面（便于分享链接、网页取证） */
  (function initHashLink() {
    const pick = () => {
      const m = /^#\/?([a-z]+)$/i.exec(location.hash || '');
      return m ? m[1].toLowerCase() : '';
    };
    const first = pick();
    if (first && typeof allowedTab === 'function' && allowedTab(first)) S.tab = first;
    window.addEventListener('hashchange', () => {
      const id = pick();
      if (!id || id === S.tab) return;
      if (typeof allowedTab === 'function' && !allowedTab(id)) { toast(LZ('这一页是员工端的', 'Staff only')); return; }
      S.tab = id; renderNav(); render(); window.scrollTo({ top: 0, behavior: 'instant' });
    });
  })();
  /* ===== 演示 / 取证模式：网址带 ?view=guest 时，直接以只读客户身份进入 =====
     - 不弹登录窗、不弹语言窗，打开即见页面
     - 只能看客户侧页面（产品库、选款、购物车、售后），员工数据仍被权限挡住
     - 用途：网页取证、给客户发一个「免登录试用」链接 */
  const GUEST_ROLE = (function () {
    const m = /(?:^|[?&])view=(guest|boss)(?:[&=#]|$)/.exec(location.search + location.hash);
    return m ? m[1] : '';
  })();
  const GUEST_MODE = !!GUEST_ROLE;
  /* 老板演示视图不接服务器共享区：只用本机演示数据，避免把真实客户记录暴露给任何拿到链接的人 */
  const NO_NET = GUEST_ROLE === 'boss';
  if (GUEST_MODE) {
    try { A.loginDemo(GUEST_ROLE === 'boss' ? 'boss' : 'customer'); } catch (e) { }
    try { I.setLang('zh'); applyLangChrome(); window.__askLang = false; } catch (e) { }
    const gm = /^#\/?([a-z]+)$/i.exec(location.hash || '');
    const gtab = gm ? gm[1].toLowerCase() : '';
    const custTabs = ['home', 'select', 'products', 'custom', 'quote', 'aftersale'];
    const okTab = t => (GUEST_ROLE === 'boss' ? allowedTab(t) : custTabs.indexOf(t) >= 0);
    S.tab = okTab(gtab) ? gtab : (GUEST_ROLE === 'boss' ? 'boss' : 'products');
  }
  ensureDeals();
  render();
  applySession();
  window.__askLang = (!savedLang || rememberLang !== '1');
  if (!GUEST_MODE) setTimeout(openGate, 80);
  pushChat(true);
  $('#chatBadge').textContent = S.chat.msgs.filter(m => m.match && m.match.top).length;
  $('#chatBadge').style.display = S.chat.msgs.some(m => m.match && m.match.top) ? 'inline-block' : 'none';
  render();
  /* ---- 共享区：服务器模式下拉数据 + 轮询（客户和员工不在同一台电脑也能互通） ---- */
  if (!NO_NET && window.SYN && SYN.available()) {
    const sig = () => [SYN.list('quotes').length, SYN.list('settlements').length,
      SYN.list('inquiries').length, SYN.list('aftersales').length].join('/');
    let lastSig = '';
    SYN.start(function (first) {
      mergeNet();
      if (first || sig() !== lastSig) { lastSig = sig(); render(); }
    });
  }
  if (GUEST_MODE) {
    const gb = document.createElement('div');
    gb.className = 'guest-bar';
    gb.textContent = GUEST_ROLE === 'boss' ? '演示模式 · 老板视图（仅演示数据，不含真实客户记录）' : '演示模式 · 只读浏览（不含员工数据）';
    document.body.appendChild(gb);
    document.body.classList.add('has-guestbar');
  }
  if (!storageOK) {
    const n = document.createElement('div');
    n.className = 'notice warn';
    n.style.cssText = 'position:fixed;bottom:12px;left:50%;transform:translateX(-50%);z-index:99';
    n.textContent = '当前浏览器禁用了本地存储，本次修改不会自动保存。请用「导出全量快照」备份，或通过 启动.bat 以 http 方式打开。';
    document.body.appendChild(n);
  }
})();