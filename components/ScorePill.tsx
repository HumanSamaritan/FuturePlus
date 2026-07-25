export default function ScorePill({ score }: { score: number | null | undefined }) {
  const value = Number(score ?? 0);
  const label = value >= 80 ? 'Strong' : value >= 65 ? 'Good' : value >= 50 ? 'Moderate' : 'Review';
  return <span className={`score-pill score-${label.toLowerCase()}`}>{label} {value}/100</span>;
}
