import { test, expect, type Page } from "@playwright/test";

/**
 * The load-bearing E2E: two browsers, two heroes, one fight, and the loser's
 * hero is visibly captured on BOTH screens (core mechanic + Convex reactivity).
 *
 * Requires the app running against a live Convex deployment + AI_GATEWAY_API_KEY
 * (real image gen + judge). Start `npm run dev` (configured) then `npm run e2e`.
 * Skips itself if the backend isn't reachable so CI without secrets stays green.
 */

const ROOM = `e2e-${Date.now().toString(36)}`;

async function summonHero(page: Page, name: string, prompt: string) {
  await page.goto("/");
  await page.getByPlaceholder("hero name").fill(name);
  await page.getByPlaceholder(/caffeinated wizard/i).fill(prompt);
  await page.getByRole("button", { name: /summon hero/i }).click();
  // Sprite gen is slow (5-20s). Wait for the hero to land in the roster.
  await expect(page.getByText(name, { exact: false }).first()).toBeVisible({ timeout: 60_000 });
}

async function lockInAndEnter(page: Page) {
  await page.getByPlaceholder(/room code/i).fill(ROOM);
  await page.getByRole("button", { name: /^go$/i }).click();
  await expect(page).toHaveURL(new RegExp(`/room/${ROOM}`));
  // Click the first roster hero card to lock in.
  await page.getByText(/lock in a hero/i).waitFor({ timeout: 15_000 });
  await page.locator("button:has(.hero-static, .hero-sprite)").first().click();
}

test("loser's hero is captured on both screens", async ({ browser }) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  // Bail out cleanly if the backend isn't configured.
  const probe = await pageA.goto("/").catch(() => null);
  test.skip(!probe || !probe.ok(), "app/backend not reachable — configure Convex + AI key");

  await summonHero(pageA, "Alpha", "a stone golem wreathed in lightning");
  await summonHero(pageB, "Bravo", "a tiny paper origami crane");

  await lockInAndEnter(pageA);
  await lockInAndEnter(pageB);

  // The judge resolves; narration appears on both screens.
  await expect(pageA.getByText(/captures/i)).toBeVisible({ timeout: 60_000 });
  await expect(pageB.getByText(/captures/i)).toBeVisible({ timeout: 60_000 });

  // Exactly one hero is marked CAPTURED, and it's the same on both screens.
  await expect(pageA.getByText("CAPTURED")).toHaveCount(1, { timeout: 15_000 });
  await expect(pageB.getByText("CAPTURED")).toHaveCount(1, { timeout: 15_000 });

  await ctxA.close();
  await ctxB.close();
});
