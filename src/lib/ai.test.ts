import { describe, it, expect, vi, beforeEach } from "vitest";

const generateObjectMock = vi.fn();
vi.mock("ai", () => ({
  experimental_generateImage: vi.fn(),
  generateObject: (...args: unknown[]) => generateObjectMock(...args),
}));

import { judgeBattle } from "./ai";

const A = { id: "hero_a", name: "A", prompt: "alpha" };
const B = { id: "hero_b", name: "B", prompt: "beta" };

beforeEach(() => generateObjectMock.mockReset());

describe("judgeBattle validator", () => {
  it("accepts a winnerId that is one of the two fighters", async () => {
    generateObjectMock.mockResolvedValueOnce({
      object: { winnerId: "hero_b", narration: "B wins" },
    });
    const res = await judgeBattle(A, B);
    expect(res).toEqual({ ok: true, data: { winnerId: "hero_b", narration: "B wins" } });
  });

  it("rejects a hallucinated winnerId not in the set", async () => {
    generateObjectMock.mockResolvedValueOnce({
      object: { winnerId: "hero_zzz", narration: "??? wins" },
    });
    const res = await judgeBattle(A, B);
    expect(res.ok).toBe(false);
  });

  it("returns ok:false when the model call throws", async () => {
    generateObjectMock.mockRejectedValueOnce(new Error("gateway down"));
    const res = await judgeBattle(A, B);
    expect(res.ok).toBe(false);
  });
});
