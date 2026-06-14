import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { validateRoomCode } from "../lib/limits";

export const getByRoom = query({
  args: { roomCode: v.string() },
  handler: async (ctx, { roomCode }) => {
    const codeResult = validateRoomCode(roomCode);
    if (!codeResult.ok) return null;
    const battle = await ctx.db
      .query("battles")
      .withIndex("by_room", (q) => q.eq("roomCode", codeResult.value))
      .unique();
    if (!battle) return null;
    const heroA = await ctx.db.get(battle.heroAId);
    const heroB = battle.heroBId ? await ctx.db.get(battle.heroBId) : null;
    return { battle, heroA, heroB };
  },
});

/**
 * Idempotent join keyed by room code. The FIRST hero creates the battle; the
 * SECOND fills heroBId and flips to both_locked. A single battle row exists per
 * room no matter how many clients call this, killing the battle-creation race.
 * Capacity is capped at 2 — a third joiner with a different hero is rejected.
 */
export const joinRoom = mutation({
  args: { roomCode: v.string(), heroId: v.id("heroes") },
  handler: async (ctx, { roomCode, heroId }) => {
    const codeResult = validateRoomCode(roomCode);
    if (!codeResult.ok) throw new Error(codeResult.error);
    const code = codeResult.value;

    const hero = await ctx.db.get(heroId);
    if (!hero || hero.status !== "alive") throw new Error("hero not available");

    const existing = await ctx.db
      .query("battles")
      .withIndex("by_room", (q) => q.eq("roomCode", code))
      .unique();

    if (!existing) {
      await ctx.db.insert("battles", {
        roomCode: code,
        heroAId: heroId,
        status: "waiting_for_opponent",
        createdAt: Date.now(),
      });
      return { role: "A" as const };
    }

    if (existing.heroAId === heroId) return { role: "A" as const };
    if (existing.heroBId === heroId) return { role: "B" as const };

    if (existing.heroBId) throw new Error("room is full");
    if (existing.status !== "waiting_for_opponent") throw new Error("battle already started");

    await ctx.db.patch(existing._id, { heroBId: heroId, status: "both_locked" });
    return { role: "B" as const };
  },
});

/**
 * CAS guard: flip both_locked -> resolving ONLY if currently both_locked.
 * Whichever client calls first wins the transition; the loser's call no-ops.
 * This guarantees the judge action fires exactly once. Returns whether THIS
 * caller won the transition (and should therefore kick off the judge).
 */
export const claimResolve = mutation({
  args: { battleId: v.id("battles") },
  handler: async (ctx, { battleId }) => {
    const battle = await ctx.db.get(battleId);
    if (!battle) throw new Error("battle not found");
    if (battle.status !== "both_locked") return { claimed: false };
    await ctx.db.patch(battleId, { status: "resolving" });
    return { claimed: true };
  },
});

export const _loadFighters = internalQuery({
  args: { battleId: v.id("battles") },
  handler: async (ctx, { battleId }) => {
    const battle = await ctx.db.get(battleId);
    if (!battle || !battle.heroBId) return null;
    const a = await ctx.db.get(battle.heroAId);
    const b = await ctx.db.get(battle.heroBId);
    if (!a || !b) return null;
    return {
      a: { id: battle.heroAId as string, name: a.name, prompt: a.prompt },
      b: { id: battle.heroBId as string, name: b.name, prompt: b.prompt },
    };
  },
});

/**
 * Capture, applied transactionally and ONLY on a validated verdict.
 * winnerId is re-checked against the two fighters here too (defence in depth) —
 * an invalid verdict marks the battle `failed` and NO hero changes hands.
 * On a valid verdict the loser's hero is HANDED OVER to the winner: its
 * ownerSessionId flips to the winning hero's owner. No permadeath.
 */
export const finishBattle = internalMutation({
  args: {
    battleId: v.id("battles"),
    ok: v.boolean(),
    winnerId: v.optional(v.string()),
    narration: v.optional(v.string()),
  },
  handler: async (ctx, { battleId, ok, winnerId, narration }) => {
    const battle = await ctx.db.get(battleId);
    if (!battle || battle.status !== "resolving" || !battle.heroBId) return;

    const valid =
      ok &&
      (winnerId === (battle.heroAId as string) || winnerId === (battle.heroBId as string));

    if (!valid) {
      await ctx.db.patch(battleId, { status: "failed" });
      return;
    }

    const winId = winnerId as unknown as Id<"heroes">;
    const loserId = winId === battle.heroAId ? battle.heroBId : battle.heroAId;
    const winner = await ctx.db.get(winId);
    if (!winner) {
      await ctx.db.patch(battleId, { status: "failed" });
      return;
    }
    // Hand the loser's hero over to the winning player's roster.
    await ctx.db.patch(loserId, { ownerSessionId: winner.ownerSessionId });
    await ctx.db.patch(battleId, { status: "done", winnerId: winId, narration });
  },
});

/** Reset a failed battle so both players can rematch without losing a hero. */
export const rematch = mutation({
  args: { battleId: v.id("battles") },
  handler: async (ctx, { battleId }) => {
    const battle = await ctx.db.get(battleId);
    if (!battle || battle.status !== "failed" || !battle.heroBId) return;
    await ctx.db.patch(battleId, { status: "both_locked", winnerId: undefined, narration: undefined });
  },
});

/**
 * Clear a finished (done/failed) battle from a room so players can start a new
 * one in the same room code. Deletes the battle row; the next joinRoom creates
 * a fresh one. Heroes (and any ownership that changed) are untouched.
 */
export const clearRoom = mutation({
  args: { roomCode: v.string() },
  handler: async (ctx, { roomCode }) => {
    const codeResult = validateRoomCode(roomCode);
    if (!codeResult.ok) throw new Error(codeResult.error);
    const battle = await ctx.db
      .query("battles")
      .withIndex("by_room", (q) => q.eq("roomCode", codeResult.value))
      .unique();
    if (!battle) return;
    if (battle.status !== "done" && battle.status !== "failed") return;
    await ctx.db.delete(battle._id);
  },
});
