import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function computeGrade(total: number): { grade: string; remark: string } {
  if (total >= 75) return { grade: "A", remark: "Excellent" };
  if (total >= 65) return { grade: "B", remark: "Very Good" };
  if (total >= 55) return { grade: "C", remark: "Good" };
  if (total >= 45) return { grade: "D", remark: "Pass" };
  if (total >= 40) return { grade: "E", remark: "Weak Pass" };
  return { grade: "F", remark: "Fail" };
}

export const listScoresForClass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        class_id: z.string().uuid(),
        subject_id: z.string().uuid(),
        term_id: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [{ data: students, error: sErr }, { data: scores, error: scErr }] = await Promise.all([
      supabase
        .from("students")
        .select("id, admission_no, first_name, last_name")
        .eq("class_id", data.class_id)
        .eq("is_active", true)
        .order("last_name"),
      supabase
        .from("scores")
        .select("id, student_id, ca1, ca2, ca3, exam, total, grade, remark")
        .eq("subject_id", data.subject_id)
        .eq("term_id", data.term_id),
    ]);
    if (sErr) throw new Error(sErr.message);
    if (scErr) throw new Error(scErr.message);
    return { students: students ?? [], scores: scores ?? [] };
  });

export const upsertScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        student_id: z.string().uuid(),
        subject_id: z.string().uuid(),
        term_id: z.string().uuid(),
        ca1: z.number().min(0).max(100).nullable().optional(),
        ca2: z.number().min(0).max(100).nullable().optional(),
        ca3: z.number().min(0).max(100).nullable().optional(),
        exam: z.number().min(0).max(100).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const total =
      (data.ca1 ?? 0) + (data.ca2 ?? 0) + (data.ca3 ?? 0) + (data.exam ?? 0);
    const { grade, remark } = computeGrade(total);
    const { error } = await context.supabase.from("scores").upsert(
      {
        student_id: data.student_id,
        subject_id: data.subject_id,
        term_id: data.term_id,
        ca1: data.ca1 ?? null,
        ca2: data.ca2 ?? null,
        ca3: data.ca3 ?? null,
        exam: data.exam ?? null,
        total,
        grade,
        remark,
      },
      { onConflict: "student_id,subject_id,term_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true, total, grade };
  });

export const listStudentResults = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ student_id: z.string().uuid(), term_id: z.string().uuid() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("scores")
      .select("id, ca1, ca2, ca3, exam, total, grade, remark, subjects(name, code)")
      .eq("student_id", data.student_id)
      .eq("term_id", data.term_id);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
