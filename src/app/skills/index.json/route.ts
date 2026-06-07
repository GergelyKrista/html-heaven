import { NextResponse } from "next/server";
import { getAllApps } from "@/lib/apps";
import { isSkill } from "@/types";

// Machine-readable skills catalog — how agents DISCOVER skills (the skills
// themselves are just the raw HTML at each `url`). All fields come from
// reviewed submission metadata. See docs/html-skills-design.md §4.1.
export async function GET() {
  const skills = (await getAllApps()).filter(isSkill).map((a) => ({
    title: a.title,
    // The reviewed description doubles as the "when to use" signal.
    description: a.description,
    tags: a.tags,
    author: a.author,
    /** Fetch this — the skill content itself (raw, self-contained HTML). */
    url: `https://htmlheaven.com/apps/${a.slug}/index.html`,
    /** Human-facing page with preview, comments, and the skill ribbon. */
    page: `https://htmlheaven.com/app/${a.slug}`,
  }));

  return NextResponse.json(
    {
      name: "HTML Heaven Skills",
      description:
        "Reviewed single-file HTML pages that double as LLM skills. Fetch any skill's `url` and use its content directly — the same page renders for humans.",
      count: skills.length,
      skills,
    },
    {
      headers: {
        // Content only changes when a PR merges and the site redeploys.
        "cache-control": "public, max-age=3600",
      },
    }
  );
}
