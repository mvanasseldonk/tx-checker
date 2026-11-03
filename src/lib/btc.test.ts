import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { lookupBtc, placeInLine, sentOutputs, type ProjectedBlock } from "./btc";

const input = (address?: string) => ({ prevout: address ? { scriptpubkey_address: address } : null });
const output = (value: number, address?: string) => ({ value, scriptpubkey_address: address });

describe("sentOutputs", () => {
  it("leaves out change that goes back to an input address", () => {
    const tx = { vin: [input("alice")], vout: [output(74_900_000, "bob"), output(12_465_505, "alice")] };
    expect(sentOutputs(tx)).toEqual({ sats: 74_900_000, addresses: ["bob"] });
  });

  it("totals several outputs and names their addresses", () => {
    const tx = {
      vin: [input("alice"), input("alice2")],
      vout: [output(100, "bob"), output(200, "carol"), output(300, "dave"), output(50, "alice2")],
    };
    expect(sentOutputs(tx)).toEqual({ sats: 600, addresses: ["bob", "carol", "dave"] });
  });

  it("counts two outputs to one address as one address", () => {
    const tx = { vin: [input("alice")], vout: [output(100, "bob"), output(200, "bob")] };
    expect(sentOutputs(tx)).toEqual({ sats: 300, addresses: ["bob"] });
  });

  it("ignores outputs without an address, such as OP_RETURN", () => {
    const tx = { vin: [input("alice")], vout: [output(0), output(500, "bob"), output(40, "alice")] };
    expect(sentOutputs(tx)).toEqual({ sats: 500, addresses: ["bob"] });
  });

  it("counts every output when all of them go back to the sender", () => {
    const tx = { vin: [input("alice")], vout: [output(700, "alice"), output(200, "alice")] };
    expect(sentOutputs(tx)).toEqual({ sats: 900, addresses: ["alice"] });
  });

  it("counts every output when only outputs without an address are left over", () => {
    const tx = { vin: [input("alice")], vout: [output(0), output(300, "alice")] };
    expect(sentOutputs(tx)).toEqual({ sats: 300, addresses: ["alice"] });
  });

  it("copes with inputs that have no address", () => {
    const tx = { vin: [input()], vout: [output(5_000_000_000, "miner")] };
    expect(sentOutputs(tx)).toEqual({ sats: 5_000_000_000, addresses: ["miner"] });
  });
});

describe("placeInLine", () => {
  // Highest block first, like mempool.space projects them.
  const block = (low: number, high: number): ProjectedBlock => ({ feeRange: [low, (low + high) / 2, high] });
  const few = [block(8, 90), block(4, 8), block(2, 4)];

  it("puts a fee rate in the first block it pays enough for", () => {
    expect(placeInLine(50, few)).toBe(1);
    expect(placeInLine(8, few)).toBe(1);
    expect(placeInLine(7.9, few)).toBe(2);
    expect(placeInLine(2, few)).toBe(3);
  });

  it("is too low below the lowest projected block", () => {
    expect(placeInLine(1.9, few)).toBeNull();
  });

  it("calls the last block of a full projection too low, as it holds all the rest", () => {
    const full = [9, 8, 7, 6, 5, 4, 3, 1].map((low) => block(low, low + 1));
    expect(placeInLine(7, full)).toBe(3);
    expect(placeInLine(3.5, full)).toBe(7);
    expect(placeInLine(1.5, full)).toBeNull();
  });

  it("is the next block when nothing else is waiting", () => {
    expect(placeInLine(1, [])).toBe(1);
  });
});

describe("lookupBtc", () => {
  const MEMPOOL = "https://mempool.space/api";
  const BLOCKSTREAM = "https://blockstream.info/api";
  const TXID = "a".repeat(64);
  const timeout = () => Promise.reject(new DOMException("timed out", "TimeoutError"));
  const json = (body: unknown) => Promise.resolve(Response.json(body));
  const tx = (confirmed: boolean) => ({
    fee: 1000,
    weight: 800,
    vin: [{ prevout: { scriptpubkey_address: "alice" } }],
    vout: [{ value: 50_000, scriptpubkey_address: "bob" }],
    status: confirmed ? { confirmed: true, block_height: 100, block_time: 1_800_000_000 } : { confirmed: false },
  });

  /** Answers each URL with the first handler whose prefix it starts with; anything else (prices) fails. */
  function serve(routes: Record<string, () => Promise<Response>>) {
    const asked: string[] = [];
    vi.stubGlobal("fetch", (url: string) => {
      asked.push(url);
      const route = Object.keys(routes).find((prefix) => url.startsWith(prefix));
      return route ? routes[route]() : timeout();
    });
    return asked;
  }

  beforeEach(() => {
    // `get` leaves a trace of every request that gives no answer.
    vi.spyOn(console, "info").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("never asks Blockstream while mempool.space answers", async () => {
    const asked = serve({
      [`${MEMPOOL}/tx/`]: () => json(tx(true)),
      [`${MEMPOOL}/blocks/tip/height`]: () => Promise.resolve(new Response("105")),
    });
    expect(await lookupBtc(TXID)).toMatchObject({ kind: "final" });
    expect(asked.some((url) => url.startsWith(BLOCKSTREAM))).toBe(false);
  });

  it("asks Blockstream for the transaction and the tip when mempool.space fails", async () => {
    serve({
      [`${BLOCKSTREAM}/tx/`]: () => json(tx(true)),
      [`${BLOCKSTREAM}/blocks/tip/height`]: () => Promise.resolve(new Response("101")),
    });
    expect(await lookupBtc(TXID)).toMatchObject({ kind: "included", progress: 2 / 6 });
  });

  it("is still pending, without a place in line, when the projection cannot be had", async () => {
    serve({ [`${MEMPOOL}/tx/`]: () => json(tx(false)) });
    expect(await lookupBtc(TXID)).toEqual(expect.objectContaining({ kind: "pending", cause: null }));
  });

  it("is not found, not an error, when replacements cannot be looked up", async () => {
    serve({ [`${MEMPOOL}/tx/`]: () => Promise.resolve(new Response(null, { status: 404 })) });
    expect(await lookupBtc(TXID)).toEqual({ kind: "notFound" });
  });

  it("still finds a replacement when mempool.space tells of one", async () => {
    const by = "b".repeat(64);
    serve({
      [`${MEMPOOL}/tx/${TXID}`]: () => Promise.resolve(new Response(null, { status: 404 })),
      [`${MEMPOOL}/v1/tx/`]: () => json({ replacements: { tx: { txid: by } } }),
    });
    expect(await lookupBtc(TXID)).toEqual({ kind: "replaced", by });
  });

  it("fails when neither can answer, so it is never taken for not found", async () => {
    serve({});
    await expect(lookupBtc(TXID)).rejects.toThrow();
  });
});
