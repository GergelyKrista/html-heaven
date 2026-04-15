"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { useState } from "react";

const links = [
  { href: "/browse", label: "Browse" },
  { href: "/submit", label: "Submit" },
  { href: "/favorites", label: "Favorites" },
];

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="group flex items-center gap-2.5 font-semibold tracking-tight"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-[13px] font-bold text-white transition-transform group-hover:scale-105">
            H
          </span>
          <span className="text-foreground">HTML Heaven</span>
        </Link>

        <div className="hidden items-center gap-0.5 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`relative px-3 py-1.5 text-[13px] font-medium transition-colors ${
                pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href))
                  ? "text-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {link.label}
              {(pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href))) && (
                <span className="absolute bottom-0 left-3 right-3 h-px bg-primary" />
              )}
            </Link>
          ))}

          {/* Auth section */}
          {session?.user ? (
            <Link
              href="/profile"
              className="ml-2 flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-surface"
            >
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt=""
                  className="h-6 w-6 rounded-full"
                />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-2 text-[10px] font-semibold text-muted">
                  {session.user.name?.[0]?.toUpperCase() || "?"}
                </div>
              )}
              <span className="text-[13px] font-medium text-muted-light">
                {session.user.name?.split(" ")[0]}
              </span>
            </Link>
          ) : (
            <button
              onClick={() => signIn("github")}
              className="ml-2 h-8 rounded-md border border-border px-3 text-[12px] font-medium text-muted transition-colors hover:text-foreground"
            >
              Sign in
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          {session?.user && (
            <Link href="/profile">
              {session.user.image ? (
                <img src={session.user.image} alt="" className="h-7 w-7 rounded-full" />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-[11px] font-semibold text-muted">
                  {session.user.name?.[0]?.toUpperCase() || "?"}
                </div>
              )}
            </Link>
          )}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:text-foreground"
            aria-label="Toggle menu"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-border/50 px-4 py-2 md:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`block rounded-md px-3 py-2.5 text-sm transition-colors ${
                pathname === link.href ? "text-foreground" : "text-muted hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {!session?.user && (
            <button
              onClick={() => signIn("github")}
              className="mt-1 block w-full rounded-md px-3 py-2.5 text-left text-sm text-muted hover:text-foreground"
            >
              Sign in
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
