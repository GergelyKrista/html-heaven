import Link from "next/link";

export const metadata = {
  title: "About — HTML Heaven",
  description: "Learn about HTML Heaven.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <h1 className="text-xl font-semibold">About</h1>

      <div className="mt-6 space-y-4 text-[14px] leading-relaxed text-muted-light">
        <p>
          HTML Heaven is a community-curated showcase of small, self-contained
          HTML5 apps — bundled single-file uploads and apps hosted on
          contributors&apos; own domains. The site code is open-source under
          MIT; the catalog is moderated.
        </p>

        <p>
          Bundled apps run as a single HTML file loaded in a sandboxed iframe.
          Your input stays in your browser for those; nothing is sent to any
          server except when you choose to like, favorite, or comment.
        </p>

        <h2 className="pt-2 text-[15px] font-semibold text-foreground">
          Contributing
        </h2>
        <p>
          You can{" "}
          <Link href="/submit" className="text-primary-light hover:underline">
            submit an app
          </Link>{" "}
          through the site. It creates a PR on the{" "}
          <a
            href="https://github.com/GergelyKrista/html-heaven"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-light hover:underline"
          >
            GitHub repo
          </a>
          . Every submission is reviewed before going live.
        </p>

        <h2 className="pt-2 text-[15px] font-semibold text-foreground">
          How it works
        </h2>
        <p>
          The catalog of bundled apps lives as files in a GitHub repository, so
          the content is inspectable and forkable. Social data — likes,
          favorites, comments, profiles — is stored in a Cloudflare D1
          database. The whole stack runs on Cloudflare free tiers.
        </p>

        <h2 className="pt-2 text-[15px] font-semibold text-foreground">
          Security
        </h2>
        <p>
          Bundled apps run in sandboxed iframes with restricted permissions
          and an HTTP-level CSP sandbox — even when opened in a new tab they
          can&apos;t read cookies or make authenticated requests back to the
          main site. Externally-hosted apps open in a new tab on their own
          domain; we don&apos;t iframe or proxy them.
        </p>
      </div>
    </div>
  );
}
