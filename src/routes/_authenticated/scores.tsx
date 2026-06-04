import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { listClasses, listSubjects, listTerms } from "@/lib/academics.functions";
import { listScoresForClass, upsertScore } from "@/lib/scores.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_authenticated/scores")({
  head: () => ({ meta: [{ title: "Scores — Enigma College" }] }),
  component: ScoresPage,
});

type Row = {
  ca1: string;
  ca2: string;
  ca3: string;
  exam: string;
};

function num(v: string): number | null {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function ScoresPage() {
  const qc = useQueryClient();
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [termId, setTermId] = useState("");
  const [grid, setGrid] = useState<Record<string, Row>>({});

  const { data: classes = [] } = useQuery({ queryKey: ["classes"], queryFn: () => listClasses() });
  const { data: subjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: () => listSubjects() });
  const { data: terms = [] } = useQuery({ queryKey: ["terms"], queryFn: () => listTerms() });

  useEffect(() => {
    const current = terms.find((t) => t.is_current);
    if (current && !termId) setTermId(current.id);
  }, [terms, termId]);

  const subjectsForClass = useMemo(
    () => subjects.filter((s) => s.class_id === classId),
    [subjects, classId],
  );

  const data = useQuery({
    queryKey: ["scores", classId, subjectId, termId],
    queryFn: () =>
      listScoresForClass({
        data: { class_id: classId, subject_id: subjectId, term_id: termId },
      }),
    enabled: !!classId && !!subjectId && !!termId,
  });

  useEffect(() => {
    if (!data.data) return;
    const seed: Record<string, Row> = {};
    for (const s of data.data.students) seed[s.id] = { ca1: "", ca2: "", ca3: "", exam: "" };
    for (const sc of data.data.scores) {
      seed[sc.student_id] = {
        ca1: sc.ca1?.toString() ?? "",
        ca2: sc.ca2?.toString() ?? "",
        ca3: sc.ca3?.toString() ?? "",
        exam: sc.exam?.toString() ?? "",
      };
    }
    setGrid(seed);
  }, [data.data]);

  const save = useMutation({
    mutationFn: async (studentId: string) => {
      const r = grid[studentId];
      return upsertScore({
        data: {
          student_id: studentId,
          subject_id: subjectId,
          term_id: termId,
          ca1: num(r.ca1),
          ca2: num(r.ca2),
          ca3: num(r.ca3),
          exam: num(r.exam),
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scores"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveAll = useMutation({
    mutationFn: async () => {
      const ids = Object.keys(grid);
      let ok = 0;
      for (const id of ids) {
        const r = grid[id];
        if (!r.ca1 && !r.ca2 && !r.ca3 && !r.exam) continue;
        await upsertScore({
          data: {
            student_id: id,
            subject_id: subjectId,
            term_id: termId,
            ca1: num(r.ca1),
            ca2: num(r.ca2),
            ca3: num(r.ca3),
            exam: num(r.exam),
          },
        });
        ok++;
      }
      return ok;
    },
    onSuccess: (n) => {
      toast.success(`Saved ${n} students`);
      qc.invalidateQueries({ queryKey: ["scores"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <PageHeader title="Scores" description="CA + Exam. Total auto-computed (max 100)." />

      <Card className="p-4 mb-4 grid gap-3 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Class</Label>
          <Select value={classId} onValueChange={(v) => { setClassId(v); setSubjectId(""); }}>
            <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
            <SelectContent>
              {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Subject</Label>
          <Select value={subjectId} onValueChange={setSubjectId} disabled={!classId}>
            <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
            <SelectContent>
              {subjectsForClass.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Term</Label>
          <Select value={termId} onValueChange={setTermId}>
            <SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger>
            <SelectContent>
              {terms.map((t) => <SelectItem key={t.id} value={t.id}>{t.session} {t.term}{t.is_current ? " (current)" : ""}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {(!classId || !subjectId || !termId) && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Select class, subject and term to load students.
        </Card>
      )}

      {data.data && data.data.students.length > 0 && (
        <>
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="p-2 font-semibold">Student</th>
                  <th className="p-2 font-semibold w-16">CA1</th>
                  <th className="p-2 font-semibold w-16">CA2</th>
                  <th className="p-2 font-semibold w-16">CA3</th>
                  <th className="p-2 font-semibold w-16">Exam</th>
                  <th className="p-2 font-semibold w-16">Total</th>
                  <th className="p-2 font-semibold w-12">Save</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.data.students.map((s) => {
                  const r = grid[s.id] ?? { ca1: "", ca2: "", ca3: "", exam: "" };
                  const total = (num(r.ca1) ?? 0) + (num(r.ca2) ?? 0) + (num(r.ca3) ?? 0) + (num(r.exam) ?? 0);
                  return (
                    <tr key={s.id}>
                      <td className="p-2">
                        <div className="font-medium">{s.last_name}, {s.first_name}</div>
                        <div className="text-xs text-muted-foreground">{s.admission_no}</div>
                      </td>
                      {(["ca1", "ca2", "ca3", "exam"] as const).map((k) => (
                        <td key={k} className="p-1">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={r[k]}
                            onChange={(e) => setGrid((g) => ({ ...g, [s.id]: { ...r, [k]: e.target.value } }))}
                            className="h-8 px-2 text-sm"
                          />
                        </td>
                      ))}
                      <td className="p-2 font-bold">{total || "—"}</td>
                      <td className="p-1">
                        <Button size="icon" variant="ghost" onClick={() => save.mutate(s.id)}>
                          <Save className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => saveAll.mutate()} disabled={saveAll.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {saveAll.isPending ? "Saving…" : "Save all"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
