// Gamification utility — XP, levels, badges — all localStorage-backed

export function getXP(): number {
  if (typeof window === "undefined") return 0;
  try { return Number(localStorage.getItem("fl_xp") ?? "0"); } catch { return 0; }
}

export function addXP(points: number): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem("fl_xp", String(getXP() + points)); } catch { /* noop */ }
}

export function getLevel(): { level: number; title: string } {
  const xp = getXP();
  if (xp > 250) return { level: 3, title: "On Track" };
  if (xp > 100) return { level: 2, title: "Active Matter" };
  return { level: 1, title: "New Client" };
}

export function getBadges(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("fl_badges");
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
}

export function awardBadge(id: string, _label: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const badges = getBadges();
    if (badges.includes(id)) return false;
    localStorage.setItem("fl_badges", JSON.stringify([...badges, id]));
    return true;
  } catch { return false; }
}

// XP event constants
export const XP_EVENTS = {
  ACCOUNT_CREATED: 50,
  EMAIL_VERIFIED: 25,
  ID_UPLOADED: 50,
  KYC_COMPLETE: 75,
  CONSULTATION_ATTENDED: 100,
  PHASE_COMPLETE: 50,
} as const;

// Badge definitions
export const BADGE_DEFS: Record<string, string> = {
  "first-login":   "First Login",
  "portal-ready":  "Portal Ready",
  "matter-moving": "Matter Moving",
  "almost-there":  "Almost There",
};
