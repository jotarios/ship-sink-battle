import { describe, it, expect, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import { modules } from "./test.setup";
import type { Id } from "./_generated/dataModel";

// Mock the AI module so no real network/judge call happens in unit tests.
const judgeMock = vi.fn();
vi.mock("../lib/ai", () => ({
  judgeBattle: (...args: unknown[]) => judgeMock(...args),
}));

function t() {
  return convexTest(schema, modules);
}

async function seedHero(
  tc: ReturnType<typeof t>,
  name: string,
  owner: string,
): Promise<Id<"heroes">> {
  return await tc.run(async (ctx) =>
    ctx.db.insert("heroes", {
      name,
      prompt: `${name} the test hero`,
      spriteUrl: "https://example.test/sprite.png",
      spriteKind: "single",
      ownerSessionId: owner,
      status: "alive",
      createdAt: Date.now(),
    }),
  );
}

describe("battle join + state machine", () => {
  it("joinRoom is idempotent and caps the room at two heroes", async () => {
    const tc = t();
    const a = await seedHero(tc, "A", "owner-a");
    const b = await seedHero(tc, "B", "owner-b");
    const c = await seedHero(tc, "C", "owner-c");

    expect(await tc.mutation(api.battles.joinRoom, { roomCode: "r1", heroId: a })).toEqual({ role: "A" });
    // A re-joining is a no-op that still returns role A (no duplicate battle).
    expect(await tc.mutation(api.battles.joinRoom, { roomCode: "r1", heroId: a })).toEqual({ role: "A" });
    expect(await tc.mutation(api.battles.joinRoom, { roomCode: "r1", heroId: b })).toEqual({ role: "B" });

    // Third distinct hero is rejected, not silently added.
    await expect(
      tc.mutation(api.battles.joinRoom, { roomCode: "r1", heroId: c }),
    ).rejects.toThrow(/full/);

    const room = await tc.query(api.battles.getByRoom, { roomCode: "r1" });
    expect(room?.battle.status).toBe("both_locked");
  });
});

describe("CAS resolve fires the judge exactly once", () => {
  it("only the first claimResolve wins; the second no-ops", async () => {
    const tc = t();
    const a = await seedHero(tc, "A", "owner-a");
    const b = await seedHero(tc, "B", "owner-b");
    await tc.mutation(api.battles.joinRoom, { roomCode: "r2", heroId: a });
    await tc.mutation(api.battles.joinRoom, { roomCode: "r2", heroId: b });
    const room = await tc.query(api.battles.getByRoom, { roomCode: "r2" });
    const battleId = room!.battle._id;

    const first = await tc.mutation(api.battles.claimResolve, { battleId });
    const second = await tc.mutation(api.battles.claimResolve, { battleId });

    expect(first).toEqual({ claimed: true });
    expect(second).toEqual({ claimed: false });
  });
});

describe("capture safety", () => {
  it("valid verdict hands the loser's hero to the winning player", async () => {
    const tc = t();
    const a = await seedHero(tc, "A", "owner-a");
    const b = await seedHero(tc, "B", "owner-b");
    await tc.mutation(api.battles.joinRoom, { roomCode: "r3", heroId: a });
    await tc.mutation(api.battles.joinRoom, { roomCode: "r3", heroId: b });
    const room = await tc.query(api.battles.getByRoom, { roomCode: "r3" });
    const battleId = room!.battle._id;

    judgeMock.mockResolvedValueOnce({
      ok: true,
      data: { winnerId: a, narration: "A wins!" },
    });
    await tc.mutation(api.battles.claimResolve, { battleId });
    await tc.action(api.judgeAction.runJudge, { battleId });

    const after = await tc.query(api.battles.getByRoom, { roomCode: "r3" });
    expect(after?.battle.status).toBe("done");
    expect(after?.battle.winnerId).toBe(a);
    // Both heroes stay alive; the loser now belongs to the winning player.
    expect(after?.heroA?.status).toBe("alive");
    expect(after?.heroB?.status).toBe("alive");
    expect(after?.heroA?.ownerSessionId).toBe("owner-a");
    expect(after?.heroB?.ownerSessionId).toBe("owner-a");

    // The winner's roster now holds both heroes; the loser's holds none.
    const winnerRoster = await tc.query(api.heroes.myRoster, { ownerSessionId: "owner-a" });
    const loserRoster = await tc.query(api.heroes.myRoster, { ownerSessionId: "owner-b" });
    expect(winnerRoster).toHaveLength(2);
    expect(loserRoster).toHaveLength(0);
  });

  it("malformed/invalid judge output -> failed, NO hero changes hands", async () => {
    const tc = t();
    const a = await seedHero(tc, "A", "owner-a");
    const b = await seedHero(tc, "B", "owner-b");
    await tc.mutation(api.battles.joinRoom, { roomCode: "r4", heroId: a });
    await tc.mutation(api.battles.joinRoom, { roomCode: "r4", heroId: b });
    const room = await tc.query(api.battles.getByRoom, { roomCode: "r4" });
    const battleId = room!.battle._id;

    // judge call fails (or returns garbage the lib already rejected).
    judgeMock.mockResolvedValueOnce({ ok: false, error: "judge returned invalid winnerId" });
    await tc.mutation(api.battles.claimResolve, { battleId });
    await tc.action(api.judgeAction.runJudge, { battleId });

    const after = await tc.query(api.battles.getByRoom, { roomCode: "r4" });
    expect(after?.battle.status).toBe("failed");
    expect(after?.battle.winnerId).toBeUndefined();
    expect(after?.heroA?.ownerSessionId).toBe("owner-a");
    expect(after?.heroB?.ownerSessionId).toBe("owner-b");
  });

  it("even if the judge action is bypassed, finishBattle rejects an out-of-set winnerId", async () => {
    const tc = t();
    const a = await seedHero(tc, "A", "owner-a");
    const b = await seedHero(tc, "B", "owner-b");
    await tc.mutation(api.battles.joinRoom, { roomCode: "r5", heroId: a });
    await tc.mutation(api.battles.joinRoom, { roomCode: "r5", heroId: b });
    const room = await tc.query(api.battles.getByRoom, { roomCode: "r5" });
    const battleId = room!.battle._id;
    await tc.mutation(api.battles.claimResolve, { battleId });

    // Pretend a buggy verdict slipped through with a hero id from another battle.
    await tc.mutation(internal.battles.finishBattle, {
      battleId,
      ok: true,
      winnerId: "not_a_real_hero_id",
    });

    const after = await tc.query(api.battles.getByRoom, { roomCode: "r5" });
    expect(after?.battle.status).toBe("failed");
    expect(after?.heroA?.ownerSessionId).toBe("owner-a");
    expect(after?.heroB?.ownerSessionId).toBe("owner-b");
  });
});
