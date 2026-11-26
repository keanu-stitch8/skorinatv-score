/**
 * Geometry of the statistics graphic, in artwork pixels (public/stats/background.png).
 * Shared by the /stats page and scripts/gt-psd so the web graphic and the GT title stay aligned.
 */
export const artwork = { width: 1670, height: 941 };

/** Centres of the two empty score boxes in the artwork. */
export const scoreBoxes = { y: 277, left: 754, right: 918, fontSize: 86 };

/** Inner area of the empty statistics panel. */
export const panel = { left: 522, top: 350, width: 626, height: 466 };
export const panelPaddingY = 6;
export const inset = 22;

/** One group is a text line with its bar directly underneath. Groups are spaced evenly (justify-evenly). */
export const group = {
  textHeight: 24,
  textSize: 19,
  barGap: 3,
  barHeight: 7,
  possessionLabelSize: 20,
  possessionBarHeight: 26,
  valueColumn: 150,
  cardIcon: { width: 16, height: 22 },
};

/**
 * Top of each group's text line and bar, matching the browser's justify-evenly layout.
 * @param {Array<{key: string, kind?: string, icon?: string}>} rows
 */
export function groupPositions(rows) {
  const heightOf = (row) => {
    if (row.kind === 'split') return group.textHeight + group.barGap + group.possessionBarHeight;
    if (row.icon) return group.textHeight;
    return group.textHeight + group.barGap + group.barHeight;
  };
  const content = rows.reduce((sum, row) => sum + heightOf(row), 0);
  const space = (panel.height - panelPaddingY * 2 - content) / (rows.length + 1);

  let top = panel.top + panelPaddingY + space;
  return rows.map((row) => {
    const position = { key: row.key, textTop: top, barTop: top + group.textHeight + group.barGap };
    top += heightOf(row) + space;
    return position;
  });
}
