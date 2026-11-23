/* 界面语言包：10 种语言。数组顺序固定，缺项回退英文，再回退中文。
   中文/英文按童装业务重写；其余语言沿用旧译文并按术语替换，长句回落英文。 */
window.I18N = (function () {
  const ORDER = ['zh', 'en', 'es', 'pt', 'ar', 'ru', 'id', 'vi', 'th', 'tr'];

  const LANGS = [
    { code: 'zh', native: '中文', region: '中国', flag: '🇨🇳', dir: 'ltr' },
    { code: 'en', native: 'English', region: 'International', flag: '🇬🇧', dir: 'ltr' },
    { code: 'es', native: 'Español', region: 'Latinoamérica / España', flag: '🇲🇽', dir: 'ltr' },
    { code: 'pt', native: 'Português', region: 'Brasil / Portugal', flag: '🇧🇷', dir: 'ltr' },
    { code: 'ar', native: 'العربية', region: 'الشرق الأوسط', flag: '🇸🇦', dir: 'rtl' },
    { code: 'ru', native: 'Русский', region: 'Россия / СНГ', flag: '🇷🇺', dir: 'ltr' },
    { code: 'id', native: 'Bahasa Indonesia', region: 'Indonesia', flag: '🇮🇩', dir: 'ltr' },
    { code: 'vi', native: 'Tiếng Việt', region: 'Việt Nam', flag: '🇻🇳', dir: 'ltr' },
    { code: 'th', native: 'ไทย', region: 'ประเทศไทย', flag: '🇹🇭', dir: 'ltr' },
    { code: 'tr', native: 'Türkçe', region: 'Türkiye', flag: '🇹🇷', dir: 'ltr' }
  ];

  // 每条：[zh, en, es, pt, ar, ru, id, vi, th, tr]
  const K = {
    "nav.home": ["工作台", "Dashboard", "Panel", "Painel", "لوحة التحكم", "Панель", "Dasbor", "Bảng điều khiển", "แดชบอร์ด", "Panel"],
    "nav.homeCust": ["首页", "Home", "Inicio", "Início", "الرئيسية", "Главная", "Beranda", "Trang chủ", "หน้าแรก", "Ana sayfa"],
    "nav.myQuote": ["我的报价", "My quote", "Mi cotización", "Meu orçamento", "عرضي", "Мой КП", "Penawaran saya", "Báo giá của tôi", "ใบเสนอราคาของฉัน", "Teklifim"],
    "nav.custom": ["自定义定制", "Custom styles", "Personalizado", "Personalizado", "تخصيص", "Инд. заказ", "Kustom", "Tùy chỉnh", "กำหนดเอง", "Özel"],
    "nav.browse": ["选购", "Browse", "Comprar", "Comprar", "تسوّق", "Покупки", "Belanja", "Mua sắm", "เลือกซื้อ", "Alışveriş"],
    "nav.cart": ["报价篮", "Quote basket", "Carrito", "Carrinho", "السلة", "Корзина", "Keranjang", "Giỏ hàng", "ตะกร้า", "Sepet"],
    "nav.myPack": ["我的资料", "My files", "Mis archivos", "Meus arquivos", "ملفاتي", "Мои файлы", "File saya", "Tài liệu của tôi", "ไฟล์ของฉัน", "Dosyalarım"],
    "nav.search": ["客户搜索", "Buyer search", "Buscar clientes", "Buscar clientes", "بحث العملاء", "Поиск клиентов", "Cari pelanggan", "Tìm khách", "ค้นหาลูกค้า", "Müşteri ara"],
    "nav.xref": ["编号对照", "Cross reference", "Referencia", "Referência", "مطابقة الأرقام", "Кросс-номера", "Referensi nomor", "Đối chiếu mã", "เทียบรหัส", "Numara eşleştir"],
    "nav.visits": ["客户浏览", "Visitor log", "Visitas", "Visitas", "زيارات العملاء", "Визиты", "Kunjungan", "Lượt bém", "ผู้เข้าชม", "Ziyaretler"],
    "nav.redfox": ["热门追踪", "Trending", "Tendencias", "Tendências", "الرائج", "Тренды", "Tren", "Xu hướng", "เทรนด์", "Trendler"],
    "nav.acquire": ["获客", "Acquire", "Captación", "Captação", "استقطاب العملاء", "Привлечение", "Akuisisi", "Khai thác khách", "หาลูกค้า", "Müşteri kazanımı"],
    "nav.g.clues": ["客户管理", "Customers", "Clientes", "Clientes", "إدارة العملاء", "Клиенты", "Pelanggan", "Quản lý khách", "จัดการลูกค้า", "Müşteriler"],
    "nav.g.data": ["款号数据", "Catalog data", "Catálogo", "Catálogo", "بيانات الأرقام", "Каталог", "Katalog", "Dữ liệu mã", "ข้อมูลรหัส", "Katalog"],
    "nav.g.tools": ["工具书", "Handbook", "Manual", "Manual", "الدليل", "Справочник", "Buku alat", "Sổ tay", "คู่มือ", "El kitabı"],
    "nav.tax": ["关税查询", "Duty & tax", "Impuestos", "Impostos", "الضرائب", "Налоги", "Pajak", "Thuế", "ภาษี", "Vergi"],
    "nav.model": ["款号查询", "Style lookup", "Buscar modelo", "Buscar código", "بحث رقم القطعة", "Поиск модели", "Cari kode", "Tra mã", "ค้นรหัส", "Parça arama"],
    "nav.fx": ["货币换算", "Currency", "Divisas", "Câmbio", "صرف العملات", "Валюта", "Kurs mata uang", "Quy đổi tiền", "แลกเปลี่ยนเงิน", "Döviz"],
    "nav.aftersales": ["售后服务", "After-sales", "Posventa", "Pós-venda", "خدمة ما بعد البيع", "Сервис", "Purnajual", "Hậu mãi", "บริการหลังการขาย", "Satış sonrası"],
    "nav.aftersale": ["售后服务", "After-sales", "Posventa", "Pós-venda", "خدمة ما بعد البيع", "Сервис", "Purnajual", "Hậu mãi", "บริการหลังการขาย", "Satış sonrası"],
    "nav.deals": ["成交台账", "Deals", "Ventas", "Vendas", "الصفقات", "Сделки", "Deal", "Đơn hàng", "ดีล", "Anlaşmalar"],
    "nav.boss": ["业绩总览", "Overview", "Resumen", "Resumo", "ملخص", "Сводка", "Ringkasan", "Tổng quan", "ภาพรวม", "Özet"],
    "nav.select": ["智能选款", "Selector", "Selección", "Seleção", "اختيار المقاس", "Подбор", "Pemilihan", "Chọn mã", "ตัวเลือก", "Seçim"],
    "nav.products": ["产品库", "Products", "Productos", "Produtos", "المنتجات", "Товары", "Produk", "Sản phẩm", "สินค้า", "Ürünler"],
    "nav.graph": ["尺码适配图谱", "Size & fitment", "Aplicaciones", "Aplicações", "التوافقات", "Применяеразмерь", "Kecocokan", "Tương thích", "การใช้งาน", "Uyum"],
    "nav.quote": ["报价单", "Quote", "Cotización", "Orçamento", "عرض سعر", "КП", "Penawaran", "Báo giá", "ใบเสนอราคา", "Teklif"],
    "nav.pack": ["资料包", "Data pack", "Paquete", "Pacote", "حزمة البيانات", "Пакет", "Paket data", "Bộ tài liệu", "ชุดเอกสาร", "Dosya paketi"],
    "nav.leads": ["询盘线索", "Leads", "Prospectos", "Leads", "العملاء المحتملون", "Лиды", "Prospek", "Khách tiềm năng", "ลีด", "Potansiyel"],
    "nav.network": ["用户画像", "Audience", "Audiencia", "Audiência", "الجمهور", "Аудитория", "Audiens", "Chân dung KH", "กลุ่มเป้าหมาย", "Hedef kitle"],
    "nav.content": ["获客内容", "Content", "Contenido", "Conteúdo", "المحتوى", "Контент", "Konten", "Nội dung", "คอนเทนต์", "İçerik"],
    "nav.import": ["数据导入", "Import", "Importar", "Importar", "استيراد البيانات", "Импорт", "Impor", "Nhập dữ liệu", "นำเข้า", "İçe aktar"],
    "nav.inquiries": ["客户询价", "Inquiries", "Consultas", "Consultas", "استفسارات", "Запросы", "Permintaan", "Yêu size báo giá", "สอบถามราคา", "Talepler"],
    "nav.addcust": ["增加客户", "Add customer", "Agregar cliente", "Adicionar cliente", "إضافة عميل", "Добавить клиента", "Tambah pelanggan", "Thêm khách hàng", "เพิ่มลูกค้า", "Müşteri ekle"],
    "top.searchPh": ["输入款式 / 尺码 / 水洗标款号 / 客户原话，回车开始选款", "Style, size band, care-label code or a customer's words — press Enter", "serie, talla, número de pieza o lo que diga el cliente — Enter", "série, tamanho, código ou o que o cliente falar — Enter", "اكتب السلسلة أو المقاس أو رقم القطعة ثم اضغط Enter", "Модель, размер, номер детали или слова клиента — Enter", "seri, ukuran, nomor part — tekan Enter", "bé, size, mã phụ tùng — nhấn Enter", "พิมพ์ซีรีส์ ไซซ์ หรือรหัส แล้วกด Enter", "çocuk, beden, parça kodu — Enter"],
    "top.lang": ["界面语言", "Language", "Idioma", "Idioma", "اللغة", "Язык", "Bahasa", "Ngôn ngữ", "ภาษา", "Dil"],
    "top.offline": ["离线可用", "Offline", "Sin conexión", "Offline", "بدون إنترنت", "Офлайн", "Offline", "Ngoại tuyến", "ออฟไลน์", "Çevrimdışı"],
    "m.title": ["选择界面语言", "Choose your language", "Elige tu idioma", "Escolha o idioma", "اختر لغة الواجهة", "Выберите язык", "Pilih bahasa", "Chọn ngôn ngữ", "เลือกภาษา", "Dil seçin"],
    "m.sub": ["面向国际市场的版本：界面文案跟随语言切换，款号与尺码保持原样。", "Built for export markets: the interface follows your language, style numbers and sizes stay as they are.", "Hecho para exportación: la interfaz cambia de idioma, los códigos no cambian.", "Feito para exportação: a interface muda, os códigos não.", "نسخة للأسواق الدولية: تتغير الواجهة فقط، والأكواد تبقى كما هي.", "Для экспорта: интерфейс меняется, артикулы — нет.", "Untuk pasar ekspor: antarmuka ikut bahasa, kode tetap.", "Dành cho xuất khẩu: giao diện đổi ngôn ngữ, mã giữ nguyên.", "สำหรับตลาดส่งออก: หน้าจอเปลี่ยนภาษา รหัสสินค้าคงเดิม", "İhracat için: arayüz dil değiştirir, kodlar aynı kalır."],
    "m.note": ["部分长说明目前为英文，后续版本补齐小语种。", "Some long help texts are English for now and will be localised later.", "", "Alguns textos longos ainda em chinês.", "بعض النصوص الطويلة ما زالت بالصينية.", "Часть длинных текстов пока на китайском.", "Sebagian teks panjang masih Mandarin.", "Một số nội dung dài vẫn là tiếng Trung.", "ข้อความยาวบางส่วนยังเป็นภาษาจีน", "Bazı uzun metinler hâlâ Çince."],
    "m.btn": ["开始使用", "Continue", "Continuar", "Continuar", "ابدأ", "Продолжить", "Lanjutkan", "Tiếp tục", "เริ่มใช้งาน", "Devam"],
    "m.auto": ["记住选择，下次自动进入", "Remember my choice", "Recordar mi elección", "Lembrar minha escolha", "تذكّر اختياري", "Запомнить выбор", "Ingat pilihan saya", "Ghi nhớ lựa chọn", "จำตัวเลือกของฉัน", "Seçimimi hatırla"],
    "home.title": ["要选哪件童装？", "Which kidswear style are you looking for?", "¿Qué prenda buscas?", "Qual peça você procura?", "أي ملابس تبحث عنها؟", "Какие модели вам нужны?", "pakaian apa yang Anda cari?", "Bạn cần mẫu nào?", "ต้องการผ้าเบรครุ่นไหน?", "Hangi ürünyı arıyorsunuz?"],
    "home.sub": ["款式系列、尺码段、水洗标款号，或者客户的一句原话都行", "A style series, a size band, a care-label code — or just what the customer said.", "Un serie, un talla, un código antiguo o lo que diga el cliente.", "Um série, um tamanho, um código antigo ou o que o cliente falar.", "سلسلة أو مقاس أو رقم قديم أو كلام العميل.", "Модель, размер, старый номер или слова клиента.", "seri, ukuran, kode lama, atau kata pelanggan.", "bé, size, mã cũ hoặc lời khách nói.", "ซีรีส์ ไซซ์ รหัสเดิม หรือคำพูดลูกค้า", "çocuk, beden, eski kod veya müşterinin sözü."],
    "home.btn": ["查找款号", "Search", "Buscar", "Buscar", "ابحث", "Найти", "Cari", "Tìm", "ค้นหา", "Ara"],
    "home.todo": ["今天要做的事", "Today", "Hoy", "Hoje", "اليوم", "Сегодня", "Hari ini", "Hôm nay", "วันนี้", "Bugün"],
    "home.todoSub": ["点一行直接过去", "Tap a row to jump there", "Toca una fila para ir", "Toque para ir", "اضغط للانتقال", "Нажмите, чтобы перейти", "Klik untuk menuju", "Nhấn để đến", "แตะเพื่อไป", "Gitmek için dokun"],
    "home.t1": ["待跟进询盘", "Leads to follow up", "Prospectos por seguir", "Leads a seguir", "عملاء للمتابعة", "Лиды в работе", "Prospek ditindaklanjuti", "Khách cần theo dõi", "ลีดที่ต้องติดตาม", "Takip edilecek"],
    "home.t2": ["待复核的适穿关系", "Fitments awaiting review", "Aplicaciones por revisar", "Aplicações a revisar", "توافقات بانتظار المراجعة", "Применяеразмерь на проверке", "Kecocokan menunggu review", "Tương thích chờ duyệt", "การใช้งานรอตรวจ", "İnceleme bekleyen"],
    "home.t3": ["已加入报价的款", "Items in the quote", "Artículos en la cotización", "Itens no orçamento", "أصناف في عرض السعر", "Позиции в КП", "Item di penawaran", "Mục trong báo giá", "รายการในใบเสนอราคา", "Teklifteki kalemler"],
    "home.t4": ["已保存的历史报价", "Saved quotes", "Cotizaciones guardadas", "Orçamentos salvos", "عروض محفوظة", "Сохранённые КП", "Penawaran tersimpan", "Báo giá đã lưu", "ใบเสนอราคาที่บันทึก", "Kayıtlı teklifler"],
    "home.steps": ["现场三步定码法", "Three steps to the right size", "Tres pasos en campo", "Três passos no campo", "ثلاث خطوات في الموقع", "Три шага на месте", "Tiga langkah di lokasi", "Ba bước tại chỗ", "สามขั้นตอนหน้างาน", "Sahada üç adım"],
    "home.stepsSub": ["客户说不清尺码时，照着念", "Say this when the customer cannot name the size", "Dilo cuando el cliente no sabe el modelo", "Diga quando o cliente não sabe o modelo", "قلها عندما لا يعرف العميل الطراز", "Когда клиент не знает модель", "Ucapkan bila pelanggan tak tahu model", "Nói khi khách không rõ bé", "พูดเมื่อลูกค้าไม่รู้รุ่น", "Müşteri modeli bilmiyorsa"],
    "home.s1": ["问身高不问年龄 —— 「孩子现在多高？」比问「几岁」准得多。", "Ask height, not age — “How tall is the child?” beats “How old?” every time.", "Pregunta por el talla, no por el niño — funciona 10 veces mejor.", "Pergunte pelo tamanho, não pelo criança — funciona 10× melhor.", "اسأل عن المقاس لا عن الطفل — أفضل عشر مرات.", "Спросите про размер, а не про машину — в 10 раз эффективнее.", "Tanya ukuran, bukan anak — 10× lebih efektif.", "Hỏi size, không phải bé — hiệu quả gấp 10.", "ถามไซซ์ ไม่ใช่ซีรีส์ — ได้ผลกว่าสิบเท่า", "Aracı değil bedenı sorun — 10 kat etkili."],
    "home.s2": ["拍三张照 —— 孩子现在穿的同类衣服平铺 / 水洗标特写 / 身高对照门框。", "Three photos — a flat-lay of a garment that fits, the care label, the child by a door frame.", "Tres fotos: cara de la prenda, lado con regla, placa del talla.", "Três fotos: face, lateral com régua, placa do tamanho.", "ثلاث صور: وجه الملابس، الجانب مع مسطرة، لوحة المقاس.", "Три фото: лицо модели, бок с линейкой, шильда размера.", "Tiga foto: muka pakaian, sisi dengan penggaris, plat ukuran.", "Ba ảnh: mặt má, cạnh có thước, tem size.", "สามภาพ: หน้าเสื้อผ้า ด้านข้างมีไม้บรรทัด ป้ายไซซ์", "Üç fotoğraf: ürün yüzü, cetvelli yan, beden plakası."],
    "home.s3": ["看水洗标 —— 90 / 110 / 4T，同一件衣服比按年龄猜准。", "Read the care label — 90 / 110 / 4T beats guessing by age.", "Cuenta los agujeros: 8 / 12 / 15 / 16 es lo más rápido.", "Conte os furos: 8 / 12 / 15 / 16 é o mais rápido.", "عدّ الفتحات: ٨ / ١٢ / ١٥ / ١٦ أسرع دليل.", "Посчитайте отверстия: 8 / 12 / 15 / 16 — быстрее всего.", "Hitung lubang: 8 / 12 / 15 / 16 paling cepat.", "Đếm lỗ: 8 / 12 / 15 / 16 nhanh nhất.", "นับรู 8 / 12 / 15 / 16 เร็วที่สุด", "Delikleri sayın: 8 / 12 / 15 / 16 en hızlısı."],
    "home.select": ["打开选款台", "Open selector", "Abrir selección", "Abrir seleção", "افتح الاختيار", "Открыть подбор", "Buka pemilihan", "Mở chọn mã", "เปิดตัวเลือก", "Seçimi aç"],
    "home.chat": ["客服解答", "Ask support", "Preguntar", "Falar com suporte", "اسأل الدعم", "Спросить поддержку", "Tanya CS", "Hỏi CSKH", "ถามฝ่ายขาย", "Desteğe sor"],
    "home.why": ["为什么「问身高不问年龄」", "Why ask height, not age", "¿Por qué preguntar por el talla?", "Por que perguntar pelo tamanho?", "لماذا المقاس لا الطفل؟", "Почему размер, а не машина", "Kenapa tanya ukuran", "Vì sao hỏi size", "ทำไมต้องถามไซซ์", "Neden beden"],
    "home.whySub": ["以奶油小方为例：一个系列，三个尺码段，三个款号", "Cream Crewneck: one series, three size bands, three styles", "", "", "", "", "", "", "", ""],
    "sel.title": ["智能选款", "Selector", "Selección", "Seleção", "اختيار المقاس", "Подбор моделей", "Pemilihan", "Chọn mã", "ตัวเลือก", "Seçim"],
    "sel.in": ["客户原话 / 款式系列 / 尺码段 / 水洗标款号", "Customer words / series / size band / care-label code", "Cliente / serie / talla / código", "Cliente / série / tamanho / código", "كلام العميل / السلسلة / المقاس / الرقم", "Слова клиента / модель / размер / номер", "Kata pelanggan / seri / ukuran / kode", "Lời khách / bé / size / mã", "คำลูกค้า / ซีรีส์ / ไซซ์ / รหัส", "Müşteri sözü / çocuk / beden / kod"],
    "sel.inSub": ["支持中文、英文、款号混输", "Chinese, English or mixed input", "", "Chinês, inglês ou misto", "صيني أو إنجليزي أو مختلط", "Китайский, английский или смешанно", "Mandarin, Inggris, atau campur", "Trung, Anh hoặc hỗn hợp", "จีน อังกฤษ หรือผสม", "Çince, İngilizce veya karışık"],
    "sel.ph": ["例：奶油小方 圆领卫衣 110 码 300 件 / 女童碎花裙 120 / XM-SW-2601", "e.g. cream crewneck size 110 x300 / girls floral dress 120 / XM-SW-2601", "", "", "", "", "", "", "", ""],
    "sel.go": ["解析并选款", "Match", "Analizar", "Analisar", "حلّل", "Подобрать", "Analisis", "Phân tích", "วิเคราะห์", "Eşleştir"],
    "sel.clear": ["清空", "Clear", "Limpiar", "Limpar", "مسح", "Очистить", "Hapus", "Xóa", "ล้าง", "Temizle"],
    "sel.steps": ["现场三步定码法", "Three steps to the right size", "Tres pasos en campo", "Três passos", "ثلاث خطوات", "Три шага", "Tiga langkah", "Ba bước", "สามขั้นตอน", "Üç adım"],
    "sel.res": ["识别结果", "What we understood", "Lo que entendimos", "O que entendemos", "ما فهمناه", "Что мы поняли", "Yang kami pahami", "Chúng tôi hiểu", "สิ่งที่เราเข้าใจ", "Ne anladık"],
    "sel.resSub": ["共 {n} 个候选，按证据强度排序", "{n} candidates, strongest evidence first", "{n} candidatos, mejor evidencia primero", "{n} candidatos, maior evidência primeiro", "{n} مرشحًا، الأقوى دليلًا أولًا", "{n} вариантов, сильнейшие сначала", "{n} kandidat, bukti terkuat dulu", "{n} ứng viên, bằng chứng mạnh trước", "{n} ตัวเลือก เรียงตามหลักฐาน", "{n} aday, en güçlü kanıt önce"],
    "sel.q": ["还差一步就能锁定（先问这个，别急着报价）", "One question away (ask this before quoting)", "A una pregunta (pregunta esto antes de cotizar)", "A uma pergunta (pergunte antes de cotar)", "سؤال واحد (اسأل قبل العرض)", "Один вопрос до ответа", "Satu pertanyaan lagi", "Còn một câu hỏi", "อีกหนึ่งคำถาม", "Bir soru kaldı"],
    "sel.enough": ["关键信息齐全，可直接报价。", "Enough information — you can quote.", "Información suficiente para cotizar.", "Informações suficientes para cotar.", "المعلومات كافية لعرض السعر.", "Данных достаточно для КП.", "Informasi cukup untuk penawaran.", "Đủ thông tin để báo giá.", "ข้อมูลพอสำหรับเสนอราคา", "Teklif için yeterli bilgi."],
    "sel.heat": ["常用款式系列 · 按热度排序", "Popular series · ranked by buzz", "series comunes · por likes", "séries comuns · por likes", "السلاسل الشائعة · حسب الإعجابات", "Частые модели · по лайкам", "seri umum · menurut suka", "bé thường gặp · theo lượt thích", "ซีรีส์ที่พบบ่อย · ตามไลก์", "Yaygın çocuklar · beğeniye göre"],
    "sel.heatSub": ["共 {n} 个系列，按社媒热度从高到低", "{n} series, most-talked first", "{n} series, más likes primero", "{n} séries, mais likes primeiro", "{n} مركبات، الأكثر إعجابًا أولًا", "{n} моделей, больше лайков — выше", "{n} seri, suka terbanyak dulu", "{n} bé, nhiều thích trước", "{n} รุ่น ไลก์มากก่อน", "{n} çocuk, çok beğenilen önce"],
    "sel.heatEmpty": ["该款号还没有系列线索", "No series link yet for this style", "Aún sin series asociados", "Ainda sem séries", "لا توجد مركبات مرتبطة بعد", "Пока нет привязки к моделям", "Belum ada seri terkait", "Chưa có bé liên kết", "ยังไม่มีซีรีส์ที่เชื่อมโยง", "Henüz çocuk bağlantısı yok"],
    "sel.heatNote": ["排序依据：该系列相关短视频/帖子的互动合计（演示数据）。", "Ranked by total engagement of related posts (demo data).", "Ordenado por likes totales (datos demo).", "Ordenado por likes totais (dados demo).", "الترتيب حسب مجموع الإعجابات (بيانات تجريبية).", "Сортировка по сумме лайков (демо).", "Diurutkan dari total suka (data demo).", "Xếp theo tổng lượt thích (dữ liệu demo).", "เรียงตามไลก์รวม (ข้อมูลตัวอย่าง)", "Toplam beğeniye göre (demo veri)."],
    "sel.copyList": ["复制款式清单", "Copy list", "Copiar lista", "Copiar lista", "انسخ القائمة", "Копировать список", "Salin daftar", "Sao chép danh sách", "คัดลอกリスト", "Listeyi kopyala"],
    "sel.videos": ["看相关视频", "Related videos", "Videos relacionados", "Vídeos relacionados", "فيديوهات ذات صلة", "Видео по теме", "Video terkait", "Video liên quan", "วิดีโอที่เกี่ยวข้อง", "İlgili videolar"],
    "sel.mx": ["尺码对应表", "Size band table", "Tabla de tallas", "Tabela de tamanhos", "جدول المقاسات", "Таблица размеров", "Tabel ukuran", "Bảng size", "ตารางไซซ์", "beden tablosu"],
    "sel.other": ["同系列其他款号", "Other styles in this series", "Otras piezas del serie", "Outras peças do série", "قطع أخرى لنفس السلسلة", "Другие детали для модели", "Part lain untuk seri ini", "Phụ tùng khác cho bé", "อะไหล่อื่นของรุ่นนี้", "Bu çocuk için diğer parçalar"],
    "sel.add": ["加入报价", "Add to quote", "Añadir a cotización", "Adicionar ao orçamento", "أضف إلى العرض", "В КП", "Tambah ke penawaran", "Thêm vào báo giá", "เพิ่มในใบเสนอราคา", "Teklife ekle"],
    "sel.detail": ["产品详情", "Details", "Detalles", "Detalhes", "التفاصيل", "Подробнее", "Detail", "Chi tiết", "รายละเอียด", "Detay"],
    "sel.pack": ["生成资料页", "Style sheet", "Ficha técnica", "Ficha técnica", "ورقة بيانات", "Техлист", "Lembar data", "Trang dữ liệu", "เอกสารข้อมูล", "Veri sayfası"],
    "sel.copy": ["复制回复话术", "Copy reply", "Copiar respuesta", "Copiar resposta", "انسخ الرد", "Копировать ответ", "Salin balasan", "Sao chép trả lời", "คัดลอกคำตอบ", "Yanıtı kopyala"],
    "prod.title": ["产品库", "Catalog", "Catálogo", "Catálogo", "المنتجات", "Каталог", "Katalog", "Danh mục", "แคตตาล็อก", "Katalog"],
    "prod.sub": ["{p} 个款号，{c} 条编号。点击行看详情、适穿与质检。", "{p} styles, {c} codes. Open a row for details.", "{p} productos, {c} códigos.", "{p} produtos, {c} códigos.", "{p} منتج، {c} كود.", "{p} позиций, {c} кодов.", "{p} produk, {c} kode.", "{p} sản phẩm, {c} mã.", "{p} รายการ {c} รหัส", "{p} ürün, {c} kod."],
    "prod.ph": ["搜索款号 / 编号 / 款名", "Search style, code, name", "Buscar pieza, código, nombre", "Buscar peça, código, nome", "ابحث بالرقم أو الكود أو الاسم", "Поиск по артикулу/коду", "Cari part, kode, nama", "Tìm mã, tên", "ค้นหารหัส ชื่อ", "Parça, kod, ad ara"],
    "prod.cat": ["品类", "Category", "Categoría", "Categoria", "الفئة", "Категория", "Kategori", "Danh mục", "หมวด", "Kategori"],
    "prod.brand": ["品牌线", "Brand line", "Marca", "Marca", "العلامة", "Бренд", "Merek", "Thương hiệu", "แบรนด์", "Marka"],
    "prod.mat": ["面料", "Fabric", "Material", "Material", "الخامة", "Материал", "Material", "Vật liệu", "วัสดุ", "Malzeme"],
    "prod.only": ["只看有适穿关系", "Only with fitment", "Solo con aplicación", "Só com aplicação", "مع توافق فقط", "Только с применяеразмерью", "Hanya ada kecocokan", "Chỉ có tương thích", "เฉพาะที่มีการใช้งาน", "Sadece uyumlu"],
    "prod.sort": ["排序", "Sort", "Ordenar", "Ordenar", "ترتيب", "Сортировка", "Urutkan", "Sắp xếp", "เรียง", "Sırala"],
    "prod.def": ["默认", "Default", "Predeterminado", "Padrão", "افتراضي", "По умолчанию", "Default", "Mặc định", "ค่าเริ่มต้น", "Varsayılan"],
    "prod.likes": ["按热度", "By buzz", "Por likes", "Por likes", "حسب الإعجابات", "По лайкам", "Menurut suka", "Theo lượt thích", "ตามไลก์", "Beğeniye göre"],
    "prod.fit": ["按适穿关系", "By fitment", "Por aplicaciones", "Por aplicações", "حسب التوافق", "По применяеразмери", "Menurut kecocokan", "Theo tương thích", "ตามการใช้งาน", "Uyuma göre"],
    "prod.price": ["按参考价", "By price", "Por precio", "Por preço", "حسب السعر", "По цене", "Menurut harga", "Theo giá", "ตามราคา", "Fiyata göre"],
    "prod.export": ["导出 CSV", "Export CSV", "Exportar CSV", "Exportar CSV", "تصدير CSV", "Экспорт CSV", "Ekspor CSV", "Xuất CSV", "ส่งออก CSV", "CSV indir"],
    "prod.res": ["筛选结果", "Results", "Resultados", "Resultados", "النتائج", "Найдено", "Hasil", "Kết quả", "ผลลัพธ์", "Sonuç"],
    "h.code": ["款号", "Style", "Pieza", "Peça", "القطعة", "Артикул", "Part", "Mã", "รหัส", "Parça"],
    "h.name": ["款名", "Name", "Nombre", "Nome", "الاسم", "Название", "Nama", "Tên", "ชื่อ", "Ad"],
    "h.apps": ["款式系列", "Series", "series", "séries", "السلاسل", "Модели", "seri", "bé", "ซีรีส์", "çocuklar"],
    "h.spec": ["尺码", "Size", "Medidas", "Medidas", "المقاس", "Размер", "Ukuran", "Kích thước", "ขนาด", "Ölçü"],
    "h.codes": ["编号", "Codes", "Códigos", "Códigos", "الأكواد", "Коды", "Kode", "Mã", "รหัส", "Kodlar"],
    "h.likes": ["热度", "Buzz", "Likes", "Likes", "إعجابات", "Лайки", "Suka", "Thích", "ไลก์", "Beğeni"],
    "h.price": ["参考价", "Price", "Precio", "Preço", "السعر", "Цена", "Harga", "Giá", "ราคา", "Fiyat"],
    "qt.title": ["报价单", "Quotation", "Cotización", "Orçamento", "عرض سعر", "Коммерческое предложение", "Penawaran", "Báo giá", "ใบเสนอราคา", "Teklif"],
    "qt.sub": ["阶梯价随数量自动计算；尺码依据附在备注里，减少来回确认。", "Volume price is automatic; size notes go with the quote.", "Precio por volumen automático.", "Preço por volume automático.", "السعر حسب الكمية تلقائيًا.", "Цена зависит от объёма.", "Harga otomatis menurut jumlah.", "Giá tự động theo số lượng.", "ราคาตามจำนวนอัตโนมัติ", "Hacme göre otomatik fiyat."],
    "qt.cust": ["客户与条款", "Customer & terms", "Cliente y condiciones", "Cliente e condições", "العميل والشروط", "Клиент и условия", "Pelanggan & syarat", "Khách & điều kiện", "ลูกค้าและเงื่อนไข", "Müşteri ve şartlar"],
    "qt.items": ["明细", "Items", "Partidas", "Itens", "الأصناف", "Позиции", "Item", "Chi tiết", "รายการ", "Kalemler"],
    "qt.gen": ["生成报价单（打印 / PDF）", "Generate quote (print / PDF)", "Generar cotización (PDF)", "Gerar orçamento (PDF)", "أنشئ العرض (PDF)", "Сформировать КП (PDF)", "Buat penawaran (PDF)", "Tạo báo giá (PDF)", "สร้างใบเสนอราคา (PDF)", "Teklif oluştur (PDF)"],
    "qt.save": ["保存报价", "Save quote", "Guardar", "Salvar", "احفظ", "Сохранить", "Simpan", "Lưu", "บันทึก", "Kaydet"],
    "qt.amount": ["货值", "Goods value", "Valor", "Valor", "قيمة البضاعة", "Стоиразмерь", "Nilai barang", "Giá trị hàng", "มูลค่าสินค้า", "Mal bedeli"],
    "qt.freight": ["运费估算", "Freight (est.)", "Flete (est.)", "Frete (est.)", "الشحن (تقديري)", "Фрахт (оценка)", "Ongkir (est.)", "Cước (ước tính)", "ค่าขนส่ง (ประมาณ)", "Navlun (tahmini)"],
    "qt.total": ["合计", "Total", "Total", "Total", "الإجمالي", "Итого", "Total", "Tổng", "รวม", "Toplam"],
    "qt.recent": ["最近保存", "Recent", "Recientes", "Recentes", "الأحدث", "Недавние", "Terbaru", "Gần đây", "ล่าสุด", "Son"],
    "qt.empty": ["还没有款号。去「智能选款」或「产品库」加入。", "No items yet — add from Selector or Catalog.", "Sin artículos. Añade desde Selección.", "Sem itens. Adicione em Seleção.", "لا أصناف بعد.", "Пока пусто.", "Belum ada item.", "Chưa có mục nào.", "ยังไม่มีรายการ", "Henüz kalem yok."],
    "pk.title": ["客户资料包", "Customer data pack", "Paquete de datos", "Pacote de dados", "حزمة بيانات العميل", "Пакет документов", "Paket data", "Bộ tài liệu", "ชุดเอกสารลูกค้า", "Müşteri dosyası"],
    "pk.sub": ["一次生成：封面 + 报价 + 款图与规格页 + 质检报告 + 发货确认页。", "One run: cover, quote, style sheets, test reports, confirmation page.", "Todo en uno: portada, cotización, fichas, ensayos.", "Tudo em um: capa, orçamento, fichas, ensaios.", "دفعة واحدة: الغلاف والعرض وأوراق البيانات والاختبارات.", "Один файл: обложка, КП, листы, протоколы.", "Sekali jalan: sampul, penawaran, lembar data, uji.", "Một lần: bìa, báo giá, phiếu dữ liệu, thử nghiệm.", "ครั้งเดียว: ปก ใบเสนอราคา เอกสารข้อมูล ผลทดสอบ", "Tek seferde: kapak, teklif, veri sayfaları, testler."],
    "pk.contents": ["打包内容", "What is included", "Contenido", "Conteúdo", "المحتوى", "Состав", "Isi paket", "Nội dung", "เนื้อหา", "İçerik"],
    "pk.zip": ["下载 ZIP", "Download ZIP", "Descargar ZIP", "Baixar ZIP", "تحميل ZIP", "Скачать ZIP", "Unduh ZIP", "Tải ZIP", "ดาวน์โหลด ZIP", "ZIP indir"],
    "pk.print": ["生成并打印（另存为 PDF）", "Generate & print (save as PDF)", "Generar e imprimir (PDF)", "Gerar e imprimir (PDF)", "أنشئ واطبع (PDF)", "Сформировать и печать (PDF)", "Buat & cetak (PDF)", "Tạo & in (PDF)", "สร้างและพิมพ์ (PDF)", "Oluştur ve yazdır (PDF)"],
    "pk.items": ["将被打包的款号", "Styles in this pack", "Piezas incluidas", "Peças incluídas", "القطع المشمولة", "Позиции в пакете", "Part dalam paket", "Mã trong bộ", "รายการในชุด", "Paketteki parçalar"],
    "pk.empty": ["先加入款号", "Add styles first", "Añade piezas primero", "Adicione peças primeiro", "أضف قطعًا أولًا", "Сначала добавьте позиции", "Tambah part dulu", "Thêm mã trước", "เพิ่มรหัสก่อน", "Önce parça ekleyin"],
    "ld.title": ["询盘线索", "Leads", "Prospectos", "Leads", "العملاء المحتملون", "Лиды", "Prospek", "Khách tiềm năng", "ลีด", "Potansiyel müşteriler"],
    "ld.sub": ["先判断「是不是终端」，再决定投入多少时间。", "Decide if it is an end buyer before spending time.", "Primero decide si es usuario final.", "Primeiro decida se é usuário final.", "حدّد أولًا إن كان مستخدمًا نهائيًا.", "Сначала поймите, конечный ли это клиент.", "Tentukan dulu apakah pengguna akhir.", "Xác định có phải người dùng cuối.", "ตัดสินก่อนว่าเป็นผู้ใช้ปลายทางไหม", "Önce son kullanıcı mı, karar verin."],
    "ld.new": ["录入询盘", "New lead", "Nuevo prospecto", "Novo lead", "عميل جديد", "Новый лид", "Prospek baru", "Khách mới", "ลีดใหม่", "Yeni kayıt"],
    "nw.title": ["用户画像与关系网", "Audience & network", "Audiencia y red", "Audiência e rede", "الجمهور والشبكة", "Аудитория и связи", "Audiens & jaringan", "Chân dung & mạng lưới", "กลุ่มเป้าหมายและเครือข่าย", "Hedef kitle ve ağ"],
    "nw.sub": ["从关注 / 粉丝 / 评论还原谁影响谁的选款。", "Who influences whose buying, from follows and comments.", "Quién influye en quién.", "Quem influencia quem.", "من يؤثر على من.", "Кто на кого влияет.", "Siapa memengaruhi siapa.", "Ai ảnh hưởng đến ai.", "ใครมีอิทธิพลต่อใคร", "Kim kimi etkiliyor."],
    "ct.title": ["获客内容引擎", "Content engine", "Motor de contenido", "Motor de conteúdo", "محرك المحتوى", "Контент-движок", "Mesin konten", "Máy nội dung", "เครื่องยนต์คอนเทนต์", "İçerik motoru"],
    "ct.sub": ["按语种扒热门选题 → 出童装脚本 → 挂到款号。", "Trending topics by language → kidswear scripts → link to a style.", "Temas por idioma → guiones.", "Temas por idioma → roteiros.", "مواضيع حسب اللغة → نصوص.", "Тренды по языкам → сценарии.", "Topik per bahasa → skrip.", "Chủ đề theo ngôn ngữ → kịch bản.", "หัวข้อตามภาษา → สคริปต์", "Dile göre konular → senaryo."],
    "ct.gen": ["生成脚本", "Generate script", "Generar guion", "Gerar roteiro", "أنشئ النص", "Сгенерировать", "Buat skrip", "Tạo kịch bản", "สร้างสคริปต์", "Senaryo oluştur"],
    "ct.prompt": ["复制 AI 提示词", "Copy AI prompt", "Copiar prompt", "Copiar prompt", "انسخ الطلب", "Копировать промпт", "Salin prompt", "Sao chép prompt", "คัดลอกพรอมป์ต์", "Promptu kopyala"],
    "im.title": ["数据导入与导出", "Import & export", "Importar y exportar", "Importar e exportar", "استيراد وتصدير", "Импорт и экспорт", "Impor & ekspor", "Nhập & xuất", "นำเข้าและส่งออก", "İçe/dışa aktar"],
    "im.sub": ["把 CRM、ERP、打版单、质检台账接进来。", "Bring in CRM, ERP, pattern sheets and test logs.", "Conecta CRM, ERP, planos y ensayos.", "Conecte CRM, ERP, desenhos e ensaios.", "اربط CRM وERP والمخططات وسجلات الاختبار.", "CRM, ERP, чертежи, протоколы.", "Hubungkan CRM, ERP, gambar, uji.", "Kết nối CRM, ERP, bản vẽ, thử nghiệm.", "เชื่อม CRM, ERP, แบบ drawing, ผลทดสอบ", "CRM, ERP, çizim ve test kayıtları."],
    "c.close": ["关闭", "Close", "Cerrar", "Fechar", "إغلاق", "Закрыть", "Tutup", "Đóng", "ปิด", "Kapat"],
    "c.copy": ["复制", "Copy", "Copiar", "Copiar", "نسخ", "Копировать", "Salin", "Sao chép", "คัดลอก", "Kopyala"],
    "c.add": ["加入", "Add", "Añadir", "Adicionar", "أضف", "Добавить", "Tambah", "Thêm", "เพิ่ม", "Ekle"],
    "c.all": ["全部", "All", "Todos", "Todos", "الكل", "Все", "Semua", "Tất cả", "ทั้งหมด", "Tümü"],
    "c.empty": ["暂无数据", "No data", "Sin datos", "Sem dados", "لا بيانات", "Нет данных", "Tidak ada data", "Không có dữ liệu", "ไม่มีข้อมูล", "Veri yok"],
    "gate.none": ["未登录", "Sign in", "Iniciar sesión", "Entrar", "تسجيل الدخول", "Вход", "Masuk", "Đăng nhập", "เข้าสู่ระบบ", "Giriş"],
    "gate.choose": ["选择入口", "Choose portal", "Elige el portal", "Escolha o portal", "اختر البوابة", "Выберите вход", "Pilih portal", "Chọn cổng", "เลือกพอร์ทัล", "Giriş seçin"],
    "gate.cust": ["客户入口", "Customer", "Cliente", "Cliente", "بوابة العميل", "Клиент", "Pelanggan", "Khách hàng", "ลูกค้า", "Müşteri"],
    "gate.staff": ["员工入口", "Staff", "Empleado", "Equipe", "بوابة الموظف", "Сотрудник", "Staf", "Nhân viên", "พนักงาน", "Personel"],
    "gate.custSub": ["看款式与参考价，收到你的报价和资料", "Browse styles and prices, receive quotes and packs", "Ver piezas y precios, recibir cotizaciones", "Ver peças e preços, receber orçamentos", "تصفح القطع والأسعار واستلام العروض", "Смотреть артикулы и цены, получать КП", "Lihat part dan harga, terima penawaran", "bém mã và giá, nhận báo giá", "ดูสินค้าและราคา รับใบเสนอราคา", "Parça ve fiyatları görün, teklif alın"],
    "gate.staffSub": ["看客户浏览、跟进线索、出报价与资料包", "Customer activity, leads, quotes and data packs", "Actividad de clientes, prospectos y cotizaciones", "Atividade de clientes e orçamentos", "متابعة العملاء والعروض", "Активность клиентов, лиды, КП", "Aktivitas pelanggan, prospek, penawaran", "bém khách đã bém gì, báo giá", "ดูพฤติกรรมลูกค้าและทำใบเสนอราคา", "Müşteri hareketleri, teklif ve dosyalar"],
    "gate.contactType": ["联系方式类型", "Contact type", "Tipo de contacto", "Tipo de contato", "نوع الاتصال", "Тип контакта", "Jenis kontak", "Loại liên hệ", "ประเภทการติดต่อ", "İletişim türü"],
    "gate.contactValue": ["号码或邮箱", "Number or email", "Número o correo", "Número ou e-mail", "الرقم أو البريد", "Номер или почта", "Nomor atau email", "Số hoặc email", "เบอร์หรืออีเมล", "Numara veya e-posta"],
    "gate.name": ["称呼", "Name", "Nombre", "Nome", "الاسم", "Имя", "Nama", "Tên", "ชื่อ", "Ad"],
    "gate.company": ["公司", "Company", "Empresa", "Empresa", "الشركة", "Компания", "Perusahaan", "Công ty", "บริษัท", "Şirket"],
    "gate.country": ["国家", "Country", "País", "País", "الدولة", "Страна", "Negara", "Quốc gia", "ประเทศ", "Ülke"],
    "gate.code": ["员工访问码", "Staff access code", "Código de empleado", "Código da equipe", "رمز الموظف", "Код сотрудника", "Kode staf", "Mã nhân viên", "รหัสพนักงาน", "Personel kodu"],
    "gate.in": ["进入", "Enter", "Entrar", "Entrar", "دخول", "Войти", "Masuk", "Vào", "เข้าสู่ระบบ", "Gir"],
    "gate.tip": ["客户登录后，报价和资料会发到这个联系方式。", "Quotes and packs will be sent to this contact.", "Las cotizaciones se enviarán a este contacto.", "Orçamentos serão enviados a este contato.", "ستُرسل العروض إلى هذا الاتصال.", "КП и файлы придут на этот контакт.", "Penawaran dikirim ke kontak ini.", "Báo giá sẽ gửi tới liên hệ này.", "ใบเสนอราคาจะส่งไปที่ช่องทางนี้", "Teklifler bu iletişime gönderilir."],
    "gate.logout": ["切换身份", "Switch account", "Cambiar cuenta", "Trocar conta", "تغيير الحساب", "Сменить вход", "Ganti akun", "Đổi tài khoản", "สลับบัญชี", "Hesap değiştir"],
  };

  let cur = 'zh';
  const listeners = [];

  function idx(code) { const i = ORDER.indexOf(code); return i < 0 ? 0 : i; }
  function t(key, vars) {
    const row = K[key];
    if (!row) return key;
    let s = row[idx(cur)];
    if (!s && cur !== 'en') s = row[1];
    if (!s) s = row[0];
    if (vars) Object.keys(vars).forEach(k => { s = s.split('{' + k + '}').join(vars[k]); });
    return s;
  }
  function setLang(code) {
    cur = ORDER.includes(code) ? code : 'en';
    const meta = LANGS.find(l => l.code === cur) || LANGS[1];
    document.documentElement.lang = cur;
    document.documentElement.dir = meta.dir;
    document.documentElement.dataset.lang = cur;
    try { localStorage.setItem('gy_lang', cur); } catch (e) { }
    listeners.forEach(fn => { try { fn(cur); } catch (e) { } });
  }
  function getLang() { return cur; }
  function meta(code) { return LANGS.find(l => l.code === (code || cur)) || LANGS[0]; }
  function onChange(fn) { listeners.push(fn); }

  return { LANGS, ORDER, t, setLang, getLang, meta, onChange };
})();