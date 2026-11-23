/* 首页（品牌官网风格）：实拍轮播 + 关于小满 + 产品类别 + 工具入口 + 新闻 + 联系 */
(function () {
  const HERO_SLIDES = [
    'assets/img/site/hero-1.jpg',
    'assets/img/site/hero-2.jpg',
    'assets/img/site/hero-3.jpg'
  ];

  const NEWS = [
    { d: '2026.12.08', t: '小满童装将参展 2027 春夏 CBME 孕婴童展', s: '上海 · 国家会展中心 · 童装馆 5.2H', tag: '展会' },
    { d: '2026.09.20', t: '秋冬订货会收官：摇粒绒与加绒卫衣返单最快', s: '湖州织里 · 到会买手 86 家，首单 12 个款', tag: '订货会' },
    { d: '2026.06.11', t: '全线婴童款通过 OEKO-TEX Standard 100 附录 4 复检', s: 'A 类婴幼儿级，含甲醛、pH、色牢度 12 项', tag: '品质' }
  ];

  const CATS = [
    { k: '连衣裙', en: 'Dress', n: 46, img: 'assets/img/site/cat-dress.jpg', d: '碎花 / 纱裙 / 背心裙，日常、演出与生日场景' },
    { k: '卫衣', en: 'Sweatshirt', n: 40, img: 'assets/img/site/cat-knit.jpg', d: '圆领 + 连帽，260–320 g/m²，秋冬走量款' },
    { k: '外套', en: 'Jacket', n: 36, img: 'assets/img/site/cat-outer.jpg', d: '摇粒绒 / 冲锋衣 / 羽绒，出口北欧与独联体' }
  ];

  const MORE = ['T恤', '裤装', '套装', '家居服', '连体衣'];

  function home(o) {
    const { st, isCust, isBoss, todo, ex, T, LZ, esc, I18N } = o;
    const lang = I18N.getLang();
    const zh = lang === 'zh';

    const hero = `
    <section class="site-hero" id="siteHero">
      <div class="hero-slides" id="heroSlides">
        ${HERO_SLIDES.map((s, i) => `<div class="hero-slide ${i === 0 ? 'on' : ''}" style="background-image:url('${s}')"></div>`).join('')}
      </div>
      <div class="hero-veil"></div>
      <div class="hero-inner">
        <div class="hero-kicker">${zh ? '小满童装 · 浙江湖州织里童装产业园' : 'XIAOMAN KIDS · Zhili Kidswear Park, Huzhou'}</div>
        <h1 class="hero-h1">${zh ? '把身高和场景，变成能下单的款' : 'From height and occasion to a quotable style.'}</h1>
        <p class="hero-p">${zh
          ? `272 个款号 / 613 个编号 / 26 个款式系列 / 14 个尺码段 / 44 条适穿关系 · 0–14 岁`
          : `272 styles / 613 codes / 26 series / 14 size bands / 44 fitments · ages 0–14`}</p>
        <div class="hero-cta">
          <button class="btn primary lg" data-act="tab" data-id="products">${zh ? '产品中心' : 'Catalog'}</button>
          <button class="btn ghost lg" data-act="tab" data-id="select">${zh ? '智能选款' : 'Find my style'}</button>
        </div>
      </div>
      <div class="hero-top">
        <div class="hero-search">
          <span class="ico">⌕</span>
          <input id="heroQ" type="text" placeholder="${T('sel.ph')}">
          <button class="btn primary" data-act="heroMatch">${T('home.btn')}</button>
        </div>
        <div class="hero-dots" id="heroDots"></div>
      </div>
    </section>`;

    const about = `
    <section class="site-sec" id="aboutSec">
      <div class="sec-head">
        <div><h2>${zh ? '关于小满' : 'About XIAOMAN'}</h2>
        <p>${zh ? '一个能替你回答「多大码、什么面料、多少钱」的童装伙伴' : 'A kidswear partner that answers size, fabric and price'}</p></div>
        <button class="btn sm" data-act="tab" data-id="products">${zh ? '查看款式' : 'View styles'} ›</button>
      </div>
      <div class="about-grid">
        <div class="about-pic"><img src="assets/img/site/about.jpg" alt="XIAOMAN KIDS kidswear"></div>
        <div class="about-txt">
          <p>${zh
            ? '小满童装 2016 年创立于「中国童装之都」浙江湖州织里，自有打版房、数码印花与成衣车间，主做 0–14 岁针织与梭织童装的设计、打样与小单快反。'
            : 'Founded in 2016 in Zhili, Huzhou — China\'s kidswear town — XIAOMAN KIDS runs its own pattern room, digital printing and garment lines for ages 0–14.'}</p>
          <p>${zh
            ? '年产 420 万件，出口中东、拉美、独联体、东南亚与欧洲；全线婴童款按 GB 31701 A 类生产，常规款执行 B 类，并可按客户要求提供 OEKO-TEX 与 BSCI 文件。'
            : '4.2 million pieces a year, exported to the Middle East, Latin America, the CIS, Southeast Asia and Europe. Baby styles are produced to GB 31701 class A, kids to class B, with OEKO-TEX and BSCI files on request.'}</p>
          <div class="about-stats">
            <div><b>420<span>万件</span></b><i>${zh ? '年产量' : 'pieces / year'}</i></div>
            <div><b>120<span>+</span></b><i>${zh ? '在职员工' : 'staff'}</i></div>
            <div><b>60<span>%+</span></b><i>${zh ? '出口海外' : 'export share'}</i></div>
          </div>
        </div>
      </div>
    </section>`;

    const cats = `
    <section class="site-sec">
      <div class="sec-head">
        <div><h2>${zh ? '产品类别' : 'Product categories'}</h2>
        <p>${zh ? '裙装 · 针织 · 外套' : 'Dresses · Knits · Outerwear'}</p></div>
        <button class="btn sm" data-act="tab" data-id="products">${zh ? '全部款号' : 'All styles'} ›</button>
      </div>
      <div class="cat-grid">
        ${CATS.map(c => `<div class="cat-card" data-act="openCat" data-id="${c.k}">
          <div class="cat-img"><img src="${c.img}" alt="${esc(c.k)}"></div>
          <div class="cat-body">
            <div class="cat-t">${zh ? c.k : c.en}</div>
            <div class="cat-n">${c.n} ${zh ? '个款号' : 'styles'}</div>
            <div class="cat-d">${c.d}</div>
          </div>
        </div>`).join('')}
      </div>
      <div class="row wrap-gap" style="margin-top:12px">
        ${MORE.map(k => `<button class="chip" data-act="openCat" data-id="${k}">${k}</button>`).join('')}
      </div>
    </section>`;

    const tools = `
    <section class="site-sec">
      <div class="sec-head">
        <div><h2>${zh ? '工具入口' : 'Workspace'}</h2>
        <p>${zh ? '选款 · 报价 · 资料，一条线走完' : 'Match, quote and pack in one flow'}</p></div>
      </div>
      <div class="tool-grid">
        <button class="tool-card" data-act="tab" data-id="select"><span class="ti">◎</span><b>${zh ? '智能选款' : 'Smart match'}</b><i>${zh ? '款式 / 尺码 / 水洗标款号 → 候选款 + 消歧问题' : 'Series, size band or care-label code to ranked styles'}</i></button>
        <button class="tool-card" data-act="tab" data-id="products"><span class="ti">▤</span><b>${zh ? '产品库' : 'Catalog'}</b><i>${zh ? st.products + ' 个款号，含尺码、面料、克重与款图' : st.products + ' styles with sizes, fabrics and photos'}</i></button>
        <button class="tool-card" data-act="tab" data-id="custom"><span class="ti">✂</span><b>${zh ? '自定义定制' : 'Custom styles'}</b><i>${zh ? '改色 / 换面料 / 换标 / 改版，提交后 2 小时回方案' : 'Recolour, fabric swap, relabel or re-pattern'}</i></button>
        <button class="tool-card" data-act="tab" data-id="aftersale"><span class="ti">☎</span><b>${zh ? '售后服务' : 'After-sales'}</b><i>${zh ? '尺码不合、色差、起球掉色，提交后销售和老板都能看到' : 'Wrong size, colour or pilling — sales and the owner both see it'}</i></button>
        ${!isCust ? `<button class="tool-card" data-act="tab" data-id="quote"><span class="ti">￥</span><b>${zh ? '报价单' : 'Quotation'}</b><i>${zh ? '阶梯价 + 运费，生成可打印 PDF' : 'Tier pricing, freight, printable PDF'}</i></button>` : ''}
        ${!isCust ? `<button class="tool-card" data-act="tab" data-id="pack"><span class="ti">▣</span><b>${zh ? '资料包' : 'Data pack'}</b><i>${zh ? '报价 + 款图 + 质检 + 确认页，打包 ZIP' : 'Quote, style sheets, test reports — one ZIP'}</i></button>` : ''}

        ${!isCust ? `<button class="tool-card" data-act="tab" data-id="network"><span class="ti">◉</span><b>${zh ? '用户画像' : 'Profiles'}</b><i>${zh ? '画像 / 检索式搜买家 / 短视频选题，一个入口三段切换' : 'Profiles, buyer search and content studio in one entry'}</i></button>` : ''}
        ${!isCust ? `<button class="tool-card" data-act="tab" data-id="xref"><span class="ti">⇄</span><b>${zh ? '编号对照' : 'Cross reference'}</b><i>${zh ? '老款号 / 客户款号 / 条码 / 平台款号 → 自家款号' : 'Old, customer, barcode or platform code to your style'}</i></button>` : ''}
        ${!isCust ? `<button class="tool-card" data-act="tab" data-id="deals"><span class="ti">✎</span><b>${zh ? '成交台账' : 'Deals'}</b><i>${zh ? '记一笔成交 / 改状态，老板那边立刻看到' : 'Log a deal and its status'}</i></button>` : ''}
        ${!isCust && isBoss ? `<button class="tool-card" data-act="tab" data-id="boss"><span class="ti">▦</span><b>${zh ? '业绩总览' : 'Overview'}</b><i>${zh ? '员工成交、转化率、品类结构 + 一句话总结' : 'Staff performance and category mix'}</i></button>` : ''}
        ${!isCust ? `<button class="tool-card" data-act="tab" data-id="redfox"><span class="ti">⌁</span><b>${zh ? '热门追踪' : 'Trending'}</b><i>${zh ? 'TikTok / IG / YouTube 童装热门内容 → 选题与线索' : 'Trending kidswear posts on TikTok, IG and YouTube'}</i></button>` : ''}
        ${!isCust ? `<button class="tool-card" data-act="tab" data-id="inquiries"><span class="ti">✉</span><b>${zh ? '客户询价' : 'Inquiries'}</b><i>${zh ? '客户提交的清单，一键载入报价' : 'Customer requests, load into a quote'}</i></button>` : ''}
        ${!isCust ? `<button class="tool-card" data-act="tab" data-id="visits"><span class="ti">👁</span><b>${zh ? '客户浏览' : 'Activity'}</b><i>${zh ? '谁在看、看什么款、意向多少' : 'Who is browsing, and how deep'}</i></button>` : ''}
      </div>
    </section>`;

    const news = `
    <section class="site-sec">
      <div class="sec-head">
        <div><h2>${zh ? '新闻中心' : 'News'}</h2>
        <p>${zh ? '展会 · 订货会 · 品质' : 'Exhibitions, order fairs, quality'}</p></div>
      </div>
      <div class="news-grid">
        ${NEWS.map(n => `<div class="news-card">
          <div class="news-d"><span class="tag b">${n.tag}</span><span class="mono">${n.d}</span></div>
          <div class="news-t">${n.t}</div>
          <div class="news-s">${n.s}</div>
        </div>`).join('')}
      </div>
    </section>`;

    const statline = `
    <div class="statline">
      <span><b>${st.products}</b> ${T('nav.products')}</span>
      <span><b>${st.codes}</b> ${T('h.codes')}</span>
      <span><b>${st.vehicles}</b> ${T('h.apps')}</span>
      <span><b>${st.axles}</b> ${zh ? '尺码段' : 'size bands'}</span>
      <span><b>${st.fitments}</b> ${T('nav.graph')}</span>
      <span><b>${o.tests}</b> ${zh ? '质检报告' : 'test reports'}</span>
    </div>`;

    const todoCard = `
    <div class="split">
      <div class="card">
        <div class="card-h"><h3>${isCust ? LZ('最近浏览', 'Recently viewed') : T('home.todo')}</h3><span class="sub">${isCust ? LZ('点一下回到产品库', 'Tap to open the catalog') : T('home.todoSub')}</span></div>
        <div class="card-b" style="padding:4px 15px 8px">
          ${todo.length ? todo.map(x => `<div class="todo" data-act="tab" data-id="${x.tab}">
            <div class="todo-n">${x.n}</div>
            <div style="flex:1"><div class="todo-t">${x.t}</div></div>
            <span class="muted">›</span></div>`).join('')
        : `<div class="muted small" style="padding:16px 0">${zh ? '今天没有待办。直接搜一个款号，或去「用户画像 · 获客内容」做一条脚本。' : 'Nothing pending. Search a style, or open Content to draft a video.'}</div>`}
        </div>
      </div>
      <div class="card">
        <div class="card-h"><h3>${T('home.steps')}</h3><span class="sub">${T('home.stepsSub')}</span></div>
        <div class="card-b small" style="line-height:1.95">
          <div>${T('home.s1')}</div>
          <div>${T('home.s2')}</div>
          <div>${T('home.s3')}</div>
          <div class="row wrap-gap mt-s">
            <button class="btn sm" data-act="tab" data-id="select">${T('home.select')}</button>
            <button class="btn sm" data-act="chatToggle">${T('home.chat')}</button>
          </div>
        </div>
      </div>
    </div>`;

    const why = `
    <details class="fold mt">
      <summary>${T('home.why')}<span class="sub">${T('home.whySub')}</span></summary>
      <div class="fold-b">
        ${(window.Engine || window.E).matrix('V-SW-01').map(m => `<div class="leaf" style="border-bottom:1px solid var(--line-2)">
          <span class="mono" style="width:76px;color:var(--muted)">${esc(m.axle ? m.axle.model : (zh ? '按旧款' : 'by old style'))}</span>
          <span class="arrow">→</span><b class="mono" style="width:86px">${esc(m.code)}</b>
          <span class="muted small flex1">${esc(m.fit)}</span>${o.confTag(m.conf)}
        </div>`).join('')}
        <div class="row wrap-gap mt-s">
          <button class="chip" data-act="example" data-id="${esc(ex[1])}">${LZ('试一下「奶油小方 圆领卫衣 110 码 300 件」', 'Try “Cream crewneck size 110, 300 pcs”')}</button>
          <button class="chip" data-act="tab" data-id="graph">${T('nav.graph')}</button>
        </div>
      </div>
    </details>`;

    return hero + about + cats + tools + news + statline + (isCust ? '' : todoCard) + why + `
      <footer class="site-foot">
        <img src="assets/img/site/logo-site.png" alt="XIAOMAN KIDS 小满童装">
        <span>© 2026 湖州小满童装有限公司 · HUZHOU XIAOMAN KIDS APPAREL CO., LTD. · 未经授权不得复制、镜像或二次分发</span>
        <span class="flex1"></span>
        <span class="muted">${zh ? '本站数据用于选款与报价演示' : 'Demo data for style selection and quoting'}</span>
      </footer>`;
  }

  /* 实拍轮播 */
  function init() {
    if (window.__homeCleanup) { try { window.__homeCleanup(); } catch (e) { } }
    const slides = document.getElementById('heroSlides');
    const dots = document.getElementById('heroDots');
    if (!slides) return;
    let idx = 0, timer = null;

    const paintDots = () => {
      if (!dots) return;
      dots.innerHTML = Array.from({ length: HERO_SLIDES.length }).map((_, i) =>
        `<span class="hero-dot ${i === idx ? 'on' : ''}" data-i="${i}"></span>`).join('');
    };
    const showSlide = i => {
      idx = (i + HERO_SLIDES.length) % HERO_SLIDES.length;
      [...slides.children].forEach((el, k) => el.classList.toggle('on', k === idx));
      paintDots();
    };
    const start = () => {
      slides.classList.remove('off');
      showSlide(0);
      clearInterval(timer);
      timer = setInterval(() => showSlide(idx + 1), 6500);
    };

    start();
    if (dots) dots.addEventListener('click', e => {
      const d = e.target.closest('.hero-dot'); if (!d) return;
      showSlide(+d.dataset.i);
      clearInterval(timer);
      timer = setInterval(() => showSlide(idx + 1), 6500);
    });
    window.__homeCleanup = () => { clearInterval(timer); };
  }

  window.HOME_HTML = home;
  window.HOME_INIT = init;
})();
