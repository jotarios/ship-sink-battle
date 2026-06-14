export type SpriteStyleId = "nes" | "gameboy" | "arcade";

export interface SpriteStyle {
  id: SpriteStyleId;
  label: string;
  suffix: string;
}

export const SPRITE_STYLES: Record<SpriteStyleId, SpriteStyle> = {
  nes: {
    id: "nes",
    label: "NES",
    suffix:
      "NES-era 8-bit pixel art sprite of a single character, centered, full body, " +
      "flat solid background, limited 16-color palette, crisp hard pixels, no anti-aliasing, " +
      "no text, no watermark, retro video game style.",
  },
  gameboy: {
    id: "gameboy",
    label: "Game Boy",
    suffix:
      "Original Game Boy 4-shade green monochrome pixel sprite of a single character, " +
      "centered, full body, flat background, dithered shading, chunky pixels, no text, " +
      "no watermark, retro handheld game style.",
  },
  arcade: {
    id: "arcade",
    label: "Arcade",
    suffix:
      "16-bit arcade pixel art sprite of a single character, centered, full body, " +
      "flat background, vibrant saturated palette, bold black outline, crisp pixels, " +
      "no anti-aliasing, no text, no watermark, retro arcade fighter style.",
  },
};

export const DEFAULT_STYLE: SpriteStyleId = "nes";

export function buildSpritePrompt(
  userPrompt: string,
  style: SpriteStyleId = DEFAULT_STYLE,
): string {
  return `${userPrompt.trim()}. ${SPRITE_STYLES[style].suffix}`;
}

const SHEET_LAYOUT =
  "Render as ONE spritesheet grid: 9 columns by 8 rows of frames on a single image, " +
  "each cell 192x208 pixels, total 1728x1664 pixels, the SAME character in every cell, " +
  "consistent size and palette across all cells, each row a short animation cycle " +
  "(row 1 idle, row 2 walk, row 3 attack, row 4 hurt), flat background, no grid lines, no text.";

export function buildSheetPrompt(
  userPrompt: string,
  style: SpriteStyleId = DEFAULT_STYLE,
): string {
  return `${userPrompt.trim()}. ${SPRITE_STYLES[style].suffix} ${SHEET_LAYOUT}`;
}
