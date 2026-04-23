import { NextRequest, NextResponse } from "next/server";

// Origins allowed to make state-changing requests to our API.
// In production we only accept htmlheaven.com (apex + www). In development
// we also accept localhost on typical Next.js ports so `npm run dev` works.
const PROD_ORIGINS = ["https://htmlheaven.com", "https://www.htmlheaven.com"];
const DEV_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"];

function allowedOrigins(): string[] {
  return process.env.NODE_ENV === "production"
    ? PROD_ORIGINS
    : [...PROD_ORIGINS, ...DEV_ORIGINS];
}

/**
 * Rejects the request if its `Origin` header is missing, `null`, or not in
 * the allow-list. Returns `null` when the check passes so callers can:
 *
 *   const gate = assertSameOrigin(request);
 *   if (gate) return gate;   // early return with 403
 *
 * Why this matters: our CSP sandbox on /apps/* already makes submitted
 * code cross-site, which prevents the SameSite=Lax session cookie from
 * tagging along on fetches back to /api. This function is the
 * server-side belt-and-suspenders — any request that somehow reaches us
 * from an untrusted origin (including `null`, which is what a sandboxed
 * document sends) is rejected before it can act on state.
 *
 * Skipped for GET/HEAD/OPTIONS — those are either idempotent or CORS
 * pre-flights and don't need this check.
 */
export function assertSameOrigin(request: NextRequest): NextResponse | null {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return null;
  }

  const origin = request.headers.get("origin");

  // Missing Origin on a state-changing request is suspicious. Modern
  // browsers attach one to every fetch/XHR and to most form POSTs;
  // `null` is sent by sandboxed documents (exactly what we want to block).
  if (!origin || origin === "null") {
    return NextResponse.json(
      { error: "Forbidden: missing or untrusted origin" },
      { status: 403 }
    );
  }

  if (!allowedOrigins().includes(origin)) {
    return NextResponse.json(
      { error: "Forbidden: origin not allowed" },
      { status: 403 }
    );
  }

  return null;
}
