import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  listSubjects,
  listClasses,
  createSubject,
  updateSubject,
  deleteSubject,
} from "@/lib/academics.functions";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import { useCurrentUser } from "@/hooks/use-current-user";

export const Route = createFileRoute("/_authenticated/subjects")({
  head: () => ({ meta: [{ title: "Subjects — Enigma College" }] }),
  component: SubjectsPage,
});

type SubjectRow = {
  id: string;
  name: string;
  code: string | null;
  class_id: string;
  classes: { name: string } | null;
};

function SubjectsPage() {
  const { data: user } = useCurrentUser();
  const isAdmin = user.roles.includes("admin");
  const qc = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["subjects"],
    queryFn: () => listSubjects(),
  });
  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: () => listClasses(),
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SubjectRow | null>(null);

  const del = useMutation({
    mutationFn: (id: string) => deleteSubject({ data: { id } }),
    onSuccess: () => {
      toast.success("Subject deleted");
      qc.invalidateQueries({ queryKey: ["subjects"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <PageHeader
        title="Subjects"
        description="Subjects offered per class."
        action={
          isAdmin && (
            <Button
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
              disabled={classes.length === 0}
            >
              <Plus className="h-4 w-4 mr-1" /> New
            </Button>
          )
        }
      />

      {classes.length === 0 && !isLoading && (
        <Card className="p-4 mb-4 text-sm text-muted-foreground">
          Add a class first before creating subjects.
        </Card>
      )}

      <Card className="divide-y">
        {isLoading && <div className="p-4 text-sm text-muted-foreground">Loading…</div>}
        {!isLoading && rows.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">No subjects yet.</div>
        )}
        {rows.map((s) => (
          <div key={s.id} className="p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold truncate">
                {s.name} {s.code && <span className="text-xs text-muted-foreground">({s.code})</span>}
              </div>
              <div className="text-xs text-muted-foreground">
                {s.classes?.name ?? "—"}
              </div>
            </div>
            {isAdmin && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setEditing(s as SubjectRow);
                    setOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (confirm(`Delete subject "${s.name}"?`)) del.mutate(s.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </Card>

      <SubjectDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        classes={classes}
        onDone={() => qc.invalidateQueries({ queryKey: ["subjects"] })}
      />
    </div>
  );
}

function SubjectDialog({
  open,
  onOpenChange,
  editing,
  classes,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: SubjectRow | null;
  classes: { id: string; name: string }[];
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [classId, setClassId] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      const payload = { name, code: code || null, class_id: classId };
      if (editing) return updateSubject({ data: { id: editing.id, ...payload } });
      return createSubject({ data: payload });
    },
    onSuccess: () => {
      toast.success(editing ? "Subject updated" : "Subject created");
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
          setName(editing?.name ?? "");
          setCode(editing?.code ?? "");
          setClassId(editing?.class_id ?? "");
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit subject" : "New subject"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!classId) return toast.error("Pick a class");
            save.mutate();
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Mathematics" />
          </div>
          <div className="space-y-1.5">
            <Label>Code (optional)</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="MTH" />
          </div>
          <div className="space-y-1.5">
            <Label>Class</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a class" />
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
