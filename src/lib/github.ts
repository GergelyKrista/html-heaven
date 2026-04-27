import { Octokit } from "@octokit/rest";

export interface SlugAvailability {
  available: boolean;
  /** Machine-readable reason the slug isn't available. */
  reason?: "exists-on-main" | "pending-pr";
  /** Human-readable message, safe to surface to the submitter. */
  message?: string;
}

/**
 * Check whether an app slug is free to take. A slug is unavailable if:
 *
 *   1. `apps/<slug>/app.json` already exists on `main` — a merged app
 *      already has that slug, and we don't want silent overwrites via
 *      `createOrUpdateFileContents`.
 *   2. An **open** submission branch for the same slug already exists —
 *      someone just submitted under that title and the PR hasn't merged
 *      yet, so committing a second one would also overwrite the first.
 *
 * Closed / merged PRs don't block — by then outcome 1 catches it if it
 * was merged, and nothing matters if it was rejected.
 */
export async function checkSlugAvailability(slug: string): Promise<SlugAvailability> {
  const octokit = new Octokit({ auth: process.env.GITHUB_PAT });
  const owner = process.env.GITHUB_OWNER!;
  const repo = process.env.GITHUB_REPO!;

  // (1) Already on main?
  try {
    await octokit.repos.getContent({
      owner,
      repo,
      path: `apps/${slug}/app.json`,
      ref: "main",
    });
    return {
      available: false,
      reason: "exists-on-main",
      message: `Slug "${slug}" is already taken. Try a more specific title.`,
    };
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status;
    if (status !== 404) {
      // Any non-404 (rate limit, auth, transient) — fall open. The
      // auto-reviewer still catches duplicate file content on the PR
      // side, and the admin will see the conflict during manual review.
      console.error("checkSlugAvailability getContent non-404:", err);
    }
  }

  // (2) Open submission PR for this slug?
  try {
    // List open PRs whose head ref matches our submission/<slug>-<ts> pattern.
    // The API filter is `head=<owner>:<ref>` for an exact ref; we don't know
    // the timestamp suffix, so list recent open PRs and match the prefix.
    const { data: prs } = await octokit.pulls.list({
      owner,
      repo,
      state: "open",
      per_page: 100,
    });
    const conflict = prs.find((pr) => pr.head?.ref?.startsWith(`submission/${slug}-`));
    if (conflict) {
      return {
        available: false,
        reason: "pending-pr",
        message: `An open submission for "${slug}" is already waiting on review (#${conflict.number}). Pick a different title.`,
      };
    }
  } catch (err) {
    console.error("checkSlugAvailability pulls.list failed:", err);
    // Fall open — see note above.
  }

  return { available: true };
}

interface SubmissionData {
  slug: string;
  hostingType: "bundled" | "external";
  /** Present when hostingType === "bundled". */
  htmlContent?: string;
  /** Present when hostingType === "external". */
  externalUrl?: string;
  metadata: {
    title: string;
    description: string;
    author: string;
    tags: string[];
  };
  // Display name shown in the PR body. We deliberately don't take the
  // submitter's email here — the PR is public on a public repo, and
  // email addresses written into PR bodies live forever in git history
  // whether or not the PR merges. The GitHub username already identifies
  // the author; the site-internal D1 `submissions` row keeps the email
  // for ownership checks.
  submitterName: string;
}

export async function createSubmissionPR(data: SubmissionData): Promise<string> {
  const octokit = new Octokit({ auth: process.env.GITHUB_PAT });
  const owner = process.env.GITHUB_OWNER!;
  const repo = process.env.GITHUB_REPO!;

  const { data: mainRef } = await octokit.git.getRef({
    owner,
    repo,
    ref: "heads/main",
  });
  const baseSha = mainRef.object.sha;

  const timestamp = Date.now();
  const branchName = `submission/${data.slug}-${timestamp}`;
  await octokit.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branchName}`,
    sha: baseSha,
  });

  // app.json shape differs by hostingType. Bundled apps point at a
  // local thumbnail file; external apps carry the URL instead and skip
  // the thumbnail field (they'll fall back to the procedural cover).
  const appJsonObj: Record<string, unknown> = {
    title: data.metadata.title,
    slug: data.slug,
    description: data.metadata.description,
    author: data.metadata.author,
    tags: data.metadata.tags,
    dateAdded: new Date().toISOString().split("T")[0],
    featured: false,
    hostingType: data.hostingType,
  };
  if (data.hostingType === "bundled") {
    appJsonObj.thumbnail = "thumbnail.png";
  } else {
    appJsonObj.externalUrl = data.externalUrl;
  }
  const appJson = JSON.stringify(appJsonObj, null, 2);

  // Commit the HTML file only for bundled submissions
  if (data.hostingType === "bundled" && data.htmlContent) {
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: `apps/${data.slug}/index.html`,
      message: `Add app: ${data.metadata.title}`,
      content: btoa(unescape(encodeURIComponent(data.htmlContent))),
      branch: branchName,
    });
  }

  // Always commit the metadata file
  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: `apps/${data.slug}/app.json`,
    message: `Add metadata for: ${data.metadata.title}`,
    content: btoa(unescape(encodeURIComponent(appJson))),
    branch: branchName,
  });

  // Build a PR body that's clear about which review path this takes.
  // Bundled: the auto-reviewer scans the HTML, admin merges if clean.
  // External: no HTML to scan, admin eyeballs the link manually.
  const typeBadge = data.hostingType === "external" ? "🔗 External" : "📄 Bundled";
  const prBodyLines = [
    `## New App Submission: ${data.metadata.title}`,
    "",
    `**Type:** ${typeBadge}`,
    `**Author:** ${data.metadata.author}`,
    `**Submitted by:** ${data.submitterName}`,
    `**Tags:** ${data.metadata.tags.join(", ")}`,
    "",
    `### Description`,
    data.metadata.description,
    "",
  ];
  if (data.hostingType === "bundled") {
    const previewUrl = `https://github.com/${owner}/${repo}/blob/${branchName}/apps/${data.slug}/index.html`;
    prBodyLines.push(
      `### Preview`,
      `[View the HTML file](${previewUrl})`,
      "",
      `> The auto-reviewer will scan this file. Merge once the check is green.`,
      ""
    );
  } else {
    prBodyLines.push(
      `### External URL`,
      `${data.externalUrl}`,
      "",
      `> No HTML to scan — please open the link and confirm it loads, is publicly viewable, and isn't a scam/phishing page before merging.`,
      ""
    );
  }
  prBodyLines.push(`---`, `*Submitted via HTML Heaven*`);

  const { data: pr } = await octokit.pulls.create({
    owner,
    repo,
    title: `[New App] ${data.metadata.title}${data.hostingType === "external" ? " (external)" : ""}`,
    head: branchName,
    base: "main",
    body: prBodyLines.join("\n"),
  });

  return pr.html_url;
}

