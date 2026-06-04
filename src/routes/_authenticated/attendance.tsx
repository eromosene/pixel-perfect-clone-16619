import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CloudOff, CheckCircle2, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { listClasses, listTerms } from "@/lib/academics.functions";
import {
  listAttendanceForClassDate,
  upsertAttendance,
} from "@/lib/attendance.functions";
import {
  enqueueAttendance,
  flushQueue,
  getQueue,
  onQueueChange,
} from "@/lib/offline-queue";
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

export const Route = createFileRoute("/_authenticated/attendance")({
  head: () => ({ meta: [{ title: "Attendance — Enigma College" }] }),
  component: AttendancePage,
});

type Status = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

const STATUS_OPTIONS: { value: Status; label: string; tone: string }[] = [
  { value: "PRESENT", label: "P", tone: "bg-emerald-500 text-white" },
  { value: "ABSENT", label: "A", tone: "bg-destructive text-white" },
  { value: "LATE", label: "L", tone: "bg-amber-500 text-white" },
  { value: "EXCUSED", label: "E", tone: "bg-sky-500 text-white" },
];

function useOnline() {
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function AttendancePage() {
  const qc = useQueryClient();
  const online = useOnline();
  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [marks, setMarks] = useState<Record<string, Status>>({});
  const [queueSize, setQueueSize] = useState(0);

  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: () => listClasses(),
  });
  const { data: terms = [] } = useQuery({
    queryKey: ["terms"],
    queryFn: () => listTerms(),
  });
  const currentTerm = terms.find((t) => t.is_current);

  const rosterQuery = useQuery({
    queryKey: ["attendance-roster", classId, date],
    queryFn: () =>
      listAttendanceForClassDate({ data: { class_id: classId, date } }),
    enabled: !!classId && !!date,
  });

  // Seed marks from existing records when roster loads
  useEffect(() => {
    if (!rosterQuery.data) return;
    const seed: Record<string, Status> = {};
    for (const s of rosterQuery.data.students) seed[s.id] = "PRESENT";
    for (const r of rosterQuery.data.records) seed[r.student_id] = r.status as Status;
    setMarks(seed);
  }, [rosterQuery.data]);

  // Queue size + auto-flush when online
  useEffect(() => {
    const update = () => setQueueSize(getQueue().length);
    update();
    return onQueueChange(update);
  }, []);

  useEffect(() => {
    if (!online) return;
    flushQueue().then((r) => {
      if (r.synced > 0) {
        toast.success(`Synced ${r.synced} offline attendance entr${r.synced === 1 ? "y" : "ies"}`);
        qc.invalidateQueries({ queryKey: ["attendance-roster"] });
      }
    });
  }, [online, qc]);

  const summary = useMemo(() => {
    const counts: Record<Status, number> = {
      PRESENT: 0,
      ABSENT: 0,
      LATE: 0,
      EXCUSED: 0,
    };
    for (const v of Object.values(marks)) counts[v]++;
    return counts;
  }, [marks]);

  const save = useMutation({
    mutationFn: async () => {
      const records = Object.entries(marks).map(([student_id, status]) => ({
        student_id,
        status,
      }));
      if (records.length === 0) throw new Error("Nothing to save");
      if (!online) {
        enqueueAttendance({
          class_id: classId,
          date,
          term_id: currentTerm?.id ?? null,
          records,
        });
        return { offline: true as const, count: records.length };
      }
      const res = await upsertAttendance({
        data: { date, term_id: currentTerm?.id ?? null, records },
      });
      return { offline: false as const, count: res.count };
    },
    onSuccess: (r) => {
      if (r.offline) {
        toast.success(`Saved offline (${r.count}). Will sync when back online.`);
      } else {
        toast.success(`Saved attendance for ${r.count} students`);
        qc.invalidateQueries({ queryKey: ["attendance-roster"] });
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function manualSync() {
    const r = await flushQueue();
    if (r.synced === 0 && r.failed === 0) toast.info("Nothing to sync");
    else if (r.failed > 0) toast.error(`Synced ${r.synced}, ${r.failed} failed`);
    else toast.success(`Synced ${r.synced} entries`);
    qc.invalidateQueries({ queryKey: ["attendance-roster"] });
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <PageHeader
        title="Attendance"
        description={currentTerm ? `Current term: ${currentTerm.session} ${currentTerm.term}` : "No current term set"}
        action={
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                online ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-destructive/10 text-destructive"
              }`}
            >
              {online ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CloudOff className="h-3.5 w-3.5" />}
              {online ? "Online" : "Offline"}
            </span>
            {queueSize > 0 && (
              <Button variant="outline" size="sm" onClick={manualSync}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Sync {queueSize}
              </Button>
            )}
          </div>
        }
      />

      <Card className="p-4 mb-4 grid gap-3 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Class</Label>
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Quick mark</Label>
          <Button
            variant="outline"
            className="w-full"
            disabled={!rosterQuery.data?.students.length}
            onClick={() => {
              if (!rosterQuery.data) return;
              const all: Record<string, Status> = {};
              for (const s of rosterQuery.data.students) all[s.id] = "PRESENT";
              setMarks(all);
            }}
          >
            All present
          </Button>
        </div>
      </Card>

      {!classId && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Pick a class to load the roster.
        </Card>
      )}

      {classId && rosterQuery.isLoading && (
        <Card className="p-6 text-sm text-muted-foreground">Loading roster…</Card>
      )}

      {classId && rosterQuery.data && rosterQuery.data.students.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No active students in this class.
        </Card>
      )}

      {classId && rosterQuery.data && rosterQuery.data.students.length > 0 && (
        <>
          <div className="flex gap-3 text-xs font-semibold mb-3 px-1">
            <span className="text-emerald-600">P {summary.PRESENT}</span>
            <span className="text-destructive">A {summary.ABSENT}</span>
            <span className="text-amber-600">L {summary.LATE}</span>
            <span className="text-sky-600">E {summary.EXCUSED}</span>
          </div>
          <Card className="divide-y">
            {rosterQuery.data.students.map((s) => {
              const current = marks[s.id] ?? "PRESENT";
              return (
                <div key={s.id} className="p-3 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate text-sm">
                      {s.last_name}, {s.first_name}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{s.admission_no}</div>
                  </div>
                  <div className="flex gap-1">
                    {STATUS_OPTIONS.map((opt) => {
                      const active = current === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setMarks((m) => ({ ...m, [s.id]: opt.value }))}
                          className={`h-9 w-9 rounded-md text-sm font-bold transition ${
                            active ? opt.tone : "bg-muted text-muted-foreground hover:bg-muted/70"
                          }`}
                          aria-label={opt.value}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </Card>

          <div className="sticky bottom-16 md:bottom-4 mt-4 flex justify-end">
            <Button
              size="lg"
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="shadow-lg"
            >
              <Save className="h-4 w-4 mr-2" />
              {save.isPending ? "Saving…" : online ? "Save attendance" : "Save offline"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
