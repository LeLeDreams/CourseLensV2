import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function POST(req: Request) {
  try {
    const { userId, studentId } = await req.json();

    if (!userId || !studentId) {
      return NextResponse.json({ error: "Missing studentId" }, { status: 400 });
    }

    const { error: evalError} = await supabaseAdmin
      .from("course_evaluations")
      .delete()
      .eq("student_profile_id", studentId);

      if (evalError) {
        return NextResponse.json({ error: evalError.message }, { status: 500 });
      }
    
    const { error: profileError} =  await supabaseAdmin
      .from("student_profiles")
      .delete()
      .eq("id", studentId);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    const {error: reqError} = await supabaseAdmin
      .from("class_add_requests")
      .delete()
      .eq("requested_by_user_id", userId);

    if (reqError) {
      return NextResponse.json({ error: reqError.message }, { status: 500 });
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}