interface DeleteResult {
  prUrl: string;
  prNumber: number;
  autoMerged: boolean;
}

/**
 * Creates a PR that deletes an app from the repo. If autoMerge is true,
 * merges it immediately (for admin-triggered deletions).
 */
export async function createDeletePR(params: {
  slug: string;
  deletedBy: string;       // email
  deletedByName: string;
  reason?: string;
  autoMerge: boolean;
}): Promise<DeleteResult> {
  const { slug, deletedBy, deletedByName, reason, autoMerge } = params;
  const octokit = new Octokit({ auth: process.env.GITHUB_PAT });
  const owner = process.env.GITHUB_OWNER!;
  const repo = process.env.GITHUB_REPO!;

  // Get SHA of main
  const { data: mainRef } = await octokit.git.getRef({
    owner, repo, ref: "heads/main",
  });
  const baseSha = mainRef.object.sha;

  // Create a delete branch
  const timestamp = Date.now();
  const branchName = `delete/${slug}-${timestamp}`;
  await octokit.git.createRef({
    owner, repo,
    ref: `refs/heads/${branchName}`,
    sha: baseSha,
  });

  // List files under apps/<slug>/ via the Trees API (recursive)
  const { data: tree } = await octokit.git.getTree({
    owner, repo,
    tree_sha: baseSha,
    recursive: "true",
  });

  const prefix = `apps/${slug}/`;
  const filesToDelete = tree.tree.filter(
    (entry) => entry.type === "blob" && entry.path && entry.path.startsWith(prefix)
  );

  if (filesToDelete.length === 0) {
    // Nothing to delete — still open an empty PR so there's a record, or throw
    throw new Error(`No files found under ${prefix}`);
  }

  // Delete each file on the branch (one commit per file is fine for small apps)
  for (const file of filesToDelete) {
    if (!file.path || !file.sha) continue;
    await octokit.repos.deleteFile({
      owner, repo,
      path: file.path,
      message: `Delete ${file.path}`,
      sha: file.sha,
      branch: branchName,
    });
  }

  // Create the PR
  const body = [
    `## Delete app: \`${slug}\``,
    "",
    `**Deleted by:** ${deletedByName} (${deletedBy})`,
    reason ? `**Reason:** ${reason}` : null,
    "",
    `Removes the \`apps/${slug}/\` directory.`,
    "",
    `---`,
    `*Triggered via HTML Heaven delete flow*`,
  ].filter(Boolean).join("\n");

  const { data: pr } = await octokit.pulls.create({
    owner, repo,
    title: `[Delete] ${slug}`,
    head: branchName,
    base: "main",
    body,
  });

  let autoMerged = false;
  if (autoMerge) {
    try {
      await octokit.pulls.merge({
        owner, repo,
        pull_number: pr.number,
        merge_method: "squash",
        commit_title: `Delete ${slug} (#${pr.number})`,
      });
      autoMerged = true;
      // Clean up the branch after merge
      try {
        await octokit.git.deleteRef({
          owner, repo,
          ref: `heads/${branchName}`,
        });
      } catch {
        // If branch deletion fails, not fatal — the PR's merged
      }
    } catch (err) {
      // Merge failed (conflicts? protected branch rules?) — leave PR open for manual
      console.error("Auto-merge failed:", err);
    }
  }

  return { prUrl: pr.html_url, prNumber: pr.number, autoMerged };
}

export async function postCommentToPR(slug: string, comment: string, userName: string): Promise<void> {
  const pat = process.env.GITHUB_PAT;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  if (!pat || !owner || !repo) return;

  const octokit = new Octokit({ auth: pat });

  // Search for the PR that added this app
  const { data: searchResult } = await octokit.search.issuesAndPullRequests({
    q: `repo:${owner}/${repo} "[New App]" "${slug}" is:pr`,
    per_page: 1,
  });

  if (searchResult.total_count === 0) return;

  const prNumber = searchResult.items[0].number;

  await octokit.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    body: `**Feedback from ${userName}:**\n\n${comment}\n\n---\n*Posted via [HTML Heaven](https://htmlheaven.com/app/${slug})*`,
  });
}
