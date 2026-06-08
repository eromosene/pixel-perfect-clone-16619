import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listTeachers, removeTeacherRole } from "@/lib/teachers.functions";
import { setAdminRole, setUserActive } from "@/lib/users.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { UserCheck, Trash2, Shield, ShieldOff } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SignupLinkCard, CreateAccountButton } from "@/components/account-tools";
import { useCurrentUser } from "@/hooks/use-current-user";

export const Route = createFileRoute("/_authenticated/teachers")({
  head: () => ({ meta: [{ title: "Teachers — Enigma College" }] }),
  component: TeachersPage,
});

function TeachersPage() {
  const queryClient = useQueryClient();
  const { data: me } = useCurrentUser();
  const isAdmin = me.roles.includes("admin");
  const fetchTeachers = useServerFn(listTeachers);
  const removeFn = useServerFn(removeTeacherRole);
  const adminFn = useServerFn(setAdminRole);
  const activeFn = useServerFn(setUserActive);
  const { data: teachers = [], isLoading } = useQuery({
    queryKey: ["teachers"],
    queryFn: () => fetchTeachers(),
  });
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["teachers"] });
  }

  async function handleRemove(userId: string) {
    if (!confirm("Remove teacher role from this user?")) return;
    setBusyId(userId);
    try {
      await removeFn({ data: { user_id: userId } });
      await refresh();
      toast.success("Teacher role removed");
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleAdmin(userId: string, makeAdmin: boolean) {
    setBusyId(userId);
    try {
      await adminFn({ data: { user_id: userId, make_admin: makeAdmin } });
      await refresh();
      toast.success(makeAdmin ? "Promoted to admin" : "Admin role removed");
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleActive(userId: string, active: boolean) {
    setBusyId(userId);
    try {
      await activeFn({ data: { user_id: userId, active } });
      await refresh();
      toast.success(active ? "Account activated" : "Account deactivated");
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
      <PageHeader
        title="Teachers"
        description="Manage teacher accounts, admin roles, and account access."
        action={isAdmin && <CreateAccountButton role="teacher" label="Teacher" onCreated={refresh} />}
      />

      {isAdmin && <SignupLinkCard role="teacher" label="Teacher" />}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4 h-16 animate-pulse bg-muted" />
          ))}
        </div>
      ) : teachers.length === 0 ? (
        <Card className="p-8 text-center shadow-card">
          <UserCheck className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold">No teachers yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Share the signup link above or create an account.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {teachers.map((t: any) => (
            <Card key={t.id} className="p-4 space-y-3 shadow-card">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-secondary text-primary grid place-items-center text-sm font-bold overflow-hidden flex-shrink-0">
                  {t.avatar ? (
                    <img src={t.avatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (t.name || t.email || "?")
                      .split(" ")
                      .map((p: string) => p[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium flex items-center gap-2">
                    <span className="truncate">{t.name || "Unnamed"}</span>
                    {t.is_admin && <Badge>Admin</Badge>}
                    {!t.is_active && <Badge variant="destructive">Inactive</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{t.email}</div>
                </div>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(t.id)}
                    disabled={busyId === t.id}
                    aria-label="Remove teacher role"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
              {isAdmin && (
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    variant={t.is_admin ? "outline" : "secondary"}
                    disabled={busyId === t.id}
                    onClick={() => toggleAdmin(t.id, !t.is_admin)}
                  >
                    {t.is_admin ? (
                      <><ShieldOff className="h-3.5 w-3.5 mr-1" /> Revoke admin</>
                    ) : (
                      <><Shield className="h-3.5 w-3.5 mr-1" /> Make admin</>
                    )}
                  </Button>
                  <div className="flex items-center gap-2 ml-auto">
                    <Label htmlFor={`active-${t.id}`} className="text-xs text-muted-foreground">
                      {t.is_active ? "Active" : "Inactive"}
                    </Label>
                    <Switch
                      id={`active-${t.id}`}
                      checked={t.is_active}
                      disabled={busyId === t.id || t.id === me.id}
                      onCheckedChange={(v) => toggleActive(t.id, v)}
                    />
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
