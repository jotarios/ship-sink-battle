import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  heroes: defineTable({
    name: v.string(),
    prompt: v.string(),
    spriteUrl: v.string(),
    // "sheet" => spriteUrl is a 9x8 animated spritesheet; "single" => one static sprite.
    spriteKind: v.union(v.literal("sheet"), v.literal("single")),
    ownerSessionId: v.string(),
    status: v.union(v.literal("alive"), v.literal("dead")),
    captures: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_owner", ["ownerSessionId"])
    .index("by_captures", ["captures"]),

  battles: defineTable({
    roomCode: v.string(),
    heroAId: v.id("heroes"),
    heroBId: v.optional(v.id("heroes")),
    // waiting_for_opponent -> both_locked -> resolving -> done | failed
    status: v.union(
      v.literal("waiting_for_opponent"),
      v.literal("both_locked"),
      v.literal("resolving"),
      v.literal("done"),
      v.literal("failed"),
    ),
    winnerId: v.optional(v.id("heroes")),
    narration: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_room", ["roomCode"]),
});
