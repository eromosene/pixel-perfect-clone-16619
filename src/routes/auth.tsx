import { createFileRoute, useNavigate, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { GraduationCap } from "lucide-react";

const SIGNUP_ROLES = ["teacher", "student", "parent"] as const;
type SignupRole = (typeof SIGNUP_ROLES)[number];

const searchSchema = z.object({
  role: z.enum(SIGNUP_ROLES).optional(),
  mode: z.enum(["signin", "signup"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — Enigma College" },
      { name: "description", content: "Sign in or create your Enigma College account." },
    ],
  }),
  component: AuthPage,
});

const ROLE_LABEL: Record<SignupRole, string> = {
  teacher: "Teacher",
  student: "Student",
  parent: "Parent / Guardian",
};

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const signupRole: SignupRole | undefined = search.role;
  const [mode, setMode] = useState<"signin" | "signup">(
    search.mode ?? (signupRole ? "signup" : "signin"),
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/dashboard", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              name,
              ...(signupRole ? { signup_role: signupRole } : {}),
            },
          },
        });
        if (error) throw error;
        toast.success("Account created. Check your email to verify, then sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 text-primary">
            <div className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground grid place-items-center shadow-elevated">
              <GraduationCap className="h-6 w-6" />
            </div>
          </Link>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Enigma College</h1>
          <p className="text-sm text-muted-foreground">School management portal</p>
        </div>

        <Card className="p-6 shadow-elevated">
          {signupRole && mode === "signup" && (
            <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm flex items-center gap-2">
              <Badge variant="secondary">{ROLE_LABEL[signupRole]}</Badge>
              <span className="text-muted-foreground">
                You're signing up as a {ROLE_LABEL[signupRole].toLowerCase()}.
              </span>
            </div>
          )}

          <div className="flex gap-1 p-1 bg-muted rounded-lg mb-6">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
                mode === "signin" ? "bg-card shadow-card" : "text-muted-foreground"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
                mode === "signup" ? "bg-card shadow-card" : "text-muted-foreground"
              }`}
            >
              Create account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          {mode === "signup" && !signupRole && (
            <p className="text-xs text-muted-foreground text-center mt-4">
              The first account becomes the school administrator. Otherwise new accounts default
              to the student role — ask your school for a teacher or parent signup link.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
