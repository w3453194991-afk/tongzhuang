# 生成 data/导入模板.xlsx —— 与 SQLite 库、前端字段一致的 8 张表
# 运行：python build\make_xlsx.py
import json, os
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = json.load(open(os.path.join(ROOT, "data", "db.json"), encoding="utf-8"))
OUT = os.path.join(ROOT, "data", "导入模板.xlsx")

HEAD_FILL = PatternFill("solid", fgColor="2E3A3F")
HEAD_FONT = Font(color="FFFFFF", bold=True, size=10.5)
TITLE_FONT = Font(bold=True, size=14)
SUB_FONT = Font(color="7C7268", size=10)
THIN = Side(style="thin", color="E4D9CC")
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
ALT_FILL = PatternFill("solid", fgColor="FDFBF7")

wb = Workbook()

# ---------- 说明 ----------
ws = wb.active
ws.title = "说明"
ws.column_dimensions["A"].width = 18
ws.column_dimensions["B"].width = 105
ws["A1"] = "小满童装 · 选款与报价中台 —— 数据导入模板"
ws["A1"].font = TITLE_FONT
ws["A2"] = f"数据版本 {D['meta']['version']} · 生成于 {D['meta']['built']} · 与 assets/data.js、data/xiaoman.db 同源"
ws["A2"].font = SUB_FONT

rows = [
    ("怎么用", "在「数据导入」页按 sheet 名称选择对应表，粘贴 CSV 或整表导入；导入只改本机浏览器存储，可随时「恢复默认数据」回滚。"),
    ("产品", f"{D['stats']['products']} 个款号：款号 / 编号 / 品类 / 面料 / 版型 / 尺码 / 克重 / 价格 / MOQ / 包装 / HS。"),
    ("编号", f"{D['stats']['codes']} 条编号：条码 EAN、客户款号、旧款号、平台款号、竞品款号与款号的对应关系。"),
    ("款式系列", f"{D['stats']['vehicles']} 个系列：系列名、款型、上市季、定位、适用尺码段。"),
    ("尺码段", f"{D['stats']['axles']} 个尺码段：婴童 59–98、小童 90–120、中童 110–140、大童 130–160。"),
    ("适穿关系", f"{D['stats']['fitments']} 条：款式系列 × 尺码段 → 款号，含版型、适穿类型、置信度与来源。"),
    ("质检", f"{D['stats']['tests']} 份：GB 31701-2015、GB 18401-2010、OEKO-TEX 100、起球、色牢度、缩水率。"),
    ("线索", f"{len(D['leads'])} 条演示询盘，字段与「询盘线索」页一致。"),
    ("价格口径", "全部为 USD / 件，演示示例值；上线前用真实报价表覆盖。"),
    ("必填与校验", "款号唯一；尺码段必须命中「尺码段」表；适穿关系的置信度只允许 已确认 / 高 / 中 / 低。"),
]
r = 4
for k, v in rows:
    ws.cell(r, 1, k).font = Font(bold=True, size=10.5)
    c = ws.cell(r, 2, v)
    c.alignment = Alignment(wrap_text=True, vertical="top")
    c.font = Font(size=10.5)
    ws.row_dimensions[r].height = 34
    r += 1

# ---------- 表格工具 ----------
def sheet(name, cols, data, widths):
    s = wb.create_sheet(name)
    for i, (k, label) in enumerate(cols, 1):
        c = s.cell(1, i, label)
        c.fill = HEAD_FILL; c.font = HEAD_FONT
        c.alignment = Alignment(horizontal="center", vertical="center")
        c.border = BORDER
        s.column_dimensions[get_column_letter(i)].width = widths[i - 1]
    s.freeze_panes = "A2"
    s.auto_filter.ref = f"A1:{get_column_letter(len(cols))}{len(data) + 1}"
    for ri, row in enumerate(data, 2):
        for ci, (k, _) in enumerate(cols, 1):
            v = row.get(k, "")
            if isinstance(v, (list, dict)):
                v = json.dumps(v, ensure_ascii=False)
            c = s.cell(ri, ci, v)
            c.border = BORDER
            c.alignment = Alignment(vertical="top", wrap_text=False)
            if ri % 2 == 0:
                c.fill = ALT_FILL
    return s

