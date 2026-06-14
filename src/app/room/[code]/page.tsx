"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSessionId } from "@/lib/session";
import { HeroCard } from "@/components/HeroCard";
import { Button } from "@/components/ui/8bit/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/8bit/alert";
import type { Id } from "@/convex/_generated/dataModel";

export default function Arena({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const roomCode = decodeURIComponent(code).toLowerCase();
  const sessionId = useSessionId();

  const roster = useQuery(api.heroes.myRoster, sessionId ? { ownerSessionId: sessionId } : "skip");
  const room = useQuery(api.battles.getByRoom, { roomCode });

  const joinRoom = useMutation(api.battles.joinRoom);
  const claimResolve = useMutation(api.battles.claimResolve);
  const runJudge = useAction(api.judgeAction.runJudge);
  const rematch = useMutation(api.battles.rematch);
  const clearRoom = useMutation(api.battles.clearRoom);

  const [joinError, setJoinError] = useState<string | null>(null);
  const judgedRef = useRef(false);

  const aliveRoster = roster?.filter((h) => h.status === "alive") ?? [];
  const battle = room?.battle;

  // Reset the once-guard when the room is cleared, so a fresh battle can resolve.
  useEffect(() => {
    if (!battle) judgedRef.current = false;
  }, [battle]);

  // When both heroes are locked, exactly one client wins the CAS and fires the judge.
  useEffect(() => {
    if (!battle || battle.status !== "both_locked" || judgedRef.current) return;
    judgedRef.current = true;
    (async () => {
      const { claimed } = await claimResolve({ battleId: battle._id });
      if (claimed) await runJudge({ battleId: battle._id });
    })();
  }, [battle?.status, battle?._id, claimResolve, runJudge, battle]);

  async function lockIn(heroId: Id<"heroes">) {
    setJoinError(null);
    try {
      await joinRoom({ roomCode, heroId });
    } catch (e) {
      setJoinError(e instanceof Error ? e.message : "could not join");
    }
  }

  if (room === undefined) {
    return <Centered>Loading arena…</Centered>;
  }

  // Not joined yet -> pick a hero to lock in.
  const myHeroInBattle =
    battle &&
    aliveRoster.some((h) => h._id === battle.heroAId || h._id === battle.heroBId);

  return (
    <main className="mx-auto flex max-w-4xl flex-col items-center gap-6 p-6">
      <header className="text-center">
        <h1 className="retro text-lg" style={{ color: "var(--gold)" }}>
          ARENA · {roomCode}
        </h1>
        <p className="text-[10px] opacity-60">{statusLabel(battle?.status)}</p>
      </header>

      {!battle || !myHeroInBattle ? (
        <section className="flex flex-col items-center gap-3">
          <p className="retro text-xs">Lock in a hero:</p>
          {battle?.heroBId && (
            <Alert font="retro" className="max-w-sm text-left">
              <AlertTitle className="text-[11px]" style={{ color: "#b45309" }}>⚔ ARENA FULL</AlertTitle>
              <AlertDescription className="text-[9px]" style={{ color: "#1b1b2e" }}>
                Two fighters are already locked in. Try a different room code or head back to the lobby.
              </AlertDescription>
            </Alert>
          )}
          <div className="flex flex-wrap justify-center gap-4">
            {aliveRoster.map((h) => (
              <button
                key={h._id}
                onClick={() => lockIn(h._id)}
                disabled={!!battle?.heroBId}
                className="cursor-pointer border-0 bg-transparent p-0 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <HeroCard
                  hero={{ name: h.name, prompt: h.prompt, spriteUrl: h.spriteUrl, spriteKind: h.spriteKind, status: h.status }}
                />
              </button>
            ))}
            {aliveRoster.length === 0 && (
              <p className="text-[10px] opacity-60">No living heroes. Summon one in the lobby first.</p>
            )}
          </div>
          {joinError && (
            <Alert font="retro" variant="destructive" className="max-w-sm text-left">
              <AlertTitle className="text-[11px]" style={{ color: "var(--danger)" }}>🚫 COULD NOT JOIN</AlertTitle>
              <AlertDescription className="text-[9px]" style={{ color: "#b91c1c" }}>
                {joinError}
              </AlertDescription>
            </Alert>
          )}
        </section>
      ) : (
        <BattleView
          room={room}
          onRematch={() => battle && rematch({ battleId: battle._id })}
          onNewBattle={() => clearRoom({ roomCode })}
        />
      )}
    </main>
  );
}

type RoomData = NonNullable<ReturnType<typeof useQuery<typeof api.battles.getByRoom>>>;

function BattleView({
  room,
  onRematch,
  onNewBattle,
}: {
  room: RoomData;
  onRematch: () => void;
  onNewBattle: () => void;
}) {
  const { battle, heroA, heroB } = room;
  const resolving = battle.status === "resolving" || battle.status === "both_locked";
  const done = battle.status === "done";
  const failed = battle.status === "failed";

  // On a finished battle, the loser is whichever hero is NOT the winner.
  const aLost = done && !!battle.winnerId && battle.winnerId !== heroA?._id;
  const bLost = done && !!battle.winnerId && battle.winnerId !== heroB?._id;

  return (
    <section className="flex flex-col items-center gap-6">
      <div className="flex items-end gap-8">
        {heroA && (
          <HeroCard
            hero={{ name: heroA.name, prompt: heroA.prompt, spriteUrl: heroA.spriteUrl, spriteKind: heroA.spriteKind, status: heroA.status }}
            state={done ? (aLost ? "hurt" : "attack") : "idle"}
            hit={aLost}
            captured={aLost}
          />
        )}
        <span className="retro pb-20 text-xl" style={{ color: "var(--gold)" }}>
          VS
        </span>
        {heroB ? (
          <HeroCard
            hero={{ name: heroB.name, prompt: heroB.prompt, spriteUrl: heroB.spriteUrl, spriteKind: heroB.spriteKind, status: heroB.status }}
            state={done ? (bLost ? "hurt" : "attack") : "idle"}
            hit={bLost}
            captured={bLost}
          />
        ) : (
          <div className="flex h-52 w-60 items-center justify-center">
            <span className="blink text-[10px] opacity-70">waiting for opponent…</span>
          </div>
        )}
      </div>

      {resolving && (
        <p className="blink retro text-sm" style={{ color: "var(--gold)" }}>
          ⚔ The judge is deciding… ⚔
        </p>
      )}

      {done && battle.narration && (
        <div className="flex max-w-lg flex-col items-center gap-4 text-center">
          <p className="retro text-xs leading-relaxed">{battle.narration}</p>
          {(() => {
            const winnerName = battle.winnerId === heroA?._id ? heroA?.name : heroB?.name;
            const loserName = battle.winnerId === heroA?._id ? heroB?.name : heroA?.name;
            return (
              <p className="text-[10px]" style={{ color: "var(--gold)" }}>
                {winnerName} wins and captures {loserName}! 🪤
              </p>
            );
          })()}
          <div className="flex items-center gap-3">
            <Button font="retro" onClick={onNewBattle}>
              New Battle
            </Button>
            <Link href="/" className="retro text-[10px] underline opacity-70 hover:opacity-100">
              Back to Lobby
            </Link>
          </div>
        </div>
      )}

      {failed && (
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="retro text-xs" style={{ color: "var(--danger)" }}>
            The judge glitched. No hero changed hands.
          </p>
          <Button font="retro" onClick={onRematch}>
            Rematch
          </Button>
        </div>
      )}
    </section>
  );
}

function statusLabel(status?: string) {
  switch (status) {
    case "waiting_for_opponent":
      return "Waiting for an opponent to lock in…";
    case "both_locked":
    case "resolving":
      return "Battle in progress…";
    case "done":
      return "Battle over — winner takes the loser's hero.";
    case "failed":
      return "Judge error — rematch available.";
    default:
      return "Lock in a hero to begin.";
  }
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <span className="blink retro text-xs">{children}</span>
    </main>
  );
}
