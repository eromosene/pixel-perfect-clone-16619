import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listMyChildren, listFees, parentSelfLink } from "@/lib/fees.functions";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { GraduationCap, Wallet, FileText, Users, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/portal")({
  head: () => ({ meta: [{ title: "My Portal — Enigma College" }] }),
  component: PortalPage,
});

function PortalPage() {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const [admissionNo, setAdmissionNo] = useState("");
  const [relation, setRelation] = useState("Parent");
  const children = useQuery({
    queryKey: ["my-children"],
    queryFn: () => listMyChildren(),
    enabled: user.roles.includes("parent"),
  });
  const fees = useQuery({ queryKey: ["fees"], queryFn: () => listFees({ data: {} }) });

  const linkM = useMutation({
    mutationFn: (d: { admission_no: string; relation: string }) => parentSelfLink({ data: d }),
    onSuccess: (res: any) => {
      toast.success(`Linked to ${res.student?.first_name} ${res.student?.last_name}`);
      setAdmissionNo("");
      qc.invalidateQueries({ queryKey: ["my-children"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const isParent = user.roles.includes("parent");

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
      <PageHeader
        title={isParent ? "Parent Portal" : "My Portal"}
        description={isParent ? "Your linked children, their results and fee balances." : "Your personal portal."}
      />

      {isParent && (
        <>
          <section>
            <h2 className="font-semibold mb-2 flex items-center gap-2"><Users className="h-4 w-4" />My Children</h2>
            {children.data && children.data.length === 0 && (
              <Card className="p-6 text-sm text-muted-foreground text-center">
                No children linked yet. Use the form below to link your child by admission number.
              </Card>
            )}
            <div className="grid gap-3">
              {(children.data ?? []).map((c: any) => (
                <Card key={c.id} className="p-4 flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-secondary grid place-items-center text-secondary-foreground font-bold">
                    {(c.students?.first_name?.[0] ?? "") + (c.students?.last_name?.[0] ?? "")}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">
                      {c.students?.last_name}, {c.students?.first_name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {c.students?.admission_no} · {c.students?.classes?.name ?? "No class"} · {c.relation}
                    </div>
                  </div>
                  <Link to="/results" className="text-xs font-semibold text-primary">
                    Results →
                  </Link>
                </Card>
              ))}
            </div>
          </section>

          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Link a child</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter your child's admission number to link them to your account.
            </p>
            <div className="grid sm:grid-cols-[1fr_140px_auto] gap-2">
              <div>
                <Label className="sr-only">Admission number</Label>
                <Input
                  placeholder="Admission no."
                  value={admissionNo}
                  onChange={(e) => setAdmissionNo(e.target.value)}
                />
              </div>
              <div>
                <Label className="sr-only">Relation</Label>
                <Input
                  placeholder="Relation"
                  value={relation}
                  onChange={(e) => setRelation(e.target.value)}
                />
              </div>
              <Button
                onClick={() => linkM.mutate({ admission_no: admissionNo.trim(), relation: relation.trim() || "Parent" })}
                disabled={!admissionNo.trim() || linkM.isPending}
              >
                {linkM.isPending ? "Linking…" : "Link"}
              </Button>
            </div>
          </Card>
        </>
      )}


      <section>
        <h2 className="font-semibold mb-2 flex items-center gap-2"><Wallet className="h-4 w-4" />Fees</h2>
        <Card className="divide-y">
          {fees.data && fees.data.length === 0 && (
            <div className="p-6 text-sm text-muted-foreground text-center">No fee records.</div>
          )}
          {(fees.data ?? []).map((f: any) => (
            <div key={f.id} className="p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{f.students?.last_name}, {f.students?.first_name}</div>
                <div className="text-xs text-muted-foreground">{f.fee_type} · {f.session} · {f.term}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold">₦{Number(f.balance).toLocaleString()}</div>
                <div className="text-[10px] uppercase font-bold text-muted-foreground">{f.status}</div>
              </div>
            </div>
          ))}
        </Card>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Link to="/results">
          <Card className="p-4 hover:bg-accent transition">
            <GraduationCap className="h-5 w-5 mb-2 text-primary" />
            <div className="font-semibold">Results</div>
            <div className="text-xs text-muted-foreground">View term reports</div>
          </Card>
        </Link>
        <Link to="/announcements">
          <Card className="p-4 hover:bg-accent transition">
            <FileText className="h-5 w-5 mb-2 text-primary" />
            <div className="font-semibold">Announcements</div>
            <div className="text-xs text-muted-foreground">School news & updates</div>
          </Card>
        </Link>
      </section>
    </div>
  );
}
