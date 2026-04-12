"""Add printer marks (crop marks, registration marks, color bars) to PDF pages."""
import fitz
import math


MM = 72 / 25.4  # points per mm


def add_printer_marks(
    pdf_path: str,
    output_path: str,
    bleed_mm: float = 3.0,
    mark_offset_mm: float = 5.0,
    mark_length_mm: float = 5.0,
    add_crop_marks: bool = True,
    add_registration: bool = True,
    add_color_bar: bool = True,
) -> str:
    """Add printer marks to all pages of a PDF and save to output_path."""
    doc = fitz.open(pdf_path)
    bleed_pt = bleed_mm * MM
    offset_pt = mark_offset_mm * MM
    length_pt = mark_length_mm * MM
    gap_pt = bleed_pt + offset_pt

    for page in doc:
        trim = page.trimbox if page.trimbox.is_valid else page.rect
        x0, y0, x1, y1 = trim.x0, trim.y0, trim.x1, trim.y1

        # Expand media box to fit marks
        margin = gap_pt + length_pt + 5 * MM
        new_media = fitz.Rect(
            x0 - margin, y0 - margin, x1 + margin, y1 + margin
        )
        page.set_mediabox(new_media)

        color_black = (0, 0, 0)
        shape = page.new_shape()

        if add_crop_marks:
            _draw_crop_marks(shape, x0, y0, x1, y1, gap_pt, length_pt, color_black)

        if add_registration:
            _draw_registration_marks(shape, x0, y0, x1, y1, gap_pt, color_black)

        if add_color_bar:
            _draw_color_bar(shape, x0, y1 + gap_pt + 2 * MM, x1, 6 * MM)

        shape.finish(color=None, fill=None)
        shape.commit()

    doc.save(output_path, garbage=4, deflate=True)
    doc.close()
    return output_path


def _draw_crop_marks(shape, x0, y0, x1, y1, gap, length, color):
    """Draw crop marks at all four corners."""
    stroke = {"color": color, "width": 0.25}

    # Top-left corner – horizontal
    shape.draw_line(fitz.Point(x0 - gap - length, y0), fitz.Point(x0 - gap, y0))
    shape.finish(**stroke)
    # Top-left corner – vertical
    shape.draw_line(fitz.Point(x0, y0 - gap - length), fitz.Point(x0, y0 - gap))
    shape.finish(**stroke)

    # Top-right corner – horizontal
    shape.draw_line(fitz.Point(x1 + gap, y0), fitz.Point(x1 + gap + length, y0))
    shape.finish(**stroke)
    # Top-right corner – vertical
    shape.draw_line(fitz.Point(x1, y0 - gap - length), fitz.Point(x1, y0 - gap))
    shape.finish(**stroke)

    # Bottom-left corner – horizontal
    shape.draw_line(fitz.Point(x0 - gap - length, y1), fitz.Point(x0 - gap, y1))
    shape.finish(**stroke)
    # Bottom-left corner – vertical
    shape.draw_line(fitz.Point(x0, y1 + gap), fitz.Point(x0, y1 + gap + length))
    shape.finish(**stroke)

    # Bottom-right corner – horizontal
    shape.draw_line(fitz.Point(x1 + gap, y1), fitz.Point(x1 + gap + length, y1))
    shape.finish(**stroke)
    # Bottom-right corner – vertical
    shape.draw_line(fitz.Point(x1, y1 + gap), fitz.Point(x1, y1 + gap + length))
    shape.finish(**stroke)


def _draw_registration_marks(shape, x0, y0, x1, y1, gap, color):
    """Draw registration (passer) marks at center of each side."""
    r = 3 * MM  # radius
    mid_x = (x0 + x1) / 2
    mid_y = (y0 + y1) / 2
    offset = gap + r + 2 * MM

    positions = [
        (mid_x, y0 - offset),  # top center
        (mid_x, y1 + offset),  # bottom center
        (x0 - offset, mid_y),  # left center
        (x1 + offset, mid_y),  # right center
    ]

    for cx, cy in positions:
        center = fitz.Point(cx, cy)
        # Outer circle
        shape.draw_circle(center, r)
        shape.finish(color=color, width=0.25, fill=None)
        # Inner dot
        shape.draw_circle(center, 1)
        shape.finish(color=color, width=0.25, fill=color)
        # Crosshairs
        shape.draw_line(fitz.Point(cx - r * 1.5, cy), fitz.Point(cx + r * 1.5, cy))
        shape.finish(color=color, width=0.25)
        shape.draw_line(fitz.Point(cx, cy - r * 1.5), fitz.Point(cx, cy + r * 1.5))
        shape.finish(color=color, width=0.25)


def _draw_color_bar(shape, x0, y_top, x1, bar_height):
    """Draw a CMYK + RGB color bar below the page."""
    colors_cmyk = [
        (1, 0, 0, 0),   # Cyan
        (0, 1, 0, 0),   # Magenta
        (0, 0, 1, 0),   # Yellow
        (0, 0, 0, 1),   # Key (Black)
        (0, 0, 0, 0.75),
        (0, 0, 0, 0.50),
        (0, 0, 0, 0.25),
        (0, 0, 0, 0),   # White
    ]

    # Convert CMYK to RGB for fitz (which works in RGB)
    def cmyk_to_rgb(c, m, y, k):
        r = (1 - c) * (1 - k)
        g = (1 - m) * (1 - k)
        b = (1 - y) * (1 - k)
        return (r, g, b)

    num = len(colors_cmyk)
    width = x1 - x0
    swatch_w = width / num

    for i, cmyk in enumerate(colors_cmyk):
        rgb = cmyk_to_rgb(*cmyk)
        rect = fitz.Rect(
            x0 + i * swatch_w, y_top, x0 + (i + 1) * swatch_w, y_top + bar_height
        )
        shape.draw_rect(rect)
        shape.finish(color=None, fill=rgb)
