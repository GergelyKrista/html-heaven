import { Octokit } from "@octokit/rest";

interface SubmissionData {
  slug: string;
  htmlContent: string;
  metadata: {
    title: string;
    description: string;
    author: string;
    tags: string[];
  };
  submitterName: string;
  submitterEmail: string;
}

export async function createSubmissionPR(data: SubmissionData): Promise<string> {
  const octokit = new Octokit({ auth: process.env.GITHUB_PAT });
  const owner = process.env.GITHUB_OWNER!;
  const repo = process.env.GITHUB_REPO!;

  // Get the SHA of the main branch
  const { data: mainRef } = await octokit.git.getRef({
    owner,
    repo,
    ref: "heads/main",
  });
  const baseSha = mainRef.object.sha;

  // Create a new branch
  const timestamp = Date.now();
  const branchName = `submission/${data.slug}-${timestamp}`;
  await octokit.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branchName}`,
    sha: baseSha,
  });

  const appJson = JSON.stringify(
    {
      title: data.metadata.title,
      slug: data.slug,
      description: data.metadata.description,
      author: data.metadata.author,
      tags: data.metadata.tags,
      dateAdded: new Date().toISOString().split("T")[0],
      thumbnail: "thumbnail.png",
      featured: false,
    },
    null,
    2
  );

  // Commit the HTML file
  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: `apps/${data.slug}/index.html`,
    message: `Add app: ${data.metadata.title}`,
    content: btoa(unescape(encodeURIComponent(data.htmlContent))),
    branch: branchName,
  });

  // Commit the metadata file
  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: `apps/${data.slug}/app.json`,
    message: `Add metadata for: ${data.metadata.title}`,
    content: btoa(unescape(encodeURIComponent(appJson))),
    branch: branchName,
  });

  // Create the Pull Request
  const previewUrl = `https://github.com/${owner}/${repo}/blob/${branchName}/apps/${data.slug}/index.html`;
  const { data: pr } = await octokit.pulls.create({
    owner,
    repo,
    title: `[New App] ${data.metadata.title}`,
    head: branchName,
    base: "main",
    body: [
      `## New App Submission: ${data.metadata.title}`,
      "",
      `**Author:** ${data.metadata.author}`,
      `**Submitted by:** ${data.submitterName} (${data.submitterEmail})`,
      `**Tags:** ${data.metadata.tags.join(", ")}`,
      "",
      `### Description`,
      data.metadata.description,
      "",
      `### Preview`,
      `[View the HTML file](${previewUrl})`,
      "",
      `---`,
      `*Submitted via HTML Heaven*`,
    ].join("\n"),
  });

  return pr.html_url;
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
