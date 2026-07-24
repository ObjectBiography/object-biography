#!/usr/bin/env python3
"""
Watermark Object Biography images with the OB emblem.

Usage:
    python3 scripts/watermark.py images/some-new-photo-1200x1200.jpg [more files...]
    python3 scripts/watermark.py images/*.jpg

Behavior:
- Pastes the OB emblem (same mark as images/emblem.svg, the site favicon) in the
  bottom-right corner of each image, at ~35% opacity, sized to ~16% of the image's
  shorter dimension.
- Backs up the untouched original to images/_originals/<filename> before overwriting,
  unless a backup already exists there (so re-running is safe / idempotent against
  the true original).
- Overwrites the file in place at the given path.

Notes:
- The emblem is redrawn programmatically (rounded square + "OB" in a bold monospace
  font) rather than rasterized from emblem.svg, since no SVG renderer is guaranteed
  to be installed. If emblem.svg's design ever changes, update EMBLEM params below
  to match.
"""
import os
import sys
import shutil
from PIL import Image, ImageDraw, ImageFont

FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/liberation/LiberationMono-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf",
]

WATERMARK_OPACITY = 0.35     # 0-1, fraction of full opacity
MARK_SIZE_FRACTION = 0.16    # fraction of min(width, height)
MARGIN_FRACTION = 0.035      # fraction of min(width, height)
EMBLEM_BASE_SIZE = 400       # render resolution before per-image scaling


def find_font():
    for path in FONT_CANDIDATES:
        if os.path.exists(path):
            return path
    raise RuntimeError("No suitable bold monospace font found; install one or add a path to FONT_CANDIDATES")


def build_emblem():
    size = EMBLEM_BASE_SIZE
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    scale = size / 200
    stroke_w = max(1, round(3 * scale))
    pad = round(8 * scale)
    radius = round(6 * scale)

    draw.rounded_rectangle(
        [pad, pad, size - pad, size - pad],
        radius=radius,
        fill=(250, 250, 248, 255),
        outline=(34, 34, 34, 255),
        width=stroke_w,
    )

    font = ImageFont.truetype(find_font(), round(80 * scale))
    text = "OB"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = size / 2 - tw / 2 - bbox[0]
    ty = size / 2 - th / 2 - bbox[1] - round(4 * scale)
    draw.text((tx, ty), text, font=font, fill=(34, 34, 34, 255))

    alpha = img.split()[3].point(lambda a: int(a * WATERMARK_OPACITY))
    img.putalpha(alpha)
    return img


def watermark_file(path, emblem):
    images_dir = os.path.dirname(os.path.abspath(path))
    backup_dir = os.path.join(images_dir, "_originals")
    os.makedirs(backup_dir, exist_ok=True)
    backup_path = os.path.join(backup_dir, os.path.basename(path))
    if not os.path.exists(backup_path):
        shutil.copy2(path, backup_path)

    base = Image.open(path).convert("RGB")
    w, h = base.size
    mark_size = max(48, round(min(w, h) * MARK_SIZE_FRACTION))
    mark = emblem.resize((mark_size, mark_size), Image.LANCZOS)
    margin = round(min(w, h) * MARGIN_FRACTION)
    x = w - mark_size - margin
    y = h - mark_size - margin
    base.paste(mark, (x, y), mark)
    base.save(path, quality=92)
    print(f"watermarked {path} ({w}x{h}, mark {mark_size}px)")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    emblem = build_emblem()
    for path in sys.argv[1:]:
        if not os.path.exists(path):
            print(f"skip (not found): {path}")
            continue
        try:
            watermark_file(path, emblem)
        except Exception as exc:
            print(f"skip (error: {exc}): {path}")


if __name__ == "__main__":
    main()
