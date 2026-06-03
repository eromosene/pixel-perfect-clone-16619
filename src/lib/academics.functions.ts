import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ============= Classes =============

export const listClasses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("classes")
      .select("id, name, level, arm, created_at")
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const classInput = z.object({
  name: z.string().min(1).max(100),
  level: z.string().max(50).optional().nullable(),
  arm: z.string().max(50).optional().nullable(),
});

export const createClass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => classInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("classes").insert({
      name: data.name,
      level: data.level || null,
      arm: data.arm || null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateClass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => classInput.extend({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("classes")
      .update({ name: data.name, level: data.level || null, arm: data.arm || null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteClass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("classes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============= Subjects =============

export const listSubjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("subjects")
      .select("id, name, code, class_id, created_at, classes(name)")
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const subjectInput = z.object({
  name: z.string().min(1).max(100),
  code: z.string().max(20).optional().nullable(),
  class_id: z.string().uuid(),
});

export const createSubject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => subjectInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("subjects").insert({
      name: data.name,
      code: data.code || null,
      class_id: data.class_id,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateSubject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => subjectInput.extend({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("subjects")
      .update({ name: data.name, code: data.code || null, class_id: data.class_id })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSubject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("subjects").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============= Terms =============

export const listTerms = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("terms")
      .select("id, session, term, start_date, end_date, is_current, created_at")
      .order("start_date", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const termInput = z.object({
  session: z.string().min(1).max(20),
  term: z.string().min(1).max(20),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  is_current: z.boolean().default(false),
});

export const createTerm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => termInput.parse(input))
  .handler(async ({ data, context }) => {
    if (data.is_current) {
      await context.supabase.from("terms").update({ is_current: false }).neq("id", "00000000-0000-0000-0000-000000000000");
    }
    const { error } = await context.supabase.from("terms").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateTerm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => termInput.extend({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    if (data.is_current) {
      await context.supabase.from("terms").update({ is_current: false }).neq("id", data.id);
    }
    const { id, ...rest } = data;
    const { error } = await context.supabase.from("terms").update(rest).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTerm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("terms").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============= Students =============

export const listStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("students")
      .select("id, admission_no, first_name, last_name, other_name, gender, date_of_birth, class_id, is_active, photo, address, classes(name)")
      .order("last_name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getStudent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("students")
      .select("*, classes(name)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

const studentInput = z.object({
  admission_no: z.string().min(1).max(50),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  other_name: z.string().max(100).optional().nullable(),
  gender: z.enum(["MALE", "FEMALE"]),
  date_of_birth: z.string().optional().nullable(),
  class_id: z.string().uuid().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  is_active: z.boolean().default(true),
});

export const createStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => studentInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("students").insert({
      ...data,
      other_name: data.other_name || null,
      date_of_birth: data.date_of_birth || null,
      class_id: data.class_id || null,
      address: data.address || null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => studentInput.extend({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const { error } = await context.supabase
      .from("students")
      .update({
        ...rest,
        other_name: rest.other_name || null,
        date_of_birth: rest.date_of_birth || null,
        class_id: rest.class_id || null,
        address: rest.address || null,
      })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("students").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
