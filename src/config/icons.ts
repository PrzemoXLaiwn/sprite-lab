// ===========================================
// SPRITELAB CONFIG - ICON MAPPING
// ===========================================
// Maps string icon names to Lucide React components
// Used by frontend to render category icons

import {
  Swords,
  Shield,
  FlaskConical,
  Gem,
  Key,
  Users,
  PawPrint,
  Trees,
  Box,
  LayoutGrid,
  Monitor,
  Sparkles,
  Target,
  type LucideIcon,
} from "lucide-react";

// ===========================================
// ICON MAP
// ===========================================

export const ICON_MAP: Record<string, LucideIcon> = {
  Swords,
  Shield,
  FlaskConical,
  Gem,
  Key,
  Users,
  PawPrint,
  Trees,
  Box,
  LayoutGrid,
  Monitor,
  Sparkles,
  Target,
};

/**
 * Get Lucide icon component by name
 */
export function getIconByName(iconName: string): LucideIcon | null {
  return ICON_MAP[iconName] || null;
}
