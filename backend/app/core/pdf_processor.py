"""Core PDF processing using PyMuPDF (fitz)."""
import fitz  # PyMuPDF
import json
import math
from pathlib import Path
from typing import Any


POINTS_TO_MM = 25.4 / 72.0


def get_pdf_info(pdf_path: str) -> dict[str, Any]:
    """Extract comprehensive metadata from a PDF file."""
    doc = fitz.open(pdf_path)
    try:
        page_count = len(doc)
        first_page = doc[0] if page_count > 0 else None

        width_mm = round(first_page.rect.width * POINTS_TO_MM, 2) if first_page else 0
        height_mm = round(first_page.rect.height * POINTS_TO_MM, 2) if first_page else 0

        # Collect color spaces and spot colors
        color_spaces: set[str] = set()
        spot_colors: set[str] = set()
        fonts: set[str] = set()
        has_transparency = False
        has_rgb = False
        has_cmyk = False
        min_image_dpi = None

        for page_num in range(page_count):
            page = doc[page_num]

            # Fonts
            for font in page.get_fonts(full=True):
                font_name = font[3] if font[3] else font[4]
                if font_name:
                    fonts.add(font_name)

            # Images and color info
            for img in page.get_images(full=True):
                xref = img[0]
                try:
                    img_dict = doc.extract_image(xref)
                    cs = img_dict.get("colorspace", 0)
                    if cs == 1:
                        color_spaces.add("Gray")
                    elif cs == 3:
                        color_spaces.add("RGB")
                        has_rgb = True
                    elif cs == 4:
                        color_spaces.add("CMYK")
                        has_cmyk = True

                    # DPI estimation
                    img_width = img_dict.get("width", 0)
                    img_height = img_dict.get("height", 0)
                    if img_width > 0 and img_height > 0 and first_page:
                        # Approximate DPI based on page size
                        dpi_x = img_width / (width_mm / 25.4) if width_mm > 0 else 72
                        if min_image_dpi is None or dpi_x < min_image_dpi:
                            min_image_dpi = int(dpi_x)
                except Exception:
                    pass

            # Check for transparency (alpha channel usage)
            text_dict = page.get_text("dict")
            if "blocks" in text_dict:
                for block in text_dict["blocks"]:
                    if block.get("type") == 0:  # text block
                        for line in block.get("lines", []):
                            for span in line.get("spans", []):
                                color = span.get("color", 0)
                                if color != 0 and color != 0xFFFFFF:
                                    pass  # simplified

        # Get spot colors via PDF resources
        for page_num in range(page_count):
            page = doc[page_num]
            rsrc = page.get_resources()
            if rsrc:
                colorspace_dict = rsrc.get("ColorSpace", {})
                for cs_name, cs_val in colorspace_dict.items():
                    if isinstance(cs_val, list) and len(cs_val) > 0:
                        if cs_val[0] == "/Separation" or (
                            isinstance(cs_val[0], str) and "Separation" in cs_val[0]
                        ):
                            spot_name = cs_val[1] if len(cs_val) > 1 else cs_name
                            if isinstance(spot_name, str) and spot_name not in ("/None", "/All"):
                                spot_colors.add(spot_name.lstrip("/"))
                            color_spaces.add("Spot")

        metadata = doc.metadata or {}

        file_size = Path(pdf_path).stat().st_size

        return {
            "pages": page_count,
            "width_mm": width_mm,
            "height_mm": height_mm,
            "color_spaces": list(color_spaces),
            "spot_colors": list(spot_colors),
            "fonts": list(fonts),
            "has_transparency": has_transparency,
            "has_rgb": has_rgb,
            "has_cmyk": has_cmyk,
            "min_image_dpi": min_image_dpi,
            "file_size": file_size,
            "pdf_version": doc.pdf_version(),
            "metadata": {
                "title": metadata.get("title", ""),
                "author": metadata.get("author", ""),
                "creator": metadata.get("creator", ""),
                "producer": metadata.get("producer", ""),
                "creation_date": metadata.get("creationDate", ""),
            },
        }
    finally:
        doc.close()


