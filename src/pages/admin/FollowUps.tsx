import { LeadActionButtons } from "@/components/admin/LeadActionButtons";
import { LeadBadges } from "@/components/admin/LeadBadges";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { adminGet } from "@/lib/adminApi";
import { formatDate, formatDateTime, leadLocation, leadName } from "@/lib/adminDashboard";
import type { AdminLead, FollowUpSummary } from "@/lib/adminTypes";
import { useEffect, useState } from "react";

export default function FollowUpsPage() {
  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [summary, setSummary] = useState<FollowUpSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await adminGet<{ leads: AdminLead[]; summary: FollowUpSummary }>("follow-ups");
      setLeads(data.leads);
      setSummary(data.summary);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load follow-ups.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Follow-Ups unavailable</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-3xl tracking-wide">Follow-Ups</h2>
        <p className="text-muted-foreground">Start here. These are the people who need attention.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <SummaryCard label="New leads today" value={summary?.newToday ?? 0} />
        <SummaryCard label="Need follow-up" value={summary?.needFollowUp ?? 0} />
        <SummaryCard label="Overdue follow-ups" value={summary?.overdueFollowUps ?? 0} />
        <SummaryCard label="Package emails sent" value={summary?.packageEmailsSent ?? 0} />
        <SummaryCard label="Package clicks" value={summary?.packageClicks ?? 0} />
        <SummaryCard label="Conversion rate" value={`${summary?.conversionRate ?? 0}%`} />
      </div>

      {leads.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No follow-ups due</CardTitle>
            <CardDescription>There are no leads needing action right now.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {leads.map((lead) => (
            <Card key={lead.id} className="overflow-hidden">
              <CardHeader className="gap-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="text-2xl tracking-wide">{leadName(lead)}</CardTitle>
                    <CardDescription>{leadLocation(lead)}</CardDescription>
                  </div>
                  <LeadBadges lead={lead} />
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <PlainFact label="Interest" value={lead.interest_type || "Not supplied"} />
                  <PlainFact label="Timeline" value={lead.joining_timeline || "Not supplied"} />
                  <PlainFact label="Submitted" value={formatDate(lead.created_at)} />
                  <PlainFact label="Follow-up date" value={formatDateTime(lead.next_follow_up_at)} />
                  <PlainFact label="Package sent" value={lead.package_sent_at ? "Yes" : "No"} />
                  <PlainFact label="Package clicked" value={lead.package_clicked_at ? "Yes" : "No"} />
                </div>
                <LeadActionButtons lead={lead} onChanged={load} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardHeader className="p-4">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl tracking-wide">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function PlainFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background/40 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-72 w-full" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}
