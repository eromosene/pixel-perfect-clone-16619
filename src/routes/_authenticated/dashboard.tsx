import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/use-current-user";
import { GraduationCap, Users, ClipboardCheck, Megaphone } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Enigma College" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: user } = useCurrentUser();
  const role = user.roles[0] ?? "student";
  const greeting = `Welcome${user.name ? `, ${user.name.split(" ")[0]}` : ""}`;

  const tiles = [
    { label: "Students", value: "—", icon: Users },
    { label: "Today's attendance", value: "—", icon: ClipboardCheck },
    { label: "Current term", value: "—", icon: GraduationCap },
    { label: "Announcements", value: "—", icon: Megaphone },
  ];

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
          {role} portal
        </p>
        <h1 className="text-2xl md:text-3xl font-bold mt-1">{greeting}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          This is your foundation dashboard. More features come online in the next phases.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <Card key={t.label} className="p-4 flex flex-col gap-2 shadow-card">
            <div className="h-9 w-9 rounded-lg bg-secondary text-primary grid place-items-center">
              <t.icon className="h-4 w-4" />
            </div>
            <div className="text-xs text-muted-foreground">{t.label}</div>
            <div className="text-xl font-bold">{t.value}</div>
          </Card>
        ))}
      </div>

      <Card className="p-5 shadow-card">
        <h2 className="font-semibold mb-2">Your roles</h2>
        <div className="flex flex-wrap gap-2">
          {user.roles.map((r) => (
            <span
              key={r}
              className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-semibold uppercase tracking-wide"
            >
              {r}
            </span>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          The first account to sign up automatically becomes the school administrator.
          Admins can later assign teacher / parent / student roles to other users.
        </p>
      </Card>
    </div>
  );
}
