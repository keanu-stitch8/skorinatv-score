"""Raster helpers for build.mjs.

  render.py artwork <src.png> <out.rgba> <width> <height>
      Scale the artwork to cover width×height (Lanczos), centre-crop, write raw RGBA.
  render.py png <in.rgba> <out.png> <width> <height>
      Save raw RGBA as PNG.
  render.py text <spec.json> <out_dir>
      Draw a preview of each text layer box so the PSD carries real bounds and pixels.

Needs Pillow and numpy. Fonts can be overridden with PSD_FONT_BODY and PSD_FONT_SCORE (.ttf paths).
Defaults are the macOS Arial files; on Windows point them at C:\\Windows\\Fonts\\arialbd.ttf and ariblk.ttf.
"""
import json
import os
import sys

try:
    import numpy as np
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    sys.exit('render.py butuh Pillow dan numpy: python3 -m pip install pillow numpy (atau set PYTHON ke venv).')

FONTS = {
    'Arial-BoldMT': os.environ.get('PSD_FONT_BODY', '/System/Library/Fonts/Supplemental/Arial Bold.ttf'),
    'Arial-Black': os.environ.get('PSD_FONT_SCORE', '/System/Library/Fonts/Supplemental/Arial Black.ttf'),
}


def artwork(src, out, width, height):
    image = Image.open(src).convert('RGBA')
    scale = max(width / image.width, height / image.height)
    size = (round(image.width * scale), round(image.height * scale))
    image = image.resize(size, Image.LANCZOS)
    left, top = (size[0] - width) // 2, (size[1] - height) // 2
    image = image.crop((left, top, left + width, top + height))
    with open(out, 'wb') as f:
        f.write(np.asarray(image).tobytes())
    print(json.dumps({'scale': scale, 'offsetX': left, 'offsetY': top}))


def text(spec_path, out_dir):
    with open(spec_path) as f:
        layers = json.load(f)
    for layer in layers:
        w, h = layer['width'], layer['height']
        image = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        font = ImageFont.truetype(FONTS[layer['font']], layer['size'])
        pad = layer.get('pad', 0)
        anchor = {'left': 'lm', 'right': 'rm', 'center': 'mm'}[layer['justify']]
        x = {'left': pad, 'right': w - pad, 'center': w / 2}[layer['justify']]
        ImageDraw.Draw(image).text((x, h / 2), layer['text'], font=font, fill=(255, 255, 255, 255), anchor=anchor)
        with open(os.path.join(out_dir, f"{layer['name']}.rgba"), 'wb') as f:
            f.write(np.asarray(image).tobytes())


if __name__ == '__main__':
    mode = sys.argv[1]
    if mode == 'artwork':
        artwork(sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5]))
    elif mode == 'png':
        w, h = int(sys.argv[4]), int(sys.argv[5])
        with open(sys.argv[2], 'rb') as f:
            Image.frombytes('RGBA', (w, h), f.read()).save(sys.argv[3])
    elif mode == 'text':
        text(sys.argv[2], sys.argv[3])
    else:
        sys.exit(f'Mode tidak dikenal: {mode}')
