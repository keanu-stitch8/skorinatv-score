import { Suspense } from 'react';
import ScoreboardSection from '../sections/scoreboard-section';

export default function ScoreboardView({ output }) {
  const content = (
    <Suspense fallback={<div className="min-h-screen" aria-busy="true" />}>
      <ScoreboardSection output={output} />
    </Suspense>
  );

  if (!output) return content;

  return (
    <div className="min-h-screen overflow-hidden bg-[#101b37] bg-[linear-gradient(118deg,transparent_73%,#a91e3923_73%,#a91e3923_74%,transparent_74%),radial-gradient(ellipse_at_13%_28%,#143e88,transparent_64%),radial-gradient(ellipse_at_96%_53%,#54263d,transparent_57%)] leading-[normal] text-[#f5f7fb]">
      {content}
    </div>
  );
}
