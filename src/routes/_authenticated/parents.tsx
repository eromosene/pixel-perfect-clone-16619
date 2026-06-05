import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Unlink, Users } from "lucide-react";
import { toast } from "sonner";
import { listStudents } from "@/lib/academics.functions";
import {
  listParentLinks,
  linkParentStudent,
  unlinkParentStudent,
} from "@/lib/fees.functions";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_authenticated/parents")({
  head: () => ({ meta: [{ title: "Parents — Enigma College" }] }),
  component: ParentsPage,
});

function ParentsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ parent_email: "", student_id: "", relation: "Parent" });

  const links = useQuery({ queryKey: ["parent-links"], queryFn: () => listParentLinks() });
  const students = useQuery({ queryKey: ["students"], queryFn: () => listStudents() });

  const linkM = useMutation({
    mutationFn: (d: any) => linkParentStudent({ data: d }),
    onSuccess: () => {
      toast.success("Linked");
      qc.invalidateQueries({ queryKey: ["parent-links"] });
      setOpen(false);
      setForm({ parent_email: "", student_id: "", relation: "Parent" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const unlinkM = useMutation({
    mutationFn: (id: string) => unlinkParentStudent({ data: { id } }),
    onSuccess: () => {
      toast.success("Unlinked");
      qc.invalidateQueries({ queryKey: ["parent-links"] });
    },
  });

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      <PageHeader
        title="Parents"
        description="Link parent accounts to their children. Parents must sign up first."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" />Link parent</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Link parent to student</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Parent email</Label>
                  <Input value={form.parent_email} onChange={(e) => setForm({ ...form, parent_email: e.target.value })} placeholder="parent@example.com" />
                </div>
                <div>
                  <Label>Student</Label>
                  <Select value={form.student_id} onValueChange={(v) => setForm({ ...form, student_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                    <SelectContent>
                      {(students.data ?? []).map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.last_name}, {s.first_name} ({s.admission_no})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Relation</Label>
                  <Input value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => linkM.mutate(form)} disabled={!form.parent_email || !form.student_id}>Link</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <p className="text-xs text-muted-foreground mb-3">
        Parents need to be assigned the <strong>parent</strong> role too — manage roles via{" "}
        <Link to="/settings" className="underline">Settings</Link>.
      </p>

      <Card className="divide-y">
        {links.data && links.data.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
            No parent links yet.
          </div>
        )}
        {(links.data ?? []).map((l: any) => (
          <div key={l.id} className="p-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">
                {l.parent?.name || "Unknown"} <span className="text-xs text-muted-foreground">({l.parent?.email})</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {l.relation} of {l.students?.last_name}, {l.students?.first_name} ({l.students?.admission_no})
              </div>
            </div>
            <Button size="icon" variant="ghost" onClick={() => { if (confirm("Unlink?")) unlinkM.mutate(l.id); }}>
              <Unlink className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </Card>
    </div>
  );
}
