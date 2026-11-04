import { shortAddress, shortName } from "@/lib/format";

/** An ENS name and the address it was looked up to. */
export type Ens = { name: string; address: string };

const LONGEST_NAME = 20;

/**
 * The one quiet line of a page reached by name: `asseldonk.eth · 0xEc67…BE35`. A long name is shortened
 * in the middle, and is the part that gives way if the line still does not fit: the address stays whole.
 */
export function EnsLine({ ens }: { ens: Ens }) {
  return (
    <p className="-mb-2 flex max-w-full text-[15px] text-muted">
      <span className="min-w-0 truncate">{shortName(ens.name, LONGEST_NAME)}</span>
      <span className="flex-none whitespace-pre"> · {shortAddress(ens.address)}</span>
    </p>
  );
}
