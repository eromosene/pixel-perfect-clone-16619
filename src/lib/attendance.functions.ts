import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const statusEnum = z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]);

export const listAttendanceForClassDate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ class_id: z.string().uuid(), date: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [{ data: students, error: sErr }, { data: records, error: rErr }] = await Promise.all([
      supabase
        .from("students")
        .select("id, admission_no, first_name, last_name")
        .eq("class_id", data.class_id)
        .eq("is_active", true)
        .order("last_name"),
      supabase
        .from("attendance")
        .select("id, student_id, status, note")
        .eq("date", data.date),
    ]);
    if (sErr) throw new Error(sErr.message);
    if (rErr) throw new Error(rErr.message);
    return { students: students ?? [], records: records ?? [] };
  });

export const upsertAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        date: z.string().min(1),
        term_id: z.string().uuid().nullable().optional(),
        records: z
          .array(
            z.object({
              student_id: z.string().uuid(),
              status: statusEnum,
              note: z.string().max(500).optional().nullable(),
            }),
          )
          .min(1)
          .max(500),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    let termId = data.term_id ?? null;
    if (!termId) {
      const { data: t } = await supabase
        .from("terms")
        .select("id")
        .eq("is_current", true)
        .maybeSingle();
      termId = t?.id ?? null;
    }
    if (!termId) throw new Error("No current term set. Mark a term as current first.");

    const rows = data.records.map((r) => ({
      student_id: r.student_id,
      term_id: termId!,
      date: data.date,
      status: r.status,
      note: r.note || null,
      marked_by_id: userId,
    }));

    const { error } = await supabase
      .from("attendance")
      .upsert(rows, { onConflict: "student_id,date" });
    if (error) throw new Error(error.message);
    return { ok: true, count: rows.length };
  });

export const listStudentAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ student_id: z.string().uuid(), term_id: z.string().uuid().optional() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("attendance")
      .select("id, date, status, note, term_id")
      .eq("student_id", data.student_id)
      .order("date", { ascending: false })
      .limit(180);
    if (data.term_id) q = q.eq("term_id", data.term_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
