"""
Image pixelization pipeline.

Takes an uploaded image and produces:
  1. display version  -- max 512x512, original quality (for the art modal)
  2. pixel version    -- 64x64, 16-color quantized (for the art overlay)
  3. sprite version   -- 16x16, 8-color quantized  (for in-game wall display)

All outputs use NEAREST resampling to preserve the chunky pixel aesthetic.
"""

import os
import uuid
from PIL import Image, ExifTags

from app.config import UPLOAD_DIR, PIXEL_DIR


def _fix_orientation(img: Image.Image) -> Image.Image:
    """Rotate image according to EXIF orientation tag, then strip EXIF."""
    try:
        exif = img.getexif()
        orientation_key = None
        for k, v in ExifTags.TAGS.items():
            if v == "Orientation":
                orientation_key = k
                break

        if orientation_key and orientation_key in exif:
            orientation = exif[orientation_key]
            rotations = {3: 180, 6: 270, 8: 90}
            if orientation in rotations:
                img = img.rotate(rotations[orientation], expand=True)
    except Exception:
        pass
    return img


def _ensure_rgb(img: Image.Image) -> Image.Image:
    """Convert RGBA / palette / grayscale images to RGB."""
    if img.mode in ("RGBA", "LA"):
        background = Image.new("RGB", img.size, (30, 30, 30))
        if img.mode == "RGBA":
            background.paste(img, mask=img.split()[3])
        else:
            background.paste(img.convert("RGBA"), mask=img.convert("RGBA").split()[3])
        return background
    if img.mode != "RGB":
        return img.convert("RGB")
    return img


def pixelize(input_path: str) -> dict:
    """
    Process an image through the pixelization pipeline.

    Returns dict with keys:
        display_path   -- relative URL path for the display version
        pixel_path     -- relative URL path for the pixel version
        sprite_path    -- relative URL path for the sprite version
    All paths are relative to the uploads mount (e.g. "/uploads/abc.png").
    """
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    os.makedirs(PIXEL_DIR, exist_ok=True)

    file_id = uuid.uuid4().hex[:12]

    img = Image.open(input_path)
    img = _fix_orientation(img)
    img = _ensure_rgb(img)

    # 1) Display version -- max 512x512, high quality
    display = img.copy()
    display.thumbnail((512, 512), Image.LANCZOS)
    display_filename = f"{file_id}_display.png"
    display_abs = os.path.join(UPLOAD_DIR, display_filename)
    display.save(display_abs, "PNG")

    # 2) Pixel version -- 64x64, 16-color quantized
    pixel = img.copy()
    pixel = pixel.resize((64, 64), Image.NEAREST)
    pixel = pixel.quantize(colors=16, method=Image.Quantize.MEDIANCUT)
    pixel = pixel.convert("RGB")
    pixel_filename = f"{file_id}_pixel.png"
    pixel_abs = os.path.join(PIXEL_DIR, pixel_filename)
    pixel.save(pixel_abs, "PNG")

    # 3) Sprite version -- 16x16, 8-color quantized (for in-game wall)
    sprite = img.copy()
    sprite = sprite.resize((16, 16), Image.NEAREST)
    sprite = sprite.quantize(colors=8, method=Image.Quantize.MEDIANCUT)
    sprite = sprite.convert("RGB")
    sprite_filename = f"{file_id}_sprite.png"
    sprite_abs = os.path.join(PIXEL_DIR, sprite_filename)
    sprite.save(sprite_abs, "PNG")

    return {
        "display_path": f"/uploads/{display_filename}",
        "pixel_path": f"/uploads/pixel/{pixel_filename}",
        "sprite_path": f"/uploads/pixel/{sprite_filename}",
    }
