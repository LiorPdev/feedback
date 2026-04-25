import {
  Star,
  Trophy,
  Crown,
  type LucideIcon
} from "lucide-react";
import styles from "./RaterBadge.module.css";

interface Tier {
  min: number;
  icon: LucideIcon;
}

const TIERS: Tier[] = [
  { min: 8.0, icon: Crown },
  { min: 6.0, icon: Trophy },
  { min: 4.0, icon: Star },
];

interface RaterBadgeProps {
  score: number | null | undefined;
  showLabel?: boolean;
  variant?: "default" | "plain";
  className?: string;
}

export default function RaterBadge({
  score,
  showLabel = true,
  variant = "default",
  className = ""
}: RaterBadgeProps) {
  if (score === null || score === undefined || score === 0) return null;

  const tier = TIERS.find(t => score >= t.min);
  const Icon = tier?.icon;

  const formattedScore = score.toFixed(1);

  const badgeClass = variant === "plain" ? styles.badgePlain : styles.badge;

  return (
    <div className={`${badgeClass} ${className}`}>
      {variant !== "plain" && Icon && <Icon size={14} className={styles.icon} />}
      {showLabel && <span className={styles.label}>{formattedScore}</span>}
    </div>
  );
}
