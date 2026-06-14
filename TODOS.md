# TODOS

## Cost ceiling on sprite generation
- **What:** Add a per-session rate limit on hero/sprite generation (e.g. N heroes per
  `sessionId` per hour) before sharing the app URL publicly.
- **Why:** Open join-by-code rooms + image gen per hero means anyone with the code (or
  a script) can trigger unlimited paid image-model calls and burn AI Gateway credits.
- **Pros:** Caps spend; prevents a hostile or accidental credit drain if the link spreads.
- **Cons:** Plumbing that doesn't add to the fun; premature for a private demo.
- **Context:** Surfaced by the /plan-eng-review outside voice (2026-06-14). Identity is a
  localStorage `sessionId` (no accounts), so the rate-limit key is that sessionId — note
  it's spoofable by clearing storage, so this is a soft ceiling, not real abuse prevention.
  Real abuse prevention would need accounts (out of scope). Start in the Next.js
  `/api/generate-sprite` route or a Convex mutation guard.
- **Depends on / blocked by:** Nothing. Cleanest to add after the core loop works, before
  any public share.
