/** GT layer suffix for each statistic. Must match the layer names in the PSD. */
export const gtFields = {
  possession: 'PenguasaanBola',
  shots: 'Tembakan',
  shotsOnTarget: 'TepatSasaran',
  saves: 'Penyelamatan',
  corners: 'SepakPojok',
  fouls: 'Pelanggaran',
  passes: 'Umpan',
  tackles: 'Tekel',
  yellowCards: 'KartuKuning',
  redCards: 'KartuMerah',
};

const dash = '–';

function format(key, side) {
  const value = side[key];
  if (value == null) return dash;
  if (key === 'possession') return `${value}%`;
  if (key === 'passes') return `${value}(${side.passesAccurate ?? dash})`;
  return String(value);
}

/**
 * One JSON row for the vMix GT title. Column names equal the PSD layer names
 * (Skor_Persib, Persib_Tembakan, Seoul_Umpan, ...). Persib is home, FC Seoul away.
 */
export function toVmixStatsRow(score, stats) {
  const row = {
    Skor_Persib: String(score.home ?? dash),
    Skor_Seoul: String(score.away ?? dash),
  };
  for (const [key, field] of Object.entries(gtFields)) {
    row[`Persib_${field}`] = format(key, stats.home);
    row[`Seoul_${field}`] = format(key, stats.away);
  }
  return row;
}
