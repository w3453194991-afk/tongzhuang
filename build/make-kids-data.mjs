/* 童装数据生成器：款式系列 / 尺码段 / SKU / 适穿关系 / 质检报告 → assets/data.js + data/db.json
 * 全部为演示数据；产品图片为程序生成的款式图，站内实拍图来自 Burst（免商用）。
 * 运行：node build\make-kids-data.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ---------------- 确定性随机（同一份数据每次生成都一样） ---------------- */
let seed = 20261123;
const rnd = () => {
  seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = a => a[Math.floor(rnd() * a.length)];
const pickN = (a, n) => {
  const c = a.slice(), out = [];
  while (out.length < n && c.length) out.push(c.splice(Math.floor(rnd() * c.length), 1)[0]);
  return out;
};
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const money = (a, b) => Math.round((a + rnd() * (b - a)) * 10) / 10 + 0.9 * 0; // 保留一位小数
const round2 = n => Math.round(n * 100) / 100;

/* ---------------- 品类 ---------------- */
const CATS = [
  { cat: '连衣裙', catEn: 'Dress', slug: 'dr', hs: '6104.42', n: 46, price: [6.8, 19.9], mats: ['CO', 'MD', 'BB'], pats: ['小碎花', '波点', '纯色', '格子', '蕾丝边'], silhou: 'dress' },
  { cat: '卫衣', catEn: 'Sweatshirt', slug: 'sw', hs: '6110.20', n: 40, price: [7.5, 16.9], mats: ['CO', 'FL', 'PC'], pats: ['纯色', '字母', '小熊', '条纹', '星星'], silhou: 'hoodie' },
  { cat: 'T恤', catEn: 'T-Shirt', slug: 'ts', hs: '6109.10', n: 44, price: [3.2, 8.9], mats: ['CO', 'BB', 'MD'], pats: ['纯色', '条纹', '字母', '云朵', '波点'], silhou: 'tee' },
  { cat: '外套', catEn: 'Jacket', slug: 'jk', hs: '6201.40', n: 36, price: [12.8, 29.9], mats: ['PC', 'FL', 'WL'], pats: ['纯色', '格子', '星球', '拼色'], silhou: 'coat' },
  { cat: '裤装', catEn: 'Pants', slug: 'pt', hs: '6203.42', n: 38, price: [5.6, 15.9], mats: ['CO', 'PC', 'MD'], pats: ['纯色', '牛仔', '格子', '条纹'], silhou: 'pants' },
  { cat: '套装', catEn: 'Set', slug: 'st', hs: '6112.11', n: 26, price: [9.9, 24.9], mats: ['CO', 'FL', 'BB'], pats: ['拼色', '条纹', '纯色', '小熊'], silhou: 'set' },
  { cat: '家居服', catEn: 'Loungewear', slug: 'lg', hs: '6108.31', n: 22, price: [6.5, 14.9], mats: ['CO', 'BB', 'FL'], pats: ['星星', '云朵', '格子', '纯色'], silhou: 'lounge' },
  { cat: '连体衣', catEn: 'Bodysuit', slug: 'bd', hs: '6111.20', n: 20, price: [4.9, 11.9], mats: ['CO', 'MD', 'BB'], pats: ['纯色', '小熊', '波点', '条纹'], silhou: 'bodysuit' }
];

/* ---------------- 面料 ---------------- */
const MATERIALS = [
  {
    id: 'CO', name: '精梳纯棉', nameEn: 'Combed Cotton', mu: '180 – 240 g/m²', temp: '40 ℃ 机洗',
    factor: 1, traits: ['亲肤', '吸汗', '不易起球'], fit: '四季基础款、贴身层、婴幼儿 A 类',
    note: '童装基本盘，出口欧美与中东的常规首选'
  },
  {
    id: 'MD', name: '莫代尔', nameEn: 'Modal', mu: '150 – 190 g/m²', temp: '30 ℃ 轻柔',
    factor: 1.18, traits: ['垂顺', '凉感', '柔软'], fit: '夏款、家居服、连体衣',
    note: '手感最好的一档，价格比纯棉高约 18%'
  },
  {
    id: 'FL', name: '摇粒绒', nameEn: 'Polar Fleece', mu: '240 – 320 g/m²', temp: '30 ℃ 轻柔',
    factor: 1.12, traits: ['保暖', '轻', '快干'], fit: '秋冬外套、加绒卫衣、家居服',
    note: '秋冬主推，注意静电与起球指标'
  },
  {
    id: 'PC', name: '涤纶防水布', nameEn: 'Polyester Shell', mu: '110 – 150 g/m²', temp: '30 ℃ 不可漂',
    factor: 1.35, traits: ['防泼水', '防风', '耐磨'], fit: '冲锋衣、外套、户外裤',
    note: '需提供无氟防泼水检测报告'
  },
  {
    id: 'BB', name: '竹节棉', nameEn: 'Bamboo Slub Jersey', mu: '160 – 200 g/m²', temp: '30 ℃ 轻柔',
    factor: 1.08, traits: ['透气', '凉感', '竹节纹理'], fit: '夏季 T 恤、连衣裙、家居服',
    note: '纹理自带高级感，适合设计师款'
  },
  {
    id: 'WL', name: '羊毛混纺', nameEn: 'Wool Blend', mu: '260 – 340 g/m²', temp: '干洗 / 30 ℃ 羊毛档',
    factor: 1.55, traits: ['保暖', '挺括', '高档'], fit: '大衣、外套、礼盒款',
    note: '出口北欧、日韩的高单价线'
  }
];

/* ---------------- 尺码段（14 个，身高段分组） ---------------- */
const axles = [
  { id: 'AX-59', brand: '婴童', model: '59–66', type: '新生儿', cap: '0–3 月', spec: '身高 59–66cm / 体重 4–6kg', alias: ['59码', 'NB', 'newborn', '0-3M'] },
  { id: 'AX-66', brand: '婴童', model: '66–73', type: '婴童', cap: '3–6 月', spec: '身高 66–73cm / 体重 6–8kg', alias: ['66码', '3-6M', '6M'] },
  { id: 'AX-73', brand: '婴童', model: '73–80', type: '婴童', cap: '6–9 月', spec: '身高 73–80cm / 体重 8–10kg', alias: ['73码', '6-9M', '9M'] },
  { id: 'AX-80', brand: '婴童', model: '80–86', type: '婴童', cap: '9–12 月', spec: '身高 80–86cm / 体重 10–11kg', alias: ['80码', '9-12M', '12M'] },
  { id: 'AX-86', brand: '婴童', model: '86–92', type: '婴童', cap: '12–18 月', spec: '身高 86–92cm / 体重 11–12.5kg', alias: ['86码', '12-18M', '18M'] },
  { id: 'AX-92', brand: '婴童', model: '92–98', type: '婴童', cap: '18–24 月', spec: '身高 92–98cm / 体重 12.5–14kg', alias: ['92码', '18-24M', '2T'] },
  { id: 'AX-090', brand: '小童', model: '90', type: '小童', cap: '1–2 岁', spec: '身高 85–95cm / 胸围 52cm', alias: ['90码', '1-2岁', '2T'] },
  { id: 'AX-100', brand: '小童', model: '100', type: '小童', cap: '2–3 岁', spec: '身高 95–105cm / 胸围 54cm', alias: ['100码', '2-3岁', '3T'] },
  { id: 'AX-110', brand: '小童', model: '110', type: '小童', cap: '3–4 岁', spec: '身高 105–115cm / 胸围 58cm', alias: ['110码', '3-4岁', '4T'] },
  { id: 'AX-120', brand: '小童', model: '120', type: '小童', cap: '4–6 岁', spec: '身高 115–125cm / 胸围 62cm', alias: ['120码', '4-6岁', '5T'] },
  { id: 'AX-130', brand: '中童', model: '130', type: '中童', cap: '6–7 岁', spec: '身高 125–135cm / 胸围 66cm', alias: ['130码', '6-7岁', '7T'] },
  { id: 'AX-140', brand: '中童', model: '140', type: '中童', cap: '7–9 岁', spec: '身高 135–145cm / 胸围 70cm', alias: ['140码', '7-9岁', '8T'] },
  { id: 'AX-150', brand: '大童', model: '150', type: '大童', cap: '9–11 岁', spec: '身高 145–155cm / 胸围 76cm', alias: ['150码', '9-11岁', '10T'] },
  { id: 'AX-160', brand: '大童', model: '160', type: '大童', cap: '11–13 岁', spec: '身高 155–165cm / 胸围 82cm', alias: ['160码', '11-13岁', '12T'] }
];
const INFANT = ['AX-59', 'AX-66', 'AX-73', 'AX-80', 'AX-86', 'AX-92'];
const SMALL = ['AX-090', 'AX-100', 'AX-110', 'AX-120'];
const MID = ['AX-110', 'AX-120', 'AX-130', 'AX-140'];
const BIG = ['AX-130', 'AX-140', 'AX-150', 'AX-160'];
const ALL = ['AX-090', 'AX-100', 'AX-110', 'AX-120', 'AX-130', 'AX-140'];

/* ---------------- 款式系列（26 个，品类线 × 系列） ---------------- */
const series = [
  /* 连衣裙 ×4 */
  { id: 'V-DR-01', line: '女童', name: '云朵泡泡', model: '泡泡袖公主裙', modelEn: 'Bubble-sleeve Princess Dress', cat: '连衣裙', season: '2026 春夏', cls: '演出 / 生日', sizes: ALL, alias: ['云朵裙', '泡泡袖', '公主裙', 'cloud dress'], note: '纱裙 + 棉内衬，演出与生日场景的主力款' },
  { id: 'V-DR-02', line: '女童', name: '小满花园', model: '碎花连衣裙', modelEn: 'Floral A-line Dress', cat: '连衣裙', season: '2026 春夏', cls: '日常 / 出街', sizes: SMALL, alias: ['碎花裙', '花园裙', 'floral dress'], note: 'A 字版，遮小肚子，返单率最高' },
  { id: 'V-DR-03', line: '女童', name: '海盐苏打', model: '背心连衣裙', modelEn: 'Pinafore Dress', cat: '连衣裙', season: '2026 春夏', cls: '基础 / 叠穿', sizes: MID, alias: ['背心裙', '吊带裙', 'pinafore'], note: '可内搭 T 或衬衫，一件顶三件' },
  { id: 'V-DR-04', line: '女童', name: '森系棉麻', model: '棉麻长裙', modelEn: 'Linen-blend Long Dress', cat: '连衣裙', season: '2026 夏', cls: '设计师款', sizes: ALL, alias: ['棉麻裙', '长裙', 'linen dress'], note: '低饱和色系，适合精品店与买手店' },

  /* 卫衣 ×4 */
  { id: 'V-SW-01', line: '中性', name: '奶油小方', model: '圆领卫衣', modelEn: 'Crewneck Sweatshirt', cat: '卫衣', season: '2026 秋冬', cls: '基础款', sizes: ALL, alias: ['奶油卫衣', '小方卫衣', 'crewneck', '圆领卫衣'], note: '男女同款，五色基础盘，常年款' },
  { id: 'V-SW-02', line: '中性', name: '小恐龙', model: '连帽卫衣', modelEn: 'Hooded Sweatshirt', cat: '卫衣', season: '2026 秋冬', cls: '图案款', sizes: SMALL, alias: ['恐龙卫衣', '连帽卫衣', 'hoodie', 'dino hoodie'], note: '恐龙绣花 + 立体角，社媒出片率高' },
  { id: 'V-SW-03', line: '女童', name: '跳跳糖', model: '短款卫衣', modelEn: 'Cropped Sweatshirt', cat: '卫衣', season: '2026 秋', cls: '时尚款', sizes: MID, alias: ['短卫衣', '跳跳糖', 'cropped hoodie'], note: '配高腰裤，少女线的主推' },
  { id: 'V-SW-04', line: '中性', name: '小满亲子', model: '亲子卫衣', modelEn: 'Family-match Sweatshirt', cat: '卫衣', season: '2026 秋冬', cls: '亲子 / 礼盒', sizes: ALL, alias: ['亲子装', '母女装', 'family set'], note: '成人码可同款，礼盒装带手提袋' },

  /* T恤 ×4 */
  { id: 'V-TS-01', line: '中性', name: '小满日常', model: '纯棉短袖 T', modelEn: 'Cotton Tee', cat: 'T恤', season: '2026 春夏', cls: '基础款', sizes: ALL, alias: ['白T', '纯棉T', 'basic tee', '短袖'], note: '24 色纯色盘，打底与印花坯布' },
  { id: 'V-TS-02', line: '中性', name: '彩虹条纹', model: '条纹长袖 T', modelEn: 'Striped Long-sleeve Tee', cat: 'T恤', season: '2026 春', cls: '条纹款', sizes: SMALL, alias: ['条纹T', '长袖T', 'striped tee'], note: '横条显瘦，春秋两季都能卖' },
  { id: 'V-TS-03', line: '男童', name: '小足球', model: '运动短袖', modelEn: 'Sport Jersey Tee', cat: 'T恤', season: '2026 夏', cls: '运动款', sizes: MID, alias: ['运动T', '足球服', 'jersey'], note: '速干网眼，幼儿园运动会场景' },
  { id: 'V-TS-04', line: '女童', name: '花花领', model: '花边领 T', modelEn: 'Ruffle-collar Tee', cat: 'T恤', season: '2026 春夏', cls: '甜美款', sizes: SMALL, alias: ['花边T', '洋气T', 'ruffle tee'], note: '领口小荷叶，单穿也好看' },

  /* 外套 ×3 */
  { id: 'V-JK-01', line: '中性', name: '森林熊', model: '摇粒绒外套', modelEn: 'Fleece Jacket', cat: '外套', season: '2026 秋冬', cls: '保暖款', sizes: ALL, alias: ['摇粒绒', '抓绒外套', 'fleece jacket'], note: '秋冬走量款，南北市场通吃' },
  { id: 'V-JK-02', line: '中性', name: '小满出街', model: '冲锋衣', modelEn: 'Shell Jacket', cat: '外套', season: '2026 秋冬', cls: '户外款', sizes: MID, alias: ['冲锋衣', '防水外套', 'shell jacket'], note: '防泼水 5000mm，附检测报告' },
  { id: 'V-JK-03', line: '女童', name: '冬日暖阳', model: '羽绒服', modelEn: 'Down Jacket', cat: '外套', season: '2026 冬', cls: '高单价', sizes: BIG, alias: ['羽绒服', 'down jacket', '面包服'], note: '90 绒，出口北欧与日韩' },

  /* 裤装 ×4 */
  { id: 'V-PT-01', line: '中性', name: '布丁裤', model: '束脚运动裤', modelEn: 'Jogger Pants', cat: '裤装', season: '2026 秋冬', cls: '基础款', sizes: ALL, alias: ['运动裤', '束脚裤', 'joggers'], note: '加宽松紧腰，幼儿园穿脱方便' },
  { id: 'V-PT-02', line: '中性', name: '牛仔星球', model: '背带牛仔裤', modelEn: 'Denim Overalls', cat: '裤装', season: '2026 四季', cls: '经典款', sizes: SMALL, alias: ['背带裤', '牛仔背带', 'overalls'], note: '水洗做旧，耐穿耐洗' },
  { id: 'V-PT-03', line: '男童', name: '小熊口袋', model: '工装长裤', modelEn: 'Cargo Pants', cat: '裤装', season: '2026 秋冬', cls: '工装款', sizes: MID, alias: ['工装裤', 'cargo pants', '长裤'], note: '侧袋 + 立体口袋，男童主推' },
  { id: 'V-PT-04', line: '女童', name: '花边短裤', model: '花边短裤', modelEn: 'Ruffle Shorts', cat: '裤装', season: '2026 夏', cls: '甜美款', sizes: SMALL, alias: ['短裤', '花边短裤', 'shorts'], note: '配同色系 T 卖成套' },

  /* 套装 ×3 */
  { id: 'V-ST-01', line: '中性', name: '校园蓝', model: '衬衫两件套', modelEn: 'Shirt & Trouser Set', cat: '套装', season: '2026 春', cls: '校服 / 演出', sizes: SMALL, alias: ['校服套装', '衬衫套装', 'school set'], note: '开学季与幼儿园面试场景' },
  { id: 'V-ST-02', line: '女童', name: '花仙子', model: '纱裙两件套', modelEn: 'Tulle Dress Set', cat: '套装', season: '2026 春夏', cls: '演出 / 礼盒', sizes: MID, alias: ['纱裙套装', '演出服', 'tulle set'], note: '带发饰，礼盒装可加价' },
  { id: 'V-ST-03', line: '中性', name: '球场小将', model: '运动三件套', modelEn: 'Sport 3-piece Set', cat: '套装', season: '2026 夏', cls: '运动款', sizes: MID, alias: ['运动套装', '三件套', 'sport set'], note: '上衣 + 短裤 + 帽子，团购热门' },

  /* 家居服 ×2 */
  { id: 'V-LG-01', line: '中性', name: '星星睡衣', model: '长袖家居服', modelEn: 'Star Print Pyjamas', cat: '家居服', season: '2026 秋冬', cls: '家居款', sizes: ALL, alias: ['睡衣', '家居服', 'pyjamas'], note: '纯棉针织，越洗越软' },
  { id: 'V-LG-02', line: '女童', name: '竹节棉', model: '短袖套装', modelEn: 'Slub Cotton Set', cat: '家居服', season: '2026 夏', cls: '家居款', sizes: SMALL, alias: ['竹节棉睡衣', '夏季家居服', 'summer pyjamas'], note: '透气不粘身，南方市场夏季主推' },

  /* 连体衣 ×2 */
  { id: 'V-BD-01', line: '婴童', name: '云朵爬服', model: '长袖连体衣', modelEn: 'Long-sleeve Bodysuit', cat: '连体衣', season: '2026 四季', cls: '婴童基础', sizes: INFANT, alias: ['爬服', '连体衣', 'bodysuit', 'onesie'], note: '斜襟 + 按扣，换尿布不脱整件' },
  { id: 'V-BD-02', line: '婴童', name: '小羊咩', model: '加厚哈衣', modelEn: 'Thick Romper', cat: '连体衣', season: '2026 秋冬', cls: '婴童保暖', sizes: INFANT, alias: ['哈衣', '加厚爬服', 'romper'], note: 'A 类婴幼儿，秋冬出生礼首选' }
];

/* ---------------- 颜色 / 图案 ---------------- */
const COLORS = [
  { zh: '奶油白', en: 'Cream', hex: '#F7F2E8' },
  { zh: '燕麦', en: 'Oat', hex: '#EADFCB' },
  { zh: '樱粉', en: 'Cherry Pink', hex: '#F4C9D2' },
  { zh: '雾霾蓝', en: 'Misty Blue', hex: '#BFD3E6' },
  { zh: '鼠尾草绿', en: 'Sage', hex: '#C8D8C3' },
  { zh: '柠檬黄', en: 'Lemon', hex: '#F3E4A0' },
  { zh: '可可棕', en: 'Cocoa', hex: '#B99C85' },
  { zh: '石墨灰', en: 'Graphite', hex: '#C6C4C2' },
  { zh: '珊瑚橘', en: 'Coral', hex: '#F2B6A0' },
  { zh: '薄荷绿', en: 'Mint', hex: '#CFE8DE' }
];
const PAT_EN = { '纯色': 'Solid', '小碎花': 'Floral', '波点': 'Polka-dot', '格子': 'Check', '蕾丝边': 'Lace-trim', '字母': 'Graphic', '小熊': 'Bear', '条纹': 'Striped', '星星': 'Star', '云朵': 'Cloud', '牛仔': 'Denim', '星球': 'Planet', '拼色': 'Colour-block' };
const PATTERN_ID = { '纯色': 'solid', '小碎花': 'floral', '波点': 'dot', '格子': 'check', '蕾丝边': 'lace', '字母': 'letter', '小熊': 'bear', '条纹': 'stripe', '星星': 'star', '云朵': 'cloud', '牛仔': 'denim', '星球': 'planet', '拼色': 'block' };

/* ---------------- SKU 生成 ---------------- */
const products = [];
const byCat = {};
CATS.forEach(c => (byCat[c.cat] = series.filter(s => s.cat === c.cat)));

let pid = 0;
CATS.forEach(c => {
  const pool = byCat[c.cat];
  for (let i = 0; i < c.n; i++) {
    pid++;
    const s = pool[i % pool.length];
    const color = pick(COLORS);
    const pat = pick(c.pats);
    const mat = pick(c.mats);
    const m = MATERIALS.find(x => x.id === mat);
    const sizeRange = s.sizes.map(id => axles.find(a => a.id === id));
    const gsmBase = { CO: 200, MD: 170, FL: 280, PC: 130, BB: 180, WL: 300 }[mat];
    const gsm = gsmBase + int(-2, 2) * 10;
    const priceBase = c.price[0] + (c.price[1] - c.price[0]) * rnd();
    const price = round2(priceBase * m.factor);
    const moq = pick([50, 100, 100, 150, 200]);
    const per = pick(['10 件/袋 · 5 袋/箱', '6 件/袋 · 8 袋/箱', '1 件/挂装 · 60 件/箱', '12 件/袋 · 4 袋/箱']);
    const gw = round2({ CO: 9, MD: 7.5, FL: 11, PC: 8.5, BB: 8, WL: 12 }[mat] * (1 + rnd() * 0.2));
    const cbm = round2({ CO: 0.045, MD: 0.04, FL: 0.06, PC: 0.05, BB: 0.045, WL: 0.055 }[mat] * (1 + rnd() * 0.3));
    const sku = `XM-${c.slug.toUpperCase()}-${2601 + i}`;
    const code = `${c.slug.toUpperCase()}${2601 + i}${String(pid).padStart(3, '0')}`; // 主编号（可被数字检索）
    const sizeText = sizeRange.length > 1
      ? `${sizeRange[0].model.split('–')[0] || sizeRange[0].model}–${sizeRange[sizeRange.length - 1].model.split('–').pop()}cm`
      : `${sizeRange[0].model}cm`;
    const colorPat = pat === '纯色' ? '' : pat;
    const nameZh = `${s.name} ${s.model}｜${color.zh}${colorPat ? colorPat : ''}`;
    const nameEn = `${color.en}${pat === '纯色' ? '' : ' ' + PAT_EN[pat]} ${s.modelEn} — Kids ${sizeText}`;
    const ean = '697' + String(20261123000 + pid * 7).slice(0, 10);
    const customerRef = `${pick(['LC', 'MC', 'KM', 'TS'])}-${2600 + i}${pick(['A', 'B', 'C'])}`;
    const fitNote = pick(['幼儿园日常', '春秋出街', '演出礼盒', '亲子同款', '开学季', '夏季户外', '秋冬保暖']);

    products.push({
      id: 'P' + String(pid).padStart(3, '0'),
      sku,
      code,
      altCodes: [ean, customerRef],
      name: s.modelEn + ' ' + code,
      nameZh,
      nameEn,
      apps: [`${s.name} · ${s.model}`],
      commonVehicles: sizeRange.map(a => a.model),
      cat: c.cat,
      catEn: c.catEn,
      brand: { '女童': 'XIAOMAN MINI', '男童': 'XIAOMAN MINI', '中性': 'XIAOMAN', '婴童': 'XIAOMAN BABY' }[s.line],
      material: mat,
      pos: pick(['标准', '宽松', '宽松', '修身']),
      dim: sizeText,
      holes: gsm,
      dimStatus: '已核尺码表',
      price,
      moq,
      pack: { per, gw, cbm },
      hs: c.hs,
      status: rnd() > 0.12 ? '在售' : '预售',
      img: `assets/img/p/${sku.toLowerCase()}.jpg`,
      desc: descEn(c, s, color, pat, m, gsm, fitNote),
      descZh: `【${s.name}·${s.model}】${color.zh}${colorPat}，${m.name} ${gsm}g/m²，${m.traits.join('、')}。主要穿着场景：${fitNote}。尺码 ${sizeText}，${moq} 件起订，${per}。`,
      url: '',
      specStatus: '已复核',
      appsAll: [`${s.name} · ${s.model}`],
      /* 供图片生成器使用的款式参数 */
      _sil: c.silhou, _hex: color.hex, _pat: PATTERN_ID[pat],
      _series: s.id, _line: s.line, _fit: fitNote, _colorZh: color.zh
    });
  }
});

function descEn(c, s, color, pat, m, gsm, fitNote) {
  const patWord = pat === '纯色' ? 'solid-dye' : PAT_EN[pat].toLowerCase();
  return `${color.en} ${patWord} ${s.modelEn.toLowerCase()} for kids. ${m.nameEn} ${gsm} g/m² — ${m.traits.join(', ')}. Built for ${fitNote.toLowerCase()} and repeated washing: shape and colour stay after 30 cycles. Safety: GB 31701 class ${s.line === '婴童' ? 'A' : 'B'}, OEKO-TEX Standard 100 certified. MOQ and tier pricing on request.`;
}

/* ---------------- 适穿关系（44 条） ---------------- */
const fitments = [];
const FIT_TYPES = ['常规版', '加绒版', '亲子款', '礼盒装'];
const QS = [
  ['孩子现在的身高和体重是多少？按身高选码，比按年龄准。', '水洗标上是 110 还是 4T？两个码表的实际尺寸差 2cm。'],
  ['要加绒版还是常规版？同款两个版本价差 8%。', '这件是秋冬款，确认客户那边的最低气温。'],
  ['是单件还是礼盒装？礼盒装带手提袋和贺卡，单价 +1.2 USD。', '要不要配同色发饰 / 袜子？'],
  ['面料要精梳纯棉还是莫代尔？莫代尔手感更好，单价 +18%。', '客户对甲醛和色牢度有没有指定标准？']
];
let fid = 0;
const seriesOrder = series.slice();
/* 每个系列先保一条主尺码段，再补到 44 条 */
seriesOrder.forEach(s => {
  const axId = s.sizes[Math.min(1, s.sizes.length - 1)];
  const pr = products.find(p => p._series === s.id);
  if (!pr) return;
  fid++;
  const ax = axles.find(a => a.id === axId);
  const qi = (fid - 1) % QS.length;
  fitments.push({
    id: 'F' + String(fid).padStart(3, '0'),
    vid: s.id,
    aid: axId,
    pid: pr.id,
    code: pr.code,
    pos: pr.pos,
    fit: pick(FIT_TYPES.slice(0, 3)),
    conf: pick(['高', '高', '中', '中', '低']),
    src: pick(['款式开发表', '客户返单记录', '质检台账', '业务员现场确认']),
    q: QS[qi].slice(),
    vName: `${s.line} · ${s.name} ${s.model}`,
    aName: `尺码 ${ax.model}（${ax.cap}）`
  });
});
/* 补足到 44 条 */
while (fid < 44) {
  const s = pick(seriesOrder);
  const prs = products.filter(p => p._series === s.id);
  if (!prs.length) continue;
  const pr = pick(prs);
  const axId = pick(s.sizes);
  const key = s.id + '|' + axId;
  if (fitments.some(f => f.vid + '|' + f.aid === key)) continue;
  fid++;
  const ax = axles.find(a => a.id === axId);
  const qi = (fid - 1) % QS.length;
  fitments.push({
    id: 'F' + String(fid).padStart(3, '0'),
    vid: s.id, aid: axId, pid: pr.id, code: pr.code,
    pos: pr.pos,
    fit: pick(FIT_TYPES),
    conf: pick(['高', '中', '中', '低']),
    src: pick(['款式开发表', '客户返单记录', '质检台账', '业务员现场确认']),
    q: QS[qi].slice(),
    vName: `${s.line} · ${s.name} ${s.model}`,
    aName: `尺码 ${ax.model}（${ax.cap}）`
  });
}

/* ---------------- 编号（613 条） ---------------- */
const codes = [];
let xid = 0;
products.forEach(p => {
  const push = (code, type, source, conf, note) => {
    xid++;
    codes.push({ id: 'X' + String(xid).padStart(4, '0'), code, norm: String(code).toUpperCase().replace(/[\s\-_/.]/g, ''), pid: p.id, type, source, conf, note: note || '' });
  };
  push(p.code, '款号', '款式开发表', '高');
  push(p.sku, '内部款号', '系统生成', '高');
  p.altCodes.forEach((c, i) => push(c, i === 0 ? '条码 EAN' : '客户款号', i === 0 ? '商品条码库' : '客户订单', '高'));
  if (rnd() > 0.35) push('OLD-' + p.code, '旧款号', '历史订单', '中', '上季同款');
  if (rnd() > 0.55) push(pick(['MC', 'LC', 'KM']) + '-' + String(p.code).slice(0, 4), '竞品款号', '市场调研', '中', '同系列竞品');
});
/* 补到 613 条：给一部分款加平台款号 */
let guard = 0;
while (codes.length < 613 && guard++ < 2000) {
  const p = pick(products);
  const c = 'PLT-' + p.sku.replace('XM-', '') + '-' + int(10, 99);
  if (codes.some(x => x.code === c)) continue;
  codes.push({ id: 'X' + String(++xid).padStart(4, '0'), code: c, norm: c.replace(/-/g, ''), pid: p.id, type: '平台款号', source: '电商平台', conf: '中', note: '' });
}
const codesFinal = codes.slice(0, 613);

/* ---------------- 质检报告（12 份） ---------------- */
const STDS = [
  ['GB 31701-2015', '甲醛含量', '≤ 20 mg/kg（A 类限值）', '合格'],
  ['GB 31701-2015', 'pH 值', '6.2（4.0–7.5）', '合格'],
  ['GB 31701-2015', '可分解致癌芳香胺染料', '未检出（24 项）', '合格'],
  ['GB 31701-2015', '绳带与附件安全', '无绳带外露，附件抗拉 92N', '合格'],
  ['GB 18401-2010', '耐皂洗色牢度', '4–5 级', '合格'],
  ['GB 18401-2010', '耐摩擦色牢度（干/湿）', '4 / 3–4 级', '合格'],
  ['GB/T 4802.1', '起球（圆轨迹法）', '3–4 级', '合格'],
  ['GB/T 8628', '水洗尺寸变化率', '经向 -2.1% / 纬向 -1.8%', '合格'],
  ['OEKO-TEX 100', '有害物质全套', '附录 4 / 婴幼儿级', '合格'],
  ['GB 31701-2015', '重金属（铅、镉）', '未检出', '合格'],
  ['GB/T 3921', '耐汗渍色牢度', '4 级', '合格'],
  ['GB 5296.4', '使用说明（标识）', '吊牌与洗唛内容齐全', '合格']
];
const tests = STDS.map((s, i) => {
  const p = products[(i * 23) % products.length];
  return {
    id: 'T' + String(i + 1).padStart(3, '0'),
    pid: p.id,
    code: p.code,
    pname: `${p.code} · ${p.catEn}`,
    std: s[0],
    item: s[1],
    result: s[2],
    verdict: s[3],
    lab: pick(['国家纺织制品质量监督检验中心', 'SGS 上海纺织品实验室', 'Intertek 杭州实验室', '浙江省轻工业品质量检验研究院']),
    no: `${s[0].split(' ')[0].replace(/[^A-Z0-9]/g, '')}-2026-${String(1200 + i * 37).slice(0, 4)}`,
    date: `2026-0${int(1, 9)}-${String(int(10, 28))}`
  };
});

/* ---------------- 客户 / 线索 / 规则 / 模板 ---------------- */
const customers = [
  { id: 'C-001', name: 'Little Closet Trading LLC', country: '阿联酋', region: '中东', type: '经销商', tz: 'Asia/Dubai', grade: 'A', brand: 'XIAOMAN', priceLevel: '标准', incoterm: 'CIF Jebel Ali', pay: 'T/T 30% 定金', last: '2026-10-18', note: '迪拜母婴连锁 6 家门店，偏好奶油色系与礼盒装' },
  { id: 'C-002', name: 'Bebé Moda S.A. de C.V.', country: '墨西哥', region: '拉美', type: '经销商', tz: 'America/Mexico_City', grade: 'B', brand: 'XIAOMAN MINI', priceLevel: '经济', incoterm: 'FOB Ningbo', pay: 'T/T 30% 定金', last: '2026-09-02', note: '主营 2–8 岁女童，碎花裙与纱裙返单稳定' },
  { id: 'C-003', name: 'ООО Радуга Детства', country: '俄罗斯', region: '独联体', type: '批发商', tz: 'Europe/Moscow', grade: 'A', brand: 'XIAOMAN', priceLevel: '标准', incoterm: 'CIF St. Petersburg', pay: 'T/T 50% 见提单', last: '2026-10-30', note: '秋冬摇粒绒与羽绒服为主，要求 GRS 与羊毛成分证明' },
  { id: 'C-004', name: 'PT Balita Ceria', country: '印度尼西亚', region: '东南亚', type: '电商', tz: 'Asia/Jakarta', grade: 'B', brand: 'XIAOMAN BABY', priceLevel: '经济', incoterm: 'FOB Ningbo', pay: 'T/T 30% 定金', last: '2026-08-21', note: 'Shopee / TikTok Shop 自营，客单低但月均 8000 件' },
  { id: 'C-005', name: 'Çocuk Dünyası Ltd.', country: '土耳其', region: '中东欧', type: '买手店', tz: 'Europe/Istanbul', grade: 'A', brand: 'XIAOMAN MINI', priceLevel: '标准', incoterm: 'FCA Istanbul', pay: 'T/T 30% 定金', last: '2026-09-27', note: '伊斯坦布尔 3 家买手店，设计师款占比 60%' },
  { id: 'C-006', name: 'Kidswear Hub Ltd.', country: '英国', region: '欧洲', type: '进口商', tz: 'Europe/London', grade: 'A', brand: 'XIAOMAN', priceLevel: '标准', incoterm: 'FOB Ningbo', pay: 'L/C 60 天', last: '2026-10-05', note: '要求 OEKO-TEX 与 BSCI，走百货渠道' },
  { id: 'C-007', name: 'Loja Pingo Doce Kids', country: '巴西', region: '拉美', type: '经销商', tz: 'America/Sao_Paulo', grade: 'C', brand: 'XIAOMAN', priceLevel: '经济', incoterm: 'CIF Santos', pay: 'T/T 30% 定金', last: '2026-07-14', note: '价格敏感，偏好纯棉基础款' },
  { id: 'C-008', name: '杭州糖果星球母婴连锁', country: '中国', region: '国内', type: '母婴连锁', tz: 'Asia/Shanghai', grade: 'B', brand: 'XIAOMAN', priceLevel: '标准', incoterm: '送货上门', pay: '月结 30 天', last: '2026-11-12', note: '华东 24 家门店，秋冬摇粒绒与家居服走量' }
];

const leads = [
  { id: 'L-2601', created: '2026-11-21 08:12', src: '官网表单', company: 'Transportes y Moda Infantil del Norte', contact: 'Jorge Ramírez（采购经理）', country: '墨西哥', tz: 'America/Mexico_City', need: 'Buenos días, buscamos vestidos de niña talla 2-8 años, 600 piezas, algodón 100%. ¿Precio FOB y tiempo de entrega?', needZh: '童装连衣裙 2–8 岁 600 件，100% 棉，问 FOB 价和交期', status: '待跟进', score: 91, owner: 'Sophia', next: '回尺码表 + 阶梯价', nextDate: '2026-11-21', product: ['P003'], note: '官网留言，含明确品类、尺码段、数量，属终端零售采购' },
  { id: 'L-2602', created: '2026-11-21 10:45', src: 'WhatsApp', company: 'Bebé Moda S.A. de C.V.', contact: 'Ana López', country: '墨西哥', tz: 'America/Mexico_City', need: 'Necesitamos reposición de vestidos floreados 110-130, 300 pzas. Mismo color que el pedido anterior.', needZh: '碎花连衣裙 110–130 返单 300 件，同上次颜色', status: '已报价', score: 95, owner: 'Sophia', next: '跟进押金', nextDate: '2026-11-24', product: ['P002'], note: '老客户返单，价格敏感度低' },
  { id: 'L-2603', created: '2026-11-20 22:03', src: 'TikTok 私信', company: '—', contact: 'melisa.kids（账号）', country: '土耳其', tz: 'Europe/Istanbul', need: 'Merhaba, 5-6 yaş kız çocuk için elbise arıyorum, toptan fiyat nedir? 100 adet.', needZh: '5–6 岁女童连衣裙，100 件，问批发价', status: '待跟进', score: 62, owner: 'Mehmet', next: '先发目录 + 起订量说明', nextDate: '2026-11-22', product: [], note: '社媒私信，未给公司信息，需先判断是否贸易商' },
  { id: 'L-2604', created: '2026-11-20 16:30', src: '展会名片', company: 'ООО Радуга Детства', contact: 'Irina Volkova', country: '俄罗斯', tz: 'Europe/Moscow', need: 'Нужны флисовые куртки и пуховики, размеры 130-160, 1200 шт. Сертификат OEKO-TEX обязателен.', needZh: '摇粒绒外套与羽绒服 130–160，1200 件，必须 OEKO-TEX', status: '跟进中', score: 88, owner: 'Alex', next: '寄样衣 + 认证文件', nextDate: '2026-11-26', product: ['P057'], note: 'CIS 大客户，秋冬主推，认证是硬门槛' },
  { id: 'L-2605', created: '2026-11-19 09:12', src: '阿里国际站', company: 'Kidswear Hub Ltd.', contact: 'James Clark', country: '英国', tz: 'Europe/London', need: 'Looking for 100% cotton bodysuits, 0-24 months, 3000 pcs, need BSCI audit report and OEKO-TEX.', needZh: '婴幼儿纯棉连体衣 0–24 月 3000 件，要 BSCI 与 OEKO-TEX', status: '跟进中', score: 93, owner: 'Sophia', next: '发 BSCI 报告 + 报价', nextDate: '2026-11-23', product: ['P255'], note: '英国百货渠道，量大但要求文件齐全' },
  { id: 'L-2606', created: '2026-11-18 14:20', src: '官网表单', company: 'PT Balita Ceria', contact: 'Dewi Santoso', country: '印度尼西亚', tz: 'Asia/Jakarta', need: 'Mau tanya harga bodysuit baby 50 pcs dulu, bisa kirim ke Jakarta?', needZh: '连体衣 50 件试单，能否发雅加达', status: '待跟进', score: 55, owner: 'Alex', next: '报试单价（含运费）', nextDate: '2026-11-22', product: ['P258'], note: '试单量小，先培养' },
  { id: 'L-2607', created: '2026-11-17 11:02', src: '微信', company: '杭州糖果星球母婴连锁', contact: '王店长', country: '中国', tz: 'Asia/Shanghai', need: '秋冬摇粒绒外套 120–150 要 800 件，下周三前要到杭州仓，能做到吗？', needZh: '摇粒绒外套 120–150 800 件，下周三前到杭州仓', status: '已成交', score: 97, owner: '小林', next: '安排发货', nextDate: '2026-11-20', product: ['P057'], note: '国内连锁，交期紧但付款好' },
  { id: 'L-2608', created: '2026-11-16 19:41', src: '邮件', company: 'Loja Pingo Doce Kids', contact: 'Marcos Silva', country: '巴西', tz: 'America/Sao_Paulo', need: 'Precisamos de camisetas básicas infantis, tamanhos 90-140, 2000 peças. Qual o melhor preço?', needZh: '基础款儿童 T 恤 90–140 2000 件，问最优惠价', status: '待跟进', score: 74, owner: 'Mehmet', next: '给 2000 件阶梯价', nextDate: '2026-11-24', product: ['P101'], note: '价格敏感，需核算海运到桑托斯' }
];

const scoreRules = [
  { k: 'terminal', w: 18, label: '终端属性', desc: '母婴连锁 / 买手店 / 电商自营 = 加分；名称含 Trading / Import & Export = 减分' },
  { k: 'spec', w: 16, label: '需求具体度', desc: '给了品类 + 尺码段 + 数量 = 高分；只说「要童装」= 低分' },
  { k: 'volume', w: 12, label: '数量与频次', desc: '单款 300 件以上、月度返单、有历史返单记录' },
  { k: 'reach', w: 10, label: '可触达性', desc: '有实名联系人 / 公司域名邮箱 / 门店地址' },
  { k: 'fit', w: 10, label: '款式匹配度', desc: '需求款在我方在售且面料库存充足' },
  { k: 'market', w: 8, label: '市场价值', desc: '历史成交价、认证门槛（OEKO-TEX / BSCI）、竞争强度' }
];

const templates = [
  {
    id: 'T-SIZE', name: '尺码消歧（3 问定码）', lang: '中文 / EN',
    body: `Hi {{contact}},

Thanks for your interest in {{series}}. To ship the right size the first time, please confirm ONE of the following — any single one is enough:

1) The child's height and weight (we size by height, not by age);
2) The size printed on the care label of a garment that fits (e.g. 110 / 4T);
3) A photo of the child standing next to a wall with a tape measure.

{{series}} runs {{sizeCount}} sizes in our size chart, and the same age can span two sizes, so age alone cannot lock it. Once confirmed, we send the size chart, fabric swatch options and tier price within 2 hours.

Best regards,
{{owner}} | XIAOMAN KIDS`
  },
  {
    id: 'T-QUOTE', name: '报价跟进（含资料包）', lang: 'EN',
    body: `Dear {{contact}},

Attached is our quotation for {{items}} (valid 30 days), together with:
• Size chart & measurement sheet
• Fabric composition and OEKO-TEX / GB 31701 test report
• Packing and container loading data

Key points: {{keyPoints}}

If the size range or the fabric weight is different from what we assumed, tell us and we will re-quote within 2 hours.

{{owner}} | XIAOMAN KIDS`
  },
  {
    id: 'T-NOSPEC', name: '客户说不清款式时的兜底', lang: '中文',
    body: `您好 {{contact}}，

不用给款号也能定：给我 3 张图就行——① 孩子现在穿的同类衣服平铺照 ② 水洗标特写（有尺码和成分）③ 想要的风格参考图（小红书/Ins 截图都可以）。

我们库里有 {{skuCount}} 个款、{{fitCount}} 条「款式系列 × 尺码段」适穿记录，图回来 2 小时内给款号、面料和价格。

{{owner}} | 小满童装`
  }
];

/* ---------------- 统计与元信息 ---------------- */
const catCount = {};
products.forEach(p => (catCount[p.cat] = (catCount[p.cat] || 0) + 1));
const confCount = {};
fitments.forEach(f => (confCount[f.conf] = (confCount[f.conf] || 0) + 1));
const withVehicle = new Set(fitments.map(f => f.pid)).size;

const DB = {
  meta: {
    version: '2.0.0',
    name: '小满童装 · 选款与报价中台',
    subtitle: '款式 / 尺码 / 款号 → 童装 SKU → 报价与资料包',
    built: '2026-11-23',
    company: {
      name: '湖州小满童装有限公司',
      nameEn: 'HUZHOU XIAOMAN KIDS APPAREL CO., LTD.',
      brand: 'XIAOMAN KIDS / 小满童装',
      founded: 2016,
      site: '浙江湖州 · 织里童装产业园',
      capacity: '年产童装 420 万件，自有打版与数码印花车间',
      staff: '120+ 人（设计 18 人，外贸 12 人）',
      markets: '东南亚、中东、拉美、独联体、欧洲等 30 多个国家和地区',
      certs: ['GB 31701-2015（A/B 类）', 'GB 18401-2010', 'OEKO-TEX Standard 100', 'BSCI 验厂', 'GRS 再生涤纶（部分款）'],
      web: 'https://www.xiaomankids.com'
    },
    notices: [
      '产品款号、尺码、价格、MOQ 为演示数据，接入真实商品表后一键覆盖。',
      '「款式系列 × 尺码段」适穿关系为示例数据，凡 conf 非「已确认」的条目，对大货报价前须由版房复核。',
      '产品图为程序生成的款式示意；站内实拍图来自 Burst（Shopify 免费商用图库，免署名）。'
    ]
  },
  stats: {
    products: products.length,
    codes: codesFinal.length,
    vehicles: series.length,
    axles: axles.length,
    fitments: fitments.length,
    tests: tests.length,
    materials: MATERIALS.length,
    images: products.length,
    withVehicle,
    cats: CATS.map(c => ({ cat: c.cat, n: catCount[c.cat] || 0 })),
    conf: [['已确认', 0], ['高', confCount['高'] || 0], ['中', confCount['中'] || 0], ['低', confCount['低'] || 0]].map(([c, n]) => ({ c, n }))
  },
  materials: MATERIALS,
  brands: [
    { id: 'XIAOMAN', name: 'XIAOMAN 小满', desc: '主牌，2–12 岁基础与时尚线，出口与国内同款' },
    { id: 'XIAOMAN BABY', name: 'XIAOMAN BABY', desc: '0–3 岁婴幼儿线，全 A 类，连体衣与和尚服为主' },
    { id: 'XIAOMAN MINI', name: 'XIAOMAN MINI', desc: '小童线，女童裙装与男童工装占七成' },
    { id: 'XIAOMAN SPORT', name: 'XIAOMAN SPORT', desc: '运动与户外线，速干、防泼水、团购套装' },
    { id: 'XIAOMAN OEM', name: 'XIAOMAN OEM', desc: '贴牌代工线，可换标换吊牌，起订量 500 件' }
  ],
  currency: { base: 'USD', rates: { USD: 1, CNY: 7.15, EUR: 0.92, AED: 3.6725, SAR: 3.75, RUB: 92 } },
  products: products.map(({ _sil, _hex, _pat, _series, _line, _fit, _colorZh, ...rest }) => rest),
  codes: codesFinal,
  vehicles: series.map(s => ({
    id: s.id,
    brand: s.line,
    series: s.name,
    model: s.model,
    years: s.season,
    alias: s.alias,
    cls: s.cls,
    axles: s.sizes,
    note: s.note,
    fitCount: fitments.filter(f => f.vid === s.id).length,
    skus: products.filter(p => p._series === s.id).map(p => p.code).slice(0, 4)
  })),
  axles,
  fitments,
  tests,
  customers,
  leads,
  scoreRules,
  templates
};

/* ---------------- 输出 ---------------- */
const js = `/* 由 build/make-kids-data.mjs 生成，请勿手改；改数据请改生成器后重跑。\n   ${DB.meta.name} · v${DB.meta.version} · ${DB.meta.built}\n   款式系列 ${DB.stats.vehicles} · 尺码段 ${DB.stats.axles} · SKU ${DB.stats.products} · 编号 ${DB.stats.codes} · 适穿 ${DB.stats.fitments} */\nwindow.DB = ${JSON.stringify(DB, null, 1)};\n`;
fs.writeFileSync(path.join(ROOT, 'assets/data.js'), js, 'utf8');
fs.writeFileSync(path.join(ROOT, 'data/db.json'), JSON.stringify(DB, null, 1), 'utf8');

/* 供图片生成器读取的款式参数（不入站内运行时） */
const imgSpec = products.map(p => ({ id: p.id, sku: p.sku, cat: p.cat, sil: p._sil, hex: p._hex, pat: p._pat, line: p._line, colorZh: p._colorZh, name: p.nameZh }));
fs.writeFileSync(path.join(ROOT, 'build/kids-image-spec.json'), JSON.stringify(imgSpec, null, 1), 'utf8');

console.log(`data.js / db.json 已生成`);
console.log(`  SKU ${DB.stats.products} · 编号 ${DB.stats.codes} · 款式系列 ${DB.stats.vehicles} · 尺码段 ${DB.stats.axles} · 适穿 ${DB.stats.fitments} · 质检 ${DB.stats.tests}`);
console.log(`  品类：${DB.stats.cats.map(c => c.cat + ' ' + c.n).join(' / ')}`);
console.log(`  置信度：${DB.stats.conf.map(c => c.c + ' ' + c.n).join(' / ')} · 有适穿记录 ${DB.stats.withVehicle} 款`);
