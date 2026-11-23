/* 生成 assets/i18n.js：中文/英文按童装业务重写；其余 8 种语言沿用旧译文并按术语替换，
 * 替换后语义不通的长句留空（运行时自动回落英文）。一次性脚本，产出即为源文件。
 * 运行：node build\make-kids-i18n.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ---------- 读旧语言包（已提交版本） ---------- */
const oldSrc = execSync('git show HEAD:assets/i18n.js', { cwd: ROOT, encoding: 'utf8' });
const kText = oldSrc.slice(oldSrc.indexOf('const K = {'), oldSrc.indexOf('\n  };') + 4);
const OLD = eval('(' + kText.replace('const K = ', '') + ')');

/* ---------- 中文 / 英文：按童装重写 ---------- */
const NEW = {
  // 导航
  'nav.home': ['工作台', 'Dashboard'],
  'nav.homeCust': ['首页', 'Home'],
  'nav.myQuote': ['我的报价', 'My quote'],
  'nav.custom': ['自定义定制', 'Custom styles'],
  'nav.browse': ['选购', 'Browse'],
  'nav.cart': ['报价篮', 'Quote basket'],
  'nav.myPack': ['我的资料', 'My files'],
  'nav.search': ['客户搜索', 'Buyer search'],
  'nav.xref': ['编号对照', 'Cross reference'],
  'nav.visits': ['客户浏览', 'Visitor log'],
  'nav.redfox': ['热门追踪', 'Trending'],
  'nav.acquire': ['获客', 'Acquire'],
  'nav.g.clues': ['客户管理', 'Customers'],
  'nav.g.data': ['款号数据', 'Catalog data'],
  'nav.g.tools': ['工具书', 'Handbook'],
  'nav.tax': ['关税查询', 'Duty & tax'],
  'nav.model': ['款号查询', 'Style lookup'],
  'nav.fx': ['货币换算', 'Currency'],
  'nav.aftersales': ['售后服务', 'After-sales'],
  'nav.aftersale': ['售后服务', 'After-sales'],
  'nav.deals': ['成交台账', 'Deals'],
  'nav.boss': ['业绩总览', 'Overview'],
  'nav.select': ['智能选款', 'Selector'],
  'nav.products': ['产品库', 'Products'],
  'nav.graph': ['尺码适配图谱', 'Size & fitment'],
  'nav.quote': ['报价单', 'Quote'],
  'nav.pack': ['资料包', 'Data pack'],
  'nav.leads': ['询盘线索', 'Leads'],
  'nav.network': ['用户画像', 'Audience'],
  'nav.content': ['获客内容', 'Content'],
  'nav.import': ['数据导入', 'Import'],
  'nav.inquiries': ['客户询价', 'Inquiries'],
  'nav.addcust': ['增加客户', 'Add customer'],

  // 顶栏
  'top.searchPh': ['输入款式 / 尺码 / 水洗标款号 / 客户原话，回车开始选款',
    'Style, size band, care-label code or a customer\'s words — press Enter'],

  // 语言弹窗
  'm.sub': ['面向国际市场的版本：界面文案跟随语言切换，款号与尺码保持原样。',
    'Built for export markets: the interface follows your language, style numbers and sizes stay as they are.'],
  'm.note': ['部分长说明目前为英文，后续版本补齐小语种。',
    'Some long help texts are English for now and will be localised later.'],

  // 首页
  'home.title': ['要选哪件童装？', 'Which kidswear style are you looking for?'],
  'home.sub': ['款式系列、尺码段、水洗标款号，或者客户的一句原话都行',
    'A style series, a size band, a care-label code — or just what the customer said.'],
  'home.btn': ['查找款号', 'Search'],
  'home.todo': ['今天要做的事', 'Today'],
  'home.todoSub': ['点一行直接过去', 'Tap a row to jump there'],
  'home.t1': ['待跟进询盘', 'Leads to follow up'],
  'home.t2': ['待复核的适穿关系', 'Fitments awaiting review'],
  'home.t3': ['已加入报价的款', 'Items in the quote'],
  'home.t4': ['已保存的历史报价', 'Saved quotes'],
  'home.steps': ['现场三步定码法', 'Three steps to the right size'],
  'home.stepsSub': ['客户说不清尺码时，照着念', 'Say this when the customer cannot name the size'],
  'home.s1': ['问身高不问年龄 —— 「孩子现在多高？」比问「几岁」准得多。',
    'Ask height, not age — “How tall is the child?” beats “How old?” every time.'],
  'home.s2': ['拍三张照 —— 孩子现在穿的同类衣服平铺 / 水洗标特写 / 身高对照门框。',
    'Three photos — a flat-lay of a garment that fits, the care label, the child by a door frame.'],
  'home.s3': ['看水洗标 —— 90 / 110 / 4T，同一件衣服比按年龄猜准。',
    'Read the care label — 90 / 110 / 4T beats guessing by age.'],
  'home.select': ['打开选款台', 'Open selector'],
  'home.chat': ['客服解答', 'Ask support'],
  'home.why': ['为什么「问身高不问年龄」', 'Why ask height, not age'],
  'home.whySub': ['以奶油小方为例：一个系列，三个尺码段，三个款号', 'Cream Crewneck: one series, three size bands, three styles'],

  // 选款
  'sel.title': ['智能选款', 'Selector'],
  'sel.in': ['客户原话 / 款式系列 / 尺码段 / 水洗标款号', 'Customer words / series / size band / care-label code'],
  'sel.inSub': ['支持中文、英文、款号混输', 'Chinese, English or mixed input'],
  'sel.ph': ['例：奶油小方 圆领卫衣 110 码 300 件 / 女童碎花裙 120 / XM-SW-2601',
    'e.g. cream crewneck size 110 x300 / girls floral dress 120 / XM-SW-2601'],
  'sel.go': ['解析并选款', 'Match'],
  'sel.clear': ['清空', 'Clear'],
  'sel.steps': ['现场三步定码法', 'Three steps to the right size'],
  'sel.res': ['识别结果', 'What we understood'],
  'sel.resSub': ['共 {n} 个候选，按证据强度排序', '{n} candidates, strongest evidence first'],
  'sel.q': ['还差一步就能锁定（先问这个，别急着报价）', 'One question away (ask this before quoting)'],
  'sel.enough': ['关键信息齐全，可直接报价。', 'Enough information — you can quote.'],
  'sel.heat': ['常用款式系列 · 按热度排序', 'Popular series · ranked by buzz'],
  'sel.heatSub': ['共 {n} 个系列，按社媒热度从高到低', '{n} series, most-talked first'],
  'sel.heatEmpty': ['该款号还没有系列线索', 'No series link yet for this style'],
  'sel.heatNote': ['排序依据：该系列相关短视频/帖子的互动合计（演示数据）。', 'Ranked by total engagement of related posts (demo data).'],
  'sel.copyList': ['复制款式清单', 'Copy list'],
  'sel.videos': ['看相关视频', 'Related videos'],
  'sel.mx': ['尺码对应表', 'Size band table'],
  'sel.other': ['同系列其他款号', 'Other styles in this series'],
  'sel.add': ['加入报价', 'Add to quote'],
  'sel.detail': ['产品详情', 'Details'],
  'sel.pack': ['生成资料页', 'Style sheet'],
  'sel.copy': ['复制回复话术', 'Copy reply'],

  // 产品库
  'prod.title': ['产品库', 'Catalog'],
  'prod.sub': ['{p} 个款号，{c} 条编号。点击行看详情、适穿与质检。', '{p} styles, {c} codes. Open a row for details.'],
  'prod.ph': ['搜索款号 / 编号 / 款名', 'Search style, code, name'],
  'prod.cat': ['品类', 'Category'],
  'prod.brand': ['品牌线', 'Brand line'],
  'prod.mat': ['面料', 'Fabric'],
  'prod.only': ['只看有适穿关系', 'Only with fitment'],
  'prod.sort': ['排序', 'Sort'],
  'prod.def': ['默认', 'Default'],
  'prod.likes': ['按热度', 'By buzz'],
  'prod.fit': ['按适穿关系', 'By fitment'],
  'prod.price': ['按参考价', 'By price'],
  'prod.export': ['导出 CSV', 'Export CSV'],
  'prod.res': ['筛选结果', 'Results'],
  'h.code': ['款号', 'Style'],
  'h.name': ['款名', 'Name'],
  'h.apps': ['款式系列', 'Series'],
  'h.spec': ['尺码', 'Size'],
  'h.codes': ['编号', 'Codes'],
  'h.likes': ['热度', 'Buzz'],
  'h.price': ['参考价', 'Price'],

  // 报价单
  'qt.title': ['报价单', 'Quotation'],
  'qt.sub': ['阶梯价随数量自动计算；尺码依据附在备注里，减少来回确认。', 'Volume price is automatic; size notes go with the quote.'],
  'qt.cust': ['客户与条款', 'Customer & terms'],
  'qt.items': ['明细', 'Items'],
  'qt.gen': ['生成报价单（打印 / PDF）', 'Generate quote (print / PDF)'],
  'qt.save': ['保存报价', 'Save quote'],
  'qt.amount': ['货值', 'Goods value'],
  'qt.freight': ['运费估算', 'Freight (est.)'],
  'qt.total': ['合计', 'Total'],
  'qt.recent': ['最近保存', 'Recent'],
  'qt.empty': ['还没有款号。去「智能选款」或「产品库」加入。', 'No items yet — add from Selector or Catalog.'],

  // 资料包
  'pk.title': ['客户资料包', 'Customer data pack'],
  'pk.sub': ['一次生成：封面 + 报价 + 款图与规格页 + 质检报告 + 发货确认页。', 'One run: cover, quote, style sheets, test reports, confirmation page.'],
  'pk.contents': ['打包内容', 'What is included'],
  'pk.zip': ['下载 ZIP', 'Download ZIP'],
  'pk.print': ['生成并打印（另存为 PDF）', 'Generate & print (save as PDF)'],
  'pk.items': ['将被打包的款号', 'Styles in this pack'],
  'pk.empty': ['先加入款号', 'Add styles first'],

  // 线索 / 画像 / 内容
  'ld.title': ['询盘线索', 'Leads'],
  'ld.sub': ['先判断「是不是终端」，再决定投入多少时间。', 'Decide if it is an end buyer before spending time.'],
  'ld.new': ['录入询盘', 'New lead'],
  'nw.title': ['用户画像与关系网', 'Audience & network'],
  'nw.sub': ['从关注 / 粉丝 / 评论还原谁影响谁的选款。', 'Who influences whose buying, from follows and comments.'],
  'ct.title': ['获客内容引擎', 'Content engine'],
  'ct.sub': ['按语种扒热门选题 → 出童装脚本 → 挂到款号。', 'Trending topics by language → kidswear scripts → link to a style.'],
  'ct.gen': ['生成脚本', 'Generate script'],
  'ct.prompt': ['复制 AI 提示词', 'Copy AI prompt'],
  'im.title': ['数据导入与导出', 'Import & export'],
  'im.sub': ['把 CRM、ERP、打版单、质检台账接进来。', 'Bring in CRM, ERP, pattern sheets and test logs.'],

  // 入口
  'gate.custSub': ['看款式与参考价，收到你的报价和资料', 'Browse styles and prices, receive quotes and packs'],
  'gate.staffSub': ['看客户浏览、跟进线索、出报价与资料包', 'Customer activity, leads, quotes and data packs'],
  'gate.code': ['员工访问码', 'Staff access code'],
  'gate.tip': ['客户登录后，报价和资料会发到这个联系方式。', 'Quotes and packs will be sent to this contact.']
};

