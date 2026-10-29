import { test, expect } from "bun:test";
import { aiInputSchema, validateAiOutput } from "./ai-safety";
test("AI rejects inputs above 6000 characters", () => {
  expect(aiInputSchema.safeParse({ tool: "resume_builder", input: { experience: "x".repeat(6001) } }).success).toBe(false);
});
test("AI rejects executable website output", () => {
  expect(() => validateAiOutput("website_starter", { html: '<script>alert(1)</script>' })).toThrow();
});
test("AI rejects remote resources in downloadable logos", () => {
  const concept = { name: "Logo", idea: "Simple", svg: '<svg><image href="https://example.org/photo"/></svg>' };
  expect(() => validateAiOutput("logo_maker", { concepts: [concept, concept, concept] })).toThrow();
});
test("AI accepts safe SVG namespace and geometry", () => {
  const concept = { name: "Logo", idea: "Simple", svg: '<svg xmlns="http://www.w3.org/2000/svg"><circle r="5"/></svg>' };
  expect(validateAiOutput("logo_maker", { concepts: [concept, concept, concept] }).concepts.length).toBe(3);
});