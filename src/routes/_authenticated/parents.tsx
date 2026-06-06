import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Unlink, Users, Copy, UserPlus, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { listStudents } from "@/lib/academics.functions";
import {
  listParentLinks,
  linkParentStudent,
  unlinkParentStudent,
  adminCreateAccount,
} from "@/lib/fees.functions";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

const SIGNUP_ROLES = [
  { key: "teacher", label: "Teacher" },
  { key: "student", label: "Student" },
  { key: "parent", label: "Parent" },
] as const;

function ParentsPage() {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const isAdmin = user.roles.includes("admin");
  const isTeacher = user.roles.includes("teacher");
  const canManage = isAdmin || isTeacher;

  const [linkOpen, setLinkOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [linkForm, setLinkForm] = useState({ parent_email: "", student_id: "", relation: "Parent" });
  const [createForm, setCreateForm] = useState<{ email: string; name: string; role: "teacher" | "student" | "parent" }>({
    email: "",
    name: "",
    role: "student",
  });

  const links = useQuery({ queryKey: ["parent-links"], queryFn: () => listParentLinks() });
  const students = useQuery({ queryKey: ["students"], queryFn: () => listStudents() });

  const linkM = useMutation({
    mutationFn: (d: any) => linkParentStudent({ data: d }),
    onSuccess: () => {
      toast.success("Linked");
      qc.invalidateQueries({ queryKey: ["parent-links"] });
      setLinkOpen(false);
      setLinkForm({ parent_email: "", student_id: "", relation: "Parent" });
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

  const createM = useMutation({
    mutationFn: (d: typeof createForm) => adminCreateAccount({ data: d }),
    onSuccess: (res: any) => {
      toast.success(`Account created. Temp password: ${res.temp_password}`, { duration: 15000 });
      setCreateOpen(false);
      setCreateForm({ email: "", name: "", role: "student" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const signupUrl = (role: string) => `${origin}/auth?role=${role}&mode=signup`;
  const copyLink = (role: string) => {
    navigator.clipboard.writeText(signupUrl(role));
    toast.success(`${role} signup link copied`);
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
      <PageHeader
        title="Parents & accounts"
        description="Share signup links, create accounts, and link parents to students."
        action={
          canManage && (
            <div className="flex gap-2">
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline"><UserPlus className="h-4 w-4 mr-1" />Create</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Create account</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>Full name</Label>
                      <Input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} />
                    </div>
                    <div>
                      <Label>Role</Label>
                      <Select value={createForm.role} onValueChange={(v: any) => setCreateForm({ ...createForm, role: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="parent">Parent</SelectItem>
                          {isAdmin && <SelectItem value="teacher">Teacher</SelectItem>}
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      A temporary password will be shown once. Share it with the user — they can change it after sign-in.
                    </p>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={() => createM.mutate(createForm)}
                      disabled={!createForm.email || !createForm.name || createM.isPending}
                    >
                      {createM.isPending ? "Creating…" : "Create account"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 mr-1" />Link parent</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Link parent to student</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>Parent email</Label>
                      <Input value={linkForm.parent_email} onChange={(e) => setLinkForm({ ...linkForm, parent_email: e.target.value })} placeholder="parent@example.com" />
                    </div>
                    <div>
                      <Label>Student</Label>
                      <Select value={linkForm.student_id} onValueChange={(v) => setLinkForm({ ...linkForm, student_id: v })}>
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
                      <Input value={linkForm.relation} onChange={(e) => setLinkForm({ ...linkForm, relation: e.target.value })} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={() => linkM.mutate(linkForm)} disabled={!linkForm.parent_email || !linkForm.student_id}>Link</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )
        }
      />

      {canManage && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Role-specific signup links</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Share these URLs. Anyone who signs up via a link is automatically assigned that role.
          </p>
          <div className="grid gap-2">
            {SIGNUP_ROLES.filter((r) => isAdmin || r.key !== "teacher").map((r) => (
              <div key={r.key} className="flex items-center gap-2 rounded-md border p-2">
                <Badge variant="secondary" className="capitalize">{r.label}</Badge>
                <code className="flex-1 truncate text-xs text-muted-foreground">{signupUrl(r.key)}</code>
                <Button size="sm" variant="ghost" onClick={() => copyLink(r.key)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div>
        <p className="text-xs text-muted-foreground mb-2">
          Parents can also self-link to their child from their{" "}
          <Link to="/portal" className="underline">Portal</Link>.
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
              {canManage && (
                <Button size="icon" variant="ghost" onClick={() => { if (confirm("Unlink?")) unlinkM.mutate(l.id); }}>
                  <Unlink className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
