/** What happened when someone asked to share a link. */
export type ShareOutcome = "shared" | "cancelled" | "copied" | "failed";

/** The bits of `navigator` that sharing needs, passed in so the choices can be tested. */
export type ShareEnv = {
  share?: (data: ShareData) => Promise<void>;
  canShare?: (data: ShareData) => boolean;
  writeText?: (text: string) => Promise<void>;
};

/** The link to one transaction on this site. Never the current URL: an address page carries `?seen=`. */
export function txLink(origin: string, id: string): string {
  return `${origin}/tx/${encodeURIComponent(id)}`;
}

export function shareData(url: string): ShareData {
  // The link goes in `url` only. Android puts text and url in one message and iOS shows both,
  // so a link repeated in `text` would appear twice.
  return { title: "Ancoro", text: "Did my transaction go through?", url };
}

/**
 * Opens the share sheet when the device has one; otherwise, or when it breaks, copies the link.
 * Call it straight from a click: the share sheet only opens during a user gesture.
 */
export async function shareLink(url: string, env: ShareEnv): Promise<ShareOutcome> {
  const data = shareData(url);
  if (env.share && env.canShare?.(data) !== false) {
    try {
      await env.share(data);
      return "shared";
    } catch (error) {
      // Closing the share sheet is a choice, not a failure.
      if ((error as { name?: string } | null)?.name === "AbortError") return "cancelled";
    }
  }
  try {
    if (!env.writeText) return "failed";
    await env.writeText(url);
    return "copied";
  } catch {
    return "failed";
  }
}
