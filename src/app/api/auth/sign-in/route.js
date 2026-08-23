import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const { email, password } = await request.json().catch(() => ({}));

  if (!email || !password) {
    return NextResponse.json(
      {
        error: "Email and password are required.",
      },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return NextResponse.json(
      {
        error: error.message || "Sign in failed.",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    success: true,
    session: Boolean(data.session),
    user: data.user ? { id: data.user.id, email: data.user.email } : null,
  });
}
