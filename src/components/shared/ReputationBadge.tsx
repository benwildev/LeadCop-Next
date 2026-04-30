import { Shield } from "lucide-react";

export function getReputationColor(score: number): string {
  if (score >= 80) return "text-green-500 bg-green-500/10";
  if (score >= 50) return "text-yellow-400 bg-yellow-400/10";
  return "text-red-400 bg-red-500/10";
}

export function getReputationLabel(score: number): string {
  if (score >= 80) return "Good";
  if (score >= 50) return "Moderate";
  return "Poor";
}

export default function ReputationBadge({ score }: { score: number }) {
  const color = getReputationColor(score);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ${color}`}
      aria-label={`Reputation score: ${score} (${getReputationLabel(score)})`}
    >
      <Shield className="h-3 w-3" />
      {score}
    </span>
  );
}
