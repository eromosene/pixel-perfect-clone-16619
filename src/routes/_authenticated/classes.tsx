import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  listClasses,
  createClass,
  updateClass,
  deleteClass,
} from "@/lib/academics.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import { useCurrentUser } from "@/hooks/use-current-user";

export const Route = createFileRoute("/_authenticated/classes")({
  head: () => ({ meta: [{ title: "Classes — Enigma College" }] }),
  component: ClassesPage,
});

type ClassRow = { id: string; name: string; level: string | null; arm: string | null };

function ClassesPage() {
  const { data: user } = useCurrentUser();
  const isAdmin = user.roles.includes("admin");
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["classes"],
    queryFn: () => listClasses(),
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClassRow | null>(null);

  const del = useMutation({
    mutationFn: (id: string) => deleteClass({ data: { id } }),
    onSuccess: () => {
      toast.success("Class deleted");
      qc.invalidateQueries({ queryKey: ["classes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <PageHeader
        title="Classes"
        description="Manage school classes and arms."
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
          <div className="p-8 text-center text-sm text-muted-foreground">
            No classes yet.
          </div>
        )}
        {rows.map((c) => (
          <div key={c.id} className="p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold truncate">{c.name}</div>
              <div className="text-xs text-muted-foreground">
                {[c.level, c.arm].filter(Boolean).join(" • ") || "—"}
              </div>
            </div>
            {isAdmin && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setEditing(c as ClassRow);
                    setOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (confirm(`Delete class "${c.name}"?`)) del.mutate(c.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </Card>

      <ClassDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onDone={() => qc.invalidateQueries({ queryKey: ["classes"] })}
      />
    </div>
  );
}

function ClassDialog({
  open,
  onOpenChange,
  editing,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: ClassRow | null;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [level, setLevel] = useState("");
  const [arm, setArm] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      const payload = { name, level: level || null, arm: arm || null };
      if (editing) return updateClass({ data: { id: editing.id, ...payload } });
      return createClass({ data: payload });
    },
    onSuccess: () => {
      toast.success(editing ? "Class updated" : "Class created");
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
          setLevel(editing?.level ?? "");
          setArm(editing?.arm ?? "");
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit class" : "New class"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="JSS 1A" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Level</Label>
              <Input value={level} onChange={(e) => setLevel(e.target.value)} placeholder="JSS 1" />
            </div>
            <div className="space-y-1.5">
              <Label>Arm</Label>
              <Input value={arm} onChange={(e) => setArm(e.target.value)} placeholder="A" />
            </div>
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
