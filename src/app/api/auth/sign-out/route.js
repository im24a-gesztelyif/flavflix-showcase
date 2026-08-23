import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });

  if (error) {
    return NextResponse.json(
      {
        error: error.message || "Sign out failed.",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    success: true,
  });
}
