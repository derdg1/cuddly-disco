"""Imposition – Step & Repeat layout of a PDF onto a press sheet."""
import fitz
import math


MM = 72 / 25.4


def step_and_repeat(
    pdf_path: str,
    output_path: str,
    cols: int = 2,
    rows: int = 2,
    gap_mm: float = 5.0,
    bleed_mm: float = 3.0,
    sheet_width_mm: float | None = None,
    sheet_height_mm: float | None = None,
    page_num: int = 0,
) -> dict:
    """
    Impose a single PDF page onto a press sheet using Step & Repeat.

    Returns info about the resulting layout.
    """
    src = fitz.open(pdf_path)
    if page_num >= len(src):
        page_num = 0
    src_page = src[page_num]

    trim_rect = src_page.trimbox if src_page.trimbox.is_valid else src_page.rect
    trim_w = trim_rect.width
    trim_h = trim_rect.height
    bleed_pt = bleed_mm * MM
    gap_pt = gap_mm * MM

    cell_w = trim_w + bleed_pt * 2 + gap_pt
    cell_h = trim_h + bleed_pt * 2 + gap_pt

    if sheet_width_mm and sheet_height_mm:
        sheet_w = sheet_width_mm * MM
        sheet_h = sheet_height_mm * MM
    else:
        sheet_w = cols * cell_w + gap_pt
        sheet_h = rows * cell_h + gap_pt

    out_doc = fitz.open()
    sheet_page = out_doc.new_page(width=sheet_w, height=sheet_h)

    for row in range(rows):
        for col in range(cols):
            x = gap_pt / 2 + col * cell_w
            y = gap_pt / 2 + row * cell_h
            dest_rect = fitz.Rect(x, y, x + trim_w + bleed_pt * 2, y + trim_h + bleed_pt * 2)
            sheet_page.show_pdf_page(dest_rect, src, page_num)

    out_doc.save(output_path, garbage=4, deflate=True)
    out_doc.close()
    src.close()

    return {
        "sheet_width_mm": round(sheet_w / MM, 2),
        "sheet_height_mm": round(sheet_h / MM, 2),
        "cols": cols,
        "rows": rows,
        "copies": cols * rows,
        "cell_width_mm": round(cell_w / MM, 2),
        "cell_height_mm": round(cell_h / MM, 2),
    }
