import { LeadActionButtons } from "@/components/admin/LeadActionButtons";
import { LeadBadges } from "@/components/admin/LeadBadges";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { adminGet, adminPost } from "@/lib/adminApi";
import { contactText, formatDateTime, leadLocation, leadName } from "@/lib/adminDashboard";
import type { AdminLeadDetail } from "@/lib/adminTypes";
import { adminStatuses } from "@/lib/adminTypes";
import { Clipboard, RefreshCw, Save, Send } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function LeadDetailPage() {
  const { id } = useParams();
  const { toast } = useToast();
  const [lead, setLead] = useState<AdminLeadDetail | null>(null);
  const [note, setNote] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await adminGet<{ lead: AdminLeadDetail }>("lead-detail", { id });
      setLead(data.lead);
      setStatus(data.lead.status);
      setFollowUpDate(data.lead.next_follow_up_at?.slice(0, 16) ?? "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load lead.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveStatus() {
    if (!lead) return;
    await adminPost("update-status", { lead_id: lead.id, status });
    toast({ title: "Status updated" });
    await load();
  }

  async function saveFollowUp() {
    if (!lead) return;
    await adminPost("set-follow-up", {
      lead_id: lead.id,
      next_follow_up_at: followUpDate ? new Date(followUpDate).toISOString() : null,
    });
    toast({ title: "Follow-up date saved" });
    await load();
  }

  async function saveNote() {
    if (!lead || !note.trim()) return;
    await adminPost("add-note", { lead_id: lead.id, note });
    setNote("");
    toast({ title: "Note added" });
    await load();
  }

  async function retrySheetSync() {
    if (!lead) return;
    await adminPost("sync-sheets", {});
    toast({ title: "Sheet sync retried" });
    await load();
  }

  async function referLead() {
    if (!lead) return;
    await adminPost("send-referral", { lead_id: lead.id });
    toast({ title: "Lead referred to official process" });
    await load();
  }

  async function copyContactDetails() {
    if (!lead) return;
    await navigator.clipboard.writeText(contactText(lead));
    toast({ title: "Contact details copied" });
  }

  if (loading) return <Skeleton className="h-[600px] w-full" />;

  if (error || !lead) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Lead unavailable</AlertTitle>
        <AlertDescription>{error ?? "Lead not found."}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h2 className="text-3xl tracking-wide">{leadName(lead)}</h2>
          <p className="text-muted-foreground">{leadLocation(lead)}</p>
        </div>
        <LeadActionButtons lead={lead} onChanged={load} showView={false} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl tracking-wide">What We Know</CardTitle>
            <CardDescription>Contact details, survey answers, and package activity.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <Detail label="Email" value={lead.email} />
            <Detail label="Phone" value={lead.phone || "Not supplied"} />
            <Detail label="Suburb" value={lead.suburb || "Not supplied"} />
            <Detail label="Postcode" value={lead.postcode || "Not supplied"} />
            <Detail label="Age range" value={lead.age_range || "Not supplied"} />
            <Detail label="Interest" value={lead.interest_type || "Not supplied"} />
            <Detail label="Timeline" value={lead.joining_timeline || "Not supplied"} />
            <Detail label="Preferred contact" value={lead.preferred_contact_method || "Not supplied"} />
            <Detail label="Package sent" value={formatDateTime(lead.package_sent_at)} />
            <Detail label="Package clicked" value={formatDateTime(lead.package_clicked_at)} />
            <Detail label="Created" value={formatDateTime(lead.created_at)} />
            <Detail label="Last contacted" value={formatDateTime(lead.last_contacted_at)} />
            <Detail label="Next follow-up" value={formatDateTime(lead.next_follow_up_at)} />
            <Detail label="Sheet sync" value={lead.sheet_synced_at ? formatDateTime(lead.sheet_synced_at) : (lead.sheet_sync_status === "failed" ? "Failed" : "Not synced")} />
            <div className="rounded-md border bg-background/40 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
              <div className="mt-2"><LeadBadges lead={lead} /></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl tracking-wide">Actions</CardTitle>
            <CardDescription>Keep the lead moving without leaving this page.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label>Status</Label>
              <div className="flex gap-2">
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {adminStatuses.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={() => void saveStatus()}><Save data-icon="inline-start" />Save</Button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="follow-up-date">Follow-up date</Label>
              <div className="flex gap-2">
                <Input id="follow-up-date" type="datetime-local" value={followUpDate} onChange={(event) => setFollowUpDate(event.target.value)} />
                <Button onClick={() => void saveFollowUp()}>Set</Button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="note">Add note</Label>
              <Textarea id="note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Short plain-English note" />
              <Button onClick={() => void saveNote()}>Add note</Button>
            </div>
            <Button variant="outline" onClick={() => void retrySheetSync()}>
              <RefreshCw data-icon="inline-start" />
              Re-sync to Google Sheets
            </Button>
            <Button variant="outline" onClick={() => void copyContactDetails()}>
              <Clipboard data-icon="inline-start" />
              Copy contact details
            </Button>
            {lead.status === "Warm Lead" && (
              <Button onClick={() => void referLead()}>
                <Send data-icon="inline-start" />
                Refer to official process
              </Button>
            )}
            {lead.sheet_sync_status === "failed" && (
              <Button variant="outline" onClick={() => void retrySheetSync()}>
                <RefreshCw data-icon="inline-start" />
                Retry sheet sync
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-2xl tracking-wide">Survey Answers</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            {(lead.survey_responses ?? []).map((answer) => (
              <Detail key={answer.id} label={answer.question_label} value={answer.answer || "No answer"} />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-2xl tracking-wide">Email Logs</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            {(lead.email_logs ?? []).map((email) => (
              <Detail key={email.id} label={`${email.email_type} - ${email.status}`} value={formatDateTime(email.created_at)} />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-2xl tracking-wide">Activity Timeline</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            {(lead.lead_activities ?? []).map((activity) => (
              <Detail key={activity.id} label={plainActivity(activity.activity_type)} value={formatDateTime(activity.created_at)} />
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-2xl tracking-wide">Notes</CardTitle></CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap rounded-md border bg-background/40 p-4 font-sans text-sm">{lead.notes || "No notes yet."}</pre>
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background/40 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 break-words font-medium">{value}</p>
    </div>
  );
}

function plainActivity(value: string): string {
  return value.replace(/_/g, " ");
}
