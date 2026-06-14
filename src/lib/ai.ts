import { experimental_generateImage as generateImage, generateObject } from "ai";
import { z } from "zod";
import { buildSpritePrompt, buildSheetPrompt, type SpriteStyleId } from "./spriteStyle";

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

declare const process: { env: Record<string, string | undefined> };

const IMAGE_MODEL = process.env.SPRITE_IMAGE_MODEL ?? "openai/gpt-image-1";
const JUDGE_MODEL = process.env.JUDGE_MODEL ?? "openai/gpt-4o-mini";

export interface SpriteResult {
  base64: string;
  mediaType: string;
}

async function generate(prompt: string): Promise<Result<SpriteResult>> {
  try {
    const { image } = await generateImage({
      model: IMAGE_MODEL,
      prompt,
      size: "1024x1024",
    });
    return {
      ok: true,
      data: { base64: image.base64, mediaType: image.mediaType ?? "image/png" },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "image generation failed" };
  }
}

export function generateSprite(
  userPrompt: string,
  style?: SpriteStyleId,
): Promise<Result<SpriteResult>> {
  return generate(buildSpritePrompt(userPrompt, style));
}

export function generateSpriteSheet(
  userPrompt: string,
  style?: SpriteStyleId,
): Promise<Result<SpriteResult>> {
  return generate(buildSheetPrompt(userPrompt, style));
}

export interface Fighter {
  id: string;
  name: string;
  prompt: string;
}

export interface Verdict {
  winnerId: string;
  narration: string;
}

const verdictSchema = z.object({
  winnerId: z.string().describe("the id of the winning hero, exactly as given"),
  narration: z
    .string()
    .describe("a short, punchy 2-3 sentence retro battle narration naming the winner"),
});

/**
 * Asks the judge model who wins. The returned winnerId is validated against the
 * two fighter ids — an invalid or hallucinated id is treated as a judge failure
 * (ok:false) so the caller marks the battle `failed` and NO hero dies.
 */
export async function judgeBattle(a: Fighter, b: Fighter): Promise<Result<Verdict>> {
  try {
    const { object } = await generateObject({
      model: JUDGE_MODEL,
      schema: verdictSchema,
      system:
        "You are the referee of an 8-bit battle arena. Read two heroes and decide who " +
        "wins a one-on-one fight, based purely on their described nature. Pick ONE winner. " +
        "winnerId MUST be exactly one of the two ids you are given. Be decisive and fun.",
      prompt:
        `Hero A — id: ${a.id}\nname: ${a.name}\nprompt: ${a.prompt}\n\n` +
        `Hero B — id: ${b.id}\nname: ${b.name}\nprompt: ${b.prompt}\n\n` +
        `Decide the winner. winnerId must be either "${a.id}" or "${b.id}".`,
    });

    if (object.winnerId !== a.id && object.winnerId !== b.id) {
      return { ok: false, error: `judge returned invalid winnerId: ${object.winnerId}` };
    }
    return { ok: true, data: object };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "judge call failed" };
  }
}
