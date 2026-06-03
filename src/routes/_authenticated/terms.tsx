import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  listTerms,
  createTerm,
  updateTerm,
  deleteTerm,
} from "@/lib/academics.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import { useCurrentUser } from "@/hooks/use-current-user";

export const Route = createFileRoute("/_authenticated/terms")({
  head: () => ({ meta: [{ title: "Terms — Enigma College" }] }),
  component: TermsPage,
});

type TermRow = {
  id: string;
  session: string;
  term: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
};

function TermsPage() {
  const { data: user } = useCurrentUser();
  const isAdmin = user.roles.includes("admin");
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["terms"],
    queryFn: () => listTerms(),
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TermRow | null>(null);

  const del = useMutation({
    mutationFn: (id: string) => deleteTerm({ data: { id } }),
    onSuccess: () => {
      toast.success("Term deleted");
      qc.invalidateQueries({ queryKey: ["terms"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <PageHeader
        title="Terms"
        description="Academic sessions and terms."
        action={
          isAdmin && (
            <Button
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> New
            </Button>
          )
        }
      />

      <Card className="divide-y">
        {isLoading && <div className="p-4 text-sm text-muted-foreground">Loading…</div>}
        {!isLoading && rows.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">No terms yet.</div>
        )}
        {rows.map((t) => (
          <div key={t.id} className="p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold flex items-center gap-2 flex-wrap">
                {t.session} — {t.term}
                {t.is_current && (
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="h-3 w-3" /> Current
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {t.start_date} → {t.end_date}
              </div>
            </div>
            {isAdmin && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setEditing(t as TermRow);
                    setOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (confirm(`Delete ${t.session} ${t.term}?`)) del.mutate(t.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </Card>

      <TermDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onDone={() => qc.invalidateQueries({ queryKey: ["terms"] })}
      />
    </div>
  );
}

function TermDialog({
  open,
  onOpenChange,
  editing,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: TermRow | null;
  onDone: () => void;
}) {
  const [session, setSession] = useState("");
  const [term, setTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isCurrent, setIsCurrent] = useState(false);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        session,
        term,
        start_date: startDate,
        end_date: endDate,
        is_current: isCurrent,
      };
      if (editing) return updateTerm({ data: { id: editing.id, ...payload } });
      return createTerm({ data: payload });
    },
    onSuccess: () => {
      toast.success(editing ? "Term updated" : "Term created");
      onOpenChange(false);
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (v) {
          setSession(editing?.session ?? "");
          setTerm(editing?.term ?? "");
          setStartDate(editing?.start_date ?? "");
          setEndDate(editing?.end_date ?? "");
          setIsCurrent(editing?.is_current ?? false);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit term" : "New term"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Session</Label>
              <Input value={session} onChange={(e) => setSession(e.target.value)} required placeholder="2025/2026" />
            </div>
            <div className="space-y-1.5">
              <Label>Term</Label>
              <Input value={term} onChange={(e) => setTerm(e.target.value)} required placeholder="First" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>End date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={isCurrent} onCheckedChange={setIsCurrent} id="current" />
            <Label htmlFor="current" className="cursor-pointer">
              Set as current term
            </Label>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
