import { describe, expect, it } from "vitest";
import { circleChange, isSettled } from "./follow";

describe("isSettled", () => {
  it("is true for final and failed only", () => {
    expect(isSettled("final")).toBe(true);
    expect(isSettled("failed")).toBe(true);
    expect(isSettled("included")).toBe(false);
    expect(isSettled("pending")).toBe(false);
  });
});

describe("circleChange", () => {
  it("settles into a disc when a followed transaction ends", () => {
    expect(circleChange("included", "final")).toBe("settle");
    expect(circleChange("pending", "final")).toBe("settle");
    expect(circleChange("pending", "failed")).toBe("settle");
    expect(circleChange("included", "failed")).toBe("settle");
  });

  it("draws the ring anew when a pending transaction is included", () => {
    expect(circleChange("pending", "included")).toBe("draw");
  });

  it("changes nothing when the status stays the same", () => {
    expect(circleChange("included", "included")).toBeNull();
    expect(circleChange("pending", "pending")).toBeNull();
    expect(circleChange("final", "final")).toBeNull();
  });
});
