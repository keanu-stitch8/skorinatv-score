/** Rows of the match statistics graphic, in screen order. Every value comes from ESPN's boxscore. */
export const statRows = [
  { key: 'possession', label: 'Penguasaan Bola', kind: 'split' },
  { key: 'shots', label: 'Tembakan' },
  { key: 'shotsOnTarget', label: 'Tembakan Tepat Sasaran' },
  { key: 'saves', label: 'Penyelamatan' },
  { key: 'corners', label: 'Tendangan Sudut' },
  { key: 'fouls', label: 'Pelanggaran' },
  { key: 'passes', label: 'Umpan (suks.)', detail: 'passesAccurate' },
  { key: 'tackles', label: 'Tekel' },
  { key: 'yellowCards', label: 'Kartu Kuning', icon: 'yellow' },
  { key: 'redCards', label: 'Kartu Merah', icon: 'red' },
];

/** ESPN boxscore statistic name for each value on the graphic. */
export const espnStatNames = {
  possession: 'possessionPct',
  shots: 'totalShots',
  shotsOnTarget: 'shotsOnTarget',
  saves: 'saves',
  corners: 'wonCorners',
  fouls: 'foulsCommitted',
  passes: 'totalPasses',
  passesAccurate: 'accuratePasses',
  tackles: 'totalTackles',
  yellowCards: 'yellowCards',
  redCards: 'redCards',
};

export function emptyStats() {
  const side = Object.fromEntries(Object.keys(espnStatNames).map((key) => [key, null]));
  return { home: { ...side }, away: { ...side } };
}