def render_page_preview(pdf_path: str, page_num: int = 0, dpi: int = 150) -> bytes:
    """Render a PDF page as PNG bytes."""
    doc = fitz.open(pdf_path)
    try:
        if page_num >= len(doc):
            page_num = 0
        page = doc[page_num]
        mat = fitz.Matrix(dpi / 72, dpi / 72)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        return pix.tobytes("png")
    finally:
        doc.close()


def render_separation(pdf_path: str, page_num: int, channel: str, dpi: int = 150) -> bytes:
    """Render a single separation channel as grayscale PNG.

    channel: 'C', 'M', 'Y', 'K', or spot color name
    """
    doc = fitz.open(pdf_path)
    try:
        if page_num >= len(doc):
            page_num = 0
        page = doc[page_num]
        mat = fitz.Matrix(dpi / 72, dpi / 72)

        channel_upper = channel.upper()

        if channel_upper in ("C", "M", "Y", "K"):
            # Render as CMYK and extract channel
            pix = page.get_pixmap(matrix=mat, alpha=False, colorspace=fitz.csGRAY)
            # For true separation rendering we render full page and simulate
            pix_cmyk = page.get_pixmap(matrix=mat, alpha=False)
            samples = pix_cmyk.samples
            w, h = pix_cmyk.width, pix_cmyk.height
            n = pix_cmyk.n  # number of color components

            import array as arr
            gray_samples = bytearray(w * h)

            channel_idx = {"C": 0, "M": 1, "Y": 2, "K": 3}
            idx = channel_idx.get(channel_upper, 0)

            for i in range(w * h):
                pixel_offset = i * n
                r = samples[pixel_offset]
                g = samples[pixel_offset + 1] if n > 1 else r
                b = samples[pixel_offset + 2] if n > 2 else r

                # Approximate CMYK from RGB
                r_n = r / 255.0
                g_n = g / 255.0
                b_n = b / 255.0
                k = 1 - max(r_n, g_n, b_n)
                if k < 1:
                    c = (1 - r_n - k) / (1 - k)
                    m = (1 - g_n - k) / (1 - k)
                    y = (1 - b_n - k) / (1 - k)
                else:
                    c = m = y = 0.0

                cmyk = [c, m, y, k]
                val = cmyk[idx] if idx < len(cmyk) else 0
                gray_samples[i] = int((1 - val) * 255)

            result_pix = fitz.Pixmap(fitz.csGRAY, w, h, bytes(gray_samples), 0)
            return result_pix.tobytes("png")
        else:
            # For spot colors: render full page as grayscale
            pix = page.get_pixmap(matrix=mat, alpha=False, colorspace=fitz.csGRAY)
            return pix.tobytes("png")
    finally:
        doc.close()


def calculate_ink_coverage(pdf_path: str, page_num: int = 0) -> dict[str, float]:
    """Calculate approximate ink coverage per CMYK channel for a page (0-100%)."""
    doc = fitz.open(pdf_path)
    try:
        if page_num >= len(doc):
            page_num = 0
        page = doc[page_num]
        mat = fitz.Matrix(72 / 72, 72 / 72)  # 72 dpi for speed
        pix = page.get_pixmap(matrix=mat, alpha=False)
        samples = pix.samples
        w, h = pix.width, pix.height
        n = pix.n
        total = w * h

        c_total = m_total = y_total = k_total = 0.0

        for i in range(total):
            offset = i * n
            r = samples[offset] / 255.0
            g = samples[offset + 1] / 255.0 if n > 1 else r
            b = samples[offset + 2] / 255.0 if n > 2 else r

            k = 1 - max(r, g, b)
            if k < 1:
                c = (1 - r - k) / (1 - k)
                m = (1 - g - k) / (1 - k)
                y = (1 - b - k) / (1 - k)
            else:
                c = m = y = 0.0

            c_total += c
            m_total += m
            y_total += y
            k_total += k

        return {
            "C": round(c_total / total * 100, 2),
            "M": round(m_total / total * 100, 2),
            "Y": round(y_total / total * 100, 2),
            "K": round(k_total / total * 100, 2),
            "total": round((c_total + m_total + y_total + k_total) / total * 100, 2),
        }
    finally:
        doc.close()
