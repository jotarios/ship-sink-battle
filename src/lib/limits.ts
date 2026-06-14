export const NAME_MAX = 24;
export const PROMPT_MAX = 140;
export const ROOM_CODE_MAX = 20;
export const ROOM_CODE_PATTERN = /^[a-z0-9-]+$/;

export type ValidationResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

export function validateName(raw: string): ValidationResult {
  const value = (raw ?? "").trim();
  if (value.length === 0) return { ok: false, error: "Hero name is required." };
  if (value.length > NAME_MAX)
    return { ok: false, error: `Hero name must be at most ${NAME_MAX} characters.` };
  return { ok: true, value };
}

export function validatePrompt(raw: string): ValidationResult {
  const value = (raw ?? "").trim();
  if (value.length === 0) return { ok: false, error: "Hero prompt is required." };
  if (value.length > PROMPT_MAX)
    return { ok: false, error: `Hero prompt must be at most ${PROMPT_MAX} characters.` };
  return { ok: true, value };
}

export function validateRoomCode(raw: string): ValidationResult {
  const value = (raw ?? "").trim().toLowerCase();
  if (value.length === 0) return { ok: false, error: "Room code is required." };
  if (value.length > ROOM_CODE_MAX)
    return { ok: false, error: `Room code must be at most ${ROOM_CODE_MAX} characters.` };
  if (!ROOM_CODE_PATTERN.test(value))
    return { ok: false, error: "Room code can only contain lowercase letters, numbers and hyphens." };
  return { ok: true, value };
}
