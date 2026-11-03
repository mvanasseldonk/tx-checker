import { describe, expect, it } from "vitest";
import { decidePaste } from "./paste";

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

  it("does not recognise other text", () => {
    expect(decidePaste("hello world")).toEqual({ kind: "invalid" });
    expect(decidePaste("0x1234")).toEqual({ kind: "invalid" });
  });

  it("goes to typing when there is nothing (empty, denied or unsupported clipboard)", () => {
    expect(decidePaste("")).toEqual({ kind: "empty" });
    expect(decidePaste("  \n")).toEqual({ kind: "empty" });
    expect(decidePaste(undefined)).toEqual({ kind: "empty" });
    expect(decidePaste(null)).toEqual({ kind: "empty" });
  });
});
