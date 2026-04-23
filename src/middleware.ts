import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Force HTTPS
  if (request.headers.get("x-forwarded-proto") === "http") {
    const httpsUrl = request.url.replace("http://", "https://");
    return NextResponse.redirect(httpsUrl, 301);
  }

  const response = NextResponse.next();
  const headers = response.headers;
  const path = request.nextUrl.pathname;

  // Shared headers — applied on every response
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );
  headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );

  // Anything under /apps/ is user-submitted HTML. Treat it as untrusted
  // third-party content even though it's served from our own origin.
  //
  // The CSP `sandbox` directive, applied at the HTTP header level, forces
  // the document into a sandboxed browsing context with an **opaque
  // origin** — even when opened top-level in a new tab or via direct URL.
  // An opaque-origin page is cross-site with htmlheaven.com, so:
  //   - the session cookie (SameSite=Lax) is NOT sent on fetches back to
  //     /api/*, so submitted code can't act as the signed-in user.
  //   - localStorage / sessionStorage / document.cookie are inaccessible.
  //   - top-level navigation is only allowed by explicit user gesture
  //     (keeps the "Back to HTML Heaven" badge click working).
  //
  // This is our primary defense against account takeover via a malicious
  // submission opened in a new tab. Without it, same-origin code would
  // pick up the logged-in user's session cookie and act on their behalf.
  if (path.startsWith("/apps/")) {
    headers.set(
      "Content-Security-Policy",
      "sandbox allow-scripts allow-popups allow-top-navigation-by-user-activation allow-forms allow-modals allow-pointer-lock allow-downloads"
    );
    // Don't set X-Frame-Options — we WANT to embed these in our own iframe.
    return response;
  }

  // Main-site pages and API routes — standard clickjacking + CSP.
  headers.set("X-Frame-Options", "SAMEORIGIN");
  headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob:",
      "font-src 'self' https://fonts.gstatic.com",
      "frame-src 'self'",
      "connect-src 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "base-uri 'self'",
    ].join("; ")
  );

  return response;
}

export const config = {
  // Run on all routes except static files and Next.js internals
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
