import { afterEach, describe, expect, it, vi } from "vitest";
import { decideClipboard, decidePaste, readClipboard } from "./paste";

const ETH_TX = "0x" + "ab".repeat(32);
const BTC_TX = "448f3b960c99ae65462d9440479fadd52ce817971f754fc9ed2030f3d56f1b36";
const ETH_ADDRESS = "0xd8da6bf26964af9d7eed9e03e53415d37aa96045";

describe("decidePaste", () => {
  it("opens a transaction", () => {
    expect(decidePaste(ETH_TX)).toEqual({ kind: "open", href: `/tx/${ETH_TX}` });
    expect(decidePaste(`  ${BTC_TX}\n`)).toEqual({ kind: "open", href: `/tx/${BTC_TX}` });
  });

  it("opens an address", () => {
    expect(decidePaste(ETH_ADDRESS)).toEqual({ kind: "open", href: `/address/${ETH_ADDRESS}` });
  });

  it("opens an ENS name, lowercase and encoded", () => {
    expect(decidePaste("asseldonk.eth")).toEqual({ kind: "open", href: "/address/asseldonk.eth" });
    expect(decidePaste("  ASSELDONK.ETH\n")).toEqual({ kind: "open", href: "/address/asseldonk.eth" });
    expect(decidePaste("jesse.base.eth")).toEqual({ kind: "open", href: "/address/jesse.base.eth" });
    expect(decidePaste("🦄.eth")).toEqual({ kind: "open", href: "/address/%F0%9F%A6%84.eth" });
  });

  it("does not turn a name with a space inside into another name", () => {
    expect(decidePaste("foo bar.eth")).toEqual({ kind: "invalid" });
    expect(decidePaste(".eth")).toEqual({ kind: "invalid" });
    expect(decidePaste("foo.com")).toEqual({ kind: "invalid" });
  });

  it("does not recognise other text", () => {
    expect(decidePaste("hello world")).toEqual({ kind: "invalid" });
    expect(decidePaste("0x1234")).toEqual({ kind: "invalid" });
  });

  it("goes to typing when there is nothing (an empty clipboard)", () => {
    expect(decidePaste("")).toEqual({ kind: "empty" });
    expect(decidePaste("  \n")).toEqual({ kind: "empty" });
    expect(decidePaste(undefined)).toEqual({ kind: "empty" });
    expect(decidePaste(null)).toEqual({ kind: "empty" });
  });
});

describe("decideClipboard", () => {
  it("decides by the text when the read worked", () => {
    expect(decideClipboard({ ok: true, text: BTC_TX })).toEqual({ kind: "open", href: `/tx/${BTC_TX}` });
    expect(decideClipboard({ ok: true, text: "" })).toEqual({ kind: "empty" });
    expect(decideClipboard({ ok: true, text: "  \n" })).toEqual({ kind: "empty" });
    expect(decideClipboard({ ok: true, text: "hello" })).toEqual({ kind: "invalid" });
  });

  it("keeps the paste screen when the read failed", () => {
    expect(decideClipboard({ ok: false })).toEqual({ kind: "unreadable" });
  });
});

describe("readClipboard", () => {
  afterEach(() => vi.unstubAllGlobals());

  const stubClipboard = (clipboard: unknown) => vi.stubGlobal("navigator", { clipboard });

  it("returns the text", async () => {
    stubClipboard({ readText: async () => BTC_TX });
    expect(await readClipboard()).toEqual({ ok: true, text: BTC_TX });
  });

  it("returns an empty text for an empty clipboard", async () => {
    stubClipboard({ readText: async () => "" });
    expect(await readClipboard()).toEqual({ ok: true, text: "" });
  });

  it("fails when the read is rejected, whatever the error", async () => {
    stubClipboard({ readText: () => Promise.reject(new DOMException("denied", "NotAllowedError")) });
    expect(await readClipboard()).toEqual({ ok: false });
    stubClipboard({
      readText: () => {
        throw new Error("boom");
      },
    });
    expect(await readClipboard()).toEqual({ ok: false });
  });

  it("counts a missing clipboard API as empty, because typing is the only way then", async () => {
    stubClipboard(undefined);
    expect(await readClipboard()).toEqual({ ok: true, text: "" });
    stubClipboard({});
    expect(await readClipboard()).toEqual({ ok: true, text: "" });
    vi.stubGlobal("navigator", undefined);
    expect(await readClipboard()).toEqual({ ok: true, text: "" });
  });
});
