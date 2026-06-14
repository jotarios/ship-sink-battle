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
  "Render as ONE sprite sheet image, 1024x1024 pixels, divided into a STRICT 4 rows by 4 " +
  "columns grid = exactly 16 equal cells, each cell exactly 256x256 pixels, evenly spaced. " +
  "Draw the EXACT SAME character in all 16 cells: identical design, identical size, identical " +
  "palette, centered within its cell. Read each row left-to-right as ONE looping 4-frame " +
  "animation: row 1 = idle (small breathing bob, near-identical frames), row 2 = walk cycle, " +
  "row 3 = attack swing, row 4 = hurt recoil. Keep consecutive frames in a row only slightly " +
  "different so the row plays as smooth motion. Flat single-color background filling every " +
  "cell. NO gridlines, NO borders, NO numbers, NO labels, NO text, NO shadows between cells.";

export function buildSheetPrompt(
  userPrompt: string,
  style: SpriteStyleId = DEFAULT_STYLE,
): string {
  return `${userPrompt.trim()}. ${SPRITE_STYLES[style].suffix} ${SHEET_LAYOUT}`;
}
