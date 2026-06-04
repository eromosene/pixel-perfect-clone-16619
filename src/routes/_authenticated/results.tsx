import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listStudents, listTerms } from "@/lib/academics.functions";
import { listStudentResults } from "@/lib/scores.functions";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_authenticated/results")({
  head: () => ({ meta: [{ title: "Results — Enigma College" }] }),
  component: ResultsPage,
});

function ResultsPage() {
  const [studentId, setStudentId] = useState("");
  const [termId, setTermId] = useState("");

  const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: () => listStudents() });
  const { data: terms = [] } = useQuery({ queryKey: ["terms"], queryFn: () => listTerms() });

  useEffect(() => {
    const cur = terms.find((t) => t.is_current);
    if (cur && !termId) setTermId(cur.id);
  }, [terms, termId]);

  const results = useQuery({
    queryKey: ["student-results", studentId, termId],
    queryFn: () => listStudentResults({ data: { student_id: studentId, term_id: termId } }),
    enabled: !!studentId && !!termId,
  });

  const totals = useMemo(() => {
    const rows = results.data ?? [];
    const sum = rows.reduce((acc, r) => acc + (r.total ?? 0), 0);
    const avg = rows.length ? Math.round((sum / rows.length) * 10) / 10 : 0;
    return { sum, avg, count: rows.length };
  }, [results.data]);

  const student = students.find((s) => s.id === studentId);
  const term = terms.find((t) => t.id === termId);

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      <PageHeader title="Results" description="View student results for a term." />

      <Card className="p-4 mb-4 grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Student</Label>
          <Select value={studentId} onValueChange={setStudentId}>
            <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
            <SelectContent>
              {students.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.last_name}, {s.first_name} ({s.admission_no})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Term</Label>
          <Select value={termId} onValueChange={setTermId}>
            <SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger>
            <SelectContent>
              {terms.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.session} {t.term}{t.is_current ? " (current)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {(!studentId || !termId) && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Pick a student and a term.
        </Card>
      )}

      {results.data && (
        <Card className="p-5">
          <div className="mb-4">
            <h2 className="text-lg font-bold">
              {student ? `${student.last_name}, ${student.first_name}` : ""}
            </h2>
            <p className="text-xs text-muted-foreground">
              {term ? `${term.session} ${term.term}` : ""}
            </p>
          </div>

          {results.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No scores recorded for this term.</p>
          ) : (
            <>
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground border-b">
                    <tr>
                      <th className="py-2">Subject</th>
                      <th className="py-2 w-12">CA1</th>
                      <th className="py-2 w-12">CA2</th>
                      <th className="py-2 w-12">CA3</th>
                      <th className="py-2 w-12">Exam</th>
                      <th className="py-2 w-14">Total</th>
                      <th className="py-2 w-10">Grd</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {results.data.map((r) => (
                      <tr key={r.id}>
                        <td className="py-2 font-medium">
                          {(r as any).subjects?.name ?? "—"}
                        </td>
                        <td className="py-2">{r.ca1 ?? "—"}</td>
                        <td className="py-2">{r.ca2 ?? "—"}</td>
                        <td className="py-2">{r.ca3 ?? "—"}</td>
                        <td className="py-2">{r.exam ?? "—"}</td>
                        <td className="py-2 font-bold">{r.total ?? "—"}</td>
                        <td className="py-2 font-bold">{r.grade ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 pt-4 border-t flex justify-between text-sm">
                <span className="text-muted-foreground">Subjects: {totals.count}</span>
                <span className="font-bold">Average: {totals.avg}</span>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
