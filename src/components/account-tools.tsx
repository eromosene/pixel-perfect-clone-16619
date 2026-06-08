import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Copy, Link as LinkIcon, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { adminCreateAccount } from "@/lib/fees.functions";

type Role = "teacher" | "student" | "parent";

export function SignupLinkCard({ role, label }: { role: Role; label: string }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = `${origin}/auth?role=${role}&mode=signup`;

  async function copyLink() {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      toast.success(`${label} signup link copied`);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center gap-2">
        <LinkIcon className="h-4 w-4 text-primary" />
        <h2 className="font-semibold text-sm">Self-signup link</h2>
        <Badge variant="secondary" className="capitalize">{label}</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Share this URL — anyone who signs up via it becomes a {label.toLowerCase()}.
      </p>
      <div className="flex items-center gap-2 rounded-md border p-2">
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex-1 truncate text-xs text-primary underline underline-offset-2"
        >
          {url}
        </a>
        <Button size="sm" variant="ghost" onClick={copyLink}>
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}

export function CreateAccountButton({
  role,
  label,
  onCreated,
}: {
  role: Role;
  label: string;
  onCreated?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "" });

  const m = useMutation({
    mutationFn: (d: { name: string; email: string }) =>
      adminCreateAccount({ data: { ...d, role } }),
    onSuccess: (res: any) => {
      toast.success(`Account created. Temp password: ${res.temp_password}`, {
        duration: 20000,
      });
      setOpen(false);
      setForm({ name: "", email: "" });
      onCreated?.();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserPlus className="h-4 w-4 mr-1" /> Create {label.toLowerCase()}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create {label.toLowerCase()} account</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Full name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            A temporary password is shown once. Share it — the user can change it after sign-in.
          </p>
        </div>
        <DialogFooter>
          <Button
            onClick={() => m.mutate(form)}
            disabled={!form.email || !form.name || m.isPending}
          >
            {m.isPending ? "Creating…" : "Create account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
