"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useSession } from "next-auth/react";

interface OwnershipState {
  slugs: Set<string>;
  isAdmin: boolean;
  canDelete(slug: string): boolean;
}

const defaultState: OwnershipState = {
  slugs: new Set(),
  isAdmin: false,
  canDelete: () => false,
};

const Ctx = createContext<OwnershipState>(defaultState);

/**
 * Fetches the viewer's submitted app slugs + admin status once on mount.
 * Used by AppCard to decide whether to show the delete button.
 */
export function OwnershipProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [state, setState] = useState<OwnershipState>(defaultState);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      setState(defaultState);
      return;
    }

    let cancelled = false;
    fetch("/api/apps/ownership")
      .then((r) => r.json())
      .then((data: { slugs?: string[]; isAdmin?: boolean }) => {
        if (cancelled) return;
        const slugs = new Set(data.slugs || []);
        const isAdmin = data.isAdmin ?? false;
        setState({
          slugs,
          isAdmin,
          canDelete: (slug: string) => isAdmin || slugs.has(slug),
        });
      })
      .catch(() => {
        if (!cancelled) setState(defaultState);
      });

    return () => { cancelled = true; };
  }, [session, status]);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useOwnership() {
  return useContext(Ctx);
}
