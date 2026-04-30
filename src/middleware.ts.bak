import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define public routes that don't need authentication
const publicRoutes = ["/", "/login", "/signup", "/forgot-password", "/reset-password", "/api/public"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 1. Check for public routes
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith("/api/public") || pathname.startsWith("/blog")
  );

  // In a real app, you would check for a session cookie/token here.
  // For this migration, we'll check for a basic auth cookie if it existed, 
  // but since we're using client-side auth inRootProvider, this middleware 
  // is more of a placeholder or for IP protection.
  
  // 2. IP Protection (Optional, based on earlier requirements)
  // const clientIp = request.ip || request.headers.get("x-forwarded-for");
  // if (pathname.startsWith("/admin") && !isWhitelisted(clientIp)) {
  //   return new NextResponse("Access Denied", { status: 403 });
  // }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
