import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isEmailApprovedForSignup, markSignupEmailUsed, normalizeSignupEmail } from "@/lib/signup-allowlist";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const { email, password } = await request.json().catch(() => ({}));
    const normalizedEmail = normalizeSignupEmail(email);

    if (!normalizedEmail || !password) {
      return NextResponse.json(
        {
          error: "Email and password are required.",
        },
        { status: 400 },
      );
    }

    const isApproved = await isEmailApprovedForSignup(normalizedEmail);

    if (!isApproved) {
      return NextResponse.json(
        {
          error: "Error code 1818",
        },
        { status: 403 },
      );
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const { error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
    });

    if (createUserError) {
      const duplicateMessage = /already (?:been )?registered|already exists|duplicate/i;

      return NextResponse.json(
        {
          error: duplicateMessage.test(createUserError.message || "")
            ? "This email already has access or a pending invite. Sign in instead, or finish the invite from email."
            : createUserError.message || "Sign up failed.",
        },
        { status: duplicateMessage.test(createUserError.message || "") ? 409 : 400 },
      );
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      return NextResponse.json(
        {
          error: error.message || "Sign up failed.",
        },
        { status: 500 },
      );
    }

    await markSignupEmailUsed(normalizedEmail);

    return NextResponse.json({
      success: true,
      session: Boolean(data.session),
      user: data.user ? { id: data.user.id, email: data.user.email } : null,
    });
  } catch (routeError) {
    return NextResponse.json(
      {
        error: routeError.message || "Sign up failed.",
      },
      { status: 500 },
    );
  }
}