/* ---------- 其余 8 种语言：术语替换 ---------- */
const TERMS = {
  es: [[/pastillas de freno/gi, 'prendas'], [/pastilla de freno/gi, 'prenda'], [/pastillas/gi, 'prendas'], [/pastilla/gi, 'prenda'],
    [/vehículos/gi, 'series'], [/vehículo/gi, 'serie'], [/ejes/gi, 'tallas'], [/eje/gi, 'talla'],
    [/del camión/gi, 'del niño'], [/camiones/gi, 'niños'], [/camión/gi, 'niño'], [/freno/gi, '']],
  pt: [[/pastilhas de freio/gi, 'peças'], [/pastilhas/gi, 'peças'], [/pastilha/gi, 'peça'],
    [/veículos/gi, 'séries'], [/veículo/gi, 'série'], [/eixos/gi, 'tamanhos'], [/eixo/gi, 'tamanho'],
    [/do caminhão/gi, 'da criança'], [/caminhões/gi, 'crianças'], [/caminhão/gi, 'criança'], [/freio/gi, '']],
  ar: [[/فحمات/gi, 'ملابس'], [/المركبات/gi, 'السلاسل'], [/مركبة/gi, 'سلسلة'], [/المحاور/gi, 'المقاسات'], [/محور/gi, 'مقاس'],
    [/الشاحنة/gi, 'الطفل'], [/شاحنة/gi, 'طفل'], [/الفرامل/gi, ''], [/فرامل/gi, '']],
  ru: [[/колодки/gi, 'модели'], [/колодок/gi, 'моделей'], [/колодка/gi, 'модель'],
    [/модели автомобилей/gi, 'серии'], [/автомобиля/gi, 'ребёнка'], [/мост/gi, 'размер'], [/моста/gi, 'размера'],
    [/грузовику/gi, 'ребёнку'], [/грузовика/gi, 'ребёнка'], [/тормозные/gi, '']],
  id: [[/kampas rem/gi, 'pakaian'], [/kampas/gi, 'pakaian'], [/kendaraan/gi, 'seri'], [/axle/gi, 'ukuran'],
    [/truk/gi, 'anak'], [/rem/gi, '']],
  vi: [[/má phanh/gi, 'mẫu'], [/phanh/gi, ''], [/cầu xe/gi, 'size'], [/cầu/gi, 'size'], [/xe/gi, 'bé']],
  th: [[/ผ้าเบรก/gi, 'เสื้อผ้า'], [/เพลา/gi, 'ไซซ์'], [/รุ่นรถ/gi, 'ซีรีส์'], [/รถ/gi, 'เด็ก']],
  tr: [[/balata/gi, 'ürün'], [/aks/gi, 'beden'], [/araç/gi, 'çocuk'], [/kamyon/gi, 'çocuk']]
};

