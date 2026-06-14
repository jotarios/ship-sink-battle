import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { generateSprite, generateSpriteSheet } from "@/lib/ai";
import { checkRateLimit } from "@/lib/rateLimit";
import { validateName, validatePrompt } from "@/lib/limits";
import type { SpriteStyleId } from "@/lib/spriteStyle";

export const maxDuration = 60;

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

// Default to the safe static sprite. The 4x4 animated sheet now generates
// reliably (clean grid, consistent character) — set SPRITE_MODE=sheet to use it.
const SPRITE_KIND: "sheet" | "single" =
  process.env.SPRITE_MODE === "sheet" ? "sheet" : "single";

type Body = { name?: string; prompt?: string; style?: SpriteStyleId };

export async function POST(req: NextRequest) {
  if (!convexUrl) {
    return NextResponse.json({ ok: false, error: "Convex not configured" }, { status: 500 });
  }

  // Identity is the signed-in Clerk user. No anonymous session ids.
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Sign in to summon a hero." }, { status: 401 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid request" }, { status: 400 });
  }

  const nameResult = validateName(body.name ?? "");
  if (!nameResult.ok) {
    return NextResponse.json({ ok: false, error: nameResult.error }, { status: 400 });
  }

  const promptResult = validatePrompt(body.prompt ?? "");
  if (!promptResult.ok) {
    return NextResponse.json({ ok: false, error: promptResult.error }, { status: 400 });
  }

  const name = nameResult.value;
  const prompt = promptResult.value;

  const limit = checkRateLimit(userId);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many heroes summoned. Take a breather and try again later." },
      { status: 429 },
    );
  }

  const gen =
    SPRITE_KIND === "sheet"
      ? await generateSpriteSheet(prompt, body.style)
      : await generateSprite(prompt, body.style);

  if (!gen.ok) {
    return NextResponse.json(
      { ok: false, error: "That prompt didn't work — try another one." },
      { status: 502 },
    );
  }

  try {
    const convex = new ConvexHttpClient(convexUrl);
    const uploadUrl = await convex.mutation(api.heroes.generateUploadUrl, {});
    const bytes = Buffer.from(gen.data.base64, "base64");
    const upload = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": gen.data.mediaType },
      body: bytes,
    });
    if (!upload.ok) throw new Error(`storage upload failed: ${upload.status}`);
    const { storageId } = (await upload.json()) as { storageId: string };

    const heroId = await convex.mutation(api.heroes.create, {
      name,
      prompt,
      storageId: storageId as never,
      spriteKind: SPRITE_KIND,
      ownerSessionId: userId,
    });

    return NextResponse.json({ ok: true, heroId });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "could not save your hero" },
      { status: 500 },
    );
  }
}
