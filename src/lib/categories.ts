// Categories = broad buckets. Every app belongs to exactly one category.
// Displayed prominently on Browse page and used for grouping.
export const CATEGORIES = [
  { id: "games", label: "Games", icon: "🎮", description: "Playable games" },
  { id: "tools", label: "Tools", icon: "🛠️", description: "Utilities, calculators, converters" },
  { id: "creative", label: "Creative", icon: "🎨", description: "Art, drawing, generative, music" },
  { id: "learning", label: "Learning", icon: "📚", description: "Education, flashcards, guides, cheatsheets" },
  { id: "productivity", label: "Productivity", icon: "⏱️", description: "Timers, task managers, trackers" },
  { id: "exercise", label: "Exercise", icon: "💪", description: "Workouts, fitness routines, stretching" },
  { id: "travel", label: "Travel", icon: "✈️", description: "Trip planners, phrasebooks, itineraries" },
  { id: "ai-skill", label: "AI Skill", icon: "🤖", description: "Context packs for AI tools — reference skills as HTML" },
  { id: "fun", label: "Fun", icon: "✨", description: "Toys, generators, just-for-fun" },
  { id: "other", label: "Other", icon: "📦", description: "Doesn't fit anywhere else" },
] as const;

export type CategoryId = typeof CATEGORIES[number]["id"];

// Suggested tags users can click. Not an allowlist — custom tags are allowed.
// Organized by which categories they most commonly pair with.
export const SUGGESTED_TAGS: Record<CategoryId, string[]> = {
  games: ["arcade", "puzzle", "strategy", "rpg", "shooter", "action", "multiplayer", "single-player", "retro", "tower-defense"],
  tools: ["calculator", "converter", "generator", "visualizer", "formatter", "validator", "color", "math", "counter"],
  creative: ["drawing", "art", "music", "animation", "design", "generative", "pixel-art", "palette"],
  learning: ["language", "coding", "math", "history", "science", "flashcards", "reference", "tutorial", "cheatsheet"],
  productivity: ["timer", "todo", "habits", "planner", "focus", "pomodoro", "notes", "tracker"],
  exercise: ["workout", "fitness", "yoga", "cardio", "strength", "stretching", "hiit", "running", "cycling", "mobility"],
  travel: ["trip-planner", "phrasebook", "itinerary", "currency", "packing-list", "guide", "language", "map"],
  "ai-skill": ["claude-skill", "anthropic", "context", "prompt", "reference", "prompting", "system-prompt"],
  fun: ["humor", "meme", "random", "interactive", "experiment"],
  other: [],
};

// Validation rules for custom tags
export const TAG_RULES = {
  minLength: 2,
  maxLength: 20,
  maxCount: 6,          // max total tags per app
  pattern: /^[a-z0-9]+(-[a-z0-9]+)*$/,  // lowercase alphanumeric with hyphens
};

/**
 * Normalize a free-form tag string to canonical form.
 * "Retro Game" → "retro-game", "  foo_bar  " → "foo-bar"
 * Returns null if the tag can't be normalized to something valid.
 */
export function normalizeTag(raw: string): string | null {
  if (typeof raw !== "string") return null;
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  if (normalized.length < TAG_RULES.minLength || normalized.length > TAG_RULES.maxLength) {
    return null;
  }
  if (!TAG_RULES.pattern.test(normalized)) {
    return null;
  }
  return normalized;
}

export function isValidCategory(id: string): id is CategoryId {
  return CATEGORIES.some((c) => c.id === id);
}
