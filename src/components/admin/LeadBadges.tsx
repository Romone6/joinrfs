import { Badge } from "@/components/ui/badge";
import { priorityBadgeClass } from "@/lib/adminDashboard";
import type { AdminLead } from "@/lib/adminTypes";

export function LeadBadges({ lead }: { lead: Pick<AdminLead, "status" | "priority"> }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="secondary">{lead.status}</Badge>
      <Badge variant="outline" className={priorityBadgeClass(lead.priority)}>
        {lead.priority}
      </Badge>
    </div>
  );
}
