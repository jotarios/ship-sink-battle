/**
 * convex-test needs the function module map when convex.json uses a custom
 * `functions` path (src/convex/). This glob must be declared from inside the
 * functions dir so the relative paths resolve correctly.
 */
export const modules = import.meta.glob("./**/*.*s");
