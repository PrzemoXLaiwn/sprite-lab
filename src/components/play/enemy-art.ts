// Enemy pixel maps for the Sprite Dungeon stage. One character = one art pixel;
// "." is transparent. Drawn with fillRect on whole logical pixels only.

import type { Element, EnemyKind } from "@/lib/dungeon/config";

export interface PixelArt {
  rows: string[];
  palette: Record<string, string>;
  /** Palette keys recoloured by the enemy's element (dark / mid / light of its ramp). */
  tint?: Record<string, "dark" | "mid" | "light">;
}

/** Element colour ramps for enemy palette swaps (neutral keeps the drawn colours). */
export const ELEMENT_RAMP: Record<Exclude<Element, "neutral">, { dark: string; mid: string; light: string }> = {
  fire: { dark: "#7A1F0C", mid: "#E8552A", light: "#FFB35C" },
  ice: { dark: "#1E4C7A", mid: "#5EC8F2", light: "#CFF4FF" },
  poison: { dark: "#3E1460", mid: "#9B4DE0", light: "#D6A6FF" },
  holy: { dark: "#7A5A10", mid: "#F2C94C", light: "#FFF3B0" },
  shadow: { dark: "#1A1238", mid: "#5B45B0", light: "#A693FF" },
  nature: { dark: "#0F4D22", mid: "#2FB45A", light: "#9CF0A8" },
  lightning: { dark: "#12407A", mid: "#29ADFF", light: "#BDE9FF" },
};

/** The art's palette for an element. */
export function paletteFor(art: PixelArt, element: Element): Record<string, string> {
  if (element === "neutral" || !art.tint) return art.palette;
  const ramp = ELEMENT_RAMP[element];
  const out = { ...art.palette };
  for (const [k, tone] of Object.entries(art.tint)) out[k] = ramp[tone];
  return out;
}

export const ENEMY_ART: Record<EnemyKind, PixelArt> = {
  rat: {
    tint: { F: "mid", L: "light" },
    palette: { D: "#1C1A24", F: "#7A6F80", L: "#A89CAE", P: "#FF8FB1", r: "#FF004D" },
    rows: [
      ".DD.........",
      "DPFD...DD...",
      ".DFFDDDFFD..",
      "DFrFFFFFFFD.",
      "DFFFFLLFFFD.",
      ".DDFFFFFFDD.",
      "..DFD..DFDDD",
      "..DD....DD.P",
    ],
  },
  ghost: {
    tint: { W: "light", S: "mid" },
    palette: { D: "#3A3F66", W: "#E6E9FF", S: "#B4BBE8", k: "#131A31" },
    rows: [
      "...DDDDDD...",
      "..DWWWWWWD..",
      ".DWWWWWWWWD.",
      ".DWkkWWkkWD.",
      ".DWkkWWkkWD.",
      ".DWWWWWWWWD.",
      ".DWWWkkWWWD.",
      ".DWWWWWWWWD.",
      ".DSWWWWWWSD.",
      ".DSSWSSWSSD.",
      ".DD.DD.DD.D.",
    ],
  },
  imp: {
    tint: { R: "mid", O: "light" },
    palette: { D: "#2A0A08", R: "#E0442B", O: "#FF8A3D", Y: "#FFE36B", k: "#131A31" },
    rows: [
      ".D........D.",
      ".DRD....DRD.",
      "..DRDDDDRD..",
      "..DRRRRRRD..",
      ".DRYkRRkYRD.",
      ".DRRRRRRRRD.",
      "..DRROORRD..",
      "...DDRRDD...",
      "..DRRRRRRD.D",
      ".DRDRRRRDRDO",
      "...DRDDRD.D.",
      "...DD..DD...",
    ],
  },
  slime: {
    tint: { D: "dark", G: "mid", L: "light" },
    palette: { D: "#0A4D2A", G: "#00E436", L: "#9DFFB0", k: "#131A31" },
    rows: [
      "....DDDD....",
      "...DGGGGD...",
      "..DGLLGGGD..",
      ".DGLGGGGGGD.",
      ".DGGkGGkGGD.",
      "DGGGkGGkGGGD",
      "DGGGGGGGGGGD",
      "DGGGGGGGGGGD",
      ".DDDDDDDDDD.",
    ],
  },
  bat: {
    tint: { P: "mid" },
    palette: { D: "#1E1533", P: "#6B4C9A", r: "#FF004D", w: "#FFF1E8" },
    rows: [
      "D.....DD.....D",
      "DD...DPPD...DD",
      "DPD.DPPPPD.DPD",
      "DPPDPrPPrPDPPD",
      "DPPPPPPPPPPPPD",
      ".DPPDPwwPDPPD.",
      "..DD.DPPD.DD..",
      "......DD......",
    ],
  },
  goblin: {
    tint: { G: "mid" },
    palette: { D: "#1A2A12", G: "#5FB04A", r: "#FF004D", w: "#FFF1E8", B: "#8B5A2B" },
    rows: [
      "...D....D...",
      "..DGD..DGD..",
      "..DGGDDGGD..",
      "...DGGGGD...",
      "..DGrGGrGD..",
      "..DGGGGGGD..",
      "...DGwwGD...",
      "....DDDD....",
      "..DBBBBBBD..",
      ".DGDBBBBDGD.",
      ".DGDBBBBDGD.",
      "..DDBBBBDD..",
      "...DB..BD...",
      "...DD..DD...",
    ],
  },
  skeleton: {
    tint: { W: "light" },
    palette: { D: "#2A2F45", W: "#E8E2D0", k: "#131A31" },
    rows: [
      "...DDDDDD...",
      "..DWWWWWWD..",
      ".DWWWWWWWWD.",
      ".DWkkWWkkWD.",
      ".DWkkWWkkWD.",
      "..DWWDDWWD..",
      "...DWWWWD...",
      "....DWWD....",
      "..DDWWWWDD..",
      ".DW.DWWD.WD.",
      ".D..DWWD..D.",
      "....DWWD....",
      "...DW..WD...",
      "...DD..DD...",
    ],
  },
  mimic: {
    tint: { B: "mid" },
    palette: { D: "#2A1608", B: "#8B5A2B", Y: "#FFA300", k: "#131A31", W: "#FFF1E8", r: "#FF004D" },
    rows: [
      "..DDDDDDDDDD..",
      ".DBBBBBBBBBBD.",
      "DBBYBBBBBBYBBD",
      "DBBBBBBBBBBBBD",
      "DYYYYYYYYYYYYD",
      "DkWkWkWkWkWkWD",
      "DkkkkkrkkrkkkD",
      "DWkWkWkWkWkWkD",
      "DYYYYYYYYYYYYD",
      "DBBBBBYYBBBBBD",
      "DBBBBBBBBBBBBD",
      ".DDDDDDDDDDDD.",
    ],
  },
};

export const CROWN: PixelArt = {
  palette: { Y: "#FFA300", D: "#7A4A00" },
  rows: ["Y..Y..Y", "YY.Y.YY", "YYYYYYY", "DDDDDDD"],
};

export function artSize(art: PixelArt): { w: number; h: number } {
  return { w: Math.max(...art.rows.map((r) => r.length)), h: art.rows.length };
}
