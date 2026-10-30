import { describe, expect, test } from "bun:test";
import { normalizeIndianMobile } from "./phone-auth";

describe("normalizeIndianMobile", () => {
  test("accepts 10-digit, +91 and leading 0 forms", () => {
    expect(normalizeIndianMobile("9876543210")).toBe("919876543210");
    expect(normalizeIndianMobile("+91 98765 43210")).toBe("919876543210");
    expect(normalizeIndianMobile("09876543210")).toBe("919876543210");
  });
  test("rejects invalid numbers", () => {
    expect(normalizeIndianMobile("5876543210")).toBeNull();
    expect(normalizeIndianMobile("98765")).toBeNull();
  });
});
