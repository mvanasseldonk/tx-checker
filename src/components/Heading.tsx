/** The status word with at most one line under it. */
export function Heading({ word, color, children }: { word: string; color: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <h1 className={`display text-[length:calc(40px*var(--display-scale))] leading-[1.05] text-balance ${color}`}>
        {word}
      </h1>
      <p className="max-w-full text-[15px] text-balance text-muted [overflow-wrap:anywhere]">{children}</p>
    </div>
  );
}
