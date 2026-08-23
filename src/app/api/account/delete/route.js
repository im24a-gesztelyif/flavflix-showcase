import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const { password, confirmation } = await request.json().catch(() => ({}));

  if (confirmation !== "DELETE ACCOUNT") {
    return NextResponse.json(
      {
        error: "Type DELETE ACCOUNT to confirm account deletion.",
      },
      { status: 400 },
    );
  }

  if (!password) {
    return NextResponse.json(
      {
        error: "Password is required.",
      },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      {
        error: "You must be signed in to delete this account.",
      },
      { status: 401 },
    );
  }

  const verificationClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  const { error: verificationError } = await verificationClient.auth.signInWithPassword({
    email: user.email,
    password,
  });

  if (verificationError) {
    return NextResponse.json(
      {
        error: "Password verification failed.",
      },
      { status: 401 },
    );
  }

  const adminClient = createSupabaseAdminClient();
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

  if (deleteError) {
    return NextResponse.json(
      {
        error: deleteError.message || "Account deletion failed.",
      },
      { status: 500 },
    );
  }

  const response = NextResponse.json({
    success: true,
  });

  await supabase.auth.signOut();
  return response;
}
