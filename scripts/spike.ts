/**
 * T1 spike (throwaway de-risk). Run: npm run spike
 * Requires AI_GATEWAY_API_KEY in .env.local.
 *
 * Answers three questions before any UI is built:
 *   1. Does the image model produce an acceptable single 8-bit sprite?
 *   2. Does the judge return valid, schema-conforming JSON with a valid winnerId?
 *   3. Is a consistent 72-frame (9x8) spritesheet feasible? -> gates animated vs static.
 *
 * Sprites are written to scripts/out/ so you can eyeball them.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config(); // also pick up .env if present
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { generateSprite, generateSpriteSheet, judgeBattle } from "../src/lib/ai";

const OUT = join(process.cwd(), "scripts", "out");

function save(name: string, base64: string, mediaType: string) {
  mkdirSync(OUT, { recursive: true });
  const ext = mediaType.split("/")[1] ?? "png";
  const path = join(OUT, `${name}.${ext}`);
  writeFileSync(path, Buffer.from(base64, "base64"));
  return path;
}

async function main() {
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.OPENAI_API_KEY) {
    console.error("Set AI_GATEWAY_API_KEY (or OPENAI_API_KEY) in .env.local first.");
    process.exit(1);
  }

  console.log("\n=== 1. Single sprite ===");
  const sprite = await generateSprite("a caffeinated wizard made of broken keyboards");
  if (sprite.ok) {
    console.log("OK ->", save("single-sprite", sprite.data.base64, sprite.data.mediaType));
  } else {
    console.log("FAIL ->", sprite.error);
  }

  console.log("\n=== 2. Judge ===");
  const verdict = await judgeBattle(
    { id: "hero_a", name: "Keyboard Wizard", prompt: "a caffeinated wizard made of broken keyboards" },
    { id: "hero_b", name: "Sir Toasterton", prompt: "a noble knight whose head is a toaster" },
  );
  if (verdict.ok) {
    console.log("OK -> winnerId:", verdict.data.winnerId);
    console.log("narration:", verdict.data.narration);
    console.log("winnerId valid:", verdict.data.winnerId === "hero_a" || verdict.data.winnerId === "hero_b");
  } else {
    console.log("FAIL ->", verdict.error);
  }

  console.log("\n=== 3. 4x4 spritesheet feasibility (GATE) ===");
  const sheetPrompt = process.argv[2] ?? "a caffeinated wizard made of broken keyboards";
  const sheetName = process.argv[3] ?? "sheet";
  const sheet = await generateSpriteSheet(sheetPrompt);
  if (sheet.ok) {
    console.log("OK ->", save(sheetName, sheet.data.base64, sheet.data.mediaType));
    console.log("EYEBALL the sheet: is it a clean 4x4 grid with the SAME character per cell?");
    console.log("  YES -> ship animated heroes. NO -> static sprite fallback.");
  } else {
    console.log("FAIL ->", sheet.error, "\n  -> fall back to static sprite.");
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