# ---------- 产品 ----------
prod_cols = [
    ("sku", "SKU"), ("code", "款号"), ("nameZh", "款名"), ("nameEn", "英文名"),
    ("cat", "品类"), ("brand", "品牌线"), ("material", "面料"), ("pos", "版型"),
    ("dim", "尺码"), ("holes", "克重 g/m²"), ("price", "参考价 USD"), ("moq", "MOQ 件"),
    ("pack.per", "包装"), ("pack.gw", "毛重 kg/箱"), ("pack.cbm", "体积 CBM/箱"),
    ("hs", "HS 编码"), ("status", "状态"), ("img", "款图路径"), ("descZh", "中文描述"),
]
rows_p = []
for p in D["products"]:
    rows_p.append({
        **p, "pack.per": p["pack"]["per"], "pack.gw": p["pack"]["gw"], "pack.cbm": p["pack"]["cbm"],
    })
sheet("产品", prod_cols, rows_p, [13, 13, 30, 40, 9, 15, 15, 6, 12, 10, 11, 9, 18, 10, 11, 10, 7, 34, 50])

# ---------- 编号 ----------
sheet("编号", [("code", "编号"), ("type", "类型"), ("pid", "所属款号 id"), ("source", "来源"), ("conf", "置信度"), ("note", "备注")],
      D["codes"], [20, 12, 12, 20, 8, 24])

# ---------- 款式系列 ----------
ser_cols = [("id", "系列 id"), ("brand", "品牌线"), ("series", "系列名"), ("model", "款型"),
            ("years", "上市季"), ("cls", "定位"), ("alias", "别名（逗号分隔）"), ("axles", "适用尺码段"), ("note", "说明")]
sheet("款式系列", ser_cols, D["vehicles"], [12, 8, 16, 22, 12, 16, 40, 40, 40])

# ---------- 尺码段 ----------
sheet("尺码段", [("id", "尺码段 id"), ("brand", "分组"), ("model", "尺码"), ("type", "童段"),
                 ("cap", "适用年龄"), ("spec", "身高/围度"), ("alias", "别名")],
      D["axles"], [12, 14, 10, 8, 14, 30, 34])

# ---------- 适穿 ----------
fit_cols = [("vid", "系列 id"), ("vName", "系列"), ("aid", "尺码段 id"), ("aName", "尺码段"),
            ("pid", "款号 id"), ("code", "款号"), ("pos", "版型"), ("fit", "适穿类型"),
            ("conf", "置信度"), ("src", "来源")]
sheet("适穿关系", fit_cols, D["fitments"], [12, 34, 11, 30, 9, 13, 7, 11, 8, 22])

# ---------- 质检 ----------
sheet("质检", [("id", "id"), ("pid", "款号 id"), ("code", "款号"), ("std", "标准"),
               ("item", "检测项"), ("result", "结果"), ("verdict", "判定"),
               ("lab", "实验室"), ("no", "报告号"), ("date", "日期")],
      D["tests"], [8, 8, 12, 16, 26, 34, 8, 40, 18, 12])

# ---------- 线索 ----------
sheet("线索", [("id", "id"), ("created", "创建时间"), ("src", "来源"), ("company", "公司"),
               ("contact", "联系人"), ("country", "国家"), ("need", "原始需求"),
               ("needZh", "中文摘要"), ("status", "状态"), ("score", "评分"), ("owner", "负责人")],
      D["leads"], [9, 17, 12, 34, 20, 10, 60, 34, 10, 7, 10])

wb.save(OUT)
print("data/导入模板.xlsx 已生成：说明 / 产品 / 编号 / 款式系列 / 尺码段 / 适穿关系 / 质检 / 线索")
