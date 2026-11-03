import { textKey } from "@/lib/motion";
import { Swap } from "./Swap";

/**
 * The status word with at most one line under it. They fade up when they appear, one after the other,
 * and swap when they change (the line by its text, or by `lineKey` when it is markup; `swapLine` off for a
 * change that has its own choreography). The word is announced when it changes.
 */
export function Heading({
  word,
  color,
  lineKey,
  swapLine = true,
  children,
}: {
  word: string;
  color: string;
  lineKey?: string;
  swapLine?: boolean;
  children: React.ReactNode;
}) {
  const key = lineKey ?? textKey(children);
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <h1
        className="display text-[40px] leading-[1.05] text-balance motion-safe:animate-rise"
        style={rise(0)}
      >
        <Swap id={word} live>
          <span className={color}>{word}</span>
        </Swap>
      </h1>
      <p
        className="max-w-full text-[15px] text-balance text-muted [overflow-wrap:anywhere] motion-safe:animate-rise"
        style={rise(1)}
      >
        {key === null ? (
          children
        ) : (
          <Swap id={key} swap={swapLine}>
            {children}
          </Swap>
        )}
      </p>
    </div>
  );
}

// The headline starts at once (within 40 ms of the result), the line 40 ms after it.
function rise(index: number): React.CSSProperties {
  return { "--delay": "40ms", "--i": index } as React.CSSProperties;
}
