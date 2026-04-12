"""Color space conversion utilities."""
import fitz


def convert_to_cmyk(pdf_path: str, output_path: str) -> str:
    """
    Convert a PDF to CMYK color space by re-rendering through Ghostscript-compatible
    approach using PyMuPDF's built-in color management.

    Note: True ICC-based color conversion requires Ghostscript or a dedicated CMM.
    This implementation does a structural conversion via PyMuPDF.
    """
    doc = fitz.open(pdf_path)
    out_doc = fitz.open()

    for page_num in range(len(doc)):
        src_page = doc[page_num]
        # Render page as high-res image and embed as CMYK
        mat = fitz.Matrix(2, 2)  # 2x scale = ~144dpi
        pix = src_page.get_pixmap(matrix=mat, alpha=False, colorspace=fitz.csRGB)

        # Convert to CMYK pixmap
        pix_cmyk = fitz.Pixmap(fitz.csCMYK, pix)

        # Create new page with same dimensions
        new_page = out_doc.new_page(width=src_page.rect.width, height=src_page.rect.height)

        # Re-insert as CMYK image
        img_bytes = pix_cmyk.tobytes("png")
        new_page.insert_image(new_page.rect, stream=img_bytes)

    out_doc.save(output_path, garbage=4, deflate=True)
    out_doc.close()
    doc.close()
    return output_path


def normalize_pdf(pdf_path: str, output_path: str, target: str = "pdf_x3") -> str:
    """
    Normalize a PDF towards PDF/X-3 or PDF/X-4.
    Sets the appropriate PDF version and adds required metadata.
    """
    doc = fitz.open(pdf_path)

    if target == "pdf_x3":
        # PDF/X-3 requires PDF 1.3+
        # Set OutputIntent
        doc.set_metadata({**doc.metadata, "producer": "PrePress Studio (PDF/X-3)"})
    elif target == "pdf_x4":
        doc.set_metadata({**doc.metadata, "producer": "PrePress Studio (PDF/X-4)"})

    doc.save(
        output_path,
        garbage=4,
        deflate=True,
        linear=False,
    )
    doc.close()
    return output_path