const ORDER = ['zh', 'en', 'es', 'pt', 'ar', 'ru', 'id', 'vi', 'th', 'tr'];
const KEEP_ALL = ['c.close', 'c.copy', 'c.add', 'c.all', 'c.empty', 'top.lang', 'top.offline',
  'm.title', 'm.btn', 'm.auto', 'gate.none', 'gate.choose', 'gate.cust', 'gate.staff',
  'gate.contactType', 'gate.contactValue', 'gate.name', 'gate.company', 'gate.country', 'gate.in', 'gate.logout'];
const KEEP_ZH_EN = Object.keys(OLD).filter(k => !NEW[k] && !KEEP_ALL.includes(k));
/* 术语替换后仍残留汽配痕迹的，直接清空 → 运行时回落英文 */
const BAD = /pastilla|balata|kolodk|camión|caminhão|грузовик|kamyon|truck|camion|الفرامل|فحمات|kampas|má phanh|ผ้าเบรก|เพลา/i; // 旧行业词，命中即回落英文

const K = {};
for (const key of Object.keys(OLD)) {
  const old = OLD[key];
  if (NEW[key]) {
    const [zh, en] = NEW[key];
    const row = [zh, en];
    for (let i = 2; i < ORDER.length; i++) {
      let v = old[i] || '';
      const map = TERMS[ORDER[i]] || [];
      for (const [re, to] of map) v = v.replace(re, to);
      // 替换后出现连续空格或语义残缺的，回落英文
      if (/^\s*$/.test(v) || BAD.test(v) || /{\w+}/.test(old[i] || '') !== /{\w+}/.test(v)) v = '';
      row.push(v.trim());
    }
    K[key] = row;
  } else if (KEEP_ALL.includes(key)) {
    K[key] = old.slice();
  } else {
    // 通用键：中英沿用旧值，其余语言按术语替换
    const row = [old[0], old[1]];
    for (let i = 2; i < ORDER.length; i++) {
      let v = old[i] || '';
      const map = TERMS[ORDER[i]] || [];
      for (const [re, to] of map) v = v.replace(re, to);
      row.push((/^\s*$/.test(v) || BAD.test(v)) ? '' : v.trim());
    }
    K[key] = row;
  }
}

