import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const roleEnum = z.enum(["admin", "teacher", "parent", "student"]);

export const listAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("announcements")
      .select("id, title, content, target_role, is_pinned, created_at, author_id, profiles:profiles!announcements_author_id_fkey(name)")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      // Fallback if FK alias name differs
      const fb = await context.supabase
        .from("announcements")
        .select("id, title, content, target_role, is_pinned, created_at, author_id")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100);
      if (fb.error) throw new Error(fb.error.message);
      return fb.data ?? [];
    }
    return data ?? [];
  });

const input = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
  target_role: roleEnum.nullable().optional(),
  is_pinned: z.boolean().default(false),
});

export const createAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => input.parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("announcements").insert({
      title: data.title,
      content: data.content,
      target_role: data.target_role ?? null,
      is_pinned: data.is_pinned,
      author_id: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => input.extend({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const { error } = await context.supabase
      .from("announcements")
      .update({ ...rest, target_role: rest.target_role ?? null })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("announcements")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
