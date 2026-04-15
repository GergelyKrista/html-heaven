import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border/50 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 sm:flex-row sm:justify-between sm:px-6">
        <div className="flex items-center gap-1.5 text-[13px] text-muted">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">
            H
          </span>
          <span>HTML Heaven</span>
        </div>
        <div className="flex items-center gap-6 text-[13px] text-muted">
          <Link href="/about" className="transition-colors hover:text-foreground">
            About
          </Link>
          <a
            href="https://github.com/GergelyKrista/html-heaven"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
          >
            GitHub
          </a>
          <span className="text-border">|</span>
          <span>Open source</span>
        </div>
      </div>
    </footer>
  );
}