/* ---------- 输出 ---------- */
const LINES = Object.entries(K).map(([k, row]) => {
  const cells = row.map(s => JSON.stringify(s == null ? '' : String(s))).join(', ');
  return `    ${JSON.stringify(k)}: [${cells}],`;
});

const head = fs.readFileSync(path.join(ROOT, 'assets/i18n.js'), 'utf8');
const fromLangs = head.slice(head.indexOf('  const LANGS = ['), head.indexOf('  // 每条：'));
const tail = head.slice(head.indexOf('  let cur = '));

const out = `/* 界面语言包：10 种语言。数组顺序固定，缺项回退英文，再回退中文。
   中文/英文按童装业务重写；其余语言沿用旧译文并按术语替换，长句回落英文。 */
window.I18N = (function () {
  const ORDER = ['zh', 'en', 'es', 'pt', 'ar', 'ru', 'id', 'vi', 'th', 'tr'];

${fromLangs}  // 每条：[zh, en, es, pt, ar, ru, id, vi, th, tr]
  const K = {
${LINES.join('\n')}
  };

${tail}`;

fs.writeFileSync(path.join(ROOT, 'assets/i18n.js'), out, 'utf8');
const stat = { total: Object.keys(K).length, rewritten: Object.keys(NEW).length, fallbackEn: Object.values(K).filter(r => r.slice(2).filter(Boolean).length === 0).length };
console.log('i18n.js 已生成', stat);

