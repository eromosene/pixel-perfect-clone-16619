import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Users as UsersIcon } from "lucide-react";
import { listAllUsers, setUserActive, setAdminRole } from "@/lib/users.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/page-header";
import { useCurrentUser } from "@/hooks/use-current-user";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({ meta: [{ title: "Users — Enigma College" }] }),
  component: UsersPage,
});

function UsersPage() {
  const { data: me } = useCurrentUser();
  const isAdmin = me.roles.includes("admin");
  const qc = useQueryClient();
  const fetchUsers = useServerFn(listAllUsers);
  const activeFn = useServerFn(setUserActive);
  const adminFn = useServerFn(setAdminRole);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["all-users"],
    queryFn: () => fetchUsers(),
    enabled: isAdmin,
  });

  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto p-8 text-center text-sm text-muted-foreground">
        Only admins can manage users.
      </div>
    );
  }

  const filtered = users.filter((u: any) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${u.name ?? ""} ${u.email ?? ""}`.toLowerCase().includes(q);
  });

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["all-users"] });
  }

  async function doActive(id: string, active: boolean) {
    setBusyId(id);
    try {
      await activeFn({ data: { user_id: id, active } });
      await refresh();
      toast.success(active ? "Activated" : "Deactivated");
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setBusyId(null);
    }
  }

  async function doAdmin(id: string, makeAdmin: boolean) {
    setBusyId(id);
    try {
      await adminFn({ data: { user_id: id, make_admin: makeAdmin } });
      await refresh();
      toast.success(makeAdmin ? "Promoted to admin" : "Admin removed");
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
      <PageHeader
        title="Users"
        description="Activate, deactivate, or promote any user in the system."
      />

      <Input
        placeholder="Search name or email"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4 h-20 animate-pulse bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <UsersIcon className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <div className="text-sm text-muted-foreground">No users.</div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((u: any) => {
            const isMe = u.id === me.id;
            const isAdminUser = u.roles.includes("admin");
            return (
              <Card key={u.id} className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-secondary text-primary grid place-items-center text-sm font-bold overflow-hidden flex-shrink-0">
                    {u.avatar ? (
                      <img src={u.avatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      (u.name || u.email || "?")
                        .split(" ")
                        .map((p: string) => p[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium flex items-center gap-2 flex-wrap">
                      <span className="truncate">{u.name || "Unnamed"}</span>
                      {isMe && <Badge variant="outline">You</Badge>}
                      {!u.is_active && <Badge variant="destructive">Inactive</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {u.roles.map((r: string) => (
                        <Badge key={r} variant={r === "admin" ? "default" : "secondary"} className="capitalize text-[10px]">
                          {r}
                        </Badge>
                      ))}
                      {u.roles.length === 0 && (
                        <Badge variant="outline" className="text-[10px]">no role</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    variant={isAdminUser ? "outline" : "secondary"}
                    disabled={busyId === u.id || (isAdminUser && isMe)}
                    onClick={() => doAdmin(u.id, !isAdminUser)}
                  >
                    {isAdminUser ? "Revoke admin" : "Make admin"}
                  </Button>
                  <div className="flex items-center gap-2 ml-auto">
                    <Label htmlFor={`act-${u.id}`} className="text-xs text-muted-foreground">
                      {u.is_active ? "Active" : "Inactive"}
                    </Label>
                    <Switch
                      id={`act-${u.id}`}
                      checked={u.is_active}
                      disabled={busyId === u.id || isMe}
                      onCheckedChange={(v) => doActive(u.id, v)}
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
