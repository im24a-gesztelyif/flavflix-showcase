import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const AUTH_CALLBACK_PARAMS = [
  "code",
  "token_hash",
  "type",
  "access_token",
  "refresh_token",
  "expires_in",
  "expires_at",
  "token_type",
  "provider_token",
  "provider_refresh_token",
  "error",
  "error_code",
  "error_description",
];

function copyCookies(fromResponse, toResponse) {
  fromResponse.cookies.getAll().forEach((cookie) => {
    toResponse.cookies.set(cookie);
  });
}

export async function middleware(request) {
  const { response, user } = await updateSession(request);
  const { pathname, search } = request.nextUrl;
  const isAuthRoute = pathname.startsWith("/auth");

  if (!user && !isAuthRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth";
    redirectUrl.search = "";

    const nextUrl = new URL(request.nextUrl.toString());
    const authCallbackSnapshot = new Map();

    AUTH_CALLBACK_PARAMS.forEach((param) => {
      const value = nextUrl.searchParams.get(param);

      if (value) {
        authCallbackSnapshot.set(param, value);
        nextUrl.searchParams.delete(param);
      }
    });

    redirectUrl.searchParams.set("next", `${pathname}${nextUrl.search}`);

    authCallbackSnapshot.forEach((value, key) => {
      redirectUrl.searchParams.set(key, value);
    });

    if (authCallbackSnapshot.get("type") === "invite") {
      redirectUrl.searchParams.set("mode", "reset");
    }

    const redirectResponse = NextResponse.redirect(redirectUrl);
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|map)$).*)"],
};
