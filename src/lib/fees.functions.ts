import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listFees = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ student_id: z.string().uuid().optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("fee_payments")
      .select("id, student_id, amount, amount_paid, balance, fee_type, session, term, status, paid_at, created_at, students(first_name, last_name, admission_no)")
      .order("created_at", { ascending: false });
    if (data.student_id) q = q.eq("student_id", data.student_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const feeInput = z.object({
  student_id: z.string().uuid(),
  amount: z.number().min(0),
  amount_paid: z.number().min(0).default(0),
  fee_type: z.string().min(1).max(100).default("School Fees"),
  session: z.string().min(1).max(20),
  term: z.string().min(1).max(20),
});

export const createFee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => feeInput.parse(input))
  .handler(async ({ data, context }) => {
    const balance = Math.max(0, data.amount - data.amount_paid);
    const status =
      data.amount_paid <= 0 ? "PENDING" : balance <= 0 ? "PAID" : "PARTIAL";
    const { error } = await context.supabase.from("fee_payments").insert({
      student_id: data.student_id,
      amount: data.amount,
      amount_paid: data.amount_paid,
      balance,
      fee_type: data.fee_type,
      session: data.session,
      term: data.term,
      status: status as any,
      paid_at: balance <= 0 && data.amount_paid > 0 ? new Date().toISOString() : null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const recordFeePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), amount_paid: z.number().min(0) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error: getErr } = await context.supabase
      .from("fee_payments")
      .select("amount")
      .eq("id", data.id)
      .maybeSingle();
    if (getErr) throw new Error(getErr.message);
    if (!row) throw new Error("Not found");
    const balance = Math.max(0, Number(row.amount) - data.amount_paid);
    const status = data.amount_paid <= 0 ? "PENDING" : balance <= 0 ? "PAID" : "PARTIAL";
    const { error } = await context.supabase
      .from("fee_payments")
      .update({
        amount_paid: data.amount_paid,
        balance,
        status: status as any,
        paid_at: balance <= 0 && data.amount_paid > 0 ? new Date().toISOString() : null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteFee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("fee_payments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ Parent linking ============

export const listMyChildren = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("parent_students")
      .select("id, relation, students(id, first_name, last_name, admission_no, photo, class_id, classes(name))")
      .eq("parent_id", context.userId);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listParentLinks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("parent_students")
      .select("id, parent_id, student_id, relation, students(first_name, last_name, admission_no), profiles!parent_students_parent_id_fkey(name, email)");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const linkParentStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      parent_email: z.string().email(),
      student_id: z.string().uuid(),
      relation: z.string().min(1).max(50).default("Parent"),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: profile, error: pErr } = await context.supabase
      .from("profiles")
      .select("id")
      .eq("email", data.parent_email)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!profile) throw new Error("No user found with that email. They must sign up first.");
    const { error } = await context.supabase.from("parent_students").insert({
      parent_id: profile.id,
      student_id: data.student_id,
      relation: data.relation,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const unlinkParentStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("parent_students").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
