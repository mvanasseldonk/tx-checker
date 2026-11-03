import { CircleTransition } from "./CircleTransition";

const RADIUS = 98;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const CENTER = "104px 104px";

/**
 * A white circle with a ring around it, filled for `progress` (0–1) of the way.
 * `spinning` is the fast spin of "Checking". `following` is the calm motion of a status that is
 * still being followed: the arc travels around the track, or, when `pulse` is set, the leading
 * end of the ring breathes. `still` pauses it where it is. `drawIn` grows the ring from nothing when it appears.
 * `cover` sits between the ring and its content, and `contentClassName` and `contentStyle` style
 * the content.
 */
export function Ring({
  color,
  track,
  progress,
  spinning = false,
  following = false,
  pulse = false,
  still = false,
  drawIn = true,
  cover,
  contentClassName = "",
  contentStyle,
  children,
}: {
  color: string;
  track: string;
  progress: number;
  spinning?: boolean;
  following?: boolean;
  pulse?: boolean;
  still?: boolean;
  drawIn?: boolean;
  cover?: React.ReactNode;
  contentClassName?: string;
  contentStyle?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  return (
    <CircleTransition>
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
            <g
              className={following && !pulse ? "motion-safe:animate-travel" : ""}
              style={{ transformOrigin: CENTER, animationPlayState: still ? "paused" : "running" }}
            >
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
                className={`motion-safe:transition-[stroke-dasharray,stroke] motion-safe:duration-700 ${
                  drawIn ? "motion-safe:animate-draw" : ""
                }`}
              />
            </g>
          )}
          {following && pulse && (
            // A soft halo on the leading end of the ring, turned along with the ring as it grows.
            <g
              className="motion-safe:transition-transform motion-safe:duration-700"
              style={{ transformOrigin: CENTER, transform: `rotate(${progress * 360}deg)` }}
            >
              <circle
                cx="104"
                cy={104 - RADIUS}
                r="4"
                fill={color}
                className="opacity-0 motion-safe:animate-pulse-end"
                style={{ transformBox: "fill-box", transformOrigin: "center", animationPlayState: still ? "paused" : "running" }}
              />
            </g>
          )}
        </svg>
        {cover}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center gap-1 px-5 text-center ${contentClassName}`}
          style={contentStyle}
        >
          {children}
        </div>
      </div>
    </CircleTransition>
  );
}

/** A solid disc: the transaction is settled one way or the other. */
export function Disc({ color, shadow, children }: { color: string; shadow: string; children: React.ReactNode }) {
  return (
    <CircleTransition>
      <div
        className="flex size-52 flex-col items-center justify-center gap-1 rounded-full px-5 text-center text-white"
        style={{ background: color, boxShadow: `0 24px 48px -20px ${shadow}` }}
      >
        {children}
      </div>
    </CircleTransition>
  );
}
