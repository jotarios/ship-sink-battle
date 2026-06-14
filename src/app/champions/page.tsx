"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { HeroSprite } from "@/components/HeroSprite";
import { Card, CardContent } from "@/components/ui/8bit/card";
import { Badge } from "@/components/ui/8bit/badge";

export default function Champions() {
  const champions = useQuery(api.heroes.topChampions, {});

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 p-6">
      <header className="text-center">
        <h1 className="retro text-2xl" style={{ color: "var(--gold)" }}>
          HALL OF CHAMPIONS
        </h1>
        <p className="text-[10px] opacity-70">
          Heroes ranked by battles won. Live-updates as the arena rages on.
        </p>
        <Link
          href="/"
          className="retro text-[10px] underline-offset-4 hover:underline"
          style={{ color: "var(--gold)" }}
        >
          ← Back to Lobby
        </Link>
      </header>

      {champions === undefined ? (
        <p className="blink text-center text-[10px]" style={{ color: "var(--gold)" }}>
          Loading…
        </p>
      ) : champions.length === 0 ? (
        <p className="text-center text-[10px] opacity-60">
          No champions yet. Go win a battle.
        </p>
      ) : (
        <ol className="flex flex-col gap-3">
          {champions.map((hero, i) => {
            const top = i === 0 && hero.captures > 0;
            return (
              <li key={hero._id}>
                <Card
                  font="retro"
                  className={top ? "border-[var(--gold)]! dark:border-[var(--gold)]!" : undefined}
                >
                  <CardContent className="flex items-center gap-3 p-3">
                    <span
                      className="w-6 text-center text-sm"
                      style={{ color: "var(--gold)" }}
                    >
                      {top ? "👑" : i + 1}
                    </span>
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden">
                      {hero.spriteUrl ? (
                        <HeroSprite
                          url={hero.spriteUrl}
                          kind={hero.spriteKind ?? "single"}
                        />
                      ) : null}
                    </div>
                    <span className="flex-1 truncate text-xs">{hero.name}</span>
                    <Badge variant="default">
                      🏆 {hero.captures}
                    </Badge>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}
