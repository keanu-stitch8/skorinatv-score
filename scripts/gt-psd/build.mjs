// Builds the vMix GT title PSD for the statistics graphic.
//
//   npm run gt:psd [-- <output.psd>] [--point-text] [--folders] [--no-artwork]
//
// One raster artwork layer, bar tracks and card icons, plus real text layers named after the
// columns of /api/stats?format=vmix. Geometry comes from src/modules/scoreboard/lib/stats-layout.js,
// the same module the /stats page uses. Text previews are drawn by render.py (Pillow); set PYTHON
// to a Python with Pillow and numpy if the default python3 lacks them.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writePsdBuffer } from 'ag-psd';
import { statRows } from '../../src/modules/scoreboard/lib/stats.js';
import { artwork, group, inset, panel, scoreBoxes, groupPositions } from '../../src/modules/scoreboard/lib/stats-layout.js';
import { gtFields } from '../../src/modules/scoreboard/mappers/vmix-stats.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const output = resolve(args.find((a) => !a.startsWith('--')) ?? join(root, 'dist/Skorina-Statistik-Persib-vs-Seoul.psd'));
/** Point text instead of box text, for GT versions that do not read paragraph text. */
const pointText = flags.has('--point-text');
/** Keep the folders. Off by default: GT imports can drop layers that sit in folders. */
const useFolders = flags.has('--folders');
/**
 * Leave the artwork out: a transparent overlay of text, bars and icons, plus the artwork as a PNG
 * next to the PSD. Use when GT stacks the full-frame artwork above the other layers.
 */
const overlayOnly = flags.has('--no-artwork');
const python = process.env.PYTHON ?? 'python3';
const renderer = join(root, 'scripts/gt-psd/render.py');

// GT titles are 1080p. The artwork is scaled to cover it and centre-cropped.
const W = 1920, H = 1080;
const work = mkdtempSync(join(tmpdir(), 'gt-psd-'));

