import { formatVote, getRatingRingColor } from "@/lib/utils";

export function RatingRing({ value, size = 48, strokeWidth = 4 }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const score = Math.max(0, Math.min(10, Number(value || 0)));
  const progress = (score / 10) * circumference;

  return (
    <div
      className="relative flex items-center justify-center rounded-full bg-black/72 shadow-lg backdrop-blur"
      style={{ height: size, width: size }}
    >
      <svg className="-rotate-90" viewBox="0 0 44 44" aria-hidden="true" style={{ height: size, width: size }}>
        <circle cx="22" cy="22" r={radius} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={strokeWidth} />
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke={getRatingRingColor(score)}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
          strokeDasharray={`${progress} ${circumference - progress}`}
        />
      </svg>
      <span className="absolute text-[11px] font-bold text-white">{formatVote(score)}</span>
    </div>
  );
}
