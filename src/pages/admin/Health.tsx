import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { adminGet, adminPost } from "@/lib/adminApi";
import { formatDateTime } from "@/lib/adminDashboard";
import { useToast } from "@/hooks/use-toast";
import type { HealthCheck, HealthResponse } from "@/lib/adminTypes";
import { Clipboard, ExternalLink, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export default function HealthPage() {
  const { toast } = useToast();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await adminGet<HealthResponse>("health");
      setHealth(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load health checks.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleSync() {
    setSyncing(true);
    try {
      const result = await adminPost<{ synced: number; failed: number }>("sync-sheets", {});
      toast({ title: "Sync complete", description: `${result.synced} synced, ${result.failed} failed.` });
      void load();
    } catch (e) {
      toast({ title: "Sync failed", description: e instanceof Error ? e.message : "Try again.", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  }

  async function copyDiagnostics() {
    if (!health) return;
    const lines = [
      "JoinRFS Health Summary",
      `Website: ${statusLabel(health.website.status)}`,
      `Database: ${statusLabel(health.database.status)}`,
      `Email: ${statusLabel(health.email.status)} (${health.email.sentCount} sent, ${health.email.failedCount} failed)`,
      `Google Sheets: ${statusLabel(health.googleSheets.status)} (${health.googleSheets.failedSyncCount} failed syncs)`,
      `Analytics: ${statusLabel(health.analytics.status)}`,
      `Last lead: ${health.lastLeadSubmitted ?? "N/A"}`,
      `Last email sent: ${health.email.lastSuccessfulSend ?? "N/A"}`,
      `Checks: ${health.checks.filter((c) => c.ok).length}/${health.checks.length} passed`,
    ];
    await navigator.clipboard.writeText(lines.join("\n"));
    toast({ title: "Diagnostic summary copied" });
  }

  if (loading) return <Skeleton className="h-96 w-full" />;

  if (error || !health) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Health unavailable</AlertTitle>
        <AlertDescription>{error ?? "Could not load health data."}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl tracking-wide">System Health</h2>
          <p className="text-muted-foreground">
            <span className={`inline-block h-2 w-2 rounded-full ${health.checks.every((c) => c.ok) ? "bg-green-500" : "bg-yellow-500"} mr-2`} />
            {health.checks.every((c) => c.ok) ? "All systems OK" : "Some checks need attention"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void copyDiagnostics()}>
            <Clipboard data-icon="inline-start" />
            Copy summary
          </Button>
          <Button variant="outline" onClick={() => window.open("docs/TROUBLESHOOTING.md", "_blank")}>
            <ExternalLink data-icon="inline-start" />
            Troubleshooting guide
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatusCard title="Website" status={health.website.status}>
          Online
        </StatusCard>
        <StatusCard title="Database" status={health.database.status}>
          Connected
        </StatusCard>
        <StatusCard title="Email" status={health.email.status}>
          <div>{health.email.sentCount} sent, {health.email.failedCount} failed</div>
          {health.email.lastSuccessfulSend && (
            <div className="text-xs text-muted-foreground">Last sent: {formatDateTime(health.email.lastSuccessfulSend)}</div>
          )}
        </StatusCard>
        <StatusCard title="Google Sheets" status={health.googleSheets.status}>
          <div>{health.googleSheets.failedSyncCount} failed syncs</div>
          {health.googleSheets.lastSync && (
            <div className="text-xs text-muted-foreground">Last sync: {formatDateTime(health.googleSheets.lastSync)}</div>
          )}
          {health.googleSheets.status === "needs_attention" && (
            <Button size="sm" variant="outline" className="mt-2" onClick={handleSync} disabled={syncing}>
              <RefreshCw data-icon="inline-start" />
              {syncing ? "Syncing..." : "Retry sync"}
            </Button>
          )}
        </StatusCard>
        <StatusCard title="Analytics" status={health.analytics.status}>
          {health.analytics.status === "not_configured" ? "Not configured" : "Configured"}
        </StatusCard>
        <StatusCard title="Recent activity" status="healthy">
          <div className="text-xs text-muted-foreground">Last lead: {health.lastLeadSubmitted ? formatDateTime(health.lastLeadSubmitted) : "None yet"}</div>
        </StatusCard>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl tracking-wide">Component checks</CardTitle>
          <CardDescription>Detailed pass/fail for each system component.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {health.checks.map((check) => (
            <div key={check.name} className="flex flex-col gap-2 rounded-md border p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold">{check.name}</p>
                <p className="text-sm text-muted-foreground">{check.message}</p>
              </div>
              <Badge variant={check.ok ? "default" : "destructive"}>{check.ok ? "OK" : "Needs setup"}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl tracking-wide">Tools</CardTitle>
          <CardDescription>Manual maintenance actions.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={handleSync} disabled={syncing}>
            <RefreshCw data-icon="inline-start" />
            {syncing ? "Syncing..." : "Sync missing leads to Google Sheets"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusCard({ title, status, children }: { title: string; status: string; children: React.ReactNode }) {
  const colorMap: Record<string, string> = {
    healthy: "bg-green-500",
    needs_attention: "bg-yellow-500",
    broken: "bg-red-500",
    not_configured: "bg-gray-300",
  };
  const labelMap: Record<string, string> = {
    healthy: "Healthy",
    needs_attention: "Needs attention",
    broken: "Broken",
    not_configured: "Not configured",
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${colorMap[status] ?? "bg-gray-300"}`} title={labelMap[status] ?? status} />
        </div>
        <CardDescription>{labelMap[status] ?? status}</CardDescription>
      </CardHeader>
      <CardContent className="text-sm">
        {children}
      </CardContent>
    </Card>
  );
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    healthy: "Healthy",
    needs_attention: "Needs attention",
    broken: "Broken",
    not_configured: "Not configured",
  };
  return map[status] ?? status;
}
