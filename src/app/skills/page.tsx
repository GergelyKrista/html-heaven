import { getAllApps } from "@/lib/apps";
import { isSkill } from "@/types";
import { AppGrid } from "@/components/AppGrid";

export const metadata = {
  title: "Skills — HTML Heaven",
  description:
    "Reviewed HTML pages that double as LLM skills — point your agent at any of them. A cheatsheet for you, a skill for your AI.",
};

// The skills home. A skill is a regular app whose content, read as raw HTML,
// works as a reference an agent can apply — see docs/html-skills-design.md.
export default async function SkillsPage() {
  const skills = (await getAllApps()).filter(isSkill);
  const tags = [...new Set(skills.flatMap((a) => a.tags))].sort();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <span>⚡</span> Skills
        </h1>
        <p className="mt-1 max-w-2xl text-[14px] leading-relaxed text-muted">
          Every page here is reviewed content that works two ways: a visual
          reference for you, and a skill for your AI — agents read the same
          HTML directly. Open one and copy its skill URL, or point your agent
          at the{" "}
          <a href="/skills/index.json" className="text-primary-light hover:underline">
            catalog
          </a>{" "}
          /{" "}
          <a href="/llms.txt" className="text-primary-light hover:underline">
            llms.txt
          </a>
          .
        </p>
        <p className="mt-2 text-[13px] text-muted/70">
          {skills.length} skill{skills.length === 1 ? "" : "s"} in the collection
        </p>
      </div>

      {skills.length > 0 ? (
        <AppGrid apps={skills} allTags={tags} />
      ) : (
        <p className="text-[14px] text-muted">
          No skills yet — submit an HTML reference page and flag it as a skill.
        </p>
      )}
    </div>
  );
}
