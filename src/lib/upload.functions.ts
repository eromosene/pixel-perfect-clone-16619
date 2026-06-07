import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      bucket: z.string().min(1),
      path: z.string().min(1),
      contentType: z.string().min(1),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: signed, error } = await context.supabase.storage
      .from(data.bucket)
      .createSignedUploadUrl(data.path);
    if (error) throw new Error(error.message);
    return { token: signed.token, path: data.path, url: signed.signedUrl };
  });

export const deleteStorageObject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      bucket: z.string().min(1),
      path: z.string().min(1),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.storage
      .from(data.bucket)
      .remove([data.path]);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
