import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { validateName, validatePrompt } from "../lib/limits";

export const myRoster = query({
  args: { ownerSessionId: v.string() },
  handler: async (ctx, { ownerSessionId }) => {
    return await ctx.db
      .query("heroes")
      .withIndex("by_owner", (q) => q.eq("ownerSessionId", ownerSessionId))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { id: v.id("heroes") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => ctx.storage.generateUploadUrl(),
});

/**
 * Called by the /api/generate-sprite route after the image is uploaded to
 * Convex storage. Resolves the storage id to a stable URL and creates the hero.
 */
export const create = mutation({
  args: {
    name: v.string(),
    prompt: v.string(),
    storageId: v.id("_storage"),
    spriteKind: v.union(v.literal("sheet"), v.literal("single")),
    ownerSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const nameResult = validateName(args.name);
    if (!nameResult.ok) throw new Error(nameResult.error);
    const promptResult = validatePrompt(args.prompt);
    if (!promptResult.ok) throw new Error(promptResult.error);

    const spriteUrl = await ctx.storage.getUrl(args.storageId);
    if (!spriteUrl) throw new Error("uploaded sprite not found in storage");
    return await ctx.db.insert("heroes", {
      name: nameResult.value,
      prompt: promptResult.value,
      spriteUrl,
      spriteKind: args.spriteKind,
      ownerSessionId: args.ownerSessionId,
      status: "alive",
      createdAt: Date.now(),
    });
  },
});
