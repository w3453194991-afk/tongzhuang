/* 由 data/db.json 生成 SQLite：data/xiaoman.db（可直接给 IT / BI / CRM / ERP 集成）
 * 运行：node build\make-db.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const ROOT = path.resolve(import.meta.dirname, '..');
const DB = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'db.json'), 'utf8'));
const OUT = path.join(ROOT, 'data', 'xiaoman.db');
if (fs.existsSync(OUT)) fs.rmSync(OUT);

const db = new DatabaseSync(OUT);
db.exec(`
PRAGMA journal_mode = WAL;

CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE company (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT, name_en TEXT, brand TEXT, founded INTEGER,
  site TEXT, capacity TEXT, staff TEXT, markets TEXT, certs TEXT, web TEXT
);
CREATE TABLE materials (
  id TEXT PRIMARY KEY, name TEXT, name_en TEXT, weight TEXT, wash TEXT,
  factor REAL, traits TEXT, fit TEXT, note TEXT
);
CREATE TABLE brands (id TEXT PRIMARY KEY, name TEXT, desc TEXT);
CREATE TABLE series (
  id TEXT PRIMARY KEY, line TEXT, name TEXT, model TEXT, season TEXT, cls TEXT, note TEXT,
  alias TEXT, fit_count INTEGER
);
CREATE TABLE size_bands (
  id TEXT PRIMARY KEY, group_name TEXT, model TEXT, type TEXT, age TEXT, spec TEXT, alias TEXT
);
CREATE TABLE products (
  id TEXT PRIMARY KEY, sku TEXT UNIQUE, code TEXT UNIQUE,
  name_zh TEXT, name_en TEXT, cat TEXT, cat_en TEXT, brand_line TEXT, material TEXT,
  fit TEXT, size_range TEXT, gsm INTEGER, price_usd REAL, moq INTEGER,
  pack_per TEXT, pack_gw REAL, pack_cbm REAL, hs TEXT, status TEXT,
  img TEXT, desc_en TEXT, desc_zh TEXT
);
CREATE TABLE codes (
  id TEXT PRIMARY KEY, code TEXT, norm TEXT, pid TEXT, type TEXT, source TEXT, conf TEXT, note TEXT,
  FOREIGN KEY (pid) REFERENCES products(id)
);
CREATE TABLE fitments (
  id TEXT PRIMARY KEY, series_id TEXT, band_id TEXT, pid TEXT, code TEXT,
  fit_style TEXT, fit_type TEXT, conf TEXT, src TEXT, series_name TEXT, band_name TEXT,
  FOREIGN KEY (series_id) REFERENCES series(id),
  FOREIGN KEY (band_id) REFERENCES size_bands(id),
  FOREIGN KEY (pid) REFERENCES products(id)
);
CREATE TABLE tests (
  id TEXT PRIMARY KEY, pid TEXT, code TEXT, pname TEXT, std TEXT, item TEXT,
  result TEXT, verdict TEXT, lab TEXT, no TEXT, date TEXT
);
CREATE TABLE customers (
  id TEXT PRIMARY KEY, name TEXT, country TEXT, region TEXT, type TEXT, tz TEXT,
  grade TEXT, brand_line TEXT, price_level TEXT, incoterm TEXT, pay TEXT, last_order TEXT, note TEXT
);
CREATE TABLE leads (
  id TEXT PRIMARY KEY, created TEXT, src TEXT, company TEXT, contact TEXT, country TEXT, tz TEXT,
  need TEXT, need_zh TEXT, status TEXT, score INTEGER, owner TEXT,
  next_action TEXT, next_date TEXT, note TEXT
);
CREATE TABLE score_rules (k TEXT PRIMARY KEY, w INTEGER, label TEXT, desc TEXT);
CREATE TABLE templates (id TEXT PRIMARY KEY, name TEXT, lang TEXT, body TEXT);

CREATE INDEX idx_products_cat ON products(cat);
CREATE INDEX idx_products_price ON products(price_usd);
CREATE INDEX idx_codes_norm ON codes(norm);
CREATE INDEX idx_codes_pid ON codes(pid);
CREATE INDEX idx_fit_series ON fitments(series_id);
CREATE INDEX idx_fit_band ON fitments(band_id);
CREATE INDEX idx_fit_pid ON fitments(pid);
CREATE INDEX idx_tests_pid ON tests(pid);

CREATE VIEW v_style_profile AS
SELECT p.id, p.sku, p.code, p.cat, p.name_zh, p.size_range, p.gsm,
       m.name AS fabric, p.price_usd, p.moq,
       (SELECT COUNT(*) FROM codes c WHERE c.pid = p.id) AS code_count,
       (SELECT COUNT(*) FROM fitments f WHERE f.pid = p.id) AS fit_count
FROM products p LEFT JOIN materials m ON m.id = p.material;

CREATE VIEW v_size_band_fit AS
SELECT f.id, s.name AS series, s.model AS series_model, b.model AS size_band,
       b.type AS band_type, b.age, f.pid, f.code, f.fit_style, f.fit_type, f.conf, f.src
FROM fitments f
JOIN series s ON s.id = f.series_id
LEFT JOIN size_bands b ON b.id = f.band_id;
`);

const ins = (sql, rows) => {
  const st = db.prepare(sql);
  for (const r of rows) st.run(...r);
};
const j = v => Array.isArray(v) ? JSON.stringify(v) : (v == null ? '' : String(v));
const c = DB.meta.company;

ins('INSERT INTO meta(key,value) VALUES(?,?)', [
  ['version', DB.meta.version], ['name', DB.meta.name], ['subtitle', DB.meta.subtitle],
  ['built', DB.meta.built], ['products', String(DB.stats.products)], ['codes', String(DB.stats.codes)],
  ['series', String(DB.stats.vehicles)], ['size_bands', String(DB.stats.axles)],
  ['fitments', String(DB.stats.fitments)], ['tests', String(DB.stats.tests)],
  ['notices', j(DB.meta.notices)]
]);
ins('INSERT INTO company(id,name,name_en,brand,founded,site,capacity,staff,markets,certs,web) VALUES(1,?,?,?,?,?,?,?,?,?,?)',
  [[c.name, c.nameEn, c.brand, c.founded, c.site, c.capacity, c.staff, c.markets, j(c.certs), c.web]]);
ins('INSERT INTO materials(id,name,name_en,weight,wash,factor,traits,fit,note) VALUES(?,?,?,?,?,?,?,?,?)',
  DB.materials.map(m => [m.id, m.name, m.nameEn, m.mu, m.temp, m.factor, j(m.traits), m.fit, m.note]));
ins('INSERT INTO brands(id,name,desc) VALUES(?,?,?)', DB.brands.map(b => [b.id, b.name, b.desc]));
ins('INSERT INTO series(id,line,name,model,season,cls,note,alias,fit_count) VALUES(?,?,?,?,?,?,?,?,?)',
  DB.vehicles.map(v => [v.id, v.brand, v.series, v.model, v.years, v.cls, v.note, j(v.alias), v.fitCount]));
ins('INSERT INTO size_bands(id,group_name,model,type,age,spec,alias) VALUES(?,?,?,?,?,?,?)',
  DB.axles.map(a => [a.id, a.brand, a.model, a.type, a.cap, a.spec, j(a.alias)]));
ins(`INSERT INTO products(id,sku,code,name_zh,name_en,cat,cat_en,brand_line,material,fit,size_range,gsm,price_usd,moq,pack_per,pack_gw,pack_cbm,hs,status,img,desc_en,desc_zh)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  DB.products.map(p => [p.id, p.sku, p.code, p.nameZh, p.nameEn, p.cat, p.catEn, p.brand, p.material,
    p.pos, p.dim, p.holes, p.price, p.moq, p.pack.per, p.pack.gw, p.pack.cbm, p.hs, p.status, p.img, p.desc, p.descZh || '']));
ins('INSERT INTO codes(id,code,norm,pid,type,source,conf,note) VALUES(?,?,?,?,?,?,?,?)',
  DB.codes.map(x => [x.id, x.code, x.norm, x.pid, x.type, x.source, x.conf, x.note || '']));
ins(`INSERT INTO fitments(id,series_id,band_id,pid,code,fit_style,fit_type,conf,src,series_name,band_name)
     VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
  DB.fitments.map(f => [f.id, f.vid, f.aid, f.pid, f.code, f.pos, f.fit, f.conf, f.src, f.vName, f.aName]));
ins('INSERT INTO tests(id,pid,code,pname,std,item,result,verdict,lab,no,date) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
  DB.tests.map(t => [t.id, t.pid, t.code, t.pname, t.std, t.item, t.result, t.verdict, t.lab, t.no, t.date]));
ins(`INSERT INTO customers(id,name,country,region,type,tz,grade,brand_line,price_level,incoterm,pay,last_order,note)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  DB.customers.map(x => [x.id, x.name, x.country, x.region, x.type, x.tz, x.grade, x.brand, x.priceLevel, x.incoterm, x.pay, x.last, x.note]));
ins(`INSERT INTO leads(id,created,src,company,contact,country,tz,need,need_zh,status,score,owner,next_action,next_date,note)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  DB.leads.map(l => [l.id, l.created, l.src, l.company, l.contact, l.country, l.tz, l.need, l.needZh, l.status, l.score, l.owner, l.next, l.nextDate, l.note]));
ins('INSERT INTO score_rules(k,w,label,desc) VALUES(?,?,?,?)', DB.scoreRules.map(r => [r.k, r.w, r.label, r.desc]));
ins('INSERT INTO templates(id,name,lang,body) VALUES(?,?,?,?)', DB.templates.map(t => [t.id, t.name, t.lang, t.body]));

const count = t => db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;
console.log('data/xiaoman.db 已生成');
for (const t of ['products', 'codes', 'series', 'size_bands', 'fitments', 'tests', 'materials', 'customers', 'leads'])
  console.log(`  ${t}: ${count(t)}`);
db.close();
