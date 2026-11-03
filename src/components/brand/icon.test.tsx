import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DEFAULT_MARK, GROUND, INK, isMark, PICK_MARK } from "./config";
import { MarkArt } from "./Mark";

/** What src/app/icon.svg must be: the default mark, in ink, light on a dark tab. */
function expectedIcon() {
  const art = renderToStaticMarkup(<>{MarkArt(DEFAULT_MARK, "currentColor", "var(--cut)")}</>);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<style>svg{color:${INK};--cut:${GROUND}}@media (prefers-color-scheme:dark){svg{color:${GROUND};--cut:${INK}}}</style>` +
    `${art}</svg>\n`
  );
}

describe("icon.svg", () => {
  it("is drawn from the default mark (after changing DEFAULT_MARK or a mark, copy the expected text into it)", () => {
    const file = readFileSync(new URL("../../app/icon.svg", import.meta.url), "utf8");
    expect(file).toBe(expectedIcon());
  });
});

/** Runs the head script against a fake page, as the browser would before the first paint. */
function run(search: string, stored: Record<string, string> = {}, blocked = false) {
  const store = { ...stored };
  const html = { dataset: {} as Record<string, string> };
  const storage = blocked
    ? {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("blocked");
        },
      }
    : { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => (store[k] = v) };
  new Function("location", "localStorage", "document", PICK_MARK)({ search }, storage, { documentElement: html });
  return { mark: html.dataset.mark, store };
}

describe("PICK_MARK", () => {
  it("leaves the default alone when nothing was chosen", () => {
    expect(run("").mark).toBeUndefined();
  });

  it("takes the direction from the URL and remembers it", () => {
    const { mark, store } = run("?mark=c");
    expect(mark).toBe("c");
    expect(store.mark).toBe("c");
  });

  it("uses the remembered direction, and lets the URL override it", () => {
    expect(run("", { mark: "b" }).mark).toBe("b");
    expect(run("?mark=a", { mark: "b" }).mark).toBe("a");
  });

  it("ignores anything else", () => {
    expect(run("?mark=z").mark).toBeUndefined();
    expect(run("", { mark: "z" }).mark).toBeUndefined();
  });

  it("does not throw when storage is blocked", () => {
    expect(() => run("?mark=b", {}, true)).not.toThrow();
  });

  it("accepts the same directions as isMark", () => {
    for (const key of ["a", "b", "c", "d", ""]) expect(run(`?mark=${key}`).mark !== undefined).toBe(isMark(key));
  });
});
