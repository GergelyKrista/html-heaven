const STORAGE_KEY = "html-heaven-votes";

function getVotesMap(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export function hasVoted(slug: string): boolean {
  return !!getVotesMap()[slug];
}

export function toggleVote(slug: string): boolean {
  const votes = getVotesMap();
  const wasVoted = !!votes[slug];
  if (wasVoted) {
    delete votes[slug];
  } else {
    votes[slug] = true;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(votes));
  return !wasVoted;
}

export function getVotedSlugs(): string[] {
  return Object.keys(getVotesMap());
}
