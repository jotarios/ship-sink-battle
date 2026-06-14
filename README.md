# Prompt Heroes

Type a prompt → AI draws an 8-bit hero → two heroes fight → an AI judge picks the
winner → **the winner captures the loser's hero** (ownership transfers to the
winner's roster; nobody is destroyed). Real-time online via Convex.

Built with Next.js 16, [8bitcn/ui](https://8bitcn.com), Convex (reactive DB +
realtime + permadeath), and the Vercel AI Gateway (image model + judge model).
Animated-sprite technique adapted from [petdex](https://github.com/crafter-station/petdex) (MIT).

## Setup

```bash
npm install
cp .env.local.example .env.local      # fill in AI_GATEWAY_API_KEY
npx convex dev                        # login + provision; writes NEXT_PUBLIC_CONVEX_URL
npm run dev                           # in another terminal
```

Two credentials are required and are the only things that can't be pre-baked:

1. **`AI_GATEWAY_API_KEY`** — Vercel AI Gateway, used for both the image model
   and the judge. (`SPRITE_IMAGE_MODEL` / `JUDGE_MODEL` override the defaults.)
   The judge runs inside a Convex **action**, which has its own environment —
   set the key on the deployment too: `npx convex env set AI_GATEWAY_API_KEY <key>`.
2. **Convex login** — `npx convex dev` provisions the deployment and regenerates
   `src/convex/_generated/` (hand-authored stubs are committed so the app
   typechecks before your first login; `convex dev` overwrites them identically).

## The de-risking spike (run this first)

```bash
npm run spike   # needs AI_GATEWAY_API_KEY
```

Generates a sprite, runs the judge, and generates a 9×8 spritesheet into
`scripts/out/`. **Eyeball the sheet:** if the image model produces a clean,
consistent grid, set `SPRITE_MODE=sheet` to ship animated heroes (CSS
`steps()` animation). If not, leave it on the default static sprite.

## Tests

```bash
npm test       # vitest: CAS-fires-once, permadeath safety, judge validator (8 tests)
npm run e2e    # playwright: two browsers, loser dies on both screens (needs live backend)
```

## How the core mechanic stays correct

- **Judge fires exactly once** — `claimResolve` is a compare-and-set that only
  flips `both_locked → resolving`; the second caller no-ops.
- **No wrong capture** — the judge's `winnerId` is validated against the two
  fighters in `lib/ai.ts` AND re-validated in `finishBattle`. An invalid verdict
  marks the battle `failed`; no hero changes hands and both players can rematch.
- **Capture, not permadeath** — on a valid verdict the loser's hero stays alive
  and its `ownerSessionId` flips to the winner, so it joins the winner's roster.
- **Identity** is an anonymous localStorage `sessionId` — not a security boundary.
