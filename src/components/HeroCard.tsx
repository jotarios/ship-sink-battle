"use client";

import { Card, CardContent, CardFooter } from "@/components/ui/8bit/card";
import { Badge } from "@/components/ui/8bit/badge";
import { HeroSprite, type SpriteState } from "./HeroSprite";

interface HeroData {
  name: string;
  prompt: string;
  spriteUrl?: string;
  spriteKind?: "sheet" | "single";
  status?: "alive" | "dead";
}

interface Props {
  hero: HeroData;
  summoning?: boolean;
  state?: SpriteState;
  hit?: boolean;
  /** True for the loser at battle end — hero is captured by the winner. */
  captured?: boolean;
}

export function HeroCard({ hero, summoning, state, hit, captured }: Props) {
  return (
    <Card font="retro" className="w-60 text-center">
      <CardContent className="flex h-52 items-center justify-center overflow-hidden p-2">
        {summoning ? (
          <span className="blink text-[10px]" style={{ color: "var(--gold)" }}>
            ░ summoning ░
          </span>
        ) : hero.spriteUrl ? (
          <HeroSprite
            url={hero.spriteUrl}
            kind={hero.spriteKind ?? "single"}
            state={state}
            hit={hit}
            captured={captured}
          />
        ) : null}
      </CardContent>
      <CardFooter className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: captured ? "var(--danger)" : "var(--gold)" }}>
            {hero.name}
          </span>
          {captured && <Badge variant="destructive">CAPTURED</Badge>}
        </div>
        <p className="m-0 min-h-8 text-[9px] opacity-70">{hero.prompt}</p>
      </CardFooter>
    </Card>
  );
}
