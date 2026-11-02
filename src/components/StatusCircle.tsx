const RADIUS = 98;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** A white circle with a ring around it, filled for `progress` (0–1) of the way. */
export function Ring({
  color,
  track,
  progress,
  spinning = false,
  children,
}: {
  color: string;
  track: string;
  progress: number;
  spinning?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative size-52">
      <svg
        width="208"
        height="208"
        viewBox="0 0 208 208"
        aria-hidden="true"
        className={`absolute inset-0 ${spinning ? "motion-safe:animate-[spin_1.4s_linear_infinite]" : ""}`}
      >
        <circle cx="104" cy="104" r="94" fill="#fff" />
        <circle cx="104" cy="104" r={RADIUS} fill="none" stroke={track} strokeWidth="8" />
        {progress > 0 && (
          <circle
            cx="104"
            cy="104"
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${CIRCUMFERENCE * progress} ${CIRCUMFERENCE}`}
            transform="rotate(-90 104 104)"
            className="motion-safe:transition-[stroke-dasharray] motion-safe:duration-700"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-6 text-center">
        {children}
      </div>
    </div>
  );
}

/** A solid disc: the transaction is settled one way or the other. */
export function Disc({ color, shadow, children }: { color: string; shadow: string; children: React.ReactNode }) {
  return (
    <div
      className="flex size-52 flex-col items-center justify-center gap-1 rounded-full px-6 text-center text-white"
      style={{ background: color, boxShadow: `0 24px 48px -20px ${shadow}` }}
    >
      {children}
    </div>
  );
}
