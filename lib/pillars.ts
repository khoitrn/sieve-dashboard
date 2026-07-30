// Canonical pillar taxonomy — mirrors sieve/AGENTS.md's "## Pillars" section
// verbatim. Single source of truth for the dashboard: LibraryView and
// SkillUsagePanel both import from here instead of keeping their own copies
// of the ordered category list.

export interface Pillar {
  id: string;
  label: string;
  description: string;
  colorVar: string;
}

export const PILLARS: Pillar[] = [
  {
    id: "planning",
    label: "Planning",
    description: "Shape a rough idea or unfamiliar project into an agreed plan before code gets written.",
    colorVar: "var(--cat-planning)",
  },
  {
    id: "testing",
    label: "Testing",
    description: "Enforce a test-first discipline on implementation work.",
    colorVar: "var(--cat-testing)",
  },
  {
    id: "review",
    label: "Review",
    description: "Check completed work against the plan before moving on.",
    colorVar: "var(--info)",
  },
  {
    id: "debugging",
    label: "Debugging",
    description: "Find root causes methodically instead of guessing.",
    colorVar: "var(--cat-debugging)",
  },
  {
    id: "verification",
    label: "Verification",
    description: "Confirm work with evidence before calling it done.",
    colorVar: "var(--cat-verification)",
  },
  {
    id: "maintenance",
    label: "Maintenance",
    description: "Keep the catalog itself healthy over time.",
    colorVar: "var(--cat-maintenance)",
  },
];

// Hand-authored personal skills and whatever a connected source's own
// directory structure produces aren't required to fit the six pillars above
// — they're intentionally free-form. This is where they get bucketed for
// display instead of blending in unlabeled.
export const OTHER_PILLAR_ID = "other";

export function pillarRank(category: string): number {
  const i = PILLARS.findIndex((p) => p.id === category);
  return i === -1 ? PILLARS.length : i;
}

export function pillarLabel(category: string): string {
  return PILLARS.find((p) => p.id === category)?.label ?? category;
}
