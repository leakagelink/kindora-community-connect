import { test, expect } from "bun:test";
import { encode } from "fast-png";
import { normalizeListingImage } from "./listing-image.server";
test("image validation rejects disguised executable bytes", () => {
  expect(() => normalizeListingImage(new TextEncoder().encode('<script>alert(1)</script>'))).toThrow();
});
test("valid PNG is decoded and reencoded", () => {
  const png = encode({ width: 1, height: 1, data: new Uint8Array([255, 0, 0, 255]), channels: 4 });
  expect(normalizeListingImage(png).type).toBe("image/png");
});
test("image validation enforces 5 MB limit", () => {
  expect(() => normalizeListingImage(new Uint8Array(5 * 1024 * 1024 + 1))).toThrow();
});