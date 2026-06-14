"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { HeroCard } from "@/components/HeroCard";
import { Button } from "@/components/ui/8bit/button";
import { Input } from "@/components/ui/8bit/input";
import {
  NAME_MAX,
  PROMPT_MAX,
  ROOM_CODE_MAX,
  validateName,
  validatePrompt,
  validateRoomCode,
} from "@/lib/limits";

export default function Page() {
  return (
    <>
      <AuthLoading>
        <Centered>Loading…</Centered>
      </AuthLoading>
      <Unauthenticated>
        <Gate />
      </Unauthenticated>
      <Authenticated>
        <Lobby />
      </Authenticated>
    </>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <span className="blink retro text-xs" style={{ color: "var(--gold)" }}>
        {children}
      </span>
    </main>
  );
}

function Gate() {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-6 p-10 text-center">
      <h1 className="retro text-2xl" style={{ color: "var(--gold)" }}>
        PROMPT HEROES
      </h1>
      <p className="text-[10px] opacity-70">
        Sign in to summon an 8-bit hero, battle, and capture your rival&apos;s fighter.
      </p>
      <div className="flex gap-3">
        <SignInButton mode="modal">
          <Button font="retro">Sign In</Button>
        </SignInButton>
        <SignUpButton mode="modal">
          <Button font="retro">Sign Up</Button>
        </SignUpButton>
      </div>
      <Link href="/champions" className="retro text-[10px] underline opacity-70 hover:opacity-100">
        🏆 Hall of Champions
      </Link>
    </main>
  );
}

function Lobby() {
  const router = useRouter();
  const roster = useQuery(api.heroes.myRoster, {});

  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [summoning, setSummoning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [roomError, setRoomError] = useState<string | null>(null);

  const canSummon = validateName(name).ok && validatePrompt(prompt).ok && !summoning;

  async function summon() {
    if (!canSummon) return;
    setError(null);
    setSummoning(true);
    try {
      const res = await fetch("/api/generate-sprite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), prompt: prompt.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "That prompt didn't work — try another one.");
      } else {
        setName("");
        setPrompt("");
      }
    } catch {
      setError("Network hiccup — try again.");
    } finally {
      setSummoning(false);
    }
  }

  function cleanRoomCode(raw: string) {
    return raw.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, ROOM_CODE_MAX);
  }

  function enterRoom() {
    const result = validateRoomCode(roomCode);
    if (!result.ok) {
      setRoomError(result.error);
      return;
    }
    setRoomError(null);
    router.push(`/room/${encodeURIComponent(result.value)}`);
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 p-6">
      <div className="flex justify-end">
        <UserButton />
      </div>
      <header className="text-center">
        <h1 className="retro text-2xl" style={{ color: "var(--gold)" }}>
          PROMPT HEROES
        </h1>
        <p className="text-[10px] opacity-70">
          Type a prompt. Summon an 8-bit hero. Battle. Winner steals the loser&apos;s hero.
        </p>
        <Link
          href="/champions"
          className="retro text-[10px] underline-offset-4 hover:underline"
          style={{ color: "var(--gold)" }}
        >
          🏆 Hall of Champions
        </Link>
      </header>

      <section className="flex flex-col gap-3">
        <Input
          font="retro"
          placeholder="hero name"
          value={name}
          maxLength={NAME_MAX}
          onChange={(e) => setName(e.target.value)}
          disabled={summoning}
        />
        <Input
          font="retro"
          placeholder="a caffeinated wizard made of broken keyboards"
          value={prompt}
          maxLength={PROMPT_MAX}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={summoning}
          onKeyDown={(e) => e.key === "Enter" && summon()}
        />
        <Button font="retro" onClick={summon} disabled={!canSummon}>
          {summoning ? "Summoning…" : "Summon Hero"}
        </Button>
        {error && (
          <p className="text-[10px]" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}
      </section>

      <section>
        <h2 className="retro mb-3 text-sm" style={{ color: "var(--gold)" }}>
          Your roster
        </h2>
        <div className="flex flex-wrap gap-4">
          {summoning && <HeroCard hero={{ name: name || "???", prompt }} summoning />}
          {roster?.map((h) => (
            <HeroCard
              key={h._id}
              hero={{
                name: h.name,
                prompt: h.prompt,
                spriteUrl: h.spriteUrl,
                spriteKind: h.spriteKind,
                status: h.status,
              }}
            />
          ))}
          {roster && roster.length === 0 && !summoning && (
            <p className="text-[10px] opacity-60">No heroes yet. Summon one above.</p>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="retro text-sm" style={{ color: "var(--gold)" }}>
          Enter the arena
        </h2>
        <div className="flex gap-3">
          <Input
            font="retro"
            placeholder="room code (e.g. battle1)"
            value={roomCode}
            maxLength={ROOM_CODE_MAX}
            onChange={(e) => {
              setRoomCode(cleanRoomCode(e.target.value));
              setRoomError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && enterRoom()}
          />
          <Button font="retro" onClick={enterRoom} disabled={!validateRoomCode(roomCode).ok}>
            Go
          </Button>
        </div>
        {roomError && (
          <p className="text-[10px]" style={{ color: "var(--danger)" }}>
            {roomError}
          </p>
        )}
        <p className="text-[9px] opacity-60">
          Share a code with a friend. First two heroes to lock in, fight.
        </p>
      </section>
    </main>
  );
}
