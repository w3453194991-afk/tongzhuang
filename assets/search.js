/* 客户搜索（检索式生成器）+ 编号对照 */
(function () {
  const DB = () => window.DB;
  const EN = () => window.Engine;

  /* ---------------- 市场 / 本地语言 ---------------- */
  const MARKETS = [
    { id: 'mx', name: '墨西哥', dom: '.mx', lang: 'es', city: 'Ciudad de México', terms: { cat: 'ropa infantil', cat2: 'vestidos de niña', shop: 'tienda de ropa infantil' } },
    { id: 'br', name: '巴西', dom: '.br', lang: 'pt', city: 'São Paulo', terms: { cat: 'roupa infantil', cat2: 'vestidos infantis', shop: 'loja de roupa infantil' } },
    { id: 'cl', name: '智利', dom: '.cl', lang: 'es', city: 'Santiago', terms: { cat: 'ropa infantil', cat2: 'vestidos de niña', shop: 'tienda de ropa infantil' } },
    { id: 'ae', name: '阿联酋', dom: '.ae', lang: 'en', city: 'Dubai', terms: { cat: 'kids clothing', cat2: 'kids dresses', shop: 'kids boutique' } },
    { id: 'sa', name: '沙特', dom: '.sa', lang: 'ar', city: 'Riyadh', terms: { cat: 'ملابس أطفال', cat2: 'فساتين أطفال', shop: 'متجر ملابس أطفال' } },
    { id: 'eg', name: '埃及', dom: '.eg', lang: 'ar', city: 'Cairo', terms: { cat: 'ملابس أطفال', cat2: 'فساتين أطفال', shop: 'متجر ملابس أطفال' } },
    { id: 'za', name: '南非', dom: '.za', lang: 'en', city: 'Johannesburg', terms: { cat: 'kids clothing', cat2: 'kids dresses', shop: 'kids clothing shop' } },
    { id: 'ru', name: '俄罗斯', dom: '.ru', lang: 'ru', city: 'Москва', terms: { cat: 'детская одежда', cat2: 'детские платья', shop: 'детский магазин одежды' } },
    { id: 'tr', name: '土耳其', dom: '.tr', lang: 'tr', city: 'İstanbul', terms: { cat: 'çocuk giyim', cat2: 'çocuk elbise', shop: 'çocuk giyim mağazası' } },
    { id: 'id', name: '印尼', dom: '.co.id', lang: 'id', city: 'Jakarta', terms: { cat: 'baju anak', cat2: 'gaun anak', shop: 'toko baju anak' } },
    { id: 'vn', name: '越南', dom: '.vn', lang: 'vi', city: 'Hồ Chí Minh', terms: { cat: 'quần áo trẻ em', cat2: 'váy trẻ em', shop: 'cửa hàng quần áo trẻ em' } },
    { id: 'cn', name: '国内（中文）', dom: '.cn', lang: 'zh', city: '杭州', terms: { cat: '童装', cat2: '童装连衣裙', shop: '母婴店' } },
    { id: 'global', name: '全球（英文）', dom: '', lang: 'en', city: '', terms: { cat: 'kids clothing', cat2: 'kids dresses', shop: 'kids boutique' } }
  ];

  const TYPES = {
    distributor: { en: 'kids clothing distributor', zh: '经销商', local: { es: 'distribuidor de ropa infantil', pt: 'distribuidor de roupa infantil', ar: 'موزع ملابس أطفال', ru: 'дистрибьютор детской одежды', tr: 'çocuk giyim distribütörü', id: 'distributor baju anak', vi: 'nhà phân phối quần áo trẻ em', zh: '童装经销商', en: 'kids clothing distributor' } },
    importer: { en: 'kids wear importer', zh: '进口商', local: { es: 'importador de ropa infantil', pt: 'importador de roupa infantil', ar: 'مستورد ملابس أطفال', ru: 'импортёр детской одежды', tr: 'çocuk giyim ithalatçısı', id: 'importir baju anak', vi: 'nhà nhập khẩu quần áo trẻ em', zh: '童装进口商', en: 'kids wear importer' } },
    wholesaler: { en: 'kids clothing wholesaler', zh: '批发商', local: { es: 'mayorista de ropa infantil', pt: 'atacadista de roupa infantil', ar: 'تاجر جملة ملابس أطفال', ru: 'оптовик детской одежды', tr: 'çocuk giyim toptancısı', id: 'grosir baju anak', vi: 'bán buôn quần áo trẻ em', zh: '童装批发商', en: 'kids clothing wholesaler' } },
    boutique: { en: 'kids boutique', zh: '童装买手店', local: { es: 'boutique infantil', pt: 'loja de roupa infantil', ar: 'بوتيك أطفال', ru: 'детский бутик', tr: 'çocuk butik', id: 'butik baju anak', vi: 'shop thời trang trẻ em', zh: '童装买手店', en: 'kids boutique' } },
    chain: { en: 'kids retail chain', zh: '母婴连锁', local: { es: 'cadena de tiendas infantiles', pt: 'rede de lojas infantis', ar: 'سلسلة متاجر أطفال', ru: 'сеть детских магазинов', tr: 'çocuk mağaza zinciri', id: 'jaringan toko anak', vi: 'chuỗi cửa hàng trẻ em', zh: '母婴连锁', en: 'kids retail chain' } },
    ecom: { en: 'kids wear e-commerce seller', zh: '童装电商', local: { es: 'tienda online de ropa infantil', pt: 'loja online de roupa infantil', ar: 'متجر إلكتروني لملابس أطفال', ru: 'интернет-магазин детской одежды', tr: 'çocuk giyim e-ticaret', id: 'toko online baju anak', vi: 'shop online quần áo trẻ em', zh: '童装电商', en: 'kids wear e-commerce seller' } }
  };

  const PRODUCTS = {
    dress: { zh: '连衣裙', en: 'kids dresses', cat: '连衣裙' },
    hoodie: { zh: '卫衣', en: 'kids sweatshirts', cat: '卫衣' },
    tee: { zh: 'T恤', en: 'kids t-shirts', cat: 'T恤' },
    jacket: { zh: '外套', en: 'kids jackets', cat: '外套' },
    pants: { zh: '裤装', en: 'kids pants', cat: '裤装' },
    set: { zh: '套装', en: 'kids clothing sets', cat: '套装' },
    homewear: { zh: '家居服', en: 'kids pajamas', cat: '家居服' },
    romper: { zh: '连体衣', en: 'baby rompers', cat: '连体衣' }
  };

  const NARROW = {
    none: { zh: '不加收窄', suffix: '' },
    site: { zh: '只搜本国域名 site:', suffix: 'SITE' },
    intitle: { zh: '标题含 wholesale / buyer', suffix: 'INTITLE' },
    inurl: { zh: 'URL 含 boutique / contact', suffix: 'INURL' },
    pdf: { zh: '只要 PDF 目录 / line sheet', suffix: 'PDF' }
  };

  let current = [];
  let opts = { market: 'mx', type: 'distributor', prod: 'dress', narrow: 'none', excl: '-alibaba -made-in-china -marketplace -dropship' };

  /* ---------------- 预设库（按区域、含 Google 长版 / DDG 短版） ---------------- */
  const PRESET_REGIONS = [
    {
      k: 'sea', label: '东南亚 SEA',
      langs: 'en / baju anak（印尼）/ quần áo trẻ em（越南）/ เสื้อผ้าเด็ก（泰语）',
      chan: 'Facebook / WhatsApp / Zalo / LINE',
      note: '时差小，漏单主因是刷屏淹没；泰国、印尼买家多在 Facebook 群组里问价',
      rows: [
        {
          tag: '童装 · 批发商 · 泰国',
          google: '"kids clothing" ("wholesaler" OR "distributor") site:.th "90-160cm" -alibaba -made-in-china -marketplace', g2: '"kids clothing" (wholesale OR distributor) Bangkok contact filetype:pdf OR "line sheet" "2T-12Y"',
          ddg: '"kids clothing" wholesale Thailand -alibaba'
        },
        {
          tag: '女童连衣裙 · 童装买手店 · 泰国',
          google: '"kids dresses" ("boutique" OR "buyer") site:.th "2T-12Y" -alibaba -made-in-china', g2: '"kids dress" (boutique OR buyer) Bangkok contact filetype:pdf',
          ddg: '"kids dress" boutique Thailand -alibaba'
        }
      ]
    },
    {
      k: 'me', label: '中东 ME',
      langs: 'en / ar（阿语）/ çocuk giyim（土耳其）',
      chan: 'WhatsApp / LinkedIn / 展会名录',
      note: '迪拜是转口集散地，满屏贸易公司最典型；先看有没有门店与品牌授权',
      rows: [
        {
          tag: '童装批发 · 进口商 · 阿联酋',
          google: '"kids clothing" ("importer" OR "wholesaler") site:.ae "90-160cm" -alibaba -made-in-china -marketplace', g2: '"kids clothing" importer Dubai contact filetype:pdf OR "line sheet"',
          ddg: '"kids clothing" importer Dubai -alibaba'
        },
        {
          tag: '童装买手店 · 买手 · 沙特',
          google: '"kids boutique" ("buyer" OR "multi-brand") site:.sa "2T-12Y" -alibaba -made-in-china', g2: '"children wear" boutique buyer Riyadh contact filetype:pdf',
          ddg: '"kids boutique" buyer Saudi -alibaba'
        }
      ]
    },
    {
      k: 'sa', label: '南美 SA',
      langs: 'pt（português）/ es（español）· roupa infantil / ropa infantil',
      chan: 'WhatsApp（绝对主渠道）',
      note: '时差最大，夜间询盘必漏；巴西买家习惯先要 WhatsApp 目录',
      rows: [
        {
          tag: '童装批发 · 批发商 · 巴西',
          google: '"roupa infantil" ("atacado" OR "distribuidor") site:.br "90-160cm" -alibaba -made-in-china -marketplace', g2: '"roupa infantil" atacado São Paulo contato filetype:pdf',
          ddg: '"roupa infantil" atacado Brasil -alibaba'
        },
        {
          tag: '女童连衣裙 · 买手店 · 智利',
          google: '"vestidos de niña" ("boutique" OR "mayorista") site:.cl "2T-12Y" -alibaba -made-in-china', g2: '"vestidos de niña" boutique Santiago contacto filetype:pdf',
          ddg: '"vestidos de niña" boutique Chile -alibaba'
        }
      ]
    },
    {
      k: 'na', label: '北美 NA',
      langs: 'en / "2T-12Y" 是通用尺码语言',
      chan: 'LinkedIn / 邮件 / 展会（NY NOW / Children\'s Club）',
      note: '用条码与尺码表对话；Amazon 卖家比传统进口商更活跃，准入更看 CPSIA',
      rows: [
        {
          tag: '童装 · 进口商 / 分销商 · 美国',
          google: '"kids clothing" ("importer" OR "distributor") site:.us "2T-12Y" -alibaba -made-in-china -marketplace', g2: '"kids clothing" importer OR distributor USA "size 2T-12Y" filetype:pdf OR contact',
          ddg: '"kids clothing" importer distributor USA -alibaba'
        },
        {
          tag: '童装买手店 · 买手邮箱 · 美国',
          google: 'site:linkedin.com "kids apparel" buyer ("boutique" OR "sourcing") "childrenswear"', g2: 'children wear boutique buyer email USA "2T-12Y" contact filetype:pdf',
          ddg: 'children wear boutique buyer email -alibaba'
        }
      ]
    },
    {
      k: 'eu', label: '欧洲 EU',
      langs: 'en / de（Kinderbekleidung）/ pl（odzież dziecięca）',
      chan: '邮件 / LinkedIn / 展会（Playtime / CIFF）',
      note: '欧洲先问 OEKO-TEX 100 与 REACH，再谈价；买手店占比高',
      rows: [
        {
          tag: '童装批发 · 经销商 · 波兰',
          google: '"odzież dziecięca" ("hurt" OR "dystrybutor") site:.pl "90-160cm" -alibaba -made-in-china -marketplace', g2: '"odzież dziecięca" hurt Warszawa kontakt filetype:pdf',
          ddg: '"odzież dziecięca" hurt Polska -alibaba'
        },
        {
          tag: '童装 · 买手 · 德国',
          google: 'site:linkedin.com "kids apparel" buyer ("Kinderbekleidung" OR "childrenswear") Germany', g2: '"Kinderbekleidung" ("Großhandel" OR "Einkauf") Berlin kontakt filetype:pdf',
          ddg: '"Kinderbekleidung" Großhandel Berlin -alibaba'
        }
      ]
    },
    {
      k: 'sas', label: '南亚 SAS',
      langs: 'en / hi（बच्चों के कपड़े）/ ur · بچوں کے کپڑے',
      chan: 'WhatsApp / IndiaMART / 电话',
      note: '价格极敏感，先问 GOTS / OEKO-TEX；斋浦尔与德里是童装集散地',
      rows: [
        {
          tag: '童装批发 · 批发商 · 印度',
          google: '"kids clothing" ("wholesaler" OR "distributor") site:.in "90-160cm" -alibaba -made-in-china -marketplace', g2: '"kids clothing" wholesale Delhi contact filetype:pdf OR "line sheet"',
          ddg: '"kids clothing" wholesale India -alibaba'
        },
        {
          tag: '女童连衣裙 · 出口商 · 印度',
          google: '"girls dresses" ("exporter" OR "buyer") site:.in "2T-12Y" -alibaba -made-in-china', g2: '"girls dress" exporter Jaipur contact filetype:pdf',
          ddg: '"girls dress" exporter India -alibaba'
        }
      ]
    },
    {
      k: 'ru', label: '俄语区 RU',
      langs: 'ru（детская одежда оптом）/ en · 哈语多走俄语',
      chan: 'WhatsApp / Telegram / 邮件',
      note: '本地化要求高（EAC 认证），哈萨克多做转口',
      rows: [
        {
          tag: '童装批发 · 批发商 · 俄罗斯',
          google: '"детская одежда" ("оптом" OR "дистрибьютор") site:.ru "90-160" -alibaba -made-in-china -marketplace', g2: '"детская одежда" оптом Москва контакты filetype:pdf',
          ddg: '"детская одежда" оптом Россия -alibaba'
        },
        {
          tag: '童装 · 多品牌店 · 哈萨克斯坦',
          google: '"детская одежда" ("мультибренд" OR "бутик") site:.kz "2T-12Y" -alibaba -made-in-china', g2: '"детская одежда" бутик Алматы контакты filetype:pdf',
          ddg: '"детская одежда" бутик Казахстан -alibaba'
        }
      ]
    },
    {
      k: 'af', label: '非洲 AF',
      langs: 'en / fr（vêtements enfants）',
      chan: 'WhatsApp / Facebook',
      note: '拉各斯与约翰内斯堡是集散地，先看现货与拼柜',
      rows: [
        {
          tag: '童装批发 · 批发商 · 南非',
          google: '"kids clothing" ("wholesaler" OR "distributor") site:.za "90-160cm" -alibaba -made-in-china -marketplace', g2: '"kids clothing" wholesale Johannesburg contact filetype:pdf',
          ddg: '"kids clothing" wholesale Johannesburg -alibaba'
        },
        {
          tag: '婴童连体衣 · 母婴店 · 尼日利亚',
          google: '"baby clothes" ("baby shop" OR "importer") site:.ng "0-24M" -alibaba -made-in-china', g2: '"baby clothes" baby shop Lagos contact filetype:pdf',
          ddg: '"baby clothes" baby shop Lagos -alibaba'
        }
      ]
    }
  ];
  let presetMode = 'ddg';
  let presetFlat = [];
  function flatPresets() {
    const out = [];
    PRESET_REGIONS.forEach(r => r.rows.forEach((row, i) => out.push({
      i: out.length, region: r.label, tag: row.tag, ddg: row.ddg, google: row.google, g2: row.g2
    })));
    return out;
  }
  function presetText(p) { return presetMode === 'google' ? p.google + '\n' + p.g2 : p.ddg; }

  function presetHtml(esc) {
    presetFlat = flatPresets();
    return `
    <div class="card">
      <div class="card-h"><h3>④ 预设库（按区域，${presetFlat.length} 组）</h3><span class="sub">脚本跑过的一批，可直接抄</span></div>
      <div class="pre-verify">每条都带 <b>Google / Bing / Yandex / DDG</b> 四个按钮，点一下就是真搜，当场能看出这条管不管用。
        注意：<b>site: / filetype: / 括号 OR</b> 这套长语法只有 Google、Bing 认，DDG 会忽略——短版就是为此准备的。</div>
      <div class="card-b" style="padding:4px 0 10px">
        <div class="row wrap-gap" style="padding:0 15px 8px">
          <button class="chip ${presetMode === 'ddg' ? 'on' : ''}" data-act="sqPreMode" data-id="ddg">短版（DDG / Serper）</button>
          <button class="chip ${presetMode === 'google' ? 'on' : ''}" data-act="sqPreMode" data-id="google">长版（Google 全语法）</button>
          <button class="btn sm" data-act="sqPreAll">复制全部 ${presetFlat.length} 组</button>
        </div>
        ${PRESET_REGIONS.map(r => `
          <div class="pre-region">
            <div class="pre-h"><b>${esc(r.label)}</b><span class="tiny muted">${esc(r.langs)}</span></div>
            ${r.rows.map(row => {
              const idx = presetFlat.findIndex(p => p.ddg === row.ddg);
              const text = presetMode === 'google' ? row.google + ' ' + row.g2 : row.ddg;
              return `<div class="pre-row">
                <span class="pre-tag">${esc(row.tag)}</span>
                <code class="sq-code" data-act="sqPreCopy" data-id="${idx}">${esc(text)}</code>
                <div class="sq-acts">
                  <button class="btn xs" data-act="sqPreCopy" data-id="${idx}">复制</button>
                  <button class="btn xs" data-act="sqPreOpen" data-id="${idx}:google">Google</button>
                  <button class="btn xs" data-act="sqPreOpen" data-id="${idx}:bing">Bing</button>
                  <button class="btn xs" data-act="sqPreOpen" data-id="${idx}:yandex">Yandex</button>
                  <button class="btn xs" data-act="sqPreOpen" data-id="${idx}:ddg">DDG</button>
                </div>
              </div>`;
            }).join('')}
            <div class="pre-note">主渠道：${esc(r.chan)} · ${esc(r.note)}</div>
          </div>`).join('')}
      </div>
    </div>`;
  }


  function marketById(id) { return MARKETS.find(m => m.id === id) || MARKETS[0]; }

  /* 款号 / 条码：从目录里挑真号 */
  function pickCodes(cat) {
    const ps = DB().products || [];
    const ofCat = ps.filter(p => p.cat === cat);
    const style = ofCat.slice(0, 2).map(p => p.code);
    const ean = [];
    const takeEan = list => list.forEach(p => (p.altCodes || []).forEach(c => { if (/^\d{13}$/.test(c) && ean.length < 2) ean.push(c); }));
    takeEan(ofCat);
    if (ean.length < 2) takeEan(ps);
    return { style: style.length ? style : ['DR2601001', 'SW2601047'], ean: ean.length ? ean : ['6972026112300', '6972026112332'] };
  }

  function build(o) {
    const m = marketById(o.market);
    const t = TYPES[o.type] || TYPES.distributor;
    const p = PRODUCTS[o.prod] || PRODUCTS.dress;
    const local = t.local[m.lang] || t.en;
    const impLocal = TYPES.importer.local[m.lang] || 'importer';
    const wholeLocal = TYPES.wholesaler.local[m.lang] || 'wholesaler';
    const catLocal = (o.prod === 'dress' && m.lang !== 'en') ? m.terms.cat2 : m.terms.cat, shopLocal = m.terms.shop;
    const site = m.dom ? 'site:' + m.dom + ' ' : '';
    const excl = (o.excl || '').trim();
    const q = [];

    /* 1 组合公式 */
    const zh = m.lang === 'zh';
    const pick = arr => arr.filter((v, i, a) => a.indexOf(v) === i);
    const catTerms = pick(zh ? [catLocal] : [catLocal, p.en]).map(v => `"${v}"`).join(' OR ');
    const typeTerms = pick([local, impLocal, wholeLocal]).map(v => `"${v}"`).join(' OR ');
    const sizeTerms = zh ? '("90-160" OR "110码" OR "2T-12Y")' : '("90-160cm" OR "2T-12Y" OR "110/4T")';
    let s1 = `(${catTerms}) (${typeTerms}) ${sizeTerms}`;
    if (site) s1 = site + s1;
    if (o.narrow === 'pdf') s1 += ' filetype:pdf';
    if (o.narrow === 'intitle') s1 = `intitle:"${t.en}" ` + s1;
    if (o.narrow === 'inurl') s1 += ' inurl:boutique';
    q.push({ k: '组合公式', tip: '品类词 + 客户类型 + 国家域名 + 尺码段，最通用的一条', text: (s1 + ' ' + excl).trim() });

    /* 2 款号 / 条码 */
    const codes = pickCodes(p.cat);
    q.push({
      k: '款号（自家款号）', tip: '客户手里只有吊牌或水洗标时，用款号去搜同款与目录',
      text: `("${codes.style[0]}" OR "${codes.style[1]}") ${zh ? '(目录 OR 画册 OR 批发)' : '(catalogue OR "line sheet" OR wholesale)'} ${excl}`.trim()
    });
    q.push({
      k: '条码（EAN）', tip: '海外买手常用条码找同款，常出现在 PDF 目录与平台链接里',
      text: `("${codes.ean[0]}" OR "${codes.ean[1]}") ${zh ? '(条码 OR EAN OR 尺码表)' : '(barcode OR EAN OR "size chart")'} filetype:pdf`
    });

    /* 3 本地语言 */
    q.push({
      k: '本地语言（终端）', tip: '终端门店不用英文搜，这条命中童装店与母婴店',
      text: `${site}"${shopLocal}" (${zh ? `"${catLocal}"` : `"${catLocal}" OR "${p.en}"`}) ${excl}`.trim()
    });

    /* 4 尺码段 / 品类 */
    const sizeCatTerms = pick(zh ? [catLocal] : [p.en, catLocal]).map(v => `"${v}"`).join(' OR ');
    q.push({
      k: '尺码段 / 品类', tip: '童装是「尺码段问题」，不是品牌问题；买家按身高段与年龄段找货',
      text: `${sizeTerms} (${sizeCatTerms}) ${zh ? '(目录 OR 尺码表)' : '(catalogue OR "size chart")'} filetype:pdf`
    });

    /* 5 买手店 / 母婴连锁 */
    q.push({
      k: '买手店 / 母婴连锁', tip: '按选品页与门店品牌找，而不是按品类词硬搜',
      text: `intitle:"${zh ? '批发' : 'wholesale'}" (${zh ? `"${catLocal}"` : `"${p.en}" OR "kids boutique"`}) ${m.dom ? 'site:' + m.dom : ''} -alibaba -marketplace`.replace(/\s+/g, ' ').trim()
    });

    /* 6 地图 */
    q.push({
      k: '地图（找人）', tip: 'Google Maps 定位城市，拿电话与 WhatsApp',
      text: `${shopLocal} ${m.city}`.trim(),
      map: true
    });

    return q;
  }

  const engines = {
    google: q => 'https://www.google.com/search?q=' + encodeURIComponent(q),
    bing: q => 'https://www.bing.com/search?q=' + encodeURIComponent(q),
    yandex: q => 'https://yandex.com/search/?text=' + encodeURIComponent(q),
    ddg: q => 'https://duckduckgo.com/?q=' + encodeURIComponent(q),
    maps: q => 'https://www.google.com/maps/search/' + encodeURIComponent(q)
  };

  function html(ctx) {
    const { esc, LZ } = ctx;
    current = build(opts);
    const m = marketById(opts.market);
    const sel = (id, list, cur) => `<select id="${id}">${list.map(x => `<option value="${x.v}"${x.v === cur ? ' selected' : ''}>${esc(x.t)}</option>`).join('')}</select>`;

    return `
    <div class="row wrap-gap" style="justify-content:space-between;margin-bottom:12px">
      <div>
        <h1 style="margin:0">客户搜索</h1>
        <div class="muted small">按「品类词 + 客户类型 + 国家 + 尺码段」生成检索式，直接投喂 Google / Bing / Yandex / Maps；搜到人一键回填线索。</div>
      </div>
      <button class="btn" data-act="tab" data-id="leads">询盘线索 →</button>
    </div>

    <div class="card">
      <div class="card-h"><h3>① 选参数</h3><span class="sub">改完点「重新生成」，或直接改完就生效</span></div>
      <div class="card-b">
        <div class="sq-form">
          <label>市场 ${sel('sqMarket', MARKETS.map(x => ({ v: x.id, t: x.name + ' · ' + x.lang + (x.dom ? ' · ' + x.dom : '') })), opts.market)}</label>
          <label>品类 ${sel('sqProd', Object.keys(PRODUCTS).map(k => ({ v: k, t: PRODUCTS[k].zh + ' / ' + PRODUCTS[k].en })), opts.prod)}</label>
          <label>客户类型 ${sel('sqType', Object.keys(TYPES).map(k => ({ v: k, t: TYPES[k].zh + ' / ' + TYPES[k].en })), opts.type)}</label>
          <label>收窄 ${sel('sqNarrow', Object.keys(NARROW).map(k => ({ v: k, t: NARROW[k].zh })), opts.narrow)}</label>
          <label class="wide">排除词 <input id="sqExcl" value="${esc(opts.excl)}" placeholder="-alibaba -made-in-china -marketplace -dropship"></label>
        </div>
        <div class="row wrap-gap" style="margin-top:10px">
          <button class="btn primary sm" data-act="sqBuild">重新生成</button>
          <button class="btn sm" data-act="sqCopyAll">复制全部 ${current.length} 条</button>
          <span class="tiny muted">当前：${esc(m.name)} · ${esc(m.lang)} · ${m.dom || '全球'}</span>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-h"><h3>② 检索式</h3><span class="sub">点一下复制；后面四个按钮直接开对应引擎</span></div>
      <div class="card-b" style="padding:4px 0 8px">
        ${current.map((x, i) => `<div class="sq-item">
          <div class="sq-h"><b>${esc(x.k)}</b><span class="tiny muted">${esc(x.tip)}</span></div>
          <code class="sq-code" data-act="sqCopy" data-id="${i}">${esc(x.text)}</code>
          <div class="sq-acts">
            <button class="btn xs" data-act="sqCopy" data-id="${i}">复制</button>
            <button class="btn xs" data-act="sqOpen" data-id="${i}:google">Google</button>
            <button class="btn xs" data-act="sqOpen" data-id="${i}:bing">Bing</button>
            <button class="btn xs" data-act="sqOpen" data-id="${i}:yandex">Yandex</button>
            <button class="btn xs" data-act="sqOpen" data-id="${i}:maps">${x.map ? '地图' : 'Maps'}</button>
          </div>
        </div>`).join('')}
      </div>
    </div>

    <div class="card">
      <div class="card-h"><h3>③ 搜到的人，回填成线索</h3><span class="sub">带来源链接，后面好复核</span></div>
      <div class="card-b">
        <div class="sq-form">
          <label>公司名 <input id="sqCo" placeholder="如 Little Closet Trading LLC"></label>
          <label>国家 ${sel('sqCountry', MARKETS.map(x => ({ v: x.name, t: x.name })), m.name)}</label>
          <label>类型 ${sel('sqKind', Object.keys(TYPES).map(k => ({ v: TYPES[k].zh, t: TYPES[k].zh })), '经销商')}</label>
          <label class="wide">来源链接 <input id="sqUrl" placeholder="https://..."></label>
          <label class="wide">备注 <input id="sqNote" placeholder="搜到什么：主营女童连衣裙 / 有 3 家门店"></label>
        </div>
        <div class="row wrap-gap" style="margin-top:10px">
          <button class="btn primary sm" data-act="sqSave">加入线索</button>
          <span class="tiny muted">进「询盘线索」后可以继续打分、匹配款号</span>
        </div>
      </div>
    </div>

    ${presetHtml(esc)}

    <details class="fold">
      <summary>筛客户的 4 条硬规则<span class="sub">别按直觉筛，按这些筛</span></summary>
      <div class="fold-b small" style="line-height:1.9">
        <div>① 只看近 12 个月，三年前的记录不算数</div>
        <div>② 一年 ≥4 票且间隔稳定 → 优先名单；一年一票多是调货贸易商 → 观察区</div>
        <div>③ 抓切换信号：从印度/越南转中国采购、新增 shipper、原供应商份额下滑</div>
        <div>④ 别信 notify party（多为清关行/货代）；别只按 HS 编码拉（6104.42 / 6110.20 太宽，婴儿连体衣可能落 6111.20）</div>
        <div class="muted">海关数据本身不含电话邮箱，平台上的联系方式是拼凑的，命中率有限，必须二次验证。</div>
      </div>
    </details>`;
  }

  function toast(msg) { if (window.__toast) window.__toast(msg); }

  function copy(i) {
    const x = current[i]; if (!x) return;
    const done = () => toast('已复制：' + x.k);
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(x.text).then(done, () => fallback(x.text, done));
    else fallback(x.text, done);
  }
  function copyAll() {
    const text = current.map(x => '# ' + x.k + ' — ' + x.tip + '\n' + x.text).join('\n\n');
    const done = () => toast('已复制 ' + current.length + ' 条检索式');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => fallback(text, done));
    else fallback(text, done);
  }
  function fallback(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) { }
    document.body.removeChild(ta); done();
  }
  function open(i, engine) {
    const x = current[i]; if (!x) return;
    const url = (engines[engine] || engines.google)(x.text);
    window.open(url, '_blank');
  }
  function setOpt(k, v) { opts[k] = v; }
  function getOpts() { return opts; }
  function readForm(doc) {
    const v = id => (doc.getElementById(id) || {}).value;
    if (v('sqMarket')) opts.market = v('sqMarket');
    if (v('sqProd')) opts.prod = v('sqProd');
    if (v('sqType')) opts.type = v('sqType');
    if (v('sqNarrow')) opts.narrow = v('sqNarrow');
    if (v('sqExcl') !== undefined) opts.excl = v('sqExcl');
  }

  /* ---- 预设库操作 ---- */
  function presetCopy(i) {
    const p = presetFlat[i]; if (!p) return;
    copyText(presetText(p), () => toast('已复制（' + p.region + '）'));
  }
  function presetOpen(i, eng) {
    const p = presetFlat[i]; if (!p) return;
    const q = presetText(p).split('\n').pop();
    window.open((engines[eng] || engines.google)(q), '_blank');
  }
  function presetAll() {
    const date = new Date();
    const stamp = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0') +
      'T' + String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0') + ':' + String(date.getSeconds()).padStart(2, '0');
    const out = [];
    out.push('# 全球童装采购端检索式 · 生成于 ' + stamp);
    out.push('# Google 版（可直接抄进浏览器；DDG 不完全支持 site:/filetype: 等语法）');
    out.push('');
    PRESET_REGIONS.forEach(r => r.rows.forEach(row => { out.push(row.google); out.push(row.g2); }));
    out.push('');
    out.push('# 脚本实际发出的 DDG / Serper 版');
    out.push('');
    PRESET_REGIONS.forEach(r => r.rows.forEach(row => out.push(row.ddg)));
    out.push('');
    out.push('# 本地语种锚点（终端门店不用英文搜）');
    out.push('');
    PRESET_REGIONS.forEach(r => out.push('[' + r.k + ' ' + r.label.split(' ')[0] + '] ' + r.langs + ' ｜ 主渠道 ' + r.chan + ' ｜ ' + r.note));
    copyText(out.join('\n'), () => toast('已复制 ' + flatPresets().length + ' 组预设（含注释）'));
  }
  function setPresetMode(m) { presetMode = m === 'google' ? 'google' : 'ddg'; }
  function copyText(text, done) {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => fallback(text, done));
    else fallback(text, done);
  }

  window.SEARCHX = { html, build, copy, copyAll, open, readForm, getOpts, setOpt, MARKETS, TYPES, PRODUCTS,
    presetCopy, presetOpen, presetAll, setPresetMode, PRESET_REGIONS };

  /* ================= 编号对照 ================= */
  const Q = { q: '' };

  function norm(s) { return String(s || '').toUpperCase().replace(/\s+/g, '').replace(/[-_/.]/g, ''); }

  function lookup(q) {
    const db = DB(); const out = [];
    const nq = norm(q), raw = String(q || '').trim();
    if (!nq) return out;

    const seen = new Set();
    const push = (p, why, score) => { if (seen.has(p.id)) return; seen.add(p.id); out.push({ p, why, score }); };

    db.products.forEach(p => {
      const codes = [p.code, p.sku].concat(p.altCodes || []);
      for (const c of codes) {
        const nc = norm(c);
        if (!nc) continue;
        if (nc === nq) { push(p, '编号精确命中 ' + c, 100); return; }
        if (nc.startsWith(nq) && nq.length >= 3) { push(p, '编号前缀命中 ' + c, 78); return; }
      }
    });

    const axles = (db.axles || []).filter(a => norm(a.model).includes(nq) || norm(a.brand).includes(nq) || (a.alias || []).some(x => norm(x).includes(nq)));
    axles.slice(0, 3).forEach(a => {
      db.fitments.filter(f => f.aid === a.id).forEach(f => {
        const p = db.products.find(x => x.id === (f.pid || f.productId));
        if (p) push(p, '尺码段命中 ' + a.brand + ' ' + a.model, 72);
      });
    });

    const vehs = (db.vehicles || []).filter(v => norm(v.model).includes(nq) || norm(v.brand || '').includes(nq) || (v.alias || []).some(x => norm(x).includes(nq)));
    vehs.slice(0, 3).forEach(v => {
      db.fitments.filter(f => f.vid === v.id).forEach(f => {
        const p = db.products.find(x => x.id === (f.pid || f.productId));
        if (p) push(p, '款式系列命中 ' + (v.brand ? v.brand + ' ' : '') + v.model, 66);
      });
    });

    if (!out.length && nq.length >= 2) {
      db.products.forEach(p => {
        const hay = norm([p.code, p.nameZh, p.nameEn, p.cat, (p.apps || []).join('')].join(' '));
        if (hay.includes(nq)) push(p, '模糊命中', 50);
      });
    }
    return out.slice(0, 12).sort((a, b) => b.score - a.score);
  }

  function gapOf(p, db) {
    const tests = (db.tests || []).filter(t => t.pid === p.id);
    const gaps = [];
    if (!p.dim || p.dimStatus !== '已核尺码表') gaps.push('尺码表（身高 / 胸围 / 衣长）没齐');
    if (!tests.length) gaps.push('没有对应质检报告');
    if (!(p.apps || []).length) gaps.push('适穿尺码段待核');
    return { tests: tests.length, gaps };
  }

  function xrefHtml(ctx) {
    const { esc, LZ } = ctx;
    const db = DB();
    const res = Q.q ? lookup(Q.q) : [];
    const axles = (db.axles || []).slice(0, 6);
    return `
    <div class="row wrap-gap" style="justify-content:space-between;margin-bottom:12px">
      <div>
        <h1 style="margin:0">编号对照</h1>
        <div class="muted small">输入自家款号 / 条码 EAN / 客户款号 / 旧款号 / 款式系列 / 尺码段，查它在这张表里能对上谁，还差什么。</div>
      </div>
      <button class="btn" data-act="tab" data-id="products">产品库 →</button>
    </div>

    <div class="card"><div class="card-b">
      <div class="row wrap-gap">
        <input id="xrefQ" value="${esc(Q.q)}" placeholder="如 SW2601047 / DR2601001 / 6972026112300 / 奶油卫衣 / 110" style="flex:1;min-width:220px;padding:10px 12px;border:1px solid var(--line);border-radius:9px;font-size:13.5px">
        <button class="btn primary" data-act="xrefGo">查</button>
        ${['SW2601047', 'DR2601001', '110', '奶油卫衣'].map(x => `<button class="chip" data-act="xrefQuick" data-id="${x}">${x}</button>`).join('')}
      </div>
      <div class="tiny muted" style="margin-top:8px">同一个版型会派生多个尺码段与花色，款号与条码不是一对一；这里给候选集，不给唯一答案——这是童装行业事实，不是能力不足。</div>
    </div></div>

    ${Q.q ? (res.length ? `<div class="xref-list">
      ${res.map(({ p, why, score }) => {
        const g = gapOf(p, db);
        const ask = g.gaps.length ? (p.dim && p.dimStatus === '已核尺码表' ? '按哪个尺码段报？90–160 还是 2T–12Y？' : '这件平铺衣长 / 胸围 / 建议身高各是多少？') : '已齐，可直接报价';
        return `<div class="xref-item">
          <div class="xref-h">
            <b class="mono">${esc(p.code)}</b>
            <span class="tag ${score >= 90 ? 'g' : score >= 70 ? 'b' : 'y'}">${Math.round(score)}</span>
            <span class="small muted">${esc(p.cat)} · ${esc(p.material || '')} ${p.pos ? '· ' + esc(p.pos) : ''}</span>
            <span class="flex1"></span>
            <button class="btn xs" data-act="openProduct" data-id="${p.id}">详情</button>
            <button class="btn xs primary" data-act="xrefAdd" data-id="${p.id}">加入报价</button>
          </div>
          <div class="xref-meta small">
            <span>${esc(why)}</span>
            <span class="mono">${esc(p.dim || '尺码待补')}</span>
            <span class="mono">${esc((p.altCodes || []).join(' / ') || '无客户款号 / 旧款号')}</span>
            <span>${g.tests} 份质检报告</span>
          </div>
          <div class="xref-gap ${g.gaps.length ? '' : 'ok'}">
            ${g.gaps.length ? '缺口：' + esc(g.gaps.join('、')) + ' → 只追问一句：<b>' + esc(ask) + '</b>' : '资料齐：尺码 + 质检报告 + 适穿都在，可作报价依据'}
          </div>
        </div>`;
      }).join('')}
    </div>` : `<div class="card"><div class="card-b muted small">没对上。换个号试试：目录里的款号形如 <span class="mono">SW2601047</span>，条码形如 <span class="mono">6972026112300</span>，客户款号形如 <span class="mono">LC-2600B</span>。</div></div>`) : ''}

    <div class="card">
      <div class="card-h"><h3>这张表要建的四列</h3><span class="sub">建起来，三件事同时解决</span></div>
      <div class="card-b small" style="line-height:1.9">
        <div><b>自家款号</b> ↔ <b>平台款号 / 条码 EAN</b> ↔ <b>尺码段与适穿系列</b> ↔ <b>尺码（身高 / 胸围 / 衣长）</b></div>
        <div>↔ 客户款号 / 旧款号 / 竞品款号 ↔ 面料与克重（180–300 g/m²）↔ 对应质检报告编号 ↔ 照片</div>
        <div class="muted" style="margin-top:8px">常见尺码段：婴童 59–98 · 小童 90–120 · 中童 110–140 · 大童 130–160；常见版型：宽松 · 标准 · 修身</div>
        <div class="muted">质检：GB 31701-2015（A/B/C 类）· GB 18401-2010 · OEKO-TEX Standard 100 · 起球 4 级 / 色牢度 4 级</div>
        <div class="muted" style="margin-top:8px">现有尺码段：${axles.map(a => esc(a.brand + ' ' + a.model)).join(' · ')}</div>
      </div>
    </div>`;
  }

  function setQ(q) { Q.q = String(q || ''); }
  window.XREF = { html: xrefHtml, lookup, setQ, getQ: () => Q.q };
})();
