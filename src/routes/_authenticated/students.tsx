import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Search, Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  listStudents,
  listClasses,
  createStudent,
  updateStudent,
  deleteStudent,
} from "@/lib/academics.functions";
import { getUploadUrl } from "@/lib/upload.functions";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

export const Route = createFileRoute("/_authenticated/students")({
  head: () => ({ meta: [{ title: "Students — Enigma College" }] }),
  component: StudentsPage,
});

type StudentRow = {
  id: string;
  admission_no: string;
  first_name: string;
  last_name: string;
  other_name: string | null;
  gender: "MALE" | "FEMALE";
  date_of_birth: string | null;
  class_id: string | null;
  address: string | null;
  is_active: boolean;
  classes: { name: string } | null;
};

function StudentsPage() {
  const { data: user } = useCurrentUser();
  const isAdmin = user.roles.includes("admin");
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["students"],
    queryFn: () => listStudents(),
  });
  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: () => listClasses(),
  });

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StudentRow | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((s) =>
      `${s.first_name} ${s.last_name} ${s.admission_no}`.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const del = useMutation({
    mutationFn: (id: string) => deleteStudent({ data: { id } }),
    onSuccess: () => {
      toast.success("Student deleted");
      qc.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <PageHeader
        title="Students"
        description="School roll. Admins can add and edit."
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

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search name or admission no"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className="divide-y">
        {isLoading && <div className="p-4 text-sm text-muted-foreground">Loading…</div>}
        {!isLoading && filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {rows.length === 0 ? "No students yet." : "No matches."}
          </div>
        )}
        {filtered.map((s) => {
          const initials = `${s.first_name[0] ?? ""}${s.last_name[0] ?? ""}`.toUpperCase();
          return (
            <div key={s.id} className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-secondary text-primary grid place-items-center text-sm font-bold flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">
                  {s.last_name}, {s.first_name} {s.other_name ?? ""}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {s.admission_no} • {s.classes?.name ?? "Unassigned"} •{" "}
                  {s.is_active ? "Active" : "Inactive"}
                </div>
              </div>
              {isAdmin && (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditing(s as StudentRow);
                      setOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm(`Delete ${s.first_name} ${s.last_name}?`)) del.mutate(s.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </Card>

      <StudentDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        classes={classes}
        onDone={() => qc.invalidateQueries({ queryKey: ["students"] })}
      />
    </div>
  );
}

function StudentDialog({
  open,
  onOpenChange,
  editing,
  classes,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: StudentRow | null;
  classes: { id: string; name: string }[];
  onDone: () => void;
}) {
  const [form, setForm] = useState({
    admission_no: "",
    first_name: "",
    last_name: "",
    other_name: "",
    gender: "MALE" as "MALE" | "FEMALE",
    date_of_birth: "",
    class_id: "",
    address: "",
    is_active: true,
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        admission_no: form.admission_no,
        first_name: form.first_name,
        last_name: form.last_name,
        other_name: form.other_name || null,
        gender: form.gender,
        date_of_birth: form.date_of_birth || null,
        class_id: form.class_id || null,
        address: form.address || null,
        is_active: form.is_active,
      };
      if (editing) return updateStudent({ data: { id: editing.id, ...payload } });
      return createStudent({ data: payload });
    },
    onSuccess: () => {
      toast.success(editing ? "Student updated" : "Student created");
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
          setForm({
            admission_no: editing?.admission_no ?? "",
            first_name: editing?.first_name ?? "",
            last_name: editing?.last_name ?? "",
            other_name: editing?.other_name ?? "",
            gender: editing?.gender ?? "MALE",
            date_of_birth: editing?.date_of_birth ?? "",
            class_id: editing?.class_id ?? "",
            address: editing?.address ?? "",
            is_active: editing?.is_active ?? true,
          });
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit student" : "New student"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label>Admission number</Label>
            <Input
              value={form.admission_no}
              onChange={(e) => setForm({ ...form, admission_no: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>First name</Label>
              <Input
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Last name</Label>
              <Input
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Other name (optional)</Label>
            <Input
              value={form.other_name}
              onChange={(e) => setForm({ ...form, other_name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select
                value={form.gender}
                onValueChange={(v) => setForm({ ...form, gender: v as "MALE" | "FEMALE" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date of birth</Label>
              <Input
                type="date"
                value={form.date_of_birth}
                onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Class</Label>
            <Select
              value={form.class_id}
              onValueChange={(v) => setForm({ ...form, class_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Unassigned" />
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
            <Label>Address</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="active"
              checked={form.is_active}
              onCheckedChange={(v) => setForm({ ...form, is_active: v })}
            />
            <Label htmlFor="active" className="cursor-pointer">
              Active
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
