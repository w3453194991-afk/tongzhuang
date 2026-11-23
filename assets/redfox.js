/* 数据接入 · RedFox —— 可视化版（平台 → 查询 → 图表） */
(function () {
  const PLATS = [
    ['tiktok', 'TikTok', '话题 / 关键词 / 账号'],
    ['facebook', 'Facebook', '帖子评论'],
    ['x', 'X (Twitter)', '关键词搜索'],
    ['xiaohongshu', '小红书', '爆款笔记 / 榜单 / 搜索 / 短剧'],
    ['shipinhao', '视频号', '关键词作品 / 账号作品']
  ];

  /* 每个平台可用的查询类型。path 走本地 /api/redfox/rest 代理 */
  const KINDS = {
    tiktok: [
      {
        id: 'topic', name: '话题作品', path: '/story/api/tiktok/ability/topicAwemeList',
        fields: [
          { k: 'ch_id', label: '话题 ID', ph: '2525872', req: true, hint: 'challengeId / hashtagId' },
          { k: 'topic', label: '话题名（仅显示用）', ph: 'charlidamelio' }
        ]
      },
      {
        id: 'video', name: '关键词视频', path: '/story/api/tiktok/ability/searchVideo',
        fields: [{ k: 'keyword', label: '关键词', ph: 'brake pads', req: true }]
      },
      {
        id: 'user', name: '账号搜索', path: '/story/api/tiktok/ability/searchUser',
        fields: [{ k: 'keyword', label: '关键词', ph: 'brake pad', req: true }]
      }
    ],
    facebook: [
      {
        id: 'post', name: '帖子评论', path: '/story/api/fb/postComment',
        fields: [{ k: 'url', label: '帖子链接（原样粘贴）', ph: 'https://www.facebook.com/reel/1746412686633900', req: true }]
      }
    ],
    x: [
      {
        id: 'search', name: '关键词搜索', path: '/story/api/x/search',
        fields: [
          { k: 'keyword', label: '关键词', ph: 'brake pads', req: true },
          { k: 'searchType', label: '搜索类型', select: [['Top', '热门'], ['Latest', '最新'], ['Media', '媒体'], ['People', '用户'], ['Lists', '列表']] }
        ]
      }
    ],
    /* 小红书：tool = 走 MCP 工具（/api/redfox/call），path = 走 REST 代理 */
    xiaohongshu: [
      {
        id: 'hot', name: '爆款笔记', tool: 'xiaohongshu_search_hot_notes',
        fields: [{ k: 'keyword', label: '关键词（可不填，空了就按互动量取最热）', ph: '短剧 / 童装' }]
      },
      {
        id: 'search', name: '笔记搜索', tool: 'xiaohongshu_search_articles',
        fields: [
          { k: 'keyword', label: '关键词', ph: '短剧', req: true },
          { k: 'sort_type', label: '排序', select: [['_0', '相关'], ['_2', '最新'], ['_4', '最热']] }
        ]
      },
      {
        id: 'rank', name: '每日爆款榜', tool: 'xiaohongshu_get_daily_hot_rank',
        fields: [
          { k: 'rank_date', label: '榜单日期', ph: '2026-11-21', req: true },
          {
            k: 'category', label: '分类', select: [['综合全部', '综合全部'], ['影视娱乐', '影视娱乐'], ['时尚穿搭', '时尚穿搭'],
            ['美味佳肴', '美味佳肴'], ['居家装修', '居家装修'], ['亲子育儿', '亲子育儿'], ['新闻资讯', '新闻资讯']]
          }
        ]
      },
      {
        id: 'playlet', name: '短剧爆款', path: '/story/api/parseWork/queryPlayletMsgs',
        fields: [
          { k: 'day', label: '日期', ph: '2026-11-21', req: true },
          { k: 'keyword', label: '题材词（可不填）', ph: '穿越 / 霸总' }
        ]
      }
    ],
    shipinhao: [
      {
        id: 'search', name: '关键词作品', path: '/story/api/sphAllData/searchWork',
        fields: [
          { k: 'keyword', label: '关键词', ph: '汽修', req: true },
          {
            k: 'sort', label: '排序', select: [['综合', '综合'], ['最新', '最新'], ['最多点赞', '最多点赞'], ['最多收藏', '最多收藏']]
          }
        ]
      },
      {
        id: 'user', name: '账号作品', path: '/story/api/sphAllData/queryWorkList',
        fields: [{ k: 'nickname', label: '账号昵称（要精准）', ph: '极速新视界', req: true }]
      }
    ]
  };

  const COUNT_LS = 'gy_redfox_count';

  const ST = {
    plat: 'tiktok', kind: 'topic', count: 20,
    args: {}, res: null, norm: null, err: '', busy: false, msg: '',
    keySet: false, synced: false, serverOk: null, statusAt: 0, busySync: false,
    retryT: 0, tries: 0, noApi: false, pages: 1
  };
  try { ST.count = Number(localStorage.getItem(COUNT_LS)) || 20; } catch (e) { }

  const el = id => document.getElementById(id);
  const toast = m => { if (window.__toast) window.__toast(m); };

  /* ---- RedFox Key：只存在这台浏览器，随请求头 x-redfox-key 透传给本机代理，不落服务器 ---- */
  const KEY_LS = 'xm_redfox_key';
  function localKey() { try { return (localStorage.getItem(KEY_LS) || '').trim(); } catch (e) { return ''; } }
  function setLocalKey(k) {
    try { k ? localStorage.setItem(KEY_LS, String(k).trim()) : localStorage.removeItem(KEY_LS); } catch (e) { }
  }
  function keyHeaders(extra) {
    const h = Object.assign({}, extra || {});
    const k = localKey();
    if (k) h['x-redfox-key'] = k;
    return h;
  }
  /* 支持一次性链接配置：?rfkey=ak_xxx 或 #/redfox?rfkey=ak_xxx，写进本机后把参数从地址栏抹掉 */
  (function captureKeyFromUrl() {
    try {
      const hash = location.hash || '';
      const src = location.search + (hash.indexOf('?') >= 0 ? '&' + hash.slice(hash.indexOf('?') + 1) : '');
      const m = /[?&](?:rfkey|key)=([^&#]+)/.exec(src);
      if (!m) return;
      const k = decodeURIComponent(m[1]).trim();
      if (k) setLocalKey(k);
      history.replaceState(null, '', location.pathname + (hash.split('?')[0] || ''));
    } catch (e) { }
  })();
  const kindsOf = p => KINDS[p] || [];
  const curKind = () => kindsOf(ST.plat).find(k => k.id === ST.kind) || kindsOf(ST.plat)[0];

  /* ---------------- 数字格式化 ---------------- */
  function fmt(n) {
    if (n === null || n === undefined || n === '' || isNaN(Number(n))) return '—';
    n = Number(n);
    if (n < 10000) return String(n);
    if (n < 1e8) return (n / 1e4).toFixed(1).replace(/\.0$/, '') + '万';
    return (n / 1e8).toFixed(2).replace(/\.?0+$/, '') + '亿';
  }
  /* 小红书榜单里的数字是「24w+」这种写法，转成数字才画得了图 */
  function cnNum(v) {
    if (v === null || v === undefined || v === '') return '';
    if (typeof v === 'number') return v;
    const m = /^\s*([\d.]+)\s*([wW万kK千]?)\s*\+?\s*$/.exec(String(v));
    if (!m) return v;
    let n = Number(m[1]);
    const u = (m[2] || '').toLowerCase();
    if (u === 'w' || u === '万') n *= 1e4;
    else if (u === 'k' || u === '千') n *= 1e3;
    return Math.round(n);
  }
  function tsShort(v) {
    if (!v) return '';
    if (typeof v === 'number') {
      const d = new Date(v < 1e12 ? v * 1000 : v);
      return isNaN(d) ? '' : (d.getMonth() + 1) + '-' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    }
    const s = String(v);
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (m) return m[2] + '-' + m[3];
    const d = new Date(s);
    return isNaN(d) ? s.slice(0, 16) : (d.getMonth() + 1) + '-' + d.getDate();
  }
  const pick = (o, ks) => { for (const k of ks) if (o && o[k] !== undefined && o[k] !== null && o[k] !== '') return o[k]; return ''; };

  /* ---------------- 把各家返回归一成统一条目 ---------------- */
  function normalize(plat, kind, raw) {
    const d = (raw && raw.data) || raw || {};
    let arr = [];
    if (Array.isArray(d)) arr = d;
    else arr = d.workList || d.videos || d.list || d.comments || d.tweets || d.users || d.userList || d.items || d.articles || [];

    const items = (arr || []).map(o => {
      if (plat === 'tiktok') {
        const st = o.statsData || o.statistics || {};
        const au = o.authorData || o.author || {};
        const vd = o.videoData || {};
        return {
          title: String(o.content || o.desc || o.title || '').replace(/\s+/g, ' ').trim(),
          author: au.userName || au.nickname || au.uniqueId || '—',
          handle: au.userHandle ? '@' + au.userHandle : '',
          avatar: au.avatarImage || au.avatar || '',
          time: tsShort(o.publishTime || o.createTime),
          link: o.shareLink || (o.workId ? 'https://www.tiktok.com/@' + (au.userHandle || '') + '/video/' + o.workId : ''),
          cover: vd.coverImage || o.coverUrl || '',
          p: {
            name: au.userName || au.nickname || '',
            handle: au.userHandle || au.uniqueId || '',
            avatar: au.avatarImage || au.avatar || '',
            bio: au.userSignature || au.signature || '',
            area: au.userArea || '',
            verified: !!(au.verifyInfo || au.enterpriseVerify),
            uid: au.userId || '',
            secUid: au.secUserId || '',
            link: au.userHandle ? 'https://www.tiktok.com/@' + au.userHandle : ''
          },
          m: {
            views: pick(st, ['viewCount', 'playCount']),
            likes: pick(st, ['likeCount', 'diggCount']),
            comments: pick(st, ['commentTotal', 'commentCount']),
            shares: pick(st, ['shareTotal', 'shareCount']),
            collects: pick(st, ['favoriteCount', 'collectCount'])
          }
        };
      }
      if (plat === 'x') {
        const u = o.user || {};
        return {
          title: String(o.text || '').replace(/\s+/g, ' ').trim(),
          author: u.displayName || o.username || '—',
          handle: o.username ? '@' + o.username : '',
          avatar: u.avatar || '',
          time: tsShort(o.createdAt),
          link: o.tweetId ? 'https://x.com/' + (o.username || 'i') + '/status/' + o.tweetId : '',
          cover: (Array.isArray(o.medias) && o.medias[0] && o.medias[0].coverUrl) || '',
          p: {
            name: u.displayName || o.username || '',
            handle: o.username || '',
            avatar: u.avatar || '',
            bio: u.description || '',
            area: u.location || '',
            verified: !!u.verified,
            uid: u.userId || '',
            followers: u.followers,
            link: o.username ? 'https://x.com/' + o.username : ''
          },
          m: {
            views: pick(o, ['viewCount']),
            likes: pick(o, ['likeCount']),
            comments: pick(o, ['replyCount']),
            shares: pick(o, ['retweetCount']),
            collects: pick(o, ['bookmarkCount'])
          }
        };
      }
      if (plat === 'xiaohongshu') {
        /* 三种返回长不一样：爆款笔记(articles) / 笔记搜索(list.work*) / 每日榜单(list.anaAdd) */
        const rank = kind === 'rank';
        const a = o.anaAdd || {};
        const work = !!(o.workId || o.workTitle);
        const title = rank ? (o.title || o.desc) : work ? (o.workTitle || o.workDesc) : (o.title || o.desc);
        const author = rank ? o.userName : work ? o.accountNickname : o.authorNickname;
        const likes = rank ? (a.useLikeCount || a.interactiveCount) : work ? o.workLikedCount : o.likedCount;
        const comments = rank ? a.useCommentCount : work ? o.workCommentsCount : o.commentsCount;
        const shares = rank ? a.useShareCount : work ? o.workSharedCount : o.sharedCount;
        const collects = rank ? a.collectedCount : work ? o.workCollectedCount : o.collectedCount;
        const link = rank ? o.photoJumpUrl : work ? o.workUrl : o.shareInfoLink;
        const uid = rank ? '' : work ? o.accountUserid : o.authorId;
        return {
          title: String(title || '').replace(/\s+/g, ' ').trim(),
          author: author || '—',
          handle: '',
          avatar: rank ? (o.userHeadUrl || '') : (o.authorAvatar || ''),
          time: tsShort(rank ? o.publicTime : work ? o.workPublishTime : o.createTime),
          link: link || (o.id ? 'https://www.xiaohongshu.com/explore/' + o.id : ''),
          cover: rank ? (o.coverUrl || '') : (o.cover || o.coverUrl || ''),
          p: {
            name: author || '', handle: '', avatar: rank ? (o.userHeadUrl || '') : (o.authorAvatar || ''),
            bio: '', area: '', verified: false, uid: uid,
            followers: rank ? cnNum(o.fans) : o.authorFans,
            link: rank ? (o.userJumpUrl || '') : (uid ? 'https://www.xiaohongshu.com/user/profile/' + uid : '')
          },
          m: {
            views: '',
            likes: cnNum(likes),
            comments: cnNum(comments),
            shares: cnNum(shares),
            collects: cnNum(collects)
          }
        };
      }
      if (plat === 'shipinhao') {
        /* 两套字段：关键词搜索(snake_case) / 账号作品(camelCase) */
        const snake = o.title !== undefined || o.author !== undefined;
        const title = snake ? o.title : o.description;
        const author = (snake ? o.author : o.nickname) || '—';
        const avatar = snake ? o.author_avatar : o.headUrl;
        return {
          title: String(title || '').replace(/\s+/g, ' ').trim(),
          author: author,
          handle: '',
          avatar: avatar || '',
          time: tsShort(snake ? o.publish_time : o.publishTime),
          link: '',
          cover: snake ? (o.cover_url || '') : (o.coverUrl || o.thumbUrl || ''),
          p: { name: author, handle: '', avatar: avatar || '', bio: '', area: '', verified: false, uid: '', link: '' },
          m: {
            views: '',
            likes: snake ? o.like_count : o.likeCount,
            comments: snake ? o.comment_count : o.commentCount,
            shares: snake ? o.share_count : o.forwardCount,
            collects: snake ? o.collect_count : o.favCount
          }
        };
      }
      // facebook
      const au = o.author || {};
      return {
        title: String(o.text || o.message || '').replace(/\s+/g, ' ').trim(),
        author: au.displayName || au.name || '—',
        handle: '',
        avatar: au.avatar || '',
        time: tsShort(o.publishedAt || o.createdTime),
        link: '',
        cover: '',
        p: {
          name: au.displayName || au.name || '',
          handle: '',
          avatar: au.avatar || '',
          bio: '',
          area: '',
          verified: false,
          uid: au.id || '',
          link: '',
          search: au.displayName ? 'https://www.facebook.com/search/top?q=' + encodeURIComponent(au.displayName) : ''
        },
        m: {
          views: '',
          likes: pick(o, ['likeCount', 'likes']),
          comments: '',
          shares: '',
          collects: ''
        }
      };
    }).filter(x => x.title || x.author !== '—');

    const sum = k => items.reduce((s, x) => s + (Number(x.m[k]) || 0), 0);
    const totals = { views: sum('views'), likes: sum('likes'), comments: sum('comments'), shares: sum('shares'), collects: sum('collects') };
    const hasViews = totals.views > 0;
    const metricKey = hasViews ? 'views' : 'likes';
    /* 表格与柱子保持同一顺序：按主指标降序 */
    items.sort((a, b) => (Number(b.m[metricKey]) || 0) - (Number(a.m[metricKey]) || 0));
    return { items, totals, metricKey, metricLabel: hasViews ? '播放' : '点赞', plat, kind };
  }

  /* ---------------- 图表（纯 CSS/SVG，零依赖） ---------------- */
  function barChart(norm, esc) {
    const key = norm.metricKey;
    const rows = norm.items
      .map((x, i) => ({ i, v: Number(x.m[key]) || 0, x }))
      .sort((a, b) => b.v - a.v)
      .slice(0, 10);
    const max = Math.max.apply(null, rows.map(r => r.v)) || 1;
    if (!rows.length) return '<div class="muted small">没有可画的数值</div>';
    return `<div class="rf-bars">${rows.map((r, i) => `
      <div class="rf-bar-row">
        <div class="rf-bar-rank">${i + 1}</div>
        <div class="rf-bar-mid">
          <div class="rf-bar-name" title="${esc(r.x.title)}">${esc(r.x.author)}${r.x.handle ? ' <span class="muted">' + esc(r.x.handle) + '</span>' : ''}</div>
          <div class="rf-bar-track"><div class="rf-bar-fill" style="width:${Math.max(2, (r.v / max) * 100).toFixed(1)}%"></div></div>
        </div>
        <div class="rf-bar-val">${fmt(r.v)}</div>
      </div>`).join('')}</div>`;
  }

  function composition(norm) {
    const t = norm.totals;
    const segs = [
      ['点赞', t.likes, '#c2410c'],
      ['评论', t.comments, '#0f766e'],
      ['分享', t.shares, '#1d4ed8'],
      ['收藏', t.collects, '#7c3aed']
    ].filter(s => s[1] > 0);
    const total = segs.reduce((s, x) => s + x[1], 0);
    if (!total) return '<div class="muted small">该数据源没有互动字段</div>';
    return `<div class="rf-stack">${segs.map(([n, v, c]) =>
      `<div class="rf-stack-seg" style="width:${(v / total * 100).toFixed(1)}%;background:${c}" title="${n} ${fmt(v)}"></div>`).join('')}</div>
      <div class="rf-legend">${segs.map(([n, v, c]) =>
      `<span><i style="background:${c}"></i>${n} <b>${fmt(v)}</b></span>`).join('')}</div>`;
  }

  function tableHTML(norm, esc) {
    const show = norm.items.slice(0, 30);
    /* 只显示这组数据里真实存在的指标列，避免出现两列「点赞」或一整列「—」 */
    const cols = [
      { k: 'views', label: '播放', on: norm.totals.views > 0 },
      { k: 'likes', label: '点赞', on: norm.totals.likes > 0 },
      { k: 'comments', label: '评论', on: norm.totals.comments > 0 },
      { k: 'shares', label: '分享', on: norm.totals.shares > 0 }
    ].filter(c => c.on);
    const av = (x, i) => {
      const ini = esc(String(x.author || '?').trim().slice(0, 1) || '?');
      /* TikTok 的头像链接是 HEIC，Chromium 解不了：加载失败就退回首字母，别留个空白 */
      return `<button class="rf-av${x.avatar ? '' : ' noimg'}" data-act="rfProfile" data-id="${i}" title="看这个人的主页资料">
        <span class="rf-av-fb">${ini}</span>
        ${x.avatar ? `<img src="${esc(x.avatar)}" alt="" loading="lazy" onerror="this.parentNode.classList.add('noimg');this.remove()">` : ''}
      </button>`;
    };
    return `<div class="rf-tbl-wrap"><table class="rf-tbl">
      <thead><tr><th>#</th><th>作者</th><th>内容</th>${cols.map(c => `<th>${c.label}</th>`).join('')}<th>时间</th></tr></thead>
      <tbody>${show.map((x, i) => `<tr>
        <td class="rf-num">${i + 1}</td>
        <td class="rf-au">${av(x, i)}<span><button class="rf-nmb" data-act="rfProfile" data-id="${i}" title="看这个人的主页资料">${esc(x.author)}</button>${x.link ? `<a href="${esc(x.link)}" target="_blank" rel="noopener" title="打开原帖">↗</a>` : ''}</span></td>
        <td class="rf-txt">${esc(x.title || '（无文字）')}</td>
        ${cols.map(c => `<td class="rf-num">${fmt(x.m[c.k])}</td>`).join('')}
        <td class="rf-num muted">${esc(x.time)}</td>
      </tr>`).join('')}</tbody>
    </table></div>
    <div class="tiny muted" style="margin-top:6px">点头像或作者名，可以看这个人的主页资料（粉丝数、简介、主页链接）</div>`;
  }

  /* ---------------- 人物资料：点头像看主页 ---------------- */
  const PROF = {};                       // 本次会话缓存：同一个人只拉一次，反复点开不再花钱
  const profKey = it => ST.plat + '|' + ((it && it.p && (it.p.uid || it.p.handle || it.p.name)) || '');
  const canFetchProfile = it => !!(it && it.p && it.p.handle && (ST.plat === 'tiktok' || ST.plat === 'x'));

  async function restPost(path, payload) {
    const r = await fetch('/api/redfox/rest', {
      method: 'POST',
      headers: keyHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ path, payload })
    });
    const text = await r.text();
    let j = null;
    try { j = JSON.parse(text); } catch (e) { }
    if (!j) throw new Error('接口返回的不是数据（HTTP ' + r.status + '）');
    if (!j.ok) throw new Error(j.error || '拉取失败');
    return j;
  }

  /** 按平台拉一次这个人的主页资料（TikTok 用账号搜索，X 用 userInfo） */
  async function fetchProfile(it) {
    const inner = j => (j.data && j.data.data) || {};
    if (ST.plat === 'tiktok') {
      const d = inner(await restPost('/story/api/tiktok/ability/searchUser', { keyword: it.p.handle, count: 1, offset: 0 }));
      const list = d.userList || [];
      const hit = list.find(u => String(u.userHandle || '').toLowerCase() === String(it.p.handle).toLowerCase());
      if (!hit) throw new Error('没搜到这个账号（可能在搜索里排到后面了）');
      return {
        name: hit.userName || it.p.name, avatar: hit.avatarImage || it.p.avatar,
        followers: hit.fansCount, following: hit.followCount, likes: hit.likedTotal, works: hit.workCount
      };
    }
    if (ST.plat === 'x') {
      const u = inner(await restPost('/story/api/x/userInfo', { screen_name: it.p.handle }));
      if (!u.username) throw new Error('没查到这个账号');
      return {
        name: u.displayName || it.p.name, avatar: u.avatar || it.p.avatar,
        followers: u.followers, following: u.following, works: u.tweetCount || u.mediaCount,
        bio: u.description || it.p.bio, area: u.location || it.p.area,
        verified: !!u.verified, site: u.website || ''
      };
    }
    throw new Error('这个平台没有按人查资料的接口');
  }

  /** 这个人在本次结果里的条数与合计（本地算，不花钱） */
  function batchOf(it) {
    if (!ST.norm) return null;
    const k = profKey(it);
    const rows = ST.norm.items.filter(x => profKey(x) === k);
    if (!rows.length) return null;
    const sum = key => rows.reduce((s, x) => s + (Number(x.m[key]) || 0), 0);
    return { n: rows.length, views: sum('views'), likes: sum('likes') };
  }

  function profileBody(it, info, o) {
    const { t2, esc, loading, err } = o;
    const b = batchOf(it);
    const cell = (label, v) => (v === undefined || v === null || v === '' ? '' :
      `<div class="rf-pstat"><span>${label}</span><b>${fmt(v)}</b></div>`);
    const stats = [
      cell(t2('粉丝', 'Followers'), info.followers),
      cell(t2('关注', 'Following'), info.following),
      cell(t2('获赞', 'Likes'), info.likes),
      cell(t2('作品', 'Posts'), info.works)
    ].join('');
    const meta = [info.handle ? '@' + info.handle : '', info.area || ''].filter(Boolean).join(' · ');
    const batch = b ? `${b.n} ${t2('条', 'items')}${b.views ? ' · ' + fmt(b.views) + t2(' 播放', ' views') : ''}${b.likes ? ' · ' + fmt(b.likes) + t2(' 赞', ' likes') : ''}` : '';
    return `<div class="rf-prof">
      <div class="rf-prof-h">
        <div class="rf-prof-av-box${info.avatar ? '' : ' noimg'}">
          <span class="rf-prof-av ph">${esc(String(info.name || it.author || '?').trim().slice(0, 1) || '?')}</span>
          ${info.avatar ? `<img class="rf-prof-av" src="${esc(info.avatar)}" alt="" onerror="this.parentNode.classList.add('noimg');this.remove()">` : ''}
        </div>
        <div class="rf-prof-meta">
          <div class="rf-prof-nm">${esc(info.name || it.author || '—')}${info.verified ? ` <span class="rf-vf" title="${t2('平台认证账号', 'Verified')}">✓</span>` : ''}</div>
          ${meta ? `<div class="tiny muted">${esc(meta)}</div>` : ''}
          ${info.site ? `<div class="tiny muted">${esc(info.site)}</div>` : ''}
        </div>
        <span class="flex1"></span>
      </div>
      ${info.bio ? `<div class="rf-prof-bio">${esc(info.bio)}</div>` : ''}
      ${stats ? `<div class="rf-prof-stats">${stats}</div>` : ''}
      ${batch ? `<div class="tiny muted" style="margin-top:10px">${t2('本次结果里', 'In this result')}：${esc(batch)}</div>` : ''}
      ${loading ? `<div class="tiny muted" style="margin-top:8px">${t2('正在拉取主页资料…（1 次调用，约 ¥0.02；同一个人只拉一次）', 'Fetching profile… (1 call, ≈¥0.02; cached per person)')}</div>` : ''}
      ${err ? `<div class="rf-err">${t2('资料没拉到', 'Could not load profile')}：${esc(err)}</div>` : ''}
      ${!canFetchProfile(it) && !info.followers ? `<div class="tiny muted" style="margin-top:8px">${t2(
        '这个平台只回了昵称和头像，没有按人查资料的公开接口；名字可以直接复制，去 App 里搜。',
        'This platform only returns the display name and avatar — copy the name and search in the app.'
      )}</div>` : ''}
    </div>`;
  }

  function profileFoot(it, i, info, o) {
    const { t2, esc } = o;
    const url = info.link || (it.p && it.p.link) || '';
    /* 只有 TikTok / X 有真正能打开的主页；Facebook 的「搜索链接」在没登录时会跳到 Not Found，干脆不给外链 */
    const first = url
      ? `<a class="btn sm" href="${esc(url)}" target="_blank" rel="noopener">${t2('打开主页 ↗', 'Open profile ↗')}</a>`
      : `<button class="btn sm" data-act="rfCopyName" data-id="${i}">${t2('复制名字', 'Copy name')}</button>`;
    return `${first}
      <button class="btn sm" data-act="rfLeadFrom" data-id="${i}">${t2('存为线索', 'Save as lead')}</button>
      <span class="flex1"></span>
      <button class="btn sm ghost" data-act="closeModal">${t2('关闭', 'Close')}</button>`;
  }

  function copyName(i) {
    const it = ST.norm && ST.norm.items[i];
    const name = (it && (it.author || (it.p && it.p.name))) || '';
    if (!name) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(name).then(() => toast('已复制：' + name), () => toast('复制失败'));
    } else toast('复制失败');
  }

  /** 打开某条结果作者的资料卡；资料缺失时自动拉一次（有缓存就不再请求） */
  function openProfile(i, ui) {
    if (!ui || !ui.modal) return;
    const it = ST.norm && ST.norm.items[i];
    if (!it) return;
    const esc = ui.esc || (s => String(s == null ? '' : s));
    const t2 = (zh, en) => (ui.LZ ? ui.LZ(zh, en) : zh);
    const key = profKey(it);
    const paint = o => {
      const info = Object.assign({}, it.p || {}, PROF[key] || {}, (o && o.stats) || {});
      ui.modal(
        t2('人物资料', 'Profile') + ' · ' + esc(info.name || it.author || ''),
        profileBody(it, info, { t2, esc, loading: !!(o && o.loading), err: (o && o.err) || '' }),
        profileFoot(it, i, info, { t2, esc }),
        true
      );
    };
    const need = !PROF[key] && canFetchProfile(it);
    paint({ loading: need });
    if (!need) return;
    fetchProfile(it)
      .then(st => { PROF[key] = st; paint({}); })
      .catch(e => paint({ err: String((e && e.message) || e) }));
  }

  /* ---------------- 本地服务连不上时的提示：分「file:// 直开」「本机服务没启动」「服务器连不上」三种 ---------------- */
  const RF_HOME = 'http://127.0.0.1:8765/index.html';
  const isFilePage = () => typeof location !== 'undefined' && location.protocol === 'file:';
  const isLocalPage = () => /^(127\.0\.0\.1|localhost|\[::1\])$/i.test(location.hostname || '');

  function rfOffline(t2) {
    const at = ST.statusAt ? new Date(ST.statusAt).toTimeString().slice(0, 8) : '';
    const btn = `<button class="btn sm ghost" data-act="rfRetry">${t2('重新检测', 'Check now')}</button>`;
    const stamp = at ? t2('上次检测 ' + at + '。', ' Last check ' + at + '.') : '';
    if (isFilePage()) {
      return `<div class="rf-err">${t2(
        '这个页面是直接双击打开的（file://），这种打开方式没有本地接口。请双击「启动.bat」启动服务，再打开 ',
        'This page was opened straight from disk (file://), so there is no local API. Run 启动.bat, then open '
      )}<a href="${RF_HOME}">${RF_HOME}</a></div>`;
    }
    if (isLocalPage()) {
      return `<div class="rf-err">${t2(
        '连不上本地服务（' + location.host + ' 没响应）。双击「启动.bat」把它拉起来就行，本页会自己重连，不用刷新。',
        'The local server on ' + location.host + ' is not responding. Start it with 启动.bat — this page reconnects on its own, no refresh needed.'
      )}${stamp} ${btn}</div>`;
    }
    if (ST.noApi) {
      return `<div class="rf-err">${t2(
        '这个地址上没有查询接口：/api 返回的是网页，不是数据，所以查询用不了。放到服务器上时，nginx 要把 /api 转发给 server.js'
          + '（配置见 tools/deploy/nginx-xiaoman.conf）；本地请用 http://127.0.0.1:8765/index.html 打开。当前地址：',
        'This address has no query API: /api returns a web page instead of data. On a server, nginx must forward /api to server.js'
          + ' (see tools/deploy/nginx-xiaoman.conf); locally open http://127.0.0.1:8765/index.html. Current address: '
      )}${location.origin} ${btn}</div>`;
    }
    return `<div class="rf-err">${t2(
      '连不上服务端（' + location.host + ' 没响应），可能是服务停了或者网络断了。稍后会自动重试。',
      'Cannot reach the server at ' + location.host + ' — it may be down or the network dropped. Retrying automatically.'
    )}${stamp} ${btn}</div>`;
  }

  /* 预计要调几次：接口一页 8~10 条，取多了会自动翻页，每次调用都计费 */
  function costHint(t2) {
    const k = curKind();
    const pages = (k && k.tool) ? 1 : (ST.count <= 10 ? 1 : Math.min(6, Math.ceil(ST.count / 8)));
    if (pages <= 1) return t2('单次调用约 ¥0.02–0.06', '≈ ¥0.02–0.06 per call');
    return t2('取 ' + ST.count + ' 条约 ' + pages + ' 次调用（¥' + (pages * 0.02).toFixed(2) + '–' + (pages * 0.06).toFixed(2) + '）',
      ST.count + ' items ≈ ' + pages + ' calls');
  }

  /* ---------------- 页面 ---------------- */
  function html(ctx) {
    const { esc, LZ } = ctx;
    const t2 = (zh, en) => (LZ ? LZ(zh, en) : zh);
    const kind = curKind();
    const platMeta = PLATS.find(p => p[0] === ST.plat) || PLATS[0];
    const n = ST.norm;

    return `
    <div class="rf-head">
      <div>
        <h1 style="margin:0">${t2('热门追踪', 'Trending')} · RedFox</h1>
        <div class="muted small">${t2('选平台 → 填一个词 → 直接出图和表。Key 只存这台浏览器（不上传服务器），按次计费。', 'Pick a platform, type a keyword, get charts and a table. The key stays in this browser only; calls are billed per request.')}</div>
      </div>
      <div class="rf-head-r">
        <span class="rf-pill ${ST.keySet ? 'on' : ''}">${ST.serverOk === false ? t2('服务端未连接', 'Server offline')
      : ST.keySet ? (ST.keySource === 'client' ? t2('已连接 · 本机 Key', 'Connected · local key') : t2('已连接 · 服务端 Key', 'Connected · server key'))
        : t2('还没填 Key', 'No key yet')}</span>
        <button class="btn sm" data-act="rfKeySet">${localKey() ? t2('改 Key', 'Change key') : t2('填 Key', 'Set key')}</button>
        <a class="btn sm" href="https://redfox.hk/skills" target="_blank" rel="noopener">Skills 广场 ↗</a>
      </div>
    </div>

    <div class="card rf-q">
      <div class="card-h"><h3>${t2('查询', 'Search')}</h3><span class="sub">${esc(platMeta[2])}</span></div>
      <div class="card-b">
        <div class="rf-plats">
          ${PLATS.map(([id, name]) => `<button class="rf-plat ${id === ST.plat ? 'on' : ''}" data-act="rfPlat" data-id="${id}">${esc(name)}</button>`).join('')}
        </div>
        <div class="rf-kinds">
          ${kindsOf(ST.plat).map(k => `<button class="chip ${k.id === ST.kind ? 'on' : ''}" data-act="rfKind" data-id="${esc(k.id)}">${esc(k.name)}</button>`).join('')}
        </div>
        <div class="sq-form rf-form">
          ${(kind.fields || []).map(f => `<label>${esc(f.label)}${f.req ? ' *' : ''}
            ${f.select
        ? `<select id="rfarg-${esc(f.k)}">${f.select.map(([v, lb]) => `<option value="${esc(v)}">${esc(lb)}</option>`).join('')}</select>`
        : `<input id="rfarg-${esc(f.k)}" value="${esc(ST.args[f.k] || '')}" placeholder="${esc(f.ph || '')}">`}
          </label>`).join('')}
          <label>${t2('取几条', 'Count')}
            <input id="rfcount" type="number" min="1" max="50" value="${ST.count}">
          </label>
        </div>
        <div class="row wrap-gap" style="margin-top:10px">
          <button class="btn primary" data-act="rfQuery">${ST.busy ? t2('查询中…', 'Loading…') : t2('开始查询', 'Search')}</button>
          ${n ? `<button class="btn sm" data-act="rfClearRes">${t2('清空结果', 'Clear')}</button>` : ''}
          <span class="tiny muted">${costHint(t2)}</span>
        </div>
        ${ST.err ? `<div class="rf-err">${esc(ST.err)}</div>` : (ST.msg ? `<div class="rf-ok">${esc(ST.msg)}</div>` : '')}
        ${ST.synced && ST.serverOk === false ? rfOffline(t2) : ''}
        ${ST.synced && ST.serverOk && !ST.keySet ? `<div class="rf-err">${t2('还没填 RedFox Key：点右上角「填 Key」粘贴即可（只存这台浏览器，不上传服务器，也不需要重启服务）。', 'No RedFox key yet: click “Set key” at the top right (it stays in this browser, never uploaded, no restart needed).')}</div>` : ''}
      </div>
    </div>

    ${n ? viz(ctx, n, esc, t2) : ''}

    <details class="fold">
      <summary>${t2('用 MCP 接进 AI 客户端（Claude / Codex）', 'Hook up MCP in your AI client')}<span class="sub">${t2('不走这个页面也能用', 'Use it outside this page')}</span></summary>
      <div class="fold-b small" style="line-height:1.8">
        <pre class="rf-json">${esc(mcpConfig())}</pre>
        <button class="btn sm" data-act="rfCopyMcp">${t2('复制 MCP 配置', 'Copy MCP config')}</button>
      </div>
    </details>`;
  }

  function viz(ctx, n, esc, t2) {
    const maxV = n.items.reduce((m, x) => Math.max(m, Number(x.m[n.metricKey]) || 0), 0);
    const avg = n.items.length ? (n.totals[n.metricKey] / n.items.length) : 0;
    const star = n.items.slice().sort((a, b) => (Number(b.m[n.metricKey]) || 0) - (Number(a.m[n.metricKey]) || 0))[0];

    return `
    <div class="card rf-viz">
      <div class="card-h">
        <h3>结果</h3>
        <span class="sub">${esc((curKind() || {}).name || '')} · ${n.items.length} 条</span>
      </div>
      <div class="card-b">
        <div class="rf-kpis">
          <div class="rf-kpi"><span>样本</span><b>${n.items.length}</b><i>条</i></div>
          <div class="rf-kpi"><span>总${n.metricLabel}</span><b>${fmt(n.totals[n.metricKey])}</b></div>
          <div class="rf-kpi"><span>最热一条</span><b>${fmt(maxV)}</b><i>${esc((star && star.author) || '')}</i></div>
          <div class="rf-kpi"><span>平均${n.metricLabel}</span><b>${fmt(Math.round(avg))}</b></div>
        </div>

        <div class="rf-charts">
          <div class="rf-chart">
            <div class="rf-chart-t">Top 10 · 按${n.metricLabel}</div>
            ${barChart(n, esc)}
          </div>
          <div class="rf-chart">
            <div class="rf-chart-t">互动构成</div>
            ${composition(n)}
            <div class="rf-chart-t" style="margin-top:16px">数据口径</div>
            <div class="tiny muted" style="line-height:1.8">${t2(
      '播放 / 点赞 / 评论 / 分享 / 收藏均取自平台返回的原始字段，未做估算。',
      'Views / likes / comments / shares / saves come straight from the platform payload — nothing estimated.')}</div>
          </div>
        </div>

        <div class="rf-toolbar">
          <button class="btn sm" data-act="rfCopy">${t2('复制 JSON', 'Copy JSON')}</button>
          <button class="btn sm" data-act="rfImportLead">${t2('把作者存为线索', 'Save author as lead')}</button>
          <button class="btn sm" data-act="rfSaveIdea">${t2('存为选题', 'Save as idea')}</button>
        </div>

        ${tableHTML(n, esc)}

        <details class="fold" style="margin-top:12px">
          <summary>${t2('原始 JSON', 'Raw JSON')}<span class="sub">${t2('给核对用', 'for verification')}</span></summary>
          <div class="fold-b"><pre class="rf-json">${esc(JSON.stringify(ST.res, null, 2).slice(0, 6000))}</pre></div>
        </details>
      </div>
    </div>`;
  }

  function mcpConfig() {
    const list = ['tiktok', 'twitter', 'instagram', 'youtube', 'douyin', 'xiaohongshu', 'gongzhonghao', 'kuaishou', 'shipinhao', 'bilibili', 'jinritoutiao'];
    const servers = {};
    list.forEach(id => {
      servers['redfox-' + id + '-mcp'] = {
        url: 'https://mcp.redfox.hk/' + id + '/mcp',
        headers: { REDFOX_API_KEY: 'YOUR_API_KEY' }
      };
    });
    return JSON.stringify({ mcpServers: servers }, null, 2);
  }

  /* ---------------- 动作 ---------------- */
  function readArgs() {
    const k = curKind();
    const out = {};
    (k.fields || []).forEach(f => {
      const i = el('rfarg-' + f.k);
      if (!i) return;
      let v = i.value.trim();
      if (f.select && !v) v = f.select[0][0];
      out[f.k] = v;
    });
    const c = el('rfcount');
    if (c) { ST.count = Math.max(1, Math.min(50, Number(c.value) || 20)); try { localStorage.setItem(COUNT_LS, ST.count); } catch (e) { } }
    ST.args = out;
    return out;
  }

  function buildPayload(kind) {
    const a = ST.args;
    const p = { source: 'RedFox · 小满童装选款中台' };
    if (ST.plat === 'tiktok') {
      p.count = ST.count;
      if (kind.id === 'topic') {
        p.ch_id = Number(a.ch_id) || 0;
        p.cursor = '0';
      } else {
        p.keyword = a.keyword || '';
        p.offset = 0;
      }
    } else if (ST.plat === 'facebook') {
      p.url = a.url || '';
      p.cursor = '';
    } else if (ST.plat === 'xiaohongshu') {
      if (kind.id === 'playlet') {
        const day = a.day || new Date(Date.now() - 864e5).toISOString().slice(0, 10);
        p.msgType = '短剧';
        p.platform = 3;                    // 3 = 小红书
        p.pageNum = 1;
        p.pageSize = ST.count;
        p.startTime = day + ' 00:00:00';
        p.endTime = day + ' 23:59:59';
        if (a.keyword) p.keyword = a.keyword;
      }
    } else if (ST.plat === 'shipinhao') {
      if (kind.id === 'user') {
        p.nickname = a.nickname || '';
        p.page = 1;
        p.size = ST.count;
      } else {
        p.keyword = a.keyword || '';
        p.sort = a.sort || '综合';
        p.page = 1;
        p.size = ST.count;
        p.source = 'RedFox · 小满童装选款中台';
      }
    } else {
      p.keyword = a.keyword || '';
      p.searchType = a.searchType || 'Top';
    }
    return p;
  }

  /** MCP 工具参数（小红书走工具，不走 REST 代理） */
  function mcpArgs(kind) {
    const a = ST.args;
    if (kind.id === 'hot') {
      const args = { page_num: 1, page_size: Math.max(1, Math.min(50, ST.count)) };
      if (a.keyword) args.keyword = a.keyword;
      return args;
    }
    if (kind.id === 'search') {
      const args = { keyword: a.keyword || '', offset: 0 };
      if (a.sort_type) args.sort_type = a.sort_type;
      return args;
    }
    return { rank_date: a.rank_date || '', category: a.category || '综合全部' };
  }

  async function callTool(tool, args) {
    const r = await fetch('/api/redfox/call?platform=' + encodeURIComponent(ST.plat), {
      method: 'POST',
      headers: keyHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ tool, args })
    });
    const text = await r.text();
    let j = null;
    try { j = JSON.parse(text); } catch (e) { }
    if (!j) throw new Error('接口返回的不是数据（HTTP ' + r.status + '）');
    if (!j.ok) throw new Error(j.error || '调用失败');
    return j;
  }

  /* 一页只回 8~10 条：要更多就顺着游标多翻几页（每页算一次调用） */
  const PAGES_MAX = 6;
  const idOf = o => o && (o.workId || o.tweetId || o.commentId || o.userId || o.secUserId || o.id) || '';

  function pageView(plat, j) {
    const d = (j && j.data && j.data.data) || {};
    if (Array.isArray(d)) return { key: 'workList', arr: d, next: null, more: false };
    if (plat === 'tiktok') {
      if (d.workList) return { key: 'workList', arr: d.workList, next: d.nextCursor, more: d.hasMore };
      return { key: 'userList', arr: d.userList || [], next: d.cursor, more: d.hasMore };
    }
    if (plat === 'x') return { key: 'tweets', arr: d.tweets || [], next: d.nextCursor, more: !!d.nextCursor };
    return { key: 'comments', arr: d.comments || [], next: d.paginationToken, more: !!d.paginationToken };
  }

  function nextPayload(kind, next) {
    const p = buildPayload(kind);
    if (ST.plat === 'tiktok' && kind.id === 'topic') p.cursor = String(next);
    else if (ST.plat === 'x' || ST.plat === 'facebook') p.cursor = String(next);
    else p.offset = Number(next) || 0;
    return p;
  }

  async function runQuery(render) {
    const kind = curKind();
    const a = readArgs();
    const need = (kind.fields || []).find(f => f.req);
    if (need && !a[need.k]) { ST.err = '请先填：' + need.label; ST.msg = ''; render(); return; }

    ST.busy = true; ST.err = ''; ST.msg = ''; render();
    try {
      let j = null;
      if (kind.tool) {
        j = await callTool(kind.tool, mcpArgs(kind));   // 小红书：走 MCP 工具
      } else {
        const r = await fetch('/api/redfox/rest', {
          method: 'POST',
          headers: keyHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ path: kind.path, payload: buildPayload(kind) })
        });
        const text = await r.text();
        try { j = JSON.parse(text); } catch (e) { }
        if (!j) {
          /* 回来的是一整页 HTML：这个地址上根本没有接口（多数是静态站点 / 只发了文件，没把 /api 转给 server.js） */
          if (/^\s*</.test(text)) {
            ST.err = '这个地址上没有查询接口：/api/redfox/rest 返回的是一整页 HTML，不是数据（HTTP ' + r.status + '）。'
              + '本页要用 http://127.0.0.1:8765/index.html 打开；放到服务器上的话，nginx 得把 /api 转发给 server.js'
              + '（配置见 tools/deploy/nginx-xiaoman.conf）。当前地址：' + location.origin;
            ST.serverOk = false; ST.statusAt = Date.now(); ST.noApi = true;
          } else {
            ST.err = '返回的不是 JSON（HTTP ' + r.status + '）：' + String(text).slice(0, 80);
          }
          ST.norm = null; ST.res = null;
          ST.busy = false; render(); return;
        }
      }
      if (!j.ok) {
        ST.err = j.error || '查询失败';
        ST.norm = null; ST.res = j.data || null;
      } else {
        ST.res = j.data;
        /* 一页只有 8~10 条：不够就翻页凑，最多 PAGES_MAX 次调用（每次计费） */
        let pages = 1;
        let view = pageView(ST.plat, j);
        if (view.arr.length && view.arr.length < ST.count && view.more && view.next != null) {
          const all = view.arr.slice();
          const seen = new Set(all.map(idOf).filter(Boolean));
          while (all.length < ST.count && view.more && view.next != null && pages < PAGES_MAX) {
            const nx = await restPost(kind.path, nextPayload(kind, view.next));
            pages += 1;
            view = pageView(ST.plat, nx);
            if (!view.arr.length) break;
            let added = 0;
            view.arr.forEach(x => {
              const id = idOf(x);
              if (id && seen.has(id)) return;
              if (id) seen.add(id);
              all.push(x);
              added += 1;
            });
            if (!added) break;   // 这一页全是重复的（游标没用），别再白花钱
          }
          const key = pageView(ST.plat, j).key;
          if (Array.isArray(j.data.data)) j.data.data = all;
          else j.data.data[key] = all;
        }
        ST.pages = pages;
        ST.norm = normalize(ST.plat, kind.id, j.data);
        /* Facebook 评论没有自己的链接，那行 ↗ 就指回你查的这条原帖，别再拼 commentId（会 404） */
        if (ST.plat === 'facebook' && ST.args.url) ST.norm.items.forEach(x => { x.link = ST.args.url; });
        /* 各家一次回的条数不完全听话（TikTok 一页 10 条、FB 固定 10 条）：统一按「取几条」截，合计重算 */
        if (ST.norm.items.length > ST.count) {
          ST.norm.items = ST.norm.items.slice(0, ST.count);
          const t = { views: 0, likes: 0, comments: 0, shares: 0, collects: 0 };
          ST.norm.items.forEach(x => { Object.keys(t).forEach(k => { t[k] += Number(x.m[k]) || 0; }); });
          ST.norm.totals = t;
        }
        if (!ST.norm.items.length) {
          ST.err = kind.id === 'playlet'
            ? '红狐短剧库这一天没有数据（接口正常，返回 0 条），换一天或换题材再试'
            : '没有拿到条目，换个关键词或参数试试';
          ST.norm = null;
        }
        else ST.msg = '已取回 ' + ST.norm.items.length + ' 条'
          + (pages > 1 ? '（分 ' + pages + ' 次调用，约 ¥' + (pages * 0.02).toFixed(2) + '–' + (pages * 0.06).toFixed(2) + '）' : '');
      }
    } catch (e) {
      ST.err = '请求失败（本地服务没开？用「启动.bat」）: ' + e.message;
      ST.norm = null;
    }
    ST.busy = false;
    render();
  }

  /* 老版本把 Key 存在 gy_redfox_key：搬到新的本机 Key，不上传服务器 */
  function migrateLegacyKey() {
    try {
      const old = localStorage.getItem('gy_redfox_key') || '';
      if (old) {
        if (!localKey()) setLocalKey(old);
        localStorage.removeItem('gy_redfox_key');
      }
    } catch (e) { }
  }
  async function refreshStatus() {
    ST.statusAt = Date.now();
    try {
      const r = await fetch('/api/redfox/status', { cache: 'no-store', headers: keyHeaders() });
      const text = await r.text();
      let j = null;
      try { j = JSON.parse(text); } catch (e) { }
      if (!j) { ST.noApi = /^\s*</.test(text); throw new Error('HTTP ' + r.status); }
      if (!j.ok) throw new Error('bad status body');
      ST.serverOk = true; ST.keySet = !!j.keySet; ST.keySource = j.source || 'none'; ST.noApi = false;
    } catch (e) {
      ST.serverOk = false; ST.keySet = false; ST.keySource = 'none';
    }
  }
  /* 重试间隔：先 3 秒一探，越试越慢，封顶 20 秒——服务起来后几秒内自己接上 */
  const RETRY_MS = [3000, 3000, 4000, 5000, 8000, 12000, 20000];
  function stopRetry() { if (ST.retryT) { clearTimeout(ST.retryT); ST.retryT = 0; } }

  /** 进页面核对一次服务端状态；连不上就自动重试，直到连上为止（状态变了才重绘，不冲掉正在输入的字） */
  function sync(cb, force) {
    if (ST.busySync) return;
    if (!force && ST.synced && ST.serverOk !== false) return;  // 已知连得上
    if (!force && ST.retryT) return;                           // 已经有排队中的重试
    ST.busySync = true;
    (async () => {
      const before = ST.serverOk + '|' + ST.keySet;
      if (!ST.synced) await migrateLegacyKey();
      ST.synced = true;
      await refreshStatus();
      ST.busySync = false;
      if (force || before !== (ST.serverOk + '|' + ST.keySet)) {
        try { readArgs(); } catch (e) { }   // 保住已经填好的参数，重绘后还在
        if (typeof cb === 'function') cb();
      }
      stopRetry();
      if (ST.serverOk === false && !isFilePage() && !ST.noApi) {
        const wait = RETRY_MS[Math.min(ST.tries, RETRY_MS.length - 1)];
        ST.tries += 1;
        ST.retryT = setTimeout(() => { ST.retryT = 0; sync(cb); }, wait);
      } else {
        ST.tries = 0;
      }
    })();
  }

  /** 手动点「重新检测」：立刻问一次，并把当前状态画出来 */
  function retry(cb) {
    ST.tries = 0;
    stopRetry();
    ST.busySync = false;
    sync(cb, true);
  }

  function leadFrom(i, ctx) {
    const n = ST.norm;
    if (!n || !n.items.length) { toast('还没有可导入的结果'); return; }
    const o = n.items[i] || n.items[0];
    ctx.addLead({
      id: 'L' + Date.now(), company: o.author || '未知作者', country: (o.p && o.p.area) || '',
      contact: o.handle || '', need: String(o.title || '').slice(0, 80), needZh: String(o.title || '').slice(0, 80),
      src: 'RedFox · ' + ST.plat + ' · ' + String(o.title || '').slice(0, 24),
      kind: '社媒', status: '待跟进',
      created: new Date().toISOString().slice(0, 16).replace('T', ' '),
      tz: 'Asia/Shanghai', score: 62, product: []
    });
    toast('已导入线索：' + (o.author || ''));
  }
  function importLead(ctx) { leadFrom(0, ctx); }

  function saveIdea() {
    const n = ST.norm;
    if (!n || !n.items.length) { toast('还没有可保存的结果'); return; }
    const o = n.items[0];
    try {
      const arr = JSON.parse(localStorage.getItem('gy_rf_ideas') || '[]');
      arr.push({ title: String(o.title || '').slice(0, 90), author: o.author, plat: ST.plat, at: Date.now() });
      localStorage.setItem('gy_rf_ideas', JSON.stringify(arr.slice(-50)));
    } catch (e) { }
    toast('已存为选题');
  }

  function copyJson() {
    const txt = JSON.stringify(ST.res, null, 2);
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(() => toast('已复制 JSON'), () => toast('复制失败'));
    else toast('复制失败');
  }
  function copyMcp() {
    const txt = mcpConfig();
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(() => toast('MCP 配置已复制'), () => toast('复制失败'));
    else toast('复制失败');
  }

  window.REDFOX = {
    html, runQuery, sync, retry, importLead, leadFrom, openProfile, copyName, saveIdea, copyJson, copyMcp,
    state: ST,
    setPlatform(p) { if (ST.plat === p) return; ST.plat = p; ST.kind = (kindsOf(p)[0] || {}).id; ST.args = {}; ST.norm = null; ST.res = null; ST.err = ''; ST.msg = ''; },
    setKind(k) { ST.kind = k; ST.args = {}; ST.norm = null; ST.res = null; ST.err = ''; ST.msg = ''; },
    clearRes() { ST.norm = null; ST.res = null; ST.err = ''; ST.msg = ''; },
    /** 弹框填 Key（只存本机）；返回 true 表示有改动 */
    askKey() {
      const cur = localKey();
      const v = window.prompt('RedFox API Key（只保存在这台浏览器，不会上传服务器；留空并确定 = 清除）', cur);
      if (v === null) return false;
      setLocalKey(v);
      ST.synced = false;
      return true;
    }
  };
})();
