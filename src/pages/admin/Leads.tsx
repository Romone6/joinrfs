import { LeadActionButtons } from "@/components/admin/LeadActionButtons";
import { LeadBadges } from "@/components/admin/LeadBadges";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminGet, downloadCsv } from "@/lib/adminApi";
import { formatDate, leadLocation, leadName } from "@/lib/adminDashboard";
import type { AdminLead } from "@/lib/adminTypes";
import { adminPriorities, adminStatuses } from "@/lib/adminTypes";
import { useToast } from "@/hooks/use-toast";
import { Download, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function LeadsPage() {
  const { toast } = useToast();
  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [interestType, setInterestType] = useState("all");
  const [packageClicked, setPackageClicked] = useState("all");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setExporting(true);
    try {
      await downloadCsv();
      toast({ title: "CSV exported" });
    } catch (e) {
      toast({ title: "Export failed", description: e instanceof Error ? e.message : "Try again.", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminGet<{ leads: AdminLead[] }>("leads", {
        search,
        status,
        priority,
        interest_type: interestType,
        package_clicked: packageClicked,
      });
      setLeads(data.leads);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load leads.");
    } finally {
      setLoading(false);
    }
  }, [interestType, packageClicked, priority, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-3xl tracking-wide">Leads</h2>
          <p className="text-muted-foreground">Search and filter everyone who requested the guide.</p>
        </div>
        <Button onClick={load}>
          <Search data-icon="inline-start" />
          Search
        </Button>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
          <Input placeholder="Search name, email, phone, suburb or postcode" value={search} onChange={(event) => setSearch(event.target.value)} />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {adminStatuses.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              {adminPriorities.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={interestType} onValueChange={setInterestType}>
            <SelectTrigger><SelectValue placeholder="Interest" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All interests</SelectItem>
              <SelectItem value="volunteering">Volunteering as a firefighter</SelectItem>
              <SelectItem value="support">Support role</SelectItem>
              <SelectItem value="cadets">Cadets or youth pathway</SelectItem>
              <SelectItem value="unsure">Not sure yet</SelectItem>
            </SelectContent>
          </Select>
          <Select value={packageClicked} onValueChange={setPackageClicked}>
            <SelectTrigger><SelectValue placeholder="Package clicked" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any click state</SelectItem>
              <SelectItem value="yes">Clicked package</SelectItem>
              <SelectItem value="no">Not clicked</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Leads unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl tracking-wide">{leads.length} leads</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-72 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Suburb</TableHead>
                  <TableHead>Interest</TableHead>
                  <TableHead>Timeline</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium"><Link to={`/admin/leads/${lead.id}`}>{leadName(lead)}</Link></TableCell>
                    <TableCell>{lead.email}</TableCell>
                    <TableCell>{lead.phone || "None"}</TableCell>
                    <TableCell>{leadLocation(lead)}</TableCell>
                    <TableCell>{lead.interest_type || "Not supplied"}</TableCell>
                    <TableCell>{lead.joining_timeline || "Not supplied"}</TableCell>
                    <TableCell><LeadBadges lead={lead} /></TableCell>
                    <TableCell>{lead.package_sent_at ? "Sent" : "Not sent"} / {lead.package_clicked_at ? "Clicked" : "No click"}</TableCell>
                    <TableCell>{formatDate(lead.created_at)}</TableCell>
                    <TableCell><LeadActionButtons lead={lead} onChanged={load} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
