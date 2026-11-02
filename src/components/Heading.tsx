/** The status word with at most one line under it. */
export function Heading({ word, color, children }: { word: string; color: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <h1 className={`text-[40px] leading-none font-semibold tracking-[-0.03em] ${color}`}>{word}</h1>
      <p className="text-[15px] text-balance text-muted">{children}</p>
    </div>
  );
}
