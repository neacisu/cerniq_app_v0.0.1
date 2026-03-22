import { describe, it, expect } from "vitest";
import { processSpintax, detectVariables } from "./spintax.js";

// ─── processSpintax ───────────────────────────────────────────────────────────

describe("processSpintax", () => {
  it("returns plain text unchanged", () => {
    expect(processSpintax("Hello world")).toBe("Hello world");
  });

  it("selects one of the given options from a {a|b|c} group", () => {
    const options = new Set<string>();
    for (let i = 0; i < 100; i++) {
      options.add(processSpintax("{foo|bar|baz}"));
    }
    expect(options).toEqual(new Set(["foo", "bar", "baz"]));
  });

  it("a single-option group returns that option", () => {
    expect(processSpintax("{only}")).toBe("only");
  });

  it("processes multiple independent spintax groups", () => {
    const result = processSpintax("{Hi|Hello}, {world|there}!");
    expect(result).toMatch(/^(Hi|Hello), (world|there)!$/);
  });

  it("processes nested spintax (innermost-first)", () => {
    // {outer {inner1|inner2}|fallback} → outer picks inner first
    const result = processSpintax("{A {B|C}|D}");
    expect(["A B", "A C", "D"]).toContain(result);
  });

  it("substitutes {{variable}} placeholders from the variables map", () => {
    expect(processSpintax("Hello {{name}}!", { name: "Alice" })).toBe("Hello Alice!");
  });

  it("leaves {{variable}} as-is when key is absent from variables map", () => {
    expect(processSpintax("Hello {{name}}!")).toBe("Hello {{name}}!");
  });

  it("works with both spintax and variable substitution in the same string", () => {
    const result = processSpintax("{Hi|Hello} {{name}}, how are you?", { name: "Bob" });
    expect(result).toMatch(/^(Hi|Hello) Bob, how are you\?$/);
  });

  it("an empty options group returns an empty string", () => {
    // {|} → two empty options, one is selected
    const result = processSpintax("prefix{}suffix");
    // no spintax — no pipe = treated as one option = the literal text
    expect(result).toBe("prefix{}suffix");
  });

  it("handles templates with no spintax and no variables", () => {
    const tpl = "Bună ziua, cum putem ajuta?";
    expect(processSpintax(tpl)).toBe(tpl);
  });
});

// ─── detectVariables ─────────────────────────────────────────────────────────

describe("detectVariables", () => {
  it("returns empty array when there are no variables", () => {
    expect(detectVariables("Hello world")).toEqual([]);
  });

  it("detects a single variable", () => {
    expect(detectVariables("Hello {{name}}")).toEqual(["name"]);
  });

  it("detects multiple distinct variables", () => {
    const vars = detectVariables("{{greeting}} {{name}}, your code is {{code}}");
    expect(vars).toHaveLength(3);
    expect(vars).toContain("greeting");
    expect(vars).toContain("name");
    expect(vars).toContain("code");
  });

  it("deduplicates repeated variables", () => {
    const vars = detectVariables("{{name}} {{name}} {{city}}");
    expect(vars).toHaveLength(2);
    expect(vars).toContain("name");
    expect(vars).toContain("city");
  });

  it("does NOT detect single-brace spintax as variables", () => {
    expect(detectVariables("{option1|option2}")).toEqual([]);
  });

  it("detects variables inside spintax groups", () => {
    const vars = detectVariables("{Hi|Hey} {{name}}, {you|u} have {{count}} messages");
    expect(vars).toContain("name");
    expect(vars).toContain("count");
  });

  it("only matches word characters in variable names", () => {
    // {{first_name}} uses underscore which is a \w char
    const vars = detectVariables("{{first_name}}");
    expect(vars).toEqual(["first_name"]);
  });
});
