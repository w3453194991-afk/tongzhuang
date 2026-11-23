# -*- coding: utf-8 -*-
"""把 docs/方案说明.md 转成 docs/方案说明.docx（标题 / 列表 / 表格 / 代码块 / 引用）。
   轻量通用转换，不依赖 pandoc。用法：python build\\md2docx.py
"""
import os
import re
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'docs', '方案说明.md')
OUT = os.path.join(ROOT, 'docs', '方案说明.docx')
NAVY = RGBColor(0x2E, 0x3A, 0x3F)
CORAL = RGBColor(0xC9, 0x66, 0x4C)
GRAY = RGBColor(0x6B, 0x63, 0x5B)


def set_cn(run, bold=False, size=None, color=None):
    run.font.name = 'Microsoft YaHei'
    run._element.rPr.rFonts.set(qn('w:eastAsia'), '微软雅黑')
    if bold:
        run.bold = True
    if size:
        run.font.size = Pt(size)
    if color is not None:
        run.font.color.rgb = color


def add_rich(par, text, size=10.5, color=None):
    """处理 **粗体** 与 `代码`"""
    for tok in re.split(r'(\*\*[^*]+\*\*|`[^`]+`)', text):
        if not tok:
            continue
        if tok.startswith('**') and tok.endswith('**'):
            r = par.add_run(tok[2:-2]); set_cn(r, bold=True, size=size, color=color)
        elif tok.startswith('`') and tok.endswith('`'):
            r = par.add_run(tok[1:-1]); r.font.name = 'Consolas'
            r.font.size = Pt(size - 0.5); r.font.color.rgb = RGBColor(0x8A, 0x4A, 0x33)
        else:
            r = par.add_run(tok); set_cn(r, size=size, color=color)


def main():
    md = open(SRC, encoding='utf-8').read().split('\n')
    doc = Document()
    sec = doc.sections[0]
    sec.left_margin = sec.right_margin = Cm(2.2)
    sec.top_margin = sec.bottom_margin = Cm(2.0)
    st = doc.styles['Normal']
    st.font.name = 'Microsoft YaHei'
    st.font.size = Pt(10.5)
    st.element.rPr.rFonts.set(qn('w:eastAsia'), '微软雅黑')

    i = 0
    first_h1 = True
    while i < len(md):
        line = md[i].rstrip()
        if not line.strip():
            i += 1
            continue

        if line.strip().startswith('```'):
            buf = []
            i += 1
            while i < len(md) and not md[i].strip().startswith('```'):
                buf.append(md[i]); i += 1
            i += 1
            p = doc.add_paragraph()
            r = p.add_run('\n'.join(buf))
            r.font.name = 'Consolas'; r.font.size = Pt(9)
            r.font.color.rgb = RGBColor(0x3A, 0x35, 0x30)
            p.paragraph_format.left_indent = Cm(0.6)
            p.paragraph_format.space_after = Pt(6)
            continue

        if line.lstrip().startswith('|') and i + 1 < len(md) and re.match(r'^\s*\|[\s:\-\|]+\|\s*$', md[i + 1]):
            rows = []
            while i < len(md) and md[i].lstrip().startswith('|'):
                if not re.match(r'^\s*\|[\s:\-\|]+\|\s*$', md[i]):
                    rows.append([c.strip() for c in md[i].strip().strip('|').split('|')])
                i += 1
            if rows:
                cols = max(len(r) for r in rows)
                t = doc.add_table(rows=len(rows), cols=cols)
                t.style = 'Table Grid'
                t.alignment = WD_TABLE_ALIGNMENT.CENTER
                for ri, row in enumerate(rows):
                    for ci in range(cols):
                        cell = t.cell(ri, ci)
                        cell.text = ''
                        p = cell.paragraphs[0]
                        add_rich(p, row[ci] if ci < len(row) else '', size=9, color=NAVY if ri == 0 else None)
                        if ri == 0:
                            for run in p.runs:
                                run.bold = True
                doc.add_paragraph()
            continue

        m = re.match(r'^(#{1,4})\s+(.*)$', line)
        if m:
            level = len(m.group(1))
            text = m.group(2).strip()
            p = doc.add_paragraph()
            if level == 1 and first_h1:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                r = p.add_run(text); set_cn(r, bold=True, size=22, color=NAVY)
                p.paragraph_format.space_after = Pt(10)
                first_h1 = False
            else:
                r = p.add_run(text)
                size = {2: 15, 3: 12.5, 4: 11}.get(level, 11)
                set_cn(r, bold=True, size=size, color=NAVY if level <= 2 else CORAL)
                p.paragraph_format.space_before = Pt(10 if level <= 2 else 6)
                p.paragraph_format.space_after = Pt(4)
            i += 1
            continue

        if line.lstrip().startswith('>'):
            p = doc.add_paragraph()
            add_rich(p, line.lstrip()[1:].strip(), size=10, color=GRAY)
            p.paragraph_format.left_indent = Cm(0.5)
            i += 1
            continue

        m = re.match(r'^(\s*)[-*]\s+(.*)$', line)
        if m:
            p = doc.add_paragraph(style='List Bullet')
            add_rich(p, m.group(2))
            p.paragraph_format.space_after = Pt(2)
            i += 1
            continue
        m = re.match(r'^(\s*)(\d+)[.)]\s+(.*)$', line)
        if m:
            p = doc.add_paragraph(style='List Number')
            add_rich(p, m.group(3))
            p.paragraph_format.space_after = Pt(2)
            i += 1
            continue

        if re.match(r'^\s*(---|\*\*\*)\s*$', line):
            i += 1
            continue

        p = doc.add_paragraph()
        add_rich(p, line.strip())
        p.paragraph_format.space_after = Pt(5)
        p.paragraph_format.line_spacing = 1.25
        i += 1

    doc.save(OUT)
    print('docs/方案说明.docx 已生成')


if __name__ == '__main__':
    main()
