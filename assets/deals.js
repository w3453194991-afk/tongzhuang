/* 成交台账（员工）+ 业绩总览（老板） */
(function () {
  const STATUS = {
    '待报价': { c: 'n', w: 0 },
    '已报价': { c: 'y', w: 1 },
    '谈判中': { c: 'b', w: 2 },
    '已成交': { c: 'g', w: 3 },
    '已丢单': { c: 'n', w: 4 }
  };
  const ORDER = ['待报价', '已报价', '谈判中', '已成交', '已丢单'];

  /* ---- 待跟进客户：从「客户咨询 / 问价」行为自动推导 ---- */
  const FU_KIND = {
    'new': { w: 0, c: 'g' },   // 有新询价，最该先打
    'hot': { w: 1, c: 'y' },   // 问过价 / 加过购 / 意向高，还没成交
    'warm': { w: 2, c: 'n' },  // 只浏览过
    'won': { w: 3, c: 'b' },   // 已成交，不再催
    'mute': { w: 4, c: 'n' }   // 手动忽略
  };
  /** 「问价」意图词：客户在客服窗口问钱，就算一次问价 */
  const ASK_RE = /价|多少|几块|报价|价格|盘|钱|price|cost|quote|precio|preço|preco|سعر|цена|harga|giá|ราคา|fiyat/i;
  const FU_LABEL = {
    'new': ['新询价', 'New RFQ'], 'hot': ['高意向', 'Hot'],
    'warm': ['有浏览', 'Browsing'], 'won': ['已成交', 'Won'], 'mute': ['已忽略', 'Muted']
  };
  const DAY = 86400000;
  /* 员工手动标的紧急度：红 = 最急，黄 = 次之，蓝 = 不急；flags 存客户 uid → 等级 */
  const FLAG = {
    red: { l: ['最急', 'Urgent'], c: 'fu-f-red', icon: '⚑', order: 0 },
    yellow: { l: ['较急', 'Soon'], c: 'fu-f-yellow', icon: '⚑', order: 1 },
    blue: { l: ['一般', 'Normal'], c: 'fu-f-blue', icon: '⚑', order: 2 }
  };
  function flagMeta(v) { return FLAG[v] || null; }
  const relTime = (ms, LZ) => {
    if (!ms) return '—';
    const m = Math.floor((Date.now() - ms) / 60000);
    if (m < 1) return LZ ? LZ('刚刚', 'just now') : 'just now';
    if (m < 60) return LZ ? LZ(m + ' 分钟前', m + ' min ago') : m + ' min ago';
    const h = Math.floor(m / 60);
    if (h < 24) return LZ ? LZ(h + ' 小时前', h + ' h ago') : h + ' h ago';
    return LZ ? LZ(Math.floor(h / 24) + ' 天前', Math.floor(h / 24) + ' d ago') : Math.floor(h / 24) + ' d ago';
  };

  const monthKey = s => String(s || '').slice(0, 7);

  /** 一句话说明：这个客户为什么进了待跟进（询价 > 问价 > 报价 > 加购 > 浏览） */
  function reasonOf(f, LZ) {
    if (f.inq) return LZ ? '提交了 ' + f.inq + ' 张询价单' : f.inq + ' RFQ(s)';
    if (f.ask) return LZ ? '在客服里问了 ' + f.ask + ' 次价' : 'asked price ' + f.ask + 'x';
    if (f.quotes) return LZ ? '打开过报价单' : 'opened quote';
    if (f.carts) return LZ ? '把款号加入了报价' : 'added styles to quote';
    return LZ ? '浏览了 ' + f.views + ' 个款号' : 'viewed ' + f.views + ' styles';
  }

  /**
   * 待跟进客户 = 有咨询/问价行为、但还没成交的客户。
   * 数据全部来自「客户浏览」里记录的客户事件（AUTH 的 users[].events）：
   *   inquiry 前台提交询价 / quote 打开报价单 / addCart 加入报价 / search 搜索 / view 看款号
   * 再加上客服窗口里的「问价」发言（custMsgs，由 app 传进来）。
   * 已成交的客户自动落到 won，不再催；手动忽略的进 mute。
   */
  function followups(ctx) {
    const { customers = [], deals = [], custMsgs = [], mute = {}, flags = {}, notes = {}, LZ } = ctx || {};
    const now = Date.now();
    const out = [];

    customers.forEach(u => {
      const ev = (u.stat && u.stat.events) || u.events || [];
      const evOf = t => ev.filter(e => e.type === t);

      const inqs = evOf('inquiry');
      const quotes = evOf('quote');
      const carts = evOf('addCart');
      const searches = evOf('search');
      const views = evOf('view');

      /* 客服窗口里这个客户问过钱 */
      const chats = (custMsgs || []).filter(m => m.from === 'me' && m.uid === u.id);
      const asks = chats.filter(m => ASK_RE.test(m.text || ''));

      const lastEvent = ev.length ? Math.max.apply(null, ev.map(e => e.t)) : (u.lastSeen || 0);
      const lastInq = inqs.length ? Math.max.apply(null, inqs.map(e => e.t)) : 0;
      const lastAsk = asks.length ? Math.max.apply(null, asks.map(m => m.t || 0)) : 0;
      const lastQuote = quotes.length ? Math.max.apply(null, quotes.map(e => e.t)) : 0;
      const lastTouch = Math.max(lastEvent, lastAsk);

      /* 咨询/问价信号：有询价单、有问价发言、打开过报价、加过购 */
      const signals = inqs.length + asks.length + quotes.length + carts.length;
      if (!signals && !views.length && !searches.length) return; // 完全没接触过，不算

      /* 最近一次的动作是什么，决定话术 */
      let lastAct = 'view';
      if (lastInq >= lastEvent && lastInq) lastAct = 'inquiry';
      else if (lastAsk >= lastEvent && lastAsk) lastAct = 'ask';
      else if (quotes.length) lastAct = 'quote';
      else if (carts.length) lastAct = 'cart';
      else if (searches.length) lastAct = 'search';

      /* 是否已成交：按公司名/客户名匹配成交台账，且要看成交之后有没有新动静 */
      const myName = u.company || u.name;
      const wonDeals = (deals || []).filter(d => d.customer === myName && d.status === '已成交');
      const lastWonAt = wonDeals.length
        ? Math.max.apply(null, wonDeals.map(d => {
          const t = Date.parse(String(d.date || '') + 'T23:59:59');
          return isNaN(t) ? 0 : t;
        }))
        : 0;
      /* 成交之后又来问价 / 提交询价 → 这是复购机会，不能归到「已成交」里不管 */
      const reviveAfterWon = lastWonAt && Math.max(lastInq, lastAsk, lastQuote) > lastWonAt;
      const isWon = wonDeals.length > 0 && !reviveAfterWon;

      /* 意向分：客户自带 stat.score 打底，再叠行为权重 */
      const score = Math.min(99,
        ((u.stat && u.stat.score) || 0) +
        Math.min(30, inqs.length * 18) +
        Math.min(20, asks.length * 10) +
        Math.min(14, quotes.length * 7) +
        Math.min(10, carts.length * 5)
      );

      /* 静默天数：太久没动静要降级 */
      const idleDays = lastTouch ? Math.floor((now - lastTouch) / DAY) : 99;

      let kind;
      if (isWon) kind = 'won';
      else if (mute[u.id]) kind = 'mute';
      else if (inqs.length || asks.length) {
        /* 咨询过/问过价：7 天内算新询价，超过算高意向待追回 */
        kind = (now - Math.max(lastInq, lastAsk) <= 7 * DAY) ? 'new' : 'hot';
      } else if (quotes.length || carts.length || score >= 60) kind = 'hot';
      else kind = 'warm';

      /* 要什么：从询价单和浏览记录里抽款号 */
      const codes = [];
      inqs.forEach(e => (e.d && e.d.items || []).forEach(it => it && it.code && codes.push(it.code)));
      ev.forEach(e => { if (e.d && e.d.code) codes.push(e.d.code); });
      const wantCodes = [...new Set(codes)].slice(0, 4);

      /* 客户原话：取最近一条搜索/客服发言 */
      const lastQ = asks.length ? asks[asks.length - 1].text
        : (searches.length ? (searches[searches.length - 1].d || {}).q || '' : '');

      /* 建议下一步 */
      let next;
      if (kind === 'new') next = inqs.length
        ? (LZ ? LZ('回价：有一张询价单等着报价', 'Reply: an RFQ is waiting') : 'Reply to the RFQ')
        : (LZ ? LZ('回他问的价', 'Answer the price question') : 'Answer the price question');
      else if (kind === 'hot') next = (LZ ? LZ('追一次：报过价但没下单', 'Follow up: quoted, not ordered') : 'Follow up on the quote');
      else if (kind === 'won') next = (LZ ? LZ('维护：已成交，可推新品/复购', 'Maintain: repeat order or new items') : 'Maintain the account');
      else next = (LZ ? LZ('试探：只在浏览，发个主推款号', 'Nudge: browsing only, send a style') : 'Nudge with a style');

      out.push({
        uid: u.id, name: u.name, company: u.company || '', country: u.country || '',
        contact: u.contact || {}, demo: !!u.demo, tags: u.tags || [],
        kind, score, signals,
        inq: inqs.length, ask: asks.length, quotes: quotes.length,
        carts: carts.length, views: views.length, searches: searches.length,
        lastTouch, lastInq, lastAsk, idleDays, lastAct, lastQ,
        wantCodes, next, wonAmount: wonDeals.reduce((s, d) => s + (+d.amount || 0), 0),
        flag: flags[u.id] || '', note: notes[u.id] || null,
        reason: ''
      });
    });

    /* 同一家公司可能有几个登录账号（业务员、老板各一个）：按公司合并成一条，别重复催 */
    const merged = [];
    const byKey = {};
    out.forEach(f => {
      const key = (f.company || f.name).trim().toLowerCase();
      const hit = byKey[key];
      if (!hit) { byKey[key] = f; merged.push(f); return; }
      /* 取更急的那个状态，其余计数累加 */
      if (FU_KIND[f.kind].w < FU_KIND[hit.kind].w) { hit.kind = f.kind; hit.next = f.next; }
      hit.score = Math.max(hit.score, f.score);
      hit.inq += f.inq; hit.ask += f.ask; hit.quotes += f.quotes;
      hit.carts += f.carts; hit.views += f.views; hit.searches += f.searches;
      if (f.lastTouch > hit.lastTouch) {
        hit.lastTouch = f.lastTouch; hit.lastQ = f.lastQ; hit.idleDays = f.idleDays;
      }
      f.wantCodes.forEach(c => { if (hit.wantCodes.indexOf(c) < 0) hit.wantCodes.push(c); });
      hit.wantCodes = hit.wantCodes.slice(0, 4);
      if (!hit.contact.value && f.contact.value) hit.contact = f.contact;
      hit.accounts = (hit.accounts || 1) + 1;
      /* 合并账号时：旗帜取更紧急的，备注叠加 */
      if (f.flag && (!hit.flag || FLAG[f.flag].order < FLAG[hit.flag].order)) hit.flag = f.flag;
      if (f.note) (hit.notes = hit.notes || []).push(f.note);
    });

    /* 合并后计数变了，原因和「在问什么」重新算一遍 */
    merged.forEach(f => {
      f.reason = reasonOf(f, LZ);
      if (!f.notes && f.note) f.notes = [f.note];
    });

    /* 有旗的先按旗色排（红>黄>蓝），再按阶段和意向分 */
    const flagW = f => f.flag ? FLAG[f.flag].order : 9;

    return merged.sort((a, b) =>
      (flagW(a) - flagW(b)) ||
      (FU_KIND[a.kind].w - FU_KIND[b.kind].w) || (b.score - a.score) || (b.lastTouch - a.lastTouch)
    );
  }

  /** 待跟进客户面板（员工端 / 老板端都显示） */
  function htmlFollowups(ctx) {
    const { esc, LZ } = ctx;
    const list = followups(ctx);
    const zh = v => LZ ? LZ(v[0], v[1]) : v[0];
    const items = list.filter(f => f.kind !== 'won' && f.kind !== 'mute');
    const newN = items.filter(f => f.kind === 'new').length;
    const hotN = items.filter(f => f.kind === 'hot').length;
    const wonN = list.filter(f => f.kind === 'won').length;

    const kpiRow = '<div class="fu-kpis">' +
      '<div class="fu-kpi main"><b>' + items.length + '</b><span>' + zh(['待跟进客户', 'To follow up']) + '</span></div>' +
      '<div class="fu-kpi g"><b>' + newN + '</b><span>' + zh(['新咨询 / 问价', 'New RFQ / ask']) + '</span></div>' +
      '<div class="fu-kpi y"><b>' + hotN + '</b><span>' + zh(['报过价待追', 'Quoted, pending']) + '</span></div>' +
      '<div class="fu-kpi b"><b>' + wonN + '</b><span>' + zh(['已成交维护', 'Won, maintain']) + '</span></div>' +
      '<div class="fu-kpi red"><b>' + items.filter(f => f.flag === 'red').length + '</b><span>' + zh(['⚑ 最急', '⚑ Urgent']) + '</span></div>' +
      '</div>';

    /* 筛选条：员工和老板都能按紧急度 / 有没有备注筛 */
    const fl = ctx.fuFilter || 'all';
    const cnt = k => k === 'all' ? items.length : k === 'note' ? items.filter(x => (x.notes || x.note)).length : items.filter(x => x.flag === k).length;
    const fbtn = (k, label) => '<button class="btn xs ' + (fl === k ? 'primary' : '') + '" data-act="fuFilter" data-id="' + k + '">' +
      label + ' <span class="tiny">' + cnt(k) + '</span></button>';
    const filterBar = '<div class="fu-filter">' +
      fbtn('all', zh(['全部', 'All'])) +
      fbtn('red', '⚑ ' + zh(['最急', 'Urgent'])) +
      fbtn('yellow', '⚑ ' + zh(['较急', 'Soon'])) +
      fbtn('blue', '⚑ ' + zh(['一般', 'Normal'])) +
      fbtn('note', '✎ ' + zh(['有备注', 'Has note'])) +
      '</div>';

    const shown = fl === 'all' ? items
      : fl === 'note' ? items.filter(x => (x.notes || x.note))
        : items.filter(x => x.flag === fl);

    const rows = shown.map(f => {
      const k = FU_KIND[f.kind];
      const c = f.contact || {};
      const codes = f.wantCodes.length
        ? f.wantCodes.map(x => '<span class="chip mono">' + esc(x) + '</span>').join(' ')
        : '<span class="tiny muted">—</span>';

      /* 紧急小旗：员工点一下切换颜色（红→黄→蓝→取消） */
      const fm = flagMeta(f.flag);
      const flagHtml = fm
        ? '<span class="fu-flag ' + fm.c + '" data-act="fuFlagCycle" data-id="' + esc(f.uid) + '" title="' + zh(fm.l) + ' · 点击切换">' +
        fm.icon + '<i>' + zh(fm.l) + '</i></span>'
        : '<span class="fu-flag none" data-act="fuFlagCycle" data-id="' + esc(f.uid) + '" title="' + zh(['标紧急', 'Set urgency']) + '">⚐</span>';

      /* 员工备注：文字 + 图片（聊天截图），老板端只读展示 */
      const notes = (f.notes || []).concat(f.note && !f.notes ? [f.note] : []);
      const noteHtml = notes.length
        ? notes.map(n => {
          const imgs = (n.imgs || []).map(src => '<img class="fu-shot" src="' + src + '" alt="聊天记录">').join('');
          return '<div class="fu-note">' +
            (n.text ? '<div class="fu-note-t">' + esc(n.text) + '</div>' : '') +
            (imgs ? '<div class="fu-shots">' + imgs + '</div>' : '') +
            (n.by || n.at ? '<div class="tiny muted">' + esc(n.by || '') + (n.at ? ' · ' + esc(n.at) : '') + '</div>' : '') +
            '</div>';
        }).join('')
        : '<div class="tiny muted" style="padding:2px 0">' + zh(['暂无备注', 'No note']) + '</div>';

      return '<tr class="fu-row' + (fm ? ' fu-has-flag' : '') + '">' +
        '<td><div class="fu-who">' + flagHtml + ' <b>' + esc(f.company || f.name) + '</b>' +
        (f.demo ? ' <span class="tag y">' + zh(['体验', 'Demo']) + '</span>' : '') +
        (f.accounts > 1 ? ' <span class="tag n">' + f.accounts + zh(['个账号', ' accts']) + '</span>' : '') + '</div>' +
        '<div class="tiny muted">' + esc(f.name) + (f.country ? ' · ' + esc(f.country) : '') + '</div>' +
        '<div class="fu-note-wrap">' + noteHtml + '</div></td>' +
        '<td><span class="tag ' + k.c + '">' + zh(FU_LABEL[f.kind]) + '</span>' +
        '<div class="tiny muted" style="margin-top:3px">' + esc(f.reason) + '</div></td>' +
        '<td>' + codes + (f.lastQ ? '<div class="tiny muted fu-q">「' + esc(String(f.lastQ).slice(0, 40)) + '」</div>' : '') + '</td>' +
        '<td class="small"><span class="tag n">' + esc(c.type || '') + '</span>' +
        '<div class="tiny mono muted">' + esc(c.value || '') + '</div></td>' +
        '<td class="small">' + esc(relTime(f.lastTouch, LZ)) +
        '<div class="tiny muted">' + zh(['静默 ', 'idle ']) + f.idleDays + zh([' 天', 'd']) + '</div></td>' +
        '<td class="right"><span class="tag ' + (f.score >= 70 ? 'g' : f.score >= 50 ? 'y' : 'n') + '">' + f.score + '</span></td>' +
        '<td class="small">' + esc(f.next) + '</td>' +
        '<td><div class="row" style="gap:4px">' +
        '<button class="btn xs primary" data-act="fuContact" data-id="' + esc(f.uid) + '">' + zh(['跟进', 'Follow up']) + '</button>' +
        '<button class="btn xs" data-act="fuNote" data-id="' + esc(f.uid) + '">' + zh(['备注', 'Note']) + '</button>' +
        '<button class="btn xs" data-act="fuDeal" data-id="' + esc(f.uid) + '">' + zh(['登记', 'Log deal']) + '</button>' +
        '</div></td>' +
        '</tr>';
    }).join('');

    const body = items.length
      ? filterBar + (shown.length
        ? '<div class="tbl-wrap"><table><thead><tr>' +
        '<th>' + zh(['客户 / 备注', 'Customer / note']) + '</th>' +
        '<th>' + zh(['状态', 'Stage']) + '</th>' +
        '<th>' + zh(['在问什么', 'Interested in']) + '</th>' +
        '<th>' + zh(['联系方式', 'Contact']) + '</th>' +
        '<th>' + zh(['最近动静', 'Last touch']) + '</th>' +
        '<th class="right">' + zh(['意向', 'Intent']) + '</th>' +
        '<th>' + zh(['建议下一步', 'Next step']) + '</th>' +
        '<th></th></tr></thead><tbody>' + rows + '</tbody></table></div>'
        : '<div class="empty">' + zh(['这个筛选下没有客户', 'Nothing under this filter']) + '</div>')
      : '<div class="empty">' + zh(['暂时没有待跟进的客户。客户在前台咨询、问价、提交询价后，这里会自动出现。',
        'No follow-ups yet. They appear automatically once a customer asks or requests a quote.']) + '</div>';

    return '<div class="card fu-card"><div class="card-h">' +
      '<h3>' + zh(['待跟进客户', 'Customers to follow up']) + '</h3>' +
      '<span class="sub">' + zh(['自动汇总客户咨询 / 问价；点小旗标紧急度，点「备注」贴聊天记录',
        'Auto-built from inquiries; flag urgency, attach chat screenshots']) + '</span>' +
      '</div>' +
      '<div class="card-b" style="padding-bottom:0">' + kpiRow + '</div>' +
      body + '</div>';
  }

  /**
   * 老板端：员工的跟进动作汇总（谁标了多少旗、留了多少备注）
   * 让老板一眼看到「哪个销售真的在跟客户」。
   */
  function htmlFollowupBoss(ctx) {
    const { esc, LZ } = ctx;
    const list = followups(ctx);
    const zh = v => LZ ? LZ(v[0], v[1]) : v[0];
    const items = list.filter(f => f.kind !== 'won' && f.kind !== 'mute');

    /* 按「备注里的记录人」汇总；没写记录人的算未署名 */
    const byStaff = {};
    items.forEach(f => {
      const all = (f.notes || []).concat(f.note && !f.notes ? [f.note] : []);
      all.forEach(n => {
        const who = (n && n.by) || zh(['未署名', 'Unassigned']);
        if (!byStaff[who]) byStaff[who] = { staff: who, notes: 0, shots: 0, flags: 0, custs: {} };
        byStaff[who].notes++;
        byStaff[who].shots += ((n && n.imgs) || []).length;
        byStaff[who].custs[f.uid] = 1;
      });
      /* 有旗但没备注的，旗算在「最近一个操作人」头上也统计不到，就单列 */
    });
    const staffRows = Object.values(byStaff).sort((a, b) => b.notes - a.notes);
    const totalNotes = staffRows.reduce((s, r) => s + r.notes, 0);
    const totalShots = staffRows.reduce((s, r) => s + r.shots, 0);
    const redN = items.filter(f => f.flag === 'red').length;

    const kpiRow = '<div class="kpi-grid">' +
      kpi(zh(['待跟进总数', 'Follow-ups']), items.length, zh(['未成交客户', 'not yet won'])) +
      kpi(zh(['标了最急', 'Marked urgent']), redN, '⚑ ' + zh(['红色小旗', 'red flag']), redN ? 'down' : '') +
      kpi(zh(['员工备注', 'Staff notes']), totalNotes, zh(['含聊天记录', 'incl. chats'])) +
      kpi(zh(['上传截图', 'Screenshots']), totalShots, zh(['跨平台沟通留痕', 'cross-platform proof'])) +
      '</div>';

    /* 跟进明细：凡是员工标了旗或留了备注的客户，老板都要能看到原文和截图 */
    const touched = items.filter(f => f.flag || (f.notes || f.note))
      .sort((a, b) => {
        const wa = a.flag ? FLAG[a.flag].order : 9, wb = b.flag ? FLAG[b.flag].order : 9;
        return wa - wb || b.score - a.score;
      });
    const detailRows = touched.map(f => {
      const fm = f.flag ? FLAG[f.flag] : null;
      const all = (f.notes || []).concat(f.note && !f.notes ? [f.note] : []);
      const last = all.length ? all[all.length - 1] : null;
      const imgs = [];
      all.forEach(n => ((n && n.imgs) || []).forEach(s => imgs.push(s)));
      const imgsHtml = imgs.length
        ? '<div class="fu-shots">' + imgs.slice(0, 6).map(s => '<img class="fu-shot" src="' + s + '" alt="chat">').join('') +
        (imgs.length > 6 ? '<span class="tiny muted" style="align-self:center">+' + (imgs.length - 6) + '</span>' : '') + '</div>'
        : '<span class="tiny muted">—</span>';
      return '<tr>' +
        '<td>' + (fm
          ? '<span class="fu-flag ' + fm.c + '" style="cursor:default">' + fm.icon + '<i>' + zh(fm.l) + '</i></span>'
          : '<span class="tiny muted">' + zh(['未标', 'none']) + '</span>') + '</td>' +
        '<td><b>' + esc(f.company || f.name) + '</b><div class="tiny muted">' + esc(f.name) + (f.country ? ' · ' + esc(f.country) : '') + '</div></td>' +
        '<td class="small">' + esc(f.reason) + '</td>' +
        '<td class="small">' + (last && last.text ? esc(last.text) : '<span class="tiny muted">' + zh(['只有截图', 'image only']) + '</span>') +
        (last && last.by ? '<div class="tiny muted">' + esc(last.by) + (last.at ? ' · ' + esc(last.at) : '') + '</div>' : '') + '</td>' +
        '<td>' + imgsHtml + '</td>' +
        '<td class="right"><span class="tag ' + (f.score >= 70 ? 'g' : f.score >= 50 ? 'y' : 'n') + '">' + f.score + '</span></td>' +
        '</tr>';
    }).join('');

    return '<div class="card"><div class="card-h"><h3>' + zh(['员工跟进情况', 'Staff follow-up']) + '</h3>' +
      '<span class="sub">' + zh(['员工标的紧急度与留下的聊天记录，老板端只读', 'Urgency flags and notes left by staff (read-only)']) + '</span></div>' +
      '<div class="card-b" style="padding-bottom:0">' + kpiRow + '</div>' +
      (staffRows.length
        ? '<div class="tbl-wrap"><table><thead><tr><th>' + zh(['员工', 'Staff']) + '</th><th class="right">' + zh(['负责客户', 'Customers']) +
        '</th><th class="right">' + zh(['备注条数', 'Notes']) + '</th><th class="right">' + zh(['截图', 'Shots']) + '</th></tr></thead><tbody>' +
        staffRows.map(r => '<tr><td><b>' + esc(r.staff) + '</b></td>' +
          '<td class="right mono small">' + Object.keys(r.custs).length + '</td>' +
          '<td class="right mono">' + r.notes + '</td>' +
          '<td class="right mono small">' + (r.shots || '—') + '</td></tr>').join('') +
        '</tbody></table></div>'
        : '<div class="empty">' + zh(['员工还没留下跟进记录', 'No staff notes yet']) + '</div>') +
      '</div>' +
      (touched.length
        ? '<div class="card"><div class="card-h"><h3>' + zh(['跟进明细', 'Follow-up detail']) + '</h3>' +
        '<span class="sub">' + touched.length + ' ' + zh(['位客户有标记或备注', 'customers flagged or noted']) + '</span></div>' +
        '<div class="tbl-wrap"><table><thead><tr><th>' + zh(['紧急度', 'Flag']) + '</th><th>' + zh(['客户', 'Customer']) +
        '</th><th>' + zh(['为什么待跟进', 'Why']) + '</th><th>' + zh(['员工备注', 'Staff note']) +
        '</th><th>' + zh(['聊天截图', 'Screenshots']) + '</th><th class="right">' + zh(['意向', 'Intent']) + '</th></tr></thead><tbody>' +
        detailRows + '</tbody></table></div></div>'
        : '');
  }

  const thisMonth = () => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  };
  const prevMonth = () => {
    const d = new Date();
    d.setDate(1); d.setMonth(d.getMonth() - 1);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  };
  const today = () => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };

  function metrics(list) {
    const cm = thisMonth(), pm = prevMonth();
    const won = list.filter(d => d.status === '已成交');
    const mWon = won.filter(d => monthKey(d.date) === cm);
    const pWon = won.filter(d => monthKey(d.date) === pm);
    const amount = mWon.reduce((s, d) => s + (+d.amount || 0), 0);
    const prevAmount = pWon.reduce((s, d) => s + (+d.amount || 0), 0);
    const pipeline = list.filter(d => d.status === '已报价' || d.status === '谈判中')
      .reduce((s, d) => s + (+d.amount || 0), 0);
    const lost = list.filter(d => d.status === '已丢单').length;
    const quoted = list.filter(d => d.status !== '待报价').length;
    return {
      cm, amount, prevAmount, count: mWon.length, prevCount: pWon.length,
      avg: mWon.length ? amount / mWon.length : 0,
      pipeline, lost, quoted,
      winRate: quoted ? Math.round(won.length / quoted * 100) : 0,
      custs: new Set(list.map(d => d.customer)).size,
      growth: prevAmount ? Math.round((amount - prevAmount) / prevAmount * 100) : (amount ? 100 : 0)
    };
  }

  function staffRows(list) {
    const names = [...new Set(list.map(d => d.staff || '未分配'))];
    return names.map(n => {
      const mine = list.filter(d => (d.staff || '未分配') === n);
      const won = mine.filter(d => d.status === '已成交');
      const amount = won.reduce((s, d) => s + (+d.amount || 0), 0);
      const quoted = mine.filter(d => d.status !== '待报价').length;
      const markets = {};
      mine.forEach(d => { markets[d.country || '—'] = (markets[d.country || '—'] || 0) + 1; });
      const top = Object.keys(markets).sort((a, b) => markets[b] - markets[a])[0] || '—';
      return {
        staff: n, deals: mine.length, won: won.length, amount,
        avg: won.length ? amount / won.length : 0,
        rate: quoted ? Math.round(won.length / quoted * 100) : 0,
        custs: new Set(mine.map(d => d.customer)).size,
        market: top,
        last: mine.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)))[0]
      };
    }).sort((a, b) => b.amount - a.amount);
  }

  function productRows(list) {
    const map = {};
    list.forEach(d => {
      const k = d.code || '—';
      if (!map[k]) map[k] = { code: k, name: d.pname || '', deals: 0, qty: 0, amount: 0, won: 0, lost: 0, last: '' };
      const r = map[k];
      r.deals++; r.qty += (+d.qty || 0); r.amount += (+d.amount || 0);
      if (d.status === '已成交') r.won++;
      if (d.status === '已丢单') r.lost++;
      if (!r.last || String(d.date) > r.last) r.last = String(d.date);
    });
    return Object.values(map).sort((a, b) => b.amount - a.amount);
  }

  function summary(m, rows, prods) {
    const parts = [];
    const nl = '\n';
    if (m.amount) parts.push('本月成交 $' + fmt(m.amount) + '、' + m.count + ' 单，环比' + (m.growth >= 0 ? '增长 ' + m.growth : '下降 ' + Math.abs(m.growth)) + '%。');
    else parts.push('本月还没有登记成交，先把在谈的 ' + m.quoted + ' 笔往前推。');
    if (rows[0]) parts.push('贡献最大的是 ' + rows[0].staff + '（$' + fmt(rows[0].amount) + '，占 ' + (m.amount ? Math.round(rows[0].amount / m.amount * 100) : 0) + '%，主战场 ' + rows[0].market + '）。');
    const bestRate = rows.filter(r => r.deals >= 2).sort((a, b) => b.rate - a.rate)[0];
    if (bestRate) parts.push('转化率最高的是 ' + bestRate.staff + '（' + bestRate.rate + '%）。');
    if (m.pipeline) parts.push('在谈金额 $' + fmt(m.pipeline) + '，是下个月的粮。');
    if (prods[0]) parts.push('卖得最好的是 ' + prods[0].code + '（$' + fmt(prods[0].amount) + '，' + prods[0].won + ' 单成交）。');
    if (m.lost) parts.push('丢单 ' + m.lost + ' 笔，建议逐条记原因（价格 / 交期 / 起订量）。');
    return parts.join(nl);
  }

  function fmt(n) {
    const v = Math.round(+n || 0);
    return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function kpi(label, value, sub, cls) {
    return '<div class="kpi ' + (cls || '') + '"><div class="kpi-l">' + label + '</div>' +
      '<div class="kpi-v">' + value + '</div>' +
      (sub ? '<div class="kpi-s">' + sub + '</div>' : '') + '</div>';
  }

  function htmlDeals(ctx) {
    const { esc } = ctx;
    const list = ctx.list || [];
    const m = metrics(list);
    const me = ctx.me || {};
    const isBoss = !!ctx.isBoss;
    const mine = (isBoss || (me && me.demo)) ? list : list.filter(d => d.staff === me.name);
    const rows = mine.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const custs = ctx.customers || [];
    const statusOpts = (cur) => ORDER.map(s => '<option' + (s === cur ? ' selected' : '') + '>' + s + '</option>').join('');

    return [
      '<div class="row wrap-gap" style="justify-content:space-between;margin-bottom:12px">',
      '<div><h1 style="margin:0">成交台账</h1><div class="muted small">',
      isBoss ? '全部员工的成交记录，可逐条改状态。' : '登记你手上的单子；状态一改，老板那边立刻能看到。',
      '</div></div>',
      isBoss ? '<button class="btn" data-act="tab" data-id="boss">业绩总览 →</button>' : '',
      '</div>',

      '<div class="kpi-grid">',
      kpi('本月成交额', '$' + fmt(m.amount), m.growth >= 0 ? '↑ ' + m.growth + '% 环比' : '↓ ' + Math.abs(m.growth) + '% 环比', m.growth >= 0 ? 'up' : 'down'),
      kpi('成交单数', m.count, '上月 ' + m.prevCount + ' 单'),
      kpi('平均单额', '$' + fmt(m.avg), m.count ? '按本月成交' : '暂无'),
      kpi('在谈金额', '$' + fmt(m.pipeline), '报价 + 谈判中'),
      '</div>',

      htmlFollowups(ctx),

      '<div class="card"><div class="card-h"><h3>登记一笔</h3><span class="sub">金额自动按「数量 × 单价」，可改</span></div>',
      '<div class="card-b"><div class="sq-form">',
      '<label>客户 <select id="dCust">' + custs.map(c => '<option value="' + esc(c.name) + '|' + esc(c.country || '') + '">' + esc(c.company || c.name) + ' · ' + esc(c.country || '') + '</option>').join('') + '</select></label>',
      '<label>款号 <input id="dCode" list="dCodeList" placeholder="SW2601047 / DR2601001"><datalist id="dCodeList">' + (ctx.codes || []).slice(0, 120).map(c => '<option value="' + esc(c) + '">').join('') + '</datalist></label>',
      '<label>数量 <input id="dQty" type="number" min="1" step="50" value="500"></label>',
      '<label>单价 USD <input id="dPrice" type="number" min="0" step="0.1" placeholder="自动带出"></label>',
      '<label>金额 USD <input id="dAmount" type="number" min="0" step="1" placeholder="自动算"></label>',
      '<label>状态 <select id="dStatus">' + statusOpts('已成交') + '</select></label>',
      '<label>日期 <input id="dDate" type="date" value="' + today() + '"></label>',
      '<label class="wide">备注 <input id="dNote" placeholder="如：奶油小方圆领卫衣，含尺码表与质检报告"></label>',
      '</div>',
      '<div class="row wrap-gap" style="margin-top:10px"><button class="btn primary sm" data-act="dealAdd">登记</button>',
      '<span class="tiny muted">登记人：' + esc(me.name || '') + '</span></div></div></div>',

      '<div class="card"><div class="card-h"><h3>' + (isBoss ? '全部记录' : '我的记录') + '</h3><span class="sub">' + rows.length + ' 条</span></div>',
      '<div class="tbl-wrap"><table><thead><tr><th>日期</th><th>客户</th><th>款号</th><th class="right">数量</th><th class="right">金额</th><th>状态</th>' + (isBoss ? '<th>员工</th>' : '') + '<th>备注</th><th></th></tr></thead><tbody>',
      rows.map(d => [
        '<tr class="deal-row" data-act="dealOpen" data-id="' + esc(d.id) + '" title="点开看这一单的完整信息">',
        '<td class="mono small">' + esc(d.date) + '</td>',
        '<td class="small"><b>' + esc(d.customer) + '</b><div class="tiny muted">' + esc(d.country || '') + '</div></td>',
        '<td class="mono small">' + esc(d.code) + '</td>',
        '<td class="right mono small">' + fmt(d.qty) + '</td>',
        '<td class="right mono">$' + fmt(d.amount) + '</td>',
        '<td><select class="deal-st" data-act="dealSet" data-id="' + esc(d.id) + '">' + statusOpts(d.status) + '</select></td>',
        isBoss ? '<td class="small">' + esc(d.staff || '') + '</td>' : '',
        '<td class="small muted" style="max-width:220px">' + esc(d.note || '') + '</td>',
        '<td><button class="btn xs" data-act="dealDel" data-id="' + esc(d.id) + '">删</button></td>',
        '</tr>'
      ].join('')).join(''),
      '</tbody></table>',
      (!rows.length ? '<div class="empty">还没有记录，上面登记第一笔</div>' : ''),
      (!rows.length && list.length ? '<div class="tiny muted" style="padding:8px 2px">你名下还没有记录；系统里有 ' + list.length + ' 条示例（李娜 / 张伟 / 王强），老板端能看到全部。登记一笔就会出现在这里。</div>' : ''),
      '</div></div>'
    ].join('');
  }

  function htmlBoss(ctx) {
    const { esc } = ctx;
    const list = ctx.list || [];
    const m = metrics(list);
    const rows = staffRows(list);
    const prods = productRows(list);
    const max = Math.max.apply(null, rows.map(r => r.amount).concat([1]));

    return [
      '<div class="row wrap-gap" style="justify-content:space-between;margin-bottom:12px">',
      '<div><h1 style="margin:0">业绩总览</h1><div class="muted small">只有老板能看：员工成交、转化、在谈与款号结构。数据来自员工登记，示例数据可随时清空。</div></div>',
      '<div class="row wrap-gap"><button class="btn" data-act="tab" data-id="deals">成交台账 →</button>',
      '<button class="btn" data-act="tab" data-id="visits">客户浏览 →</button></div></div>',

      '<div class="kpi-grid">',
      kpi('本月成交额', '$' + fmt(m.amount), (m.growth >= 0 ? '↑ ' : '↓ ') + Math.abs(m.growth) + '% 环比上月', m.growth >= 0 ? 'up' : 'down'),
      kpi('成交单数', m.count, '上月 ' + m.prevCount + ' 单'),
      kpi('平均单额', '$' + fmt(m.avg), '客单价'),
      kpi('报价转化率', m.winRate + '%', '成交 / 已报价'),
      kpi('在谈金额', '$' + fmt(m.pipeline), '下个月的口粮'),
      kpi('覆盖客户', m.custs, '去重客户数'),
      '</div>',

      '<div class="card"><div class="card-h"><h3>员工业绩</h3><span class="sub">按成交额排序</span></div><div class="card-b" style="padding:4px 0 0">',
      '<div class="tbl-wrap"><table><thead><tr><th>员工</th><th class="right">客户</th><th class="right">记录</th><th class="right">成交单</th><th class="right">成交额</th><th class="right">平均单额</th><th class="right">转化率</th><th>主战场</th><th>最近</th></tr></thead><tbody>',
      rows.map(r => [
        '<tr class="click" data-act="bossStaff" data-id="' + esc(r.staff) + '" title="点开看这位员工跟进的客户">',
        '<td><b>' + esc(r.staff) + '</b> <span class="tiny muted">看客户 ›</span><div class="deal-bar"><i style="width:' + Math.round(r.amount / max * 100) + '%"></i></div></td>',
        '<td class="right mono small">' + r.custs + '</td>',
        '<td class="right mono small">' + r.deals + '</td>',
        '<td class="right mono"><b>' + r.won + '</b></td>',
        '<td class="right mono b">$' + fmt(r.amount) + '</td>',
        '<td class="right mono small">$' + fmt(r.avg) + '</td>',
        '<td class="right"><span class="tag ' + (r.rate >= 60 ? 'g' : r.rate >= 35 ? 'y' : 'n') + '">' + r.rate + '%</span></td>',
        '<td class="small">' + esc(r.market) + '</td>',
        '<td class="small mono muted">' + esc(r.last ? r.last.date : '—') + '</td>',
        '</tr>'
      ].join('')).join(''),
      '</tbody></table></div></div></div>',

      '<div class="card"><div class="card-h"><h3>一句话总结</h3><span class="sub">自动生成，可照抄到周报</span></div>',
      '<div class="card-b"><div class="boss-sum">' + esc(summary(m, rows, prods)).split('\n').map(x => '<div>' + esc(x) + '</div>').join('') + '</div></div></div>',

      '<div class="card"><div class="card-h"><h3>款式成交状态</h3><span class="sub">哪些款号真的在走量</span></div>',
      '<div class="tbl-wrap"><table><thead><tr><th>款号</th><th class="right">记录</th><th class="right">成交量</th><th class="right">成交额</th><th class="right">成交</th><th class="right">丢单</th><th>最近</th><th>判断</th></tr></thead><tbody>',
      prods.slice(0, 10).map(p => {
        const verdict = p.won >= 2 ? '<span class="tag g">主力</span>' : p.won === 1 ? '<span class="tag b">起量</span>' : p.lost ? '<span class="tag n">只丢单</span>' : '<span class="tag y">在谈</span>';
        return '<tr><td class="mono b">' + esc(p.code) + '</td>' +
          '<td class="right mono small">' + p.deals + '</td>' +
          '<td class="right mono small">' + fmt(p.qty) + '</td>' +
          '<td class="right mono">$' + fmt(p.amount) + '</td>' +
          '<td class="right mono small">' + p.won + '</td>' +
          '<td class="right mono small">' + (p.lost || '—') + '</td>' +
          '<td class="mono small muted">' + esc(p.last) + '</td>' +
          '<td>' + verdict + '</td></tr>';
      }).join(''),
      '</tbody></table>',
      (!prods.length ? '<div class="empty">还没有成交数据</div>' : ''),
      '</div></div>'
    ].join('');
  }

  /** 单条记录详情：点开一行看到的全部信息 */
  function dealDetail(ctx, id) {
    const { esc, LZ } = ctx;
    const list = ctx.list || [];
    const d = list.find(x => x.id === id);
    if (!d) return null;
    const zh = !LZ || LZ('中', 'en') === '中';
    const STA = { '待报价': 'To quote', '已报价': 'Quoted', '谈判中': 'Negotiating', '已成交': 'Won', '已丢单': 'Lost' };
    const stName = v => zh ? v : (STA[v] || v);
    const money = v => '$' + fmt(v);
    const qty = +d.qty || 0;
    const amount = +d.amount || 0;
    const unit = qty ? amount / qty : 0;
    const st = STATUS[d.status] || { c: 'n', w: 0 };
    const stepW = st.w;
    const steps = [['待报价', '报价'], ['已报价', '报价'], ['谈判中', '谈判'], ['已成交', '成交'], ['已丢单', '丢单']];
    const tl = ORDER.map((k, i) => {
      let cls = 'dd-step';
      if (d.status === '已丢单') { if (k === '已丢单') cls += ' cur'; else if (i < 3) cls += ' done'; }
      else if (i < stepW) cls += ' done';
      else if (i === stepW) cls += ' cur';
      const label = stName(k);
      return '<div class="' + cls + '"><i></i>' + label + '</div>';
    }).join('');

    const sameCust = list.filter(x => x.customer === d.customer && x.id !== d.id);
    const sameCode = list.filter(x => x.code === d.code && x.id !== d.id);
    const row = (x) => '<div><span>' + esc(x.date) + ' · ' + esc(x.code || '—') + ' · ' + esc(stName(x.status)) +
      '</span><b>' + money(x.amount) + '</b></div>';
    const custSum = sameCust.reduce((a, x) => a + (+x.amount || 0), 0);
    const wonCnt = sameCust.filter(x => x.status === '已成交').length;

    return {
      title: LZ ? LZ('成交记录详情', 'Deal detail') : 'Deal detail',
      body: [
        '<div class="dd-top">',
        '<div><div class="dd-cust">' + esc(d.customer) + '</div>',
        '<div class="tiny muted">' + esc(d.country || '—') + (d.staff ? ' · ' + (LZ ? LZ('登记人', 'Owner') + '：' : 'Owner: ') + esc(d.staff) : '') + '</div></div>',
        '<span class="tag ' + st.c + '">' + esc(stName(d.status)) + '</span>',
        '</div>',

        '<div class="dd-kpis">',
        '<div class="dd-kpi"><span>' + (LZ ? LZ('成交金额', 'Amount') : 'Amount') + '</span><b>' + money(amount) + '</b></div>',
        '<div class="dd-kpi"><span>' + (LZ ? LZ('数量', 'Qty') : 'Qty') + '</span><b>' + fmt(qty) + '</b></div>',
        '<div class="dd-kpi"><span>' + (LZ ? LZ('单价', 'Unit price') : 'Unit price') + '</span><b>' + money(Math.round(unit * 100) / 100) + '</b></div>',
        '</div>',

        '<div class="dd-grid">',
        '<div><span class="k">' + (LZ ? LZ('款号', 'Style no.') : 'Style no.') + '</span><b class="mono">' + esc(d.code || '—') + '</b></div>',
        '<div><span class="k">' + (LZ ? LZ('款式名称', 'Style name') : 'Style name') + '</span><b>' + esc(d.pname || '—') + '</b></div>',
        '<div><span class="k">' + (LZ ? LZ('日期', 'Date') : 'Date') + '</span><b class="mono">' + esc(d.date) + '</b></div>',
        '<div><span class="k">' + (LZ ? LZ('状态', 'Status') : 'Status') + '</span><b>' + esc(stName(d.status)) + '</b></div>',
        '<div><span class="k">' + (LZ ? LZ('国家 / 市场', 'Country') : 'Country') + '</span><b>' + esc(d.country || '—') + '</b></div>',
        '<div><span class="k">' + (LZ ? LZ('记录号', 'Record ID') : 'Record ID') + '</span><b class="mono tiny">' + esc(d.id) + '</b></div>',
        '<div style="grid-column:1/-1"><span class="k">' + (LZ ? LZ('备注', 'Note') : 'Note') + '</span><b>' + esc(d.note || '—') + '</b></div>',
        '</div>',

        '<div class="dd-sec"><h4>' + (LZ ? LZ('进度', 'Progress') : 'Progress') + '</h4><div class="dd-tl">' + tl + '</div></div>',

        (sameCust.length ? '<div class="dd-sec"><h4>' + (LZ ? LZ('这个客户的其他记录', 'Same customer') : 'Same customer') + '（' + sameCust.length + '）</h4>' +
          '<div class="tiny muted" style="margin-bottom:6px">' + (LZ ? LZ('累计 ', 'Total ') : 'Total ') + money(custSum) + ' · ' + (LZ ? LZ('成交 ', 'won ') : 'won ') + wonCnt + ' ' + (LZ ? LZ('单', 'deals') : 'deals') + '</div>' +
          '<div class="dd-list">' + sameCust.slice().sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 6).map(row).join('') + '</div></div>' : ''),

        (sameCode.length ? '<div class="dd-sec"><h4>' + (LZ ? LZ('这个款号的其他记录', 'Same style') : 'Same style') + '（' + sameCode.length + '）</h4>' +
          '<div class="dd-list">' + sameCode.slice().sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 6).map(row).join('') + '</div></div>' : '')
      ].join(''),
      footer: [
        '<button class="btn" data-act="closeModal">' + (LZ ? LZ('关闭', 'Close') : 'Close') + '</button>',
        '<span class="flex1"></span>',
        '<button class="btn sm" data-act="dealToQuote" data-id="' + esc(d.id) + '">' + (LZ ? LZ('加入报价单', 'Add to quote') : 'Add to quote') + '</button>',
        (d.status !== '已成交' ? '<button class="btn sm" data-act="dealTo" data-id="' + esc(d.id) + '" data-st="已成交">' + (zh ? '标记成交' : 'Mark won') + '</button>' : ''),
        (d.status !== '已丢单' ? '<button class="btn sm" data-act="dealTo" data-id="' + esc(d.id) + '" data-st="已丢单">' + (zh ? '标记丢单' : 'Mark lost') + '</button>' : '')
      ].join('')
    };
  }

  window.DEALS = { htmlDeals, htmlBoss, dealDetail, metrics, staffRows, productRows, summary, ORDER, STATUS, monthKey, followups, htmlFollowups, htmlFollowupBoss, FLAG, flagMeta };
})();