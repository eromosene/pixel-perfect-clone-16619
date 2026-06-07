import { Suspense, type ReactNode } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Home,
  Users,
  UserCheck,
  ClipboardCheck,
  GraduationCap,
  Megaphone,
  Wallet,
  Settings,
  LogOut,
  Menu,
  BookOpen,
  FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { AppRole } from "@/lib/auth.functions";

type NavItem = {
  to: string;
  label: string;
  icon: typeof Home;
  roles?: AppRole[];
};

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/portal", label: "My Portal", icon: Home, roles: ["parent", "student"] },
  { to: "/students", label: "Students", icon: Users, roles: ["admin", "teacher"] },
  { to: "/teachers", label: "Teachers", icon: UserCheck, roles: ["admin"] },
  { to: "/classes", label: "Classes", icon: GraduationCap, roles: ["admin", "teacher"] },
  { to: "/subjects", label: "Subjects", icon: BookOpen, roles: ["admin", "teacher"] },
  { to: "/terms", label: "Terms", icon: GraduationCap, roles: ["admin"] },
  { to: "/parents", label: "Parents", icon: Users, roles: ["admin"] },
  { to: "/attendance", label: "Attendance", icon: ClipboardCheck, roles: ["admin", "teacher"] },
  { to: "/scores", label: "Scores", icon: FileText, roles: ["admin", "teacher"] },
  { to: "/results", label: "Results", icon: GraduationCap },
  { to: "/announcements", label: "News", icon: Megaphone },
  { to: "/fees", label: "Fees", icon: Wallet, roles: ["admin", "parent"] },
  { to: "/settings", label: "Settings", icon: Settings },
];

function ShellInner({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const visible = NAV.filter(
    (n) => !n.roles || n.roles.some((r) => user.roles.includes(r)),
  );

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const initials = (user.name || user.email || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground">
        <div className="px-5 py-5 flex items-center gap-3 border-b border-sidebar-border">
          <div className="h-10 w-10 rounded-xl bg-sidebar-primary text-sidebar-primary-foreground grid place-items-center">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <div className="font-bold leading-tight">Enigma College</div>
            <div className="text-xs text-sidebar-foreground/60">
              {user.roles[0] ?? "user"}
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {visible.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                  active
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent/60"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile) */}
        <header className="md:hidden sticky top-0 z-30 bg-card border-b flex items-center justify-between px-4 h-14">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 bg-sidebar text-sidebar-foreground w-64">
              <div className="px-5 py-5 flex items-center gap-3 border-b border-sidebar-border">
                <div className="h-10 w-10 rounded-xl bg-sidebar-primary text-sidebar-primary-foreground grid place-items-center">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div className="font-bold">Enigma College</div>
              </div>
              <nav className="p-3 space-y-1">
                {visible.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent/60"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                ))}
                <button
                  onClick={signOut}
                  className="w-full mt-4 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent/60"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </nav>
            </SheetContent>
          </Sheet>
          <div className="font-bold">Enigma College</div>
          <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-bold">
            {initials}
          </div>
        </header>

        <main className="flex-1 pb-20 md:pb-6">{children}</main>

        {/* Bottom nav (mobile) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t z-30 flex">
          {visible.slice(0, 5).map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex-1 py-2 flex flex-col items-center gap-0.5 text-[10px] font-medium transition ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function ShellFallback({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-background">{children}</div>;
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<ShellFallback>{children}</ShellFallback>}>
      <ShellInner>{children}</ShellInner>
    </Suspense>
  );
}
