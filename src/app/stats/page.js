import { Inter, Montserrat } from 'next/font/google';
import { connection } from 'next/server';
import StatsGraphic from '../../modules/scoreboard/components/stats-graphic';
import { getScoreboard } from '../../modules/scoreboard/queries/scoreboard-query';
import { getStats } from '../../modules/scoreboard/queries/stats-query';

const montserrat = Montserrat({ subsets: ['latin'], weight: ['900'], variable: '--font-montserrat' });
const inter = Inter({ subsets: ['latin'], weight: ['500', '600'] });

export const metadata = { title: 'Statistik | Skorina TV' };

export default async function StatsPage() {
  await connection();
  const [initial, initialStats] = await Promise.all([getScoreboard(), getStats()]);

  return (
    <div className={`${montserrat.variable} ${inter.className}`}>
      <StatsGraphic initial={initial} initialStats={initialStats} />
    </div>
  );
}
