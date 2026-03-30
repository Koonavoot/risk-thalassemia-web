import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js Middleware: protect /predict and /history routes.
 * If no JWT cookie is present, redirect to /login.
 */
const PROTECTED_PATHS = ["/predict", "/history"];
const TOKEN_KEY = "thal_access_token";

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const isProtected = PROTECTED_PATHS.some(
        (path) => pathname === path || pathname.startsWith(path + "/")
    );

    if (isProtected) {
        const token = request.cookies.get(TOKEN_KEY)?.value;
        if (!token) {
            const loginUrl = new URL("/login", request.url);
            loginUrl.searchParams.set("from", pathname);
            return NextResponse.redirect(loginUrl);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/predict/:path*", "/history/:path*"],
};
