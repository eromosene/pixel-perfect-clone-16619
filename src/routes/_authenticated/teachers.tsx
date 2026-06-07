import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listTeachers, removeTeacherRole } from "@/lib/teachers.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { UserCheck, Trash2, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_authenticated/teachers")({
  head: () => ({ meta: [{ title: "Teachers — Enigma College" }] }),
  component: TeachersPage,
});

function TeachersPage() {
  const queryClient = useQueryClient();
  const fetchTeachers = useServerFn(listTeachers);
  const removeFn = useServerFn(removeTeacherRole);
  const { data: teachers = [], isLoading } = useQuery({
    queryKey: ["teachers"],
    queryFn: () => fetchTeachers(),
  });
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleRemove(userId: string) {
    setRemovingId(userId);
    try {
      await removeFn({ data: { user_id: userId } });
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      toast.success("Teacher role removed");
    } catch (e: any) {
      toast.error(e?.message || "Failed to remove");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
      <PageHeader title="Teachers" icon={UserCheck}>
        <Button asChild size="sm">
          <Link to="/parents" search={{ tab: "create" }}>
            <Plus className="h-4 w-4 mr-1" /> Add teacher
          </Link>
        </Button>
      </PageHeader>

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
            Use the signup link or create an account on the Parents page.
          </p>
          <Button asChild className="mt-4" variant="outline">
            <Link to="/parents">Go to account creation</Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {teachers.map((t) => (
            <Card key={t.id} className="p-4 flex items-center justify-between shadow-card">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-secondary text-primary grid place-items-center text-sm font-bold">
                  {(t.name || t.email || "?")
                    .split(" ")
                    .map((p: string) => p[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
                <div>
                  <div className="font-medium">{t.name || "Unnamed"}</div>
                  <div className="text-xs text-muted-foreground">{t.email}</div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(t.id)}
                disabled={removingId === t.id}
                aria-label="Remove teacher role"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
