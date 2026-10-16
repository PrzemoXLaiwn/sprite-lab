// Enemy pixel maps for the Sprite Dungeon stage. One character = one art pixel;
// "." is transparent. Drawn with fillRect on whole logical pixels only.

import type { EnemyKind } from "@/lib/dungeon/config";

export interface PixelArt {
  rows: string[];
  palette: Record<string, string>;
}

export const ENEMY_ART: Record<EnemyKind, PixelArt> = {
  rat: {
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
