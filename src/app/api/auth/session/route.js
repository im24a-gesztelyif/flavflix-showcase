import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    if (error.message === "Auth session missing!") {
      return NextResponse.json({
        user: null,
      });
    }

    return NextResponse.json(
      {
        error: error.message || "Session lookup failed.",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    user: user ? { id: user.id, email: user.email } : null,
  });
}
