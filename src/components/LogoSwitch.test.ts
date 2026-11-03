import { describe, expect, it } from "vitest";
import { PICK_LOGO } from "./LogoSwitch";

/** Runs the head script against a fake page, as the browser would before the first paint. */
function run(search: string, stored: Record<string, string> = {}) {
  const store = { ...stored };
  const html = { dataset: {} as Record<string, string> };
  new Function("location", "localStorage", "document", PICK_LOGO)(
    { search },
    { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => (store[k] = v) },
    { documentElement: html },
  );
  return { logo: html.dataset.logo, store };
}

describe("PICK_LOGO", () => {
  it("leaves the default alone when nothing was chosen", () => {
    expect(run("").logo).toBeUndefined();
  });

  it("takes the look from the URL and remembers it", () => {
    const { logo, store } = run("?logo=brand");
    expect(logo).toBe("brand");
    expect(store.logo).toBe("brand");
  });

  it("uses the remembered look, and lets the URL override it", () => {
    expect(run("", { logo: "brand" }).logo).toBe("brand");
    expect(run("?logo=mono", { logo: "brand" }).logo).toBe("mono");
  });

  it("ignores anything else", () => {
    expect(run("?logo=neon").logo).toBeUndefined();
    expect(run("", { logo: "neon" }).logo).toBeUndefined();
  });

  it("does not throw when storage is blocked", () => {
    expect(() =>
      new Function("location", "localStorage", "document", PICK_LOGO)(
        { search: "?logo=brand" },
        {
          getItem: () => {
            throw new Error("blocked");
          },
          setItem: () => {
            throw new Error("blocked");
          },
        },
        { documentElement: { dataset: {} } },
      ),
    ).not.toThrow();
  });
});
