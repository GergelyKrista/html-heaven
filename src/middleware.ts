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
  const isDev = process.env.NODE_ENV !== "production";

  // Shared headers on every response
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

  // Anything under /apps/ is user-submitted HTML — keep the sandbox CSP.
  // See the PR on origin isolation for the full reasoning; the short
  // version is that `sandbox` at the HTTP-header level gives the document
  // an opaque origin even when loaded top-level, which stops submitted
  // code from making authenticated same-origin requests to /api.
  if (path.startsWith("/apps/")) {
    headers.set(
      "Content-Security-Policy",
      "sandbox allow-scripts allow-popups allow-top-navigation-by-user-activation allow-forms allow-modals allow-pointer-lock allow-downloads"
    );
    return response;
  }

  // Main-site CSP. Notes:
  // - We keep `unsafe-inline` for script-src because Next.js emits inline
  //   bootstrap scripts on every page, and most of our pages are
  //   statically prerendered. Switching to per-request nonces would
  //   require forcing every page to render dynamically (nonce in the
  //   header must match nonce in the HTML), which is a bigger refactor.
  //   We have zero `dangerouslySetInnerHTML` and zero raw-HTML rendering
  //   of user content today, so there is no current XSS sink for an
  //   inline-script injection to hit — it's defense-in-depth, not the
  //   front-line guard.
  // - `unsafe-eval` is only allowed in dev (Turbopack HMR uses it).
  //   Production builds don't need it, so we drop it there.
  // - `object-src 'none'` blocks legacy plugins (<embed>, <object>,
  //   <applet>) — closes a class of obscure bypasses.
  headers.set("X-Frame-Options", "SAMEORIGIN");
  headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob:",
      "font-src 'self' https://fonts.gstatic.com",
      "frame-src 'self'",
      "connect-src 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join("; ")
  );

  return response;
}

export const config = {
  // Run on all routes except static files and Next.js internals
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
