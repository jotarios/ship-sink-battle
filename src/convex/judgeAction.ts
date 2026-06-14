"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { judgeBattle } from "../lib/ai";

/**
 * The judge action runs in the Node runtime ("use node") because it makes an
 * external fetch to the AI Gateway and reads process.env. Call AFTER winning
 * claimResolve. Loads fighters, runs the judge (which validates winnerId), then
 * commits the result transactionally via finishBattle.
 */
export const runJudge = action({
  args: { battleId: v.id("battles") },
  handler: async (ctx, { battleId }) => {
    const fighters = await ctx.runQuery(internal.battles._loadFighters, { battleId });
    if (!fighters) {
      await ctx.runMutation(internal.battles.finishBattle, { battleId, ok: false });
      return;
    }
    const verdict = await judgeBattle(fighters.a, fighters.b);
    if (!verdict.ok) {
      await ctx.runMutation(internal.battles.finishBattle, { battleId, ok: false });
      return;
    }
    await ctx.runMutation(internal.battles.finishBattle, {
      battleId,
      ok: true,
      winnerId: verdict.data.winnerId,
      narration: verdict.data.narration,
    });
  },
});
