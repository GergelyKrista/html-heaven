import { getAllApps } from "@/lib/apps";
import { isSkill } from "@/types";

// llms.txt — the emerging convention for telling LLMs what a site offers.
// Lists every reviewed skill with its direct content URL.
// See docs/html-skills-design.md §4.2.
export async function GET() {
  const skills = (await getAllApps()).filter(isSkill);

  const lines = [
    "# HTML Heaven",
    "",
    "> Community-curated single-file HTML apps. Pages flagged as skills are",
    "> reviewed references an LLM can consume directly — fetch the URL and",
    "> use the content. The same page renders visually for humans.",
    "",
    "## Skills",
    "",
    ...skills.map(
      (a) =>
        `- [${a.title}](https://htmlheaven.com/apps/${a.slug}/index.html): ${a.description}`
    ),
    "",
    "## Catalog",
    "",
    "- [Skills catalog (JSON)](https://htmlheaven.com/skills/index.json): machine-readable list of all skills",
    "- [Browse all apps](https://htmlheaven.com/browse): the full human-facing collection",
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
