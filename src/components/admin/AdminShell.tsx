import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { adminGet } from "@/lib/adminApi";
import type { HealthCheck } from "@/lib/adminTypes";
import { Activity, BarChart3, HeartPulse, ListChecks, Settings, Users } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";

const navItems = [
  { href: "/admin/follow-ups", label: "Follow-Ups", icon: ListChecks },
  { href: "/admin/leads", label: "Leads", icon: Users },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/health", label: "Health", icon: HeartPulse },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"checking" | "signed-out" | "ready" | "denied">("checking");
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    async function checkAccess() {
      setState("checking");
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        if (!mounted) return;
        setState("signed-out");
        return;
      }

      try {
        await adminGet<{ checks: HealthCheck[] }>("health");
        if (!mounted) return;
        setState("ready");
        setError(null);
      } catch (accessError) {
        if (!mounted) return;
        setError(accessError instanceof Error ? accessError.message : "Admin access failed.");
        setState("denied");
      }
    }

    checkAccess();
    const { data: subscription } = supabase.auth.onAuthStateChange(() => {
      checkAccess();
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [location.pathname]);

  if (state === "checking") {
    return <AdminLoading />;
  }

  if (state === "signed-out") {
    return <AdminLogin />;
  }

  if (state === "denied") {
    return (
      <AdminFrame>
        <Alert variant="destructive">
          <AlertTitle>Admin access blocked</AlertTitle>
          <AlertDescription>{error ?? "This account is not approved for the dashboard."}</AlertDescription>
        </Alert>
      </AdminFrame>
    );
  }

  return <AdminFrame>{children}</AdminFrame>;
}

function AdminFrame({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 md:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-lg border bg-card p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-rfs-yellow">Join RFS Admin</p>
            <h1 className="text-3xl tracking-wide md:text-4xl">Operator Cockpit</h1>
          </div>
          <Button variant="outline" onClick={() => supabase.auth.signOut()}>
            Sign out
          </Button>
        </header>

        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <nav className="flex gap-2 overflow-x-auto rounded-lg border bg-card p-2 lg:flex-col lg:overflow-visible">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  `flex min-w-fit items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                    isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`
                }
              >
                <item.icon data-icon="inline-start" />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <section>{children}</section>
        </div>
      </div>
    </main>
  );
}

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/admin`,
      },
    });
    setSubmitting(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }
    setSent(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-3xl tracking-wide">Admin Login</CardTitle>
          <CardDescription>Enter an approved admin email. We will send a secure login link.</CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <Alert>
              <Activity data-icon="inline-start" />
              <AlertTitle>Check your email</AlertTitle>
              <AlertDescription>Use the login link to open the operator dashboard.</AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="admin-email">Email</Label>
                <Input id="admin-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Login failed</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" disabled={submitting}>
                {submitting ? "Sending..." : "Send login link"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function AdminLoading() {
  return (
    <AdminFrame>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </AdminFrame>
  );
}
