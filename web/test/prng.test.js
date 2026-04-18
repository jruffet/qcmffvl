import { describe, it, expect } from "vitest";
import { PRNG } from "../js/core/prng.js";

describe("PRNG", () => {
  it("should produce deterministic values for the same seed", () => {
    const prng1 = PRNG.createPRNG(123);
    const prng2 = PRNG.createPRNG(123);
    expect(prng1.next()).toBe(prng2.next());
  });

  it("should produce different values for different seeds", () => {
    const prng1 = PRNG.createPRNG(123);
    const prng2 = PRNG.createPRNG(456);
    expect(prng1.next()).not.toBe(prng2.next());
  });

  it("newSeed should return a number between 0 and 10000", () => {
    const seed = PRNG.newSeed();
    expect(typeof seed).toBe("number");
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThan(10000);
  });
});
