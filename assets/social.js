/* 社媒画像 / 关系网 / 热门视频 / 聊天消息（演示数据，接平台 API 后实时化） */
window.SOCIAL = (function () {
  const communities = [
    { id: 'latam', name: '拉美', color: '#c2410c', langs: 'ES / PT' },
    { id: 'me', name: '中东', color: '#0f766e', langs: 'AR / EN' },
    { id: 'sea', name: '东南亚', color: '#1d4ed8', langs: 'ID / VI / EN' },
    { id: 'afr', name: '非洲', color: '#7c3aed', langs: 'EN / FR' },
    { id: 'eur', name: '欧亚', color: '#b45309', langs: 'TR / RU / EN' }
  ];

  const personas = [
    { id: 'A01', handle: '@mundoinfantil', name: 'Mundo Infantil', platform: 'TikTok', country: '墨西哥', lang: 'ES', type: '童装买手店', community: 'latam', followers: 128000, following: 412, posts: 860, engage: 6.8, tags: ['DR2601001', '连衣裙'], intent: 88, note: '视频里常拍女童连衣裙上身，评论区大量问「110 还是 120」', action: '寄样 + 定制「身高→尺码」对照卡' },
    { id: 'A02', handle: '@boutiqueluna', name: 'Boutique Luna', platform: 'YouTube', country: '墨西哥', lang: 'ES', type: '童装买手店', community: 'latam', followers: 46000, following: 220, posts: 340, engage: 4.2, tags: ['SW2601047', '卫衣'], intent: 74, note: '长视频讲面料起球与掉色，粉丝以妈妈为主', action: '用质检报告做背书，置换口播' },
    { id: 'A03', handle: '@maecompras_br', name: 'Mãe Compras BR', platform: 'TikTok', country: '巴西', lang: 'PT', type: '宝妈 KOL', community: 'latam', followers: 310000, following: 180, posts: 1240, engage: 9.1, tags: ['TS2601087', 'T恤'], intent: 61, note: '纯妈妈视角，关注耐洗与价格，不关心克重参数', action: '按「30 次水洗后对比」做视频' },
    { id: 'A04', handle: '@grupoinfantil', name: 'Grupo Infantil Ltda', platform: 'Instagram', country: '巴西', lang: 'PT', type: '母婴连锁', community: 'latam', followers: 8400, following: 610, posts: 190, engage: 3.1, tags: ['BD2601253', '连体衣'], intent: 82, note: '自有 26 家母婴店，采购在评论区出现过', action: '直接私信采购，发起订量与阶梯价' },
    { id: 'A05', handle: '@andina_kids', name: 'Andina Kids', platform: 'Instagram', country: '智利', lang: 'ES', type: '经销商', community: 'latam', followers: 15600, following: 380, posts: 420, engage: 4.7, tags: ['DR2602002', '连衣裙'], intent: 79, note: '已成交客户 Comercial Andina 的关联账号', action: '让其做本地案例，给二级分销价' },
    { id: 'A06', handle: '@criancafelic', name: 'Criança Feliz', platform: 'Facebook', country: '秘鲁', lang: 'ES', type: '母婴连锁', community: 'latam', followers: 22000, following: 540, posts: 610, engage: 5.3, tags: ['PT2601167', '裤装'], intent: 76, note: '18 家门店，需要小批量多款色', action: '推拼柜方案 + 门店选款二维码' },
    { id: 'A07', handle: '@alrashid_kids', name: 'Al-Rashid Kids', platform: 'Instagram', country: '阿联酋', lang: 'AR', type: '经销商', community: 'me', followers: 23400, following: 290, posts: 520, engage: 3.9, tags: ['JK2601131', '外套'], intent: 85, note: '迪拜母婴城门店，女童连衣裙与外套为主', action: '新品先发，CIF Jebel Ali 报价' },
    { id: 'A08', handle: '@shanab_baby', name: 'Shanab Baby', platform: 'TikTok', country: '沙特阿拉伯', lang: 'AR', type: '母婴店', community: 'me', followers: 88000, following: 130, posts: 950, engage: 7.4, tags: ['SW2602048', '卫衣'], intent: 71, note: '短视频现场开箱，评论区问「哪个码、会不会起球」', action: '给「拍水洗标定位法」卡片，做置顶评论' },
    { id: 'A09', handle: '@sahararetail', name: 'Sahara Retail Group', platform: 'LinkedIn', country: '沙特阿拉伯', lang: 'EN', type: '母婴连锁', community: 'me', followers: 5200, following: 780, posts: 120, engage: 2.4, tags: ['ST2601205', '套装'], intent: 80, note: '采购经理，关注起订量、交付周期与退货率', action: '发起订量测算表与年度框架协议' },
    { id: 'A10', handle: '@tokobajuanak', name: 'Toko Baju Anak', platform: 'TikTok', country: '印度尼西亚', lang: 'ID', type: '童装店', community: 'sea', followers: 54000, following: 310, posts: 700, engage: 8.2, tags: ['TS2603089', 'T恤'], intent: 68, note: '本土童装为主，价格极敏感', action: '基础线 + 小包装试销' },
    { id: 'A11', handle: '@sinarjaya_kids', name: 'PT Sinar Jaya Kids', platform: 'Facebook', country: '印度尼西亚', lang: 'ID', type: '批发商', community: 'sea', followers: 12700, following: 460, posts: 380, engage: 3.6, tags: ['DR2603003', '连衣裙'], intent: 73, note: '已成交客户，关注交期与尺码表是否齐全', action: '锁定 30 天交期承诺' },
    { id: 'A12', handle: '@shopquanaoem', name: 'Shop Quần Áo Em', platform: 'TikTok', country: '越南', lang: 'VI', type: '童装店', community: 'sea', followers: 73000, following: 240, posts: 810, engage: 6.1, tags: ['SW2603049', '卫衣'], intent: 66, note: '中国童装为主，视频拍开箱与车缝线', action: '寄 3 个爆款做开箱视频' },
    { id: 'A13', handle: '@mekongkidswear', name: 'Mekong Kidswear', platform: 'Facebook', country: '越南', lang: 'VI', type: '贸易商', community: 'sea', followers: 4900, following: 1200, posts: 260, engage: 1.8, tags: [], intent: 34, note: '只问价格，无终端地址', action: '只发目录，不投设计资源' },
    { id: 'A14', handle: '@lagoskids', name: 'Lagos Kids Hub', platform: 'TikTok', country: '尼日利亚', lang: 'EN', type: '童装市场档口', community: 'afr', followers: 41000, following: 620, posts: 540, engage: 5.9, tags: ['ST2603207', '套装'], intent: 58, note: '拉各斯童装市场，现金采购，先看现货', action: '小批量现货 + 西非港口报价' },
    { id: 'A15', handle: '@cocukgiyim_tr', name: 'Çocuk Giyim TR', platform: 'Instagram', country: '土耳其', lang: 'TR', type: '经销商', community: 'eur', followers: 18900, following: 340, posts: 460, engage: 4.4, tags: ['JK2602132', '外套'], intent: 70, note: '辐射东欧与中亚，要求 OEKO-TEX 100', action: '主推有 OEKO-TEX 的款' },
    { id: 'A16', handle: '@jorge.ramirez', name: 'Jorge Ramírez', platform: 'LinkedIn', country: '墨西哥', lang: 'ES', type: '采购经理', community: 'latam', followers: 1800, following: 940, posts: 42, engage: 1.2, tags: ['DR2605005', '连衣裙'], intent: 91, note: 'Grupo Infantil del Norte 采购，26 家门店', action: '决策人：直接约视频会议 + 样衣' },
    { id: 'A17', handle: '@xiaomankids', name: 'XIAOMAN KIDS 官方', platform: 'TikTok', country: '中国', lang: 'EN', type: '品牌号', community: 'brand', followers: 12600, following: 180, posts: 210, engage: 2.9, tags: [], intent: 100, note: '自有账号，内容以工厂、质检与新款为主', action: '周更 3 条：选款 / 质检 / 装柜' }
  ];

  // from 关注 to（谁关注谁）
  const edges = [
    ['A01', 'A17'], ['A02', 'A17'], ['A03', 'A17'], ['A04', 'A17'], ['A05', 'A17'], ['A06', 'A17'],
    ['A07', 'A17'], ['A08', 'A17'], ['A09', 'A17'], ['A10', 'A17'], ['A11', 'A17'], ['A12', 'A17'],
    ['A14', 'A17'], ['A15', 'A17'], ['A16', 'A17'],
    ['A01', 'A02'], ['A02', 'A01'], ['A03', 'A04'], ['A04', 'A03'], ['A05', 'A06'], ['A06', 'A05'],
    ['A07', 'A08'], ['A08', 'A07'], ['A09', 'A07'], ['A10', 'A11'], ['A11', 'A10'], ['A12', 'A13'],
    ['A16', 'A01'], ['A16', 'A05'], ['A03', 'A01'], ['A14', 'A10'], ['A15', 'A07']
  ];

  const videos = [
    { id: 'V1', platform: 'TikTok', lang: 'ES', country: '墨西哥', title: '「Mismo vestido, 3 tallas distintas」probando 90 / 110 / 130', views: 1840000, likes: 96000, comments: 3100, model: 'DR2601001', angle: '同款不同尺码段的坑', trend: '+182%' },
    { id: 'V2', platform: 'TikTok', lang: 'PT', country: '巴西', title: 'Vestido infantil barato: quantas lavagens ele aguenta?', views: 960000, likes: 54000, comments: 1800, model: 'DR2602002', angle: '30 次水洗后对比', trend: '+120%' },
    { id: 'V3', platform: 'Instagram', lang: 'AR', country: '沙特', title: 'فساتين أطفال: الفرق بين القطن والبوليستر بعد ٢٠ غسلة', views: 720000, likes: 41000, comments: 2200, model: 'DR2605005', angle: '纯棉 vs 涤纶 20 次水洗', trend: '+95%' },
    { id: 'V4', platform: 'YouTube', lang: 'EN', country: '尼日利亚', title: 'How to read a kids size label without a size chart', views: 410000, likes: 18000, comments: 900, model: 'SW2601047', angle: '没有尺码表怎么认码', trend: '+64%' },
    { id: 'V5', platform: 'TikTok', lang: 'ID', country: '印度尼西亚', title: 'Baju anak 110 atau 120? Ini cara ukurnya', views: 380000, likes: 24000, comments: 1400, model: 'TS2601087', angle: '买错一码要退多少', trend: '+51%' },
    { id: 'V6', platform: 'TikTok', lang: 'VI', country: '越南', title: 'Mở hộp áo hoodie bé — nhìn đường may là biết hàng', views: 260000, likes: 15000, comments: 760, model: 'SW2602048', angle: '开箱看车缝线', trend: '+43%' },
    { id: 'V7', platform: 'Instagram', lang: 'ES', country: '智利', title: 'Vestido de niña talla 4T: el largo que nadie mide', views: 190000, likes: 9800, comments: 410, model: 'DR2603003', angle: '裙长与身高对照', trend: '+38%' },
    { id: 'V8', platform: 'TikTok', lang: 'TR', country: '土耳其', title: 'Aynı model, farklı beden: 2T mi 4T mi?', views: 155000, likes: 8200, comments: 380, model: 'SW2603049', angle: '同款不同码', trend: '+29%' },
    { id: 'V9', platform: 'YouTube', lang: 'ES', country: '秘鲁', title: 'Cómo leer la etiqueta de talla de ropa infantil', views: 132000, likes: 6400, comments: 290, model: 'TS2602088', angle: '教看水洗标尺码', trend: '+24%' },
    { id: 'V10', platform: 'Facebook', lang: 'AR', country: '阿联酋', title: 'أول غسلة لملابس الأطفال: هل يتقلص القماش؟', views: 98000, likes: 5200, comments: 310, model: 'JK2601131', angle: '首次水洗缩水实测', trend: '+18%' },
    { id: 'V11', platform: 'TikTok', lang: 'EN', country: '肯尼亚', title: 'Why kids tees pill after two washes', views: 87000, likes: 4900, comments: 240, model: 'TS2603089', angle: '起球原因拆解', trend: '+15%' },
    { id: 'V12', platform: 'Instagram', lang: 'PT', country: '巴西', title: 'Antes de comprar: foto + fita métrica = tamanho certo', views: 76000, likes: 4100, comments: 180, model: 'PT2601167', angle: '拍照+软尺定位法', trend: '+12%' }
  ];

  // 真实内容互动（演示数据）：同一个款被不同市场的账号拍过，点赞量决定款式热度排序
  const posts = [
    { id: 'P01', platform: 'TikTok', lang: 'ES', country: '墨西哥', author: '@mundoinfantil', vid: 'V-DR-01', code: 'DR2601001', title: 'Vestido 110: el largo que nadie mide y por eso se devuelve', likes: 42800, comments: 1860, shares: 940, date: '2026-11-14' },
    { id: 'P02', platform: 'TikTok', lang: 'ES', country: '墨西哥', author: '@boutiqueluna', vid: 'V-DR-01', code: 'DR2605005', title: '¿Por qué el tul se pone gris después de 5 lavadas?', likes: 18300, comments: 720, shares: 410, date: '2026-11-09' },
    { id: 'P03', platform: 'Facebook', lang: 'VI', country: '越南', author: '@shopquanaoem', vid: 'V-DR-01', code: 'DR2609009', title: 'Mở hộp váy công chúa — nhìn đường may là biết hàng', likes: 6540, comments: 268, shares: 150, date: '2026-11-16' },
    { id: 'P04', platform: 'TikTok', lang: 'ES', country: '智利', author: '@andina_kids', vid: 'V-DR-02', code: 'DR2602002', title: 'Talla 130: la cintura que aprieta y nadie revisa', likes: 9820, comments: 341, shares: 190, date: '2026-11-11' },
    { id: 'P05', platform: 'TikTok', lang: 'ES', country: '墨西哥', author: '@mundoinfantil', vid: 'V-DR-02', code: 'DR2610010', title: 'Tres vestidos, tres tallas: 90 / 110 / 130', likes: 31400, comments: 1460, shares: 880, date: '2026-11-13' },
    { id: 'P06', platform: 'Instagram', lang: 'ES', country: '秘鲁', author: '@criancafelic', vid: 'V-DR-02', code: 'DR2606006', title: 'Antes de comprar: foto + cinta métrica = talla correcta', likes: 12600, comments: 430, shares: 210, date: '2026-11-07' },
    { id: 'P07', platform: 'TikTok', lang: 'ES', country: '智利', author: '@andina_kids', vid: 'V-DR-03', code: 'DR2603003', title: '¿4T y 110 son lo mismo? No exactamente', likes: 7410, comments: 296, shares: 132, date: '2026-11-15' },
    { id: 'P08', platform: 'TikTok', lang: 'ES', country: '哥伦比亚', author: '@modainfantil_co', vid: 'V-DR-03', code: 'DR2611011', title: 'Vestido de tirantes: de 2T a 12Y, misma tela', likes: 5230, comments: 187, shares: 96, date: '2026-11-05' },
    { id: 'P09', platform: 'TikTok', lang: 'ES', country: '墨西哥', author: '@mundoinfantil', vid: 'V-DR-04', code: 'DR2604004', title: 'Lino: ¿se encoge en la primera lavada?', likes: 22400, comments: 1020, shares: 610, date: '2026-11-12' },
    { id: 'P10', platform: 'Facebook', lang: 'ES', country: '秘鲁', author: '@criancafelic', vid: 'V-DR-04', code: 'DR2608008', title: '¿Cuánto dura realmente un vestido de lino?', likes: 8120, comments: 305, shares: 144, date: '2026-11-06' },
    { id: 'P11', platform: 'TikTok', lang: 'ES', country: '墨西哥', author: '@boutiqueluna', vid: 'V-SW-01', code: 'SW2601047', title: 'Sudadera 110: el puño que no da de sí', likes: 4310, comments: 165, shares: 78, date: '2026-11-10' },
    { id: 'P12', platform: 'Facebook', lang: 'ES', country: '哥伦比亚', author: '@modainfantil_co', vid: 'V-SW-01', code: 'SW2605051', title: 'Sudadera barata: bolitas en dos lavadas', likes: 6180, comments: 214, shares: 101, date: '2026-11-08' },
    { id: 'P13', platform: 'TikTok', lang: 'ES', country: '秘鲁', author: '@criancafelic', vid: 'V-SW-01', code: 'SW2613059', title: 'Talla 150: la manga queda demasiado corta', likes: 3120, comments: 121, shares: 54, date: '2026-11-04' },
    { id: 'P14', platform: 'TikTok', lang: 'AR', country: '沙特阿拉伯', author: '@shanab_baby', vid: 'V-SW-02', code: 'SW2602048', title: 'هودي أطفال: الفرق بعد ٣ غسلات', likes: 26100, comments: 1180, shares: 690, date: '2026-11-15' },
    { id: 'P15', platform: 'TikTok', lang: 'AR', country: '阿联酋', author: '@alrashid_kids', vid: 'V-SW-02', code: 'SW2606052', title: 'ليش قماش الأطفال يتقلص بعد الغسيل؟', likes: 9430, comments: 402, shares: 233, date: '2026-11-09' },
    { id: 'P16', platform: 'TikTok', lang: 'ES', country: '智利', author: '@andina_kids', vid: 'V-SW-02', code: 'SW2610056', title: 'Sudadera con capucha 130: cremallera dura', likes: 4820, comments: 176, shares: 88, date: '2026-11-11' },
    { id: 'P17', platform: 'Instagram', lang: 'ES', country: '秘鲁', author: '@criancafelic', vid: 'V-TS-01', code: 'TS2601087', title: 'Camiseta 100% algodón: ¿pilla o no?', likes: 3610, comments: 143, shares: 66, date: '2026-11-03' },
    { id: 'P18', platform: 'Instagram', lang: 'AR', country: '沙特阿拉伯', author: '@shanab_baby', vid: 'V-TS-01', code: 'TS2605091', title: 'تي شيرت أطفال بعد ١٠ غسلات', likes: 58400, comments: 2640, shares: 1520, date: '2026-11-16' },
    { id: 'P19', platform: 'TikTok', lang: 'PT', country: '巴西', author: '@maecompras_br', vid: 'V-TS-01', code: 'TS2609095', title: 'Camiseta branca: amarelou na terceira lavagem?', likes: 21300, comments: 890, shares: 470, date: '2026-11-12' },
    { id: 'P20', platform: 'Instagram', lang: 'ES', country: '墨西哥', author: '@boutiqueluna', vid: 'V-TS-02', code: 'TS2602088', title: 'Rayas que se destiñen: cómo probarlo en tienda', likes: 9140, comments: 356, shares: 188, date: '2026-11-08' },
    { id: 'P21', platform: 'YouTube', lang: 'EN', country: '肯尼亚', author: '@lagoskids', vid: 'V-TS-03', code: 'TS2603089', title: 'Why kids tees pill after two washes', likes: 19600, comments: 810, shares: 420, date: '2026-11-13' },
    { id: 'P22', platform: 'TikTok', lang: 'ID', country: '印度尼西亚', author: '@tokobajuanak', vid: 'V-TS-03', code: 'TS2607093', title: 'Kaos bola anak: jahitan yang mudah lepas', likes: 6840, comments: 274, shares: 139, date: '2026-11-07' },
    { id: 'P23', platform: 'Instagram', lang: 'AR', country: '阿联酋', author: '@alrashid_kids', vid: 'V-JK-01', code: 'JK2601131', title: 'جاكيت صوف أطفال: كيف نعرف الجودة من الصورة', likes: 33200, comments: 1520, shares: 860, date: '2026-11-14' },
    { id: 'P24', platform: 'TikTok', lang: 'EN', country: '尼日利亚', author: '@lagoskids', vid: 'V-JK-01', code: 'JK2604134', title: 'Fleece jacket: pilling after two washes', likes: 14300, comments: 590, shares: 310, date: '2026-11-16' },
    { id: 'P25', platform: 'TikTok', lang: 'EN', country: '肯尼亚', author: '@lagoskids', vid: 'V-JK-02', code: 'JK2602132', title: 'Rain shell: the seam tape nobody checks', likes: 11200, comments: 470, shares: 246, date: '2026-11-10' },
    { id: 'P26', platform: 'Instagram', lang: 'ES', country: '智利', author: '@andina_kids', vid: 'V-JK-03', code: 'JK2603133', title: 'Parka 140: el relleno que se sale por la costura', likes: 8910, comments: 362, shares: 174, date: '2026-11-12' },
    { id: 'P27', platform: 'TikTok', lang: 'ID', country: '印度尼西亚', author: '@tokobajuanak', vid: 'V-PT-01', code: 'PT2601167', title: 'Celana jogger anak: karet pinggang melar', likes: 12200, comments: 520, shares: 271, date: '2026-11-13' },
    { id: 'P28', platform: 'TikTok', lang: 'ES', country: '哥伦比亚', author: '@modainfantil_co', vid: 'V-PT-01', code: 'PT2605171', title: 'Pantalón 4T: el largo que nadie mide', likes: 5630, comments: 214, shares: 108, date: '2026-11-09' },
    { id: 'P29', platform: 'TikTok', lang: 'PT', country: '巴西', author: '@maecompras_br', vid: 'V-PT-02', code: 'PT2602168', title: 'Jardineira jeans: encolhe ou não?', likes: 7210, comments: 298, shares: 152, date: '2026-11-11' },
    { id: 'P30', platform: 'TikTok', lang: 'TR', country: '土耳其', author: '@cocukgiyim_tr', vid: 'V-ST-01', code: 'ST2601205', title: 'Okul seti: 110 mu 120 mi?', likes: 16100, comments: 640, shares: 338, date: '2026-11-14' },
    { id: 'P31', platform: 'TikTok', lang: 'ES', country: '墨西哥', author: '@boutiqueluna', vid: 'V-ST-02', code: 'ST2602206', title: 'Vestido de fiesta: se cae el brillo en la primera lavada', likes: 4120, comments: 158, shares: 74, date: '2026-11-06' },
    { id: 'P32', platform: 'TikTok', lang: 'AR', country: '沙特阿拉伯', author: '@shanab_baby', vid: 'V-LG-01', code: 'LG2601231', title: 'بيجامة أطفال: تنكمش بعد الغسيل؟', likes: 6890, comments: 284, shares: 141, date: '2026-11-10' },
    { id: 'P33', platform: 'Facebook', lang: 'VI', country: '越南', author: '@shopquanaoem', vid: 'V-BD-01', code: 'BD2601253', title: 'Bộ liền thân em bé: khóa kéo có an toàn?', likes: 3340, comments: 132, shares: 61, date: '2026-11-05' }
  ];

  const chatQueue = [
    { ch: 'WhatsApp', from: 'Ahmed（Sahara Baby Store）', country: '沙特阿拉伯', tz: 'Asia/Riyadh', text: 'عندي متجر أطفال، أبغى فساتين بنات مقاسات 2T إلى 12Y. كم السعر؟', zh: '我开母婴店，要女童连衣裙 2T–12Y，什么价？' },
    { ch: 'WhatsApp', from: 'Jorge Ramírez（Grupo Infantil del Norte）', country: '墨西哥', tz: 'America/Mexico_City', text: 'Necesito vestidos de niña tallas 90 a 160, 600 piezas. ¿Precio FOB?', zh: '女童连衣裙 90–160 码 600 件，FOB 价？' },
    { ch: 'TikTok 私信', from: 'Carlos M.', country: '哥伦比亚', tz: 'America/Bogota', text: 'buenas, busco sudaderas para niño talla 4T, tienen?', zh: '找男童卫衣 4T，有吗？' },
    { ch: 'Facebook', from: 'Ravi（Sunrise Kidswear）', country: '印度', tz: 'Asia/Kolkata', text: 'Need kids cotton tees, sizes 2T-12Y, 1200 pcs, best price CIF Chennai.', zh: '童装纯棉 T恤 2T–12Y 1200 件，CIF 金奈最低价' },
    { ch: 'WhatsApp', from: 'Nguyen Van A', country: '越南', tz: 'Asia/Ho_Chi_Minh', text: 'cần báo giá váy trẻ em size 110, 300 cái', zh: '童装连衣裙 110 码 300 件报价' },
    { ch: 'Instagram', from: 'Marco（Andina Kids）', country: '智利', tz: 'America/Santiago', text: 'precio para vestido talla 130, 300 piezas?', zh: '连衣裙 130 码 300 件价格？' },
    { ch: 'WhatsApp', from: 'Budi', country: '印度尼西亚', tz: 'Asia/Jakarta', text: 'berapa harga baju anak ukuran 100-140?', zh: '童装 100–140 码多少钱？' },
    { ch: 'Facebook', from: 'María（Criança Feliz）', country: '秘鲁', tz: 'America/Lima', text: 'tienen conjuntos talla 2T? necesito 20 por modelo', zh: '有 2T 套装吗？每款 20 件' },
    { ch: 'WhatsApp', from: 'Dmitry', country: '俄罗斯', tz: 'Europe/Moscow', text: 'нужна детская одежда оптом, размеры 90-160, 300 шт', zh: '要童装批发 90–160 码 300 件' },
    { ch: 'TikTok 私信', from: 'Shanab', country: '沙特阿拉伯', tz: 'Asia/Riyadh', text: 'السلام عليكم، كيف أعرف مقاس الطفل بدون ما أقيس؟', zh: '你好，不量孩子怎么知道穿哪个码？' }
  ];

  /* ---------- 脚本生成 ---------- */
  const LANG = {
    ES: { name: '西班牙语', hook: '¿Tu tienda devuelve vestidos cada semana por la talla? Casi nunca es el vestido.', cta: 'Mándame una foto de la etiqueta de lavado y la altura del niño, y te confirmo la talla exacta en 2 horas.' },
    PT: { name: '葡萄牙语', hook: 'Sua loja devolve vestido toda semana por causa do tamanho? Quase nunca é o vestido.', cta: 'Me manda foto da etiqueta de lavagem e a altura da criança, e eu confirmo o tamanho certo em 2 horas.' },
    AR: { name: '阿拉伯语', hook: 'هل يرجع متجرك فساتين كل أسبوع بسبب المقاس؟ المشكلة ليست في الفستان غالباً.', cta: 'أرسل صورة بطاقة العناية وطول الطفل، وسأؤكد المقاس الصحيح خلال ساعتين.' },
    EN: { name: '英语', hook: 'Is your store returning dresses every week because of sizing? It is almost never the dress.', cta: 'Send me a photo of the care label and the child height — I will confirm the exact size within 2 hours.' },
    ID: { name: '印尼语', hook: 'Toko Anda sering retur baju anak karena ukuran? Masalahnya hampir tidak pernah di bajunya.', cta: 'Kirim foto label perawatan dan tinggi anak, saya balas ukuran yang tepat dalam 2 jam.' },
    VI: { name: '越南语', hook: 'Cửa hàng của bạn tuần nào cũng trả hàng vì sai size? Vấn đề hầu như không phải ở chiếc váy.', cta: 'Gửi ảnh nhãn giặt và chiều cao của bé, tôi xác nhận đúng size trong 2 giờ.' },
    TR: { name: '土耳其语', hook: 'Mağazanız her hafta beden yüzünden iade mi alıyor? Sorun neredeyse hiç üründe değil.', cta: 'Yıkama etiketinin fotoğrafını ve çocuğun boyunu gönderin, 2 saat içinde doğru bedeni yazayım.' }
  };

  function makeScript({ product, lang = 'ES', platform = 'TikTok', market = '墨西哥', pain = '同一系列不同尺码段，码错了就退', seconds = 30 }) {
    const L = LANG[lang] || LANG.EN;
    const p = product;
    const dur = Number(seconds) || 30;
    const beat = (a, b, t) => `${t}s｜${a}`;
    return {
      title: `${p.code} · ${L.name} · ${platform} · ${market}｜${dur}s`,
      hook: L.hook,
      cta: L.cta,
      board: [
        beat('钩子', '', `0–3`) + ` — 镜头：手拿旧款童装抖两下，字幕「${pain}」`,
        beat('', '', `3–8`) + ` — 镜头：同款 3 个尺码（90 / 110 / 130）平铺一排，软尺量衣长，字幕「同款不同码」`,
        beat('', '', `8–16`) + ` — 镜头：${p.code} 特写 + 平铺量 ${p.dim || '尺码'} + 水洗标与面料克重`,
        beat('', '', `16–24`) + ` — 镜头：质检报告 / 水洗测试特写（${p.material} 面料）`,
        beat('', '', `24–${dur}`) + ` — 镜头：孩子上身实拍 + 口播 CTA`
      ],
      voice: [
        `【${L.name} 口播 · 可交给配音】`,
        L.hook,
        'Misma serie, tres tallas: 90, 110 y 130. Si eliges por edad y no por altura, la prenda vuelve a la tienda.',
        `${p.code} — ${p.nameZh}，${p.dim || '按水洗标核对'}，${p.material} 面料。`,
        'GB 31701 / OEKO-TEX 100，30 次水洗不起球。',
        L.cta
      ].join('\n'),
      tags: ['#kidsclothing', '#kidsfashion', '#boutique', '#ملابس_أطفال', `#${p.code.replace(/\s/g, '')}`, `#${market}`],
      shots: ['旧款平铺对比', '三个尺码并排', '软尺量衣长特写', '水洗标与面料克重', '质检报告翻页', '车缝线与拉链细节'],
      prompt: `你是小满童装（XIAOMAN KIDS）的海外短视频编导。请为 ${market} 市场、${L.name}、${platform} 平台，写一条 ${dur} 秒的童装短视频脚本。\n产品：${p.code}（${p.nameZh}），尺码 ${p.dim || '见尺码表'}，面料 ${p.material}，适穿 ${(p.appsAll || []).slice(0, 3).join('、') || '按尺码表'}。\n核心痛点：${pain}。\n要求：前 3 秒必须有反常识钩子；中段用「同款不同尺码段」制造具体冲突；结尾 CTA 是「拍水洗标 + 量身高，2 小时给尺码」；口播用${L.name}，字幕给中文；给出 6 个分镜与拍摄清单；不要夸大认证。`
    };
  }

  return { communities, personas, edges, videos, posts, chatQueue, LANG, makeScript };
})();
