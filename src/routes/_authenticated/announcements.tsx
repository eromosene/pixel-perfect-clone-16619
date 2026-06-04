import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Pin, Megaphone } from "lucide-react";
import { toast } from "sonner";
import {
  listAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "@/lib/announcements.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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

export const Route = createFileRoute("/_authenticated/announcements")({
  head: () => ({ meta: [{ title: "Announcements — Enigma College" }] }),
  component: AnnouncementsPage,
});

type Role = "admin" | "teacher" | "parent" | "student";
type Row = {
  id: string;
  title: string;
  content: string;
  target_role: Role | null;
  is_pinned: boolean;
  created_at: string;
};

function AnnouncementsPage() {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const canWrite = user.roles.includes("admin") || user.roles.includes("teacher");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: () => listAnnouncements(),
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  const del = useMutation({
    mutationFn: (id: string) => deleteAnnouncement({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      <PageHeader
        title="Announcements"
        description="School-wide news. Pinned items appear first."
        action={
          canWrite && (
            <Button onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> New
            </Button>
          )
        }
      />

      {isLoading && <div className="p-4 text-sm text-muted-foreground">Loading…</div>}
      {!isLoading && rows.length === 0 && (
        <Card className="p-10 text-center">
          <Megaphone className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <div className="text-sm text-muted-foreground">No announcements yet.</div>
        </Card>
      )}

      <div className="space-y-3">
        {rows.map((a) => (
          <Card key={a.id} className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {a.is_pinned && <Pin className="h-3.5 w-3.5 text-primary" />}
                  <h3 className="font-bold truncate">{a.title}</h3>
                </div>
                <p className="text-sm whitespace-pre-wrap text-foreground/80">{a.content}</p>
                <div className="text-[11px] text-muted-foreground mt-2 flex gap-2">
                  <span>{new Date(a.created_at).toLocaleString()}</span>
                  {a.target_role && (
                    <span className="px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground uppercase">
                      {a.target_role}
                    </span>
                  )}
                </div>
              </div>
              {canWrite && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(a as Row); setOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete?")) del.mutate(a.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      <AnnouncementDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onDone={() => qc.invalidateQueries({ queryKey: ["announcements"] })}
      />
    </div>
  );
}

function AnnouncementDialog({
  open, onOpenChange, editing, onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Row | null;
  onDone: () => void;
}) {
  const [form, setForm] = useState({
    title: "",
    content: "",
    target_role: "ALL" as "ALL" | Role,
    is_pinned: false,
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        content: form.content,
        target_role: form.target_role === "ALL" ? null : (form.target_role as Role),
        is_pinned: form.is_pinned,
      };
      if (editing) return updateAnnouncement({ data: { id: editing.id, ...payload } });
      return createAnnouncement({ data: payload });
    },
    onSuccess: () => {
      toast.success(editing ? "Updated" : "Posted");
      onOpenChange(false);
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => {
      onOpenChange(v);
      if (v) {
        setForm({
          title: editing?.title ?? "",
          content: editing?.content ?? "",
          target_role: (editing?.target_role ?? "ALL") as "ALL" | Role,
          is_pinned: editing?.is_pinned ?? false,
        });
      }
    }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit announcement" : "New announcement"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label>Content</Label>
            <Textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={6}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Audience</Label>
            <Select value={form.target_role} onValueChange={(v) => setForm({ ...form, target_role: v as "ALL" | Role })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Everyone</SelectItem>
                <SelectItem value="teacher">Teachers</SelectItem>
                <SelectItem value="parent">Parents</SelectItem>
                <SelectItem value="student">Students</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <Switch id="pin" checked={form.is_pinned} onCheckedChange={(v) => setForm({ ...form, is_pinned: v })} />
            <Label htmlFor="pin" className="cursor-pointer">Pin to top</Label>
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
