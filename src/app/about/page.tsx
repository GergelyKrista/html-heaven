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
          HTML Heaven is a collection of free, self-contained HTML5 apps that
          run entirely in your browser. No downloads, no accounts, no tracking.
        </p>

        <p>
          Every app is a single HTML file loaded in a sandboxed iframe. Your
          data stays in your browser. Nothing is sent to any server.
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
          The entire catalog lives as files in a GitHub repository. There&apos;s
          no database and no recurring cost. Favorites and votes are stored in
          your browser&apos;s localStorage.
        </p>

        <h2 className="pt-2 text-[15px] font-semibold text-foreground">
          Security
        </h2>
        <p>
          Apps run in sandboxed iframes with restricted permissions. They cannot
          access cookies, storage, or any data from the parent page.
        </p>
      </div>
    </div>
  );
}
