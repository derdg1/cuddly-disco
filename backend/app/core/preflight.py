"""Preflight engine – checks PDF against print production standards."""
import fitz
from typing import Any


SEVERITY = {"error": 2, "warning": 1, "info": 0}


def _issue(severity: str, code: str, message: str, page: int | None = None) -> dict[str, Any]:
    return {"severity": severity, "code": code, "message": message, "page": page}


def run_preflight(pdf_path: str, profile: str = "default") -> dict[str, Any]:
    """
    Run preflight checks on a PDF file.

    Profiles:
      - default: General print production checks
      - pdf_x3: PDF/X-3 compliance
      - pdf_x4: PDF/X-4 compliance
    """
    issues: list[dict[str, Any]] = []
    doc = fitz.open(pdf_path)

    try:
        page_count = len(doc)

        for page_num in range(page_count):
            page = doc[page_num]
            page_label = page_num + 1

            # --- Bleed check ---
            media_box = page.mediabox
            bleed_box = page.bleedbox
            trim_box = page.trimbox

            media_w = media_box.width
            media_h = media_box.height
            trim_w = trim_box.width if trim_box else media_w
            trim_h = trim_box.height if trim_box else media_h

            bleed_margin_x = (media_w - trim_w) / 2
            bleed_margin_y = (media_h - trim_h) / 2
            min_bleed_pts = 3 * 72 / 25.4  # 3mm in points

            if bleed_margin_x < min_bleed_pts or bleed_margin_y < min_bleed_pts:
                issues.append(
                    _issue(
                        "warning",
                        "BLEED_INSUFFICIENT",
                        f"Page {page_label}: Bleed < 3mm "
                        f"(H:{bleed_margin_x:.1f}pt, V:{bleed_margin_y:.1f}pt). "
                        "Minimum 3mm bleed recommended for print.",
                        page_label,
                    )
                )

            # --- Font embedding ---
            for font in page.get_fonts(full=True):
                font_ref = font[0]
                font_name = font[3] or font[4] or "Unknown"
                # font[5] is the encoding, font[1] is the reference name
                # Check if embedded: try to extract font data
                try:
                    font_data = doc.extract_font(font_ref)
                    if not font_data or not font_data[3]:  # no font stream
                        issues.append(
                            _issue(
                                "error",
                                "FONT_NOT_EMBEDDED",
                                f"Page {page_label}: Font '{font_name}' is not embedded.",
                                page_label,
                            )
                        )
                except Exception:
                    pass

            # --- Image resolution ---
            for img_info in page.get_image_info(hashes=False):
                xref = img_info.get("xref", 0)
                img_w = img_info.get("width", 0)
                img_h = img_info.get("height", 0)
                # Get rendered size on page (in points)
                bbox = img_info.get("bbox", None)
                if bbox and img_w > 0 and img_h > 0:
                    rendered_w_pt = bbox[2] - bbox[0]
                    rendered_h_pt = bbox[3] - bbox[1]
                    if rendered_w_pt > 0 and rendered_h_pt > 0:
                        dpi_x = img_w / (rendered_w_pt / 72)
                        dpi_y = img_h / (rendered_h_pt / 72)
                        effective_dpi = min(dpi_x, dpi_y)
                        if effective_dpi < 150:
                            issues.append(
                                _issue(
                                    "error",
                                    "IMAGE_LOW_RESOLUTION",
                                    f"Page {page_label}: Image has {effective_dpi:.0f} DPI "
                                    "(minimum 150 DPI required, 300 DPI recommended).",
                                    page_label,
                                )
                            )
                        elif effective_dpi < 300:
                            issues.append(
                                _issue(
                                    "warning",
                                    "IMAGE_LOW_RESOLUTION",
                                    f"Page {page_label}: Image has {effective_dpi:.0f} DPI "
                                    "(300 DPI recommended for print quality).",
                                    page_label,
                                )
                            )

            # --- Color space: RGB in CMYK workflow ---
            for img_info in page.get_image_info():
                cs = img_info.get("colorspace", 0)
                if cs == 3:  # RGB
                    issues.append(
                        _issue(
                            "warning",
                            "RGB_IMAGE",
                            f"Page {page_label}: Contains RGB image. "
                            "Convert to CMYK for print production.",
                            page_label,
                        )
                    )
                    break  # one warning per page is enough

            # --- Overprint simulation (basic check) ---
            # Check if there is overprint set in the graphics state
            # This is a simplified check via the page dict
            rsrc = page.get_resources()
            if rsrc and rsrc.get("ExtGState"):
                for gs_name, gs_val in rsrc["ExtGState"].items():
                    if isinstance(gs_val, dict):
                        if gs_val.get("op") or gs_val.get("OP"):
                            issues.append(
                                _issue(
                                    "info",
                                    "OVERPRINT_DETECTED",
                                    f"Page {page_label}: Overprint mode is active. "
                                    "Verify overprint settings are intentional.",
                                    page_label,
                                )
                            )
                            break

            # --- Transparency ---
            for img_info in page.get_image_info():
                if img_info.get("has-alpha"):
                    issues.append(
                        _issue(
                            "warning",
                            "TRANSPARENCY",
                            f"Page {page_label}: Contains transparency/alpha channel. "
                            "Flatten transparency before printing.",
                            page_label,
                        )
                    )
                    break

        # --- PDF version check ---
        version = doc.pdf_version()
        if profile in ("pdf_x3", "pdf_x4"):
            if profile == "pdf_x3" and version < "1.3":
                issues.append(
                    _issue("error", "PDF_VERSION", f"PDF/X-3 requires PDF 1.3+. Found: {version}")
                )
            elif profile == "pdf_x4" and version < "1.6":
                issues.append(
                    _issue("error", "PDF_VERSION", f"PDF/X-4 requires PDF 1.6+. Found: {version}")
                )

        # Summary
        errors = sum(1 for i in issues if i["severity"] == "error")
        warnings = sum(1 for i in issues if i["severity"] == "warning")
        infos = sum(1 for i in issues if i["severity"] == "info")

        passed = errors == 0

        return {
            "passed": passed,
            "profile": profile,
            "pages_checked": page_count,
            "errors": errors,
            "warnings": warnings,
            "infos": infos,
            "issues": issues,
        }

    finally:
        doc.close()
