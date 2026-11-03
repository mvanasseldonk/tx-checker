import { describe, expect, it, vi } from "vitest";
import { shareData, shareLink, txLink } from "./share";

const URL = "https://ancoro.example/tx/abc";

describe("txLink", () => {
  it("is the clean transaction link", () => {
    expect(txLink("https://ancoro.example", "0xab")).toBe("https://ancoro.example/tx/0xab");
  });
});

describe("shareData", () => {
  it("keeps the link out of the text so it is not shown twice", () => {
    const data = shareData(URL);
    expect(data.url).toBe(URL);
    expect(data.title).toBe("Ancoro");
    expect(data.text).not.toContain("http");
  });
});

describe("shareLink", () => {
  it("opens the share sheet when the device has one", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn();
    expect(await shareLink(URL, { share, writeText })).toBe("shared");
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: URL }));
    expect(writeText).not.toHaveBeenCalled();
  });

  it("stays silent when the share sheet is closed", async () => {
    const share = vi.fn().mockRejectedValue(new DOMException("closed", "AbortError"));
    const writeText = vi.fn();
    expect(await shareLink(URL, { share, writeText })).toBe("cancelled");
    expect(writeText).not.toHaveBeenCalled();
  });

  it("copies the link when sharing fails", async () => {
    const share = vi.fn().mockRejectedValue(new DOMException("nope", "NotAllowedError"));
    const writeText = vi.fn().mockResolvedValue(undefined);
    expect(await shareLink(URL, { share, writeText })).toBe("copied");
    expect(writeText).toHaveBeenCalledWith(URL);
  });

  it("copies the link when the device has no share sheet", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    expect(await shareLink(URL, { writeText })).toBe("copied");
    expect(writeText).toHaveBeenCalledWith(URL);
  });

  it("copies the link when canShare refuses it", async () => {
    const share = vi.fn();
    const writeText = vi.fn().mockResolvedValue(undefined);
    expect(await shareLink(URL, { share, canShare: () => false, writeText })).toBe("copied");
    expect(share).not.toHaveBeenCalled();
  });

  it("shares when canShare is not there or agrees", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    expect(await shareLink(URL, { share, canShare: () => true })).toBe("shared");
  });

  it("fails when copying fails too", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    expect(await shareLink(URL, { writeText })).toBe("failed");
    const share = vi.fn().mockRejectedValue(new Error("broken"));
    expect(await shareLink(URL, { share, writeText })).toBe("failed");
  });

  it("fails when there is no clipboard either", async () => {
    expect(await shareLink(URL, {})).toBe("failed");
  });
});
