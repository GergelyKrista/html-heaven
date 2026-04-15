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

  // Prevent clickjacking — site cannot be embedded in iframes on other domains
  headers.set("X-Frame-Options", "SAMEORIGIN");

  // Block MIME-type sniffing
  headers.set("X-Content-Type-Options", "nosniff");

  // Control referrer leakage — only send origin to external sites
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Restrict browser features — deny access to sensitive APIs
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );

  // Force HTTPS for 1 year, including subdomains
  headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );

  // Content Security Policy
  // - default: only same-origin
  // - scripts: same-origin + inline (needed for Next.js hydration)
  // - styles: same-origin + inline (needed for Tailwind)
  // - images: same-origin + data URIs
  // - fonts: same-origin + Google Fonts
  // - frame-src: same-origin (for app iframes served from our domain)
  // - connect: same-origin (API calls)
  // - form-action: same-origin
  // - frame-ancestors: same-origin (prevent our site from being iframed)
  // - base-uri: same-origin (prevent base tag hijacking)
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
