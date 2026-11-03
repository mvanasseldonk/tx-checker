import { describe, expect, it } from "vitest";
import { isCheckable, SHAKE_KEYFRAMES, SHAKE_MS, staggerDelay, textKey } from "./motion";

const ETH_HASH = "0x448f3b960c99ae65462d9440479fadd52ce817971f754fc9ed2030f3d56f1b36";
const ETH_ADDRESS = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

describe("isCheckable", () => {
  it("accepts a hash, an address and an explorer link, with stray spaces", () => {
    expect(isCheckable(ETH_HASH)).toBe(true);
    expect(isCheckable(`  ${ETH_ADDRESS}\n`)).toBe(true);
    expect(isCheckable(`https://etherscan.io/tx/${ETH_HASH}`)).toBe(true);
  });

  it("rejects an empty field, other text and a cut-off hash", () => {
    expect(isCheckable("")).toBe(false);
    expect(isCheckable("   ")).toBe(false);
    expect(isCheckable("hello")).toBe(false);
    expect(isCheckable(ETH_HASH.slice(0, -1))).toBe(false);
  });

  it("does not even try a huge paste", () => {
    expect(isCheckable("1".repeat(5000))).toBe(false);
  });
});

describe("textKey", () => {
  it("is the text itself for strings and numbers", () => {
    expect(textKey("Pending")).toBe("Pending");
    expect(textKey(3)).toBe("3");
    expect(textKey("")).toBe("");
  });

  it("is null for markup and nothing", () => {
    expect(textKey({ type: "span" })).toBeNull();
    expect(textKey(null)).toBeNull();
    expect(textKey(undefined)).toBeNull();
    expect(textKey(["a", "b"])).toBeNull();
  });
});

describe("staggerDelay", () => {
  it("steps by 40 ms by default", () => {
    expect([0, 1, 2].map((i) => staggerDelay(i))).toEqual([0, 40, 80]);
  });

  it("starts after the lead, and lets late items start together", () => {
    expect(staggerDelay(2, { step: 25, lead: 100 })).toBe(150);
    expect(staggerDelay(50, { step: 25, cap: 4 })).toBe(100);
    expect(staggerDelay(-1)).toBe(0);
  });

  it("keeps the rows of the details sheet inside 300 ms (5 rows of 180 ms, 25 ms apart)", () => {
    expect(staggerDelay(4, { step: 25 }) + 180).toBeLessThan(300);
  });
});

describe("the shake", () => {
  it("is three small moves out and back in 300 ms, ending where it began", () => {
    expect(SHAKE_MS).toBe(300);
    const moves = SHAKE_KEYFRAMES.map((frame) => frame.transform);
    expect(moves[0]).toBe("translateX(0px)");
    expect(moves.at(-1)).toBe("translateX(0px)");
    expect(moves.filter((move) => move !== "translateX(0px)")).toHaveLength(5);
    expect(SHAKE_KEYFRAMES.map((frame) => frame.offset)).toEqual([0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6, 1]);
  });
});
