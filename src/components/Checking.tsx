import { CHAIN_LABEL, shortId, type Chain } from "@/lib/detect";

const RADIUS = 98;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** The circle spinning while a transaction is looked up. */
export function Checking({ chain, id }: { chain?: Chain; id?: string }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pt-5 pb-8">
      <header className="flex h-11 items-center">
        {chain && (
          <span className="text-xs tracking-[0.14em] text-muted">{CHAIN_LABEL[chain]}</span>
        )}
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-7 pb-10">
        <div className="relative size-52">
          <svg
            width="208"
            height="208"
            viewBox="0 0 208 208"
            aria-hidden="true"
            className="absolute inset-0 motion-safe:animate-[spin_1.4s_linear_infinite]"
          >
            <circle cx="104" cy="104" r="94" fill="#fff" />
            <circle
              cx="104"
              cy="104"
              r={RADIUS}
              fill="none"
              stroke="rgba(16,19,24,0.08)"
              strokeWidth="8"
            />
            <circle
              cx="104"
              cy="104"
              r={RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${CIRCUMFERENCE * 0.15} ${CIRCUMFERENCE}`}
              transform="rotate(-90 104 104)"
            />
          </svg>
          {chain && id && (
            <span className="absolute inset-0 flex items-center justify-center font-mono text-[15px] text-muted">
              {shortId(chain, id)}
            </span>
          )}
        </div>
        <p role="status" className="text-[15px] text-muted">
          Checking
        </p>
      </div>
    </main>
  );
}