try {
  const { scale, offsetX, offsetY } = JSON.parse(execFileSync(python, [
    renderer, 'artwork', join(root, 'public/stats/background.png'), join(work, 'artwork.rgba'), String(W), String(H),
  ]).toString());
  const X = (v) => Math.round(v * scale - offsetX);
  const Y = (v) => Math.round(v * scale - offsetY);
  const size = (v) => Math.round(v * scale);

  const white = { r: 255, g: 255, b: 255 };
  // Arial ships with both Windows and macOS, so neither Photoshop nor GT reports a missing font.
  const fonts = { body: 'Arial-BoldMT', score: 'Arial-Black' };

  /** Anti-aliased rounded rectangle as a raster layer. */
  function roundRect(name, left, top, width, height, radius, [r, g, b, a]) {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const cx = Math.min(Math.max(x + 0.5, radius), width - radius);
      const cy = Math.min(Math.max(y + 0.5, radius), height - radius);
      const cover = Math.max(0, Math.min(1, radius - Math.hypot(x + 0.5 - cx, y + 0.5 - cy) + 0.5));
      const i = (y * width + x) * 4;
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = Math.round(a * cover);
    }
    return { name, left, top, imageData: { width, height, data } };
  }

  /** Box (paragraph) text with fixed bounds, so GT creates a field of a known size. */
  const textSpecs = [];
  function text(name, value, { box, fontSize, justify = 'left', font = fonts.body, pad = 0 }) {
    const { left, top, width, height } = box;
    textSpecs.push({ name, text: value, width, height, size: fontSize, justify, font, pad });
    // Point text anchors at the aligned edge on the baseline (0.35 em below the visual centre).
    const anchorX = justify === 'left' ? left + pad : justify === 'right' ? left + width - pad : left + width / 2;
    const shape = pointText
      ? { transform: [1, 0, 0, 1, anchorX, top + height / 2 + fontSize * 0.35] }
      : { transform: [1, 0, 0, 1, left, top], shapeType: 'box', boxBounds: [0, 0, width, height] };
    return {
      name,
      left,
      top,
      text: {
        text: value,
        ...shape,
        antiAlias: 'smooth',
        style: { font: { name: font }, fontSize, fillColor: white, autoKerning: true },
        paragraphStyle: { justification: justify },
      },
    };
  }

  function boxAt(x, centreY, width, height, anchor) {
    const left = anchor === 'left' ? x : anchor === 'right' ? x - width : x - width / 2;
    return { left: Math.round(left), top: Math.round(centreY - height / 2), width, height };
  }

  // ---- Geometry (artwork pixels → 1080p) ----
  const positions = new Map(groupPositions(statRows).map((p) => [p.key, p]));
  const innerL = panel.left + inset;
  const innerR = panel.left + panel.width - inset;
  const centreX = panel.left + panel.width / 2;
  const textCentre = (row) => Y(positions.get(row.key).textTop + group.textHeight / 2);
  const body = size(group.textSize);
  const fieldHeight = size(group.textHeight) + 2;
  const valueWidth = size(group.valueColumn);

  // Widest expected value, so GT sizes each field wide enough.
  const placeholder = (row) => (row.kind === 'split' ? '100%' : row.detail ? '000(000)' : '00');
  const track = [0x1a, 0x1a, 0x1a, 255];
  const cardColours = { yellow: [0xff, 0xd2, 0x1f, 255], red: [0xff, 0x1f, 0x2d, 255] };

  const barLayers = [];
  const iconLayers = [];
  const labelLayers = [];
  for (const row of statRows) {
    const field = gtFields[row.key];
    const { barTop } = positions.get(row.key);
    if (row.kind === 'split') {
      barLayers.push(roundRect(`Track_${field}`, X(innerL), Y(barTop), X(innerR) - X(innerL), size(group.possessionBarHeight), size(6), track));
    } else if (!row.icon) {
      barLayers.push(roundRect(`Track_${field}`, X(innerL), Y(barTop), X(innerR) - X(innerL), size(group.barHeight), size(group.barHeight / 2), track));
    }
    if (row.icon) {
      const { width, height } = group.cardIcon;
      iconLayers.push(roundRect(`Icon_${field}`, X(centreX - width / 2), Y(positions.get(row.key).textTop + (group.textHeight - height) / 2), size(width), size(height), 3, cardColours[row.icon]));
    } else {
      const labelSize = size(row.kind === 'split' ? group.possessionLabelSize : group.textSize);
      labelLayers.push(text(`Label_${field}`, row.label, { box: boxAt(X(centreX), textCentre(row), 360, fieldHeight, 'center'), fontSize: labelSize, justify: 'center' }));
    }
  }

  /** Value fields for one side: from the panel edge inwards, the width of the value column. */
  function sideLayers(team, justify, edgeX) {
    return statRows.map((row) => {
      const field = gtFields[row.key];
      if (row.kind === 'split') {
        const { barTop } = positions.get(row.key);
        const centreY = Y(barTop + group.possessionBarHeight / 2);
        return text(`${team}_${field}`, placeholder(row), { box: boxAt(edgeX, centreY, 120, fieldHeight, justify), fontSize: body, justify, pad: 9 });
      }
      return text(`${team}_${field}`, placeholder(row), { box: boxAt(edgeX, textCentre(row), valueWidth, fieldHeight, justify), fontSize: body, justify, pad: 8 });
    });
  }

  const scoreSize = size(scoreBoxes.fontSize);
  const scoreBox = (x) => boxAt(X(x), Y(scoreBoxes.y), 130, Math.round(scoreSize * 1.1), 'center');
  const scoreLayers = [
    text('Skor_Persib', '0', { box: scoreBox(scoreBoxes.left), fontSize: scoreSize, justify: 'center', font: fonts.score }),
    text('Skor_Seoul', '0', { box: scoreBox(scoreBoxes.right), fontSize: scoreSize, justify: 'center', font: fonts.score }),
  ];

  const artworkPixels = new Uint8ClampedArray(readFileSync(join(work, 'artwork.rgba')));
  const psd = {
    width: W,
    height: H,
    imageData: { width: W, height: H, data: artworkPixels },
    // GT import supports one folder level only.
    children: [
      { name: 'Latar', children: [{ name: 'Artwork', left: 0, top: 0, imageData: { width: W, height: H, data: artworkPixels } }] },
      { name: 'Bar dan Ikon', children: [...barLayers, ...iconLayers] },
      { name: 'Label', children: labelLayers },
      { name: 'Statistik Persib', children: sideLayers('Persib', 'left', X(innerL)) },
      { name: 'Statistik Seoul', children: sideLayers('Seoul', 'right', X(innerR)) },
      { name: 'Skor', children: scoreLayers },
    ],
  };

  // Text previews, so every text layer has real bounds (GT sizes fields from them).
  const textDir = join(work, 'text');
  mkdirSync(textDir);
  writeFileSync(join(work, 'text.json'), JSON.stringify(textSpecs));
  execFileSync(python, [renderer, 'text', join(work, 'text.json'), textDir], { stdio: 'inherit' });
  for (const folder of psd.children) for (const layer of folder.children) {
    if (!layer.text) continue;
    const spec = textSpecs.find((t) => t.name === layer.name);
    layer.imageData = { width: spec.width, height: spec.height, data: new Uint8ClampedArray(readFileSync(join(textDir, `${layer.name}.rgba`))) };
  }

  // Composite = every layer flattened, so a viewer (or a GT fallback) shows the full title.
  const composite = overlayOnly ? new Uint8ClampedArray(W * H * 4) : new Uint8ClampedArray(artworkPixels);
  for (const folder of psd.children.slice(1)) for (const layer of folder.children) {
    const { width, height, data } = layer.imageData;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const cx = layer.left + x, cy = layer.top + y;
      if (cx < 0 || cy < 0 || cx >= W || cy >= H) continue;
      const si = (y * width + x) * 4, di = (cy * W + cx) * 4, a = data[si + 3] / 255;
      const below = composite[di + 3] / 255;
      const out = a + below * (1 - a);
      for (let c = 0; c < 3; c++) {
        composite[di + c] = out > 0 ? Math.round((data[si + c] * a + composite[di + c] * below * (1 - a)) / out) : 0;
      }
      composite[di + 3] = Math.round(out * 255);
    }
  }
  psd.imageData = { width: W, height: H, data: composite };
  if (overlayOnly) psd.children = psd.children.slice(1);
  if (!useFolders) psd.children = psd.children.flatMap((folder) => folder.children);

  mkdirSync(dirname(output), { recursive: true });
  if (overlayOnly) {
    const png = output.replace(/\.psd$/i, '') + '-artwork.png';
    execFileSync(python, [renderer, 'png', join(work, 'artwork.rgba'), png, String(W), String(H)]);
    console.log(png);
  }
  writeFileSync(output, Buffer.from(writePsdBuffer(psd, { generateThumbnail: false, invalidateTextLayers: true })));

  const count = psd.children.reduce((n, item) => n + (item.children?.length ?? 1), 0);
  console.log(`${output}\n${count} layer, ${textSpecs.length} layer teks (${pointText ? 'point' : 'box'}), ${useFolders ? 'dengan folder' : 'tanpa folder'}${overlayOnly ? ', tanpa artwork' : ''}, 1920×1080 8-bit`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
