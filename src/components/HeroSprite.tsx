"use client";

import type { CSSProperties } from "react";

export type SpriteState = "idle" | "walk" | "attack" | "hurt";

// Row index in the 4x4 sheet for each state, matching the sheet prompt layout.
const STATE_ROW: Record<SpriteState, number> = {
  idle: 0,
  walk: 1,
  attack: 2,
  hurt: 3,
};

interface Props {
  url: string;
  kind: "sheet" | "single";
  state?: SpriteState;
  captured?: boolean;
  hit?: boolean;
}

/**
 * Renders a hero sprite. A "sheet" hero animates via CSS background-position
 * (petdex steps() pattern); a "single" hero is a static image with a cheap bob.
 * Both honor the captured/hit overlays for the battle reveal.
 */
export function HeroSprite({ url, kind, state = "idle", captured, hit }: Props) {
  const fx = [captured && "hero-captured", hit && "hero-hit"].filter(Boolean).join(" ");

  if (kind === "sheet") {
    const style = {
      "--sprite-url": `url("${url}")`,
      "--sprite-row": STATE_ROW[state],
    } as CSSProperties;
    return <div className={`hero-sprite ${fx}`} style={style} aria-label="hero sprite" />;
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="hero sprite" className={`hero-static ${fx}`} />;
}
