import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Wallet, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { listStudents } from "@/lib/academics.functions";
import {
  listFees,
  createFee,
  recordFeePayment,
  deleteFee,
} from "@/lib/fees.functions";
import { useCurrentUser } from "@/hooks/use-current-user";
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

export const Route = createFileRoute("/_authenticated/fees")({
  head: () => ({ meta: [{ title: "Fees — Enigma College" }] }),
  component: FeesPage,
});

const STATUS_STYLES: Record<string, string> = {
  PAID: "bg-green-500/10 text-green-600",
  PARTIAL: "bg-amber-500/10 text-amber-700",
  PENDING: "bg-muted text-muted-foreground",
  FAILED: "bg-red-500/10 text-red-600",
};

function FeesPage() {
  const { data: user } = useCurrentUser();
  const isAdmin = user.roles.includes("admin");
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [payOpen, setPayOpen] = useState<{ id: string; amount: number; paid: number } | null>(null);
  const [payAmount, setPayAmount] = useState("");

  const [form, setForm] = useState({
    student_id: "",
    amount: "",
    amount_paid: "0",
    fee_type: "School Fees",
    session: new Date().getFullYear() + "/" + (new Date().getFullYear() + 1),
    term: "First",
  });

  const fees = useQuery({ queryKey: ["fees"], queryFn: () => listFees({ data: {} }) });
  const students = useQuery({
    queryKey: ["students"],
    queryFn: () => listStudents(),
    enabled: isAdmin,
  });

  const createM = useMutation({
    mutationFn: (d: any) => createFee({ data: d }),
    onSuccess: () => {
      toast.success("Fee record created");
      qc.invalidateQueries({ queryKey: ["fees"] });
      setOpen(false);
      setForm({ ...form, student_id: "", amount: "", amount_paid: "0" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const payM = useMutation({
    mutationFn: (d: any) => recordFeePayment({ data: d }),
    onSuccess: () => {
      toast.success("Payment recorded");
      qc.invalidateQueries({ queryKey: ["fees"] });
      setPayOpen(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const delM = useMutation({
    mutationFn: (id: string) => deleteFee({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["fees"] });
    },
  });

  const totals = useMemo(() => {
    const rows = fees.data ?? [];
    return rows.reduce(
      (a, r) => {
        a.amount += Number(r.amount);
        a.paid += Number(r.amount_paid);
        a.balance += Number(r.balance);
        return a;
      },
      { amount: 0, paid: 0, balance: 0 },
    );
  }, [fees.data]);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <PageHeader
        title="Fees"
        description={isAdmin ? "Manage school fee records and payments." : "Your children's fee records."}
        action={
          isAdmin ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-1" />New invoice</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New fee invoice</DialogTitle></DialogHeader>
                <div className="space-y-3">
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
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Session</Label>
                      <Input value={form.session} onChange={(e) => setForm({ ...form, session: e.target.value })} />
                    </div>
                    <div>
                      <Label>Term</Label>
                      <Select value={form.term} onValueChange={(v) => setForm({ ...form, term: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="First">First</SelectItem>
                          <SelectItem value="Second">Second</SelectItem>
                          <SelectItem value="Third">Third</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Fee type</Label>
                    <Input value={form.fee_type} onChange={(e) => setForm({ ...form, fee_type: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Amount</Label>
                      <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                    </div>
                    <div>
                      <Label>Amount paid</Label>
                      <Input type="number" value={form.amount_paid} onChange={(e) => setForm({ ...form, amount_paid: e.target.value })} />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() =>
                      createM.mutate({
                        ...form,
                        amount: Number(form.amount),
                        amount_paid: Number(form.amount_paid),
                      })
                    }
                    disabled={!form.student_id || !form.amount}
                  >
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : null
        }
      />

      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card className="p-3"><div className="text-xs text-muted-foreground">Invoiced</div><div className="text-lg font-bold">₦{totals.amount.toLocaleString()}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Paid</div><div className="text-lg font-bold text-green-600">₦{totals.paid.toLocaleString()}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Balance</div><div className="text-lg font-bold text-amber-700">₦{totals.balance.toLocaleString()}</div></Card>
      </div>

      <Card className="divide-y">
        {fees.isLoading && <div className="p-6 text-sm text-muted-foreground">Loading…</div>}
        {fees.data && fees.data.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <Wallet className="h-8 w-8 mx-auto mb-2 opacity-40" />
            No fee records yet.
          </div>
        )}
        {(fees.data ?? []).map((f: any) => (
          <div key={f.id} className="p-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">
                {f.students?.last_name}, {f.students?.first_name}
                <span className="text-xs text-muted-foreground ml-2">({f.students?.admission_no})</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {f.fee_type} · {f.session} · {f.term}
              </div>
              <div className="text-sm mt-1">
                ₦{Number(f.amount_paid).toLocaleString()} / ₦{Number(f.amount).toLocaleString()}
                {Number(f.balance) > 0 && (
                  <span className="text-amber-700"> · ₦{Number(f.balance).toLocaleString()} due</span>
                )}
              </div>
            </div>
            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${STATUS_STYLES[f.status] ?? ""}`}>
              {f.status}
            </span>
            {isAdmin && (
              <>
                <Button size="icon" variant="ghost" onClick={() => { setPayOpen({ id: f.id, amount: Number(f.amount), paid: Number(f.amount_paid) }); setPayAmount(String(f.amount)); }}>
                  <CreditCard className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete?")) delM.mutate(f.id); }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </>
            )}
          </div>
        ))}
      </Card>

      <Dialog open={!!payOpen} onOpenChange={(o) => !o && setPayOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record payment</DialogTitle></DialogHeader>
          <div>
            <Label>Amount paid (total)</Label>
            <Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
            <p className="text-xs text-muted-foreground mt-2">
              Invoice: ₦{payOpen?.amount.toLocaleString()} · Currently paid: ₦{payOpen?.paid.toLocaleString()}
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => payOpen && payM.mutate({ id: payOpen.id, amount_paid: Number(payAmount) })}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
