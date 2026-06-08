import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listTeachers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["teacher", "admin"]);
    if (error) throw new Error(error.message);
    const byUser: Record<string, { is_teacher: boolean; is_admin: boolean }> = {};
    for (const r of data ?? []) {
      const u = (byUser[r.user_id] ||= { is_teacher: false, is_admin: false });
      if (r.role === "teacher") u.is_teacher = true;
      if (r.role === "admin") u.is_admin = true;
    }
    const ids = Object.keys(byUser).filter((id) => byUser[id].is_teacher);
    if (!ids.length) return [];
    const { data: profs } = await context.supabase
      .from("profiles")
      .select("id, name, email, avatar, is_active")
      .in("id", ids);
    return (profs ?? []).map((p: any) => ({
      ...p,
      is_admin: byUser[p.id]?.is_admin ?? false,
    }));
  });

export const removeTeacherRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ user_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("user_roles")
      .delete()
      .eq("user_id", data.user_id)
      .eq("role", "teacher");
    if (error) throw new Error(error.message);
    return { ok: true };
  });
