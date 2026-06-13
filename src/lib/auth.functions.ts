import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "teacher" | "parent" | "student";

export type CurrentUser = {
  id: string;
  email: string | null;
  name: string;
  avatar: string | null;
  roles: AppRole[];
};

export async function getCurrentUser(): Promise<CurrentUser> {
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData?.session;

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const userId = session.user.id;

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
    email: session.user.email ?? null,
    name: profile?.name ?? "",
    avatar: profile?.avatar ?? null,
    roles: (roles ?? []).map((r) => r.role as AppRole),
  };
}
