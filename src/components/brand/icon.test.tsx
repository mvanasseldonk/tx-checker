import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GROUND, INK } from "./config";
import { MarkArt } from "./Mark";

/** What src/app/icon.svg must be: the mark, in ink, light on a dark tab. */
function expectedIcon() {
  const art = renderToStaticMarkup(<>{MarkArt()}</>);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<style>svg{color:${INK}}@media (prefers-color-scheme:dark){svg{color:${GROUND}}}</style>` +
    `${art}</svg>\n`
  );
}

describe("icon.svg", () => {
  it("is drawn from the mark (after changing the mark, copy the expected text into it)", () => {
    const file = readFileSync(new URL("../../app/icon.svg", import.meta.url), "utf8");
    expect(file).toBe(expectedIcon());
  });
});
