import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AppRole = "admin" | "teacher" | "parent" | "student";

export type CurrentUser = {
  id: string;
  email: string | null;
  name: string;
  avatar: string | null;
  roles: AppRole[];
};

export const getCurrentUser = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CurrentUser> => {
    const { supabase, userId, claims } = context;

    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase
        .from("profiles")
        .select("name, avatar")
        .eq("id", userId)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);

    return {
      id: userId,
      email: (claims.email as string | undefined) ?? null,
      name: profile?.name ?? "",
      avatar: profile?.avatar ?? null,
      roles: (roles ?? []).map((r) => r.role as AppRole),
    };
  });
