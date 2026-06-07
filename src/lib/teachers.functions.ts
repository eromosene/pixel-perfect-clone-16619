import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listTeachers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("user_id, role")
      .eq("role", "teacher");
    if (error) throw new Error(error.message);
    const ids = (data ?? []).map((r) => r.user_id);
    let profiles: Record<string, { name: string | null; email: string | null; avatar: string | null }> = {};
    if (ids.length) {
      const { data: profs } = await context.supabase
        .from("profiles")
        .select("id, name, email, avatar")
        .in("id", ids);
      for (const p of profs ?? []) profiles[p.id] = { name: p.name, email: p.email, avatar: p.avatar };
    }
    return (data ?? []).map((r) => ({ id: r.user_id, ...profiles[r.user_id] }));
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
