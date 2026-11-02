import { describe, expect, it } from "vitest";
import { formatAmount, formatEur, shortAddress } from "./format";

describe("formatAmount", () => {
  it("keeps amounts short", () => {
    expect(formatAmount(0)).toBe("0");
    expect(formatAmount(1.25)).toBe("1.25");
    expect(formatAmount(1.234567)).toBe("1.2346");
    expect(formatAmount(1204.5)).toBe("1,204.5");
    expect(formatAmount(0.004213)).toBe("0.004213");
    expect(formatAmount(0.00004)).toBe("<0.0001");
  });
});

describe("formatEur", () => {
  it("shows whole euros from €100 and cents below", () => {
    expect(formatEur(3112.4)).toBe("€3,112");
    expect(formatEur(1.5)).toBe("€1.50");
    expect(formatEur(0.004)).toBe("<€0.01");
  });
});

describe("shortAddress", () => {
  it("keeps the head and tail", () => {
    expect(shortAddress("0x12ab34cd56ef7890a1b2c3d4e5f60718293a9f3c")).toBe("0x12ab…9f3c");
  });
});
