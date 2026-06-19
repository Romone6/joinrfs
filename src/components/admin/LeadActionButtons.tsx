import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { adminPost, logLeadAction } from "@/lib/adminApi";
import { contactText, mailtoHref, smsHref, telHref } from "@/lib/adminDashboard";
import type { AdminLead } from "@/lib/adminTypes";
import { Copy, Eye, Mail, MessageSquare, Phone, Send, UserCheck } from "lucide-react";
import { Link } from "react-router-dom";

type Props = {
  lead: AdminLead;
  onChanged?: () => void;
  showView?: boolean;
};

export function LeadActionButtons({ lead, onChanged, showView = true }: Props) {
  const { toast } = useToast();

  async function markContacted() {
    try {
      await adminPost("mark-contacted", { lead_id: lead.id });
      toast({ title: "Lead marked contacted" });
      onChanged?.();
    } catch (error) {
      toast({ title: "Could not mark contacted", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" });
    }
  }

  async function copyContact() {
    await navigator.clipboard.writeText(contactText(lead));
    toast({ title: "Contact copied" });
  }

  async function resendPackage() {
    try {
      const result = await adminPost<{ ok: boolean; message?: string }>("resend-package", { lead_id: lead.id });
      toast({ title: result.ok ? "Package resent" : "Package not sent", description: result.message });
      onChanged?.();
    } catch (error) {
      toast({ title: "Package not sent", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" });
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild size="sm" variant="outline">
        <a href={mailtoHref(lead)} onClick={() => void logLeadAction(lead.id, "email_followup_opened")}>
          <Mail data-icon="inline-start" />
          Email
        </a>
      </Button>
      {lead.phone ? (
        <Button asChild size="sm" variant="outline">
          <a href={telHref(lead)} onClick={() => void logLeadAction(lead.id, "phone_call_clicked")}>
            <Phone data-icon="inline-start" />
            Call
          </a>
        </Button>
      ) : (
        <Button size="sm" variant="outline" disabled>
          <Phone data-icon="inline-start" />
          Call
        </Button>
      )}
      {lead.phone ? (
        <Button asChild size="sm" variant="outline">
          <a href={smsHref(lead)} onClick={() => void logLeadAction(lead.id, "sms_clicked")}>
            <MessageSquare data-icon="inline-start" />
            SMS
          </a>
        </Button>
      ) : (
        <Button size="sm" variant="outline" disabled>
          <MessageSquare data-icon="inline-start" />
          SMS
        </Button>
      )}
      {showView && (
        <Button asChild size="sm" variant="secondary">
          <Link to={`/admin/leads/${lead.id}`}>
            <Eye data-icon="inline-start" />
            View
          </Link>
        </Button>
      )}
      <Button size="sm" onClick={() => void markContacted()}>
        <UserCheck data-icon="inline-start" />
        Mark Contacted
      </Button>
      <Button size="sm" variant="ghost" onClick={() => void copyContact()}>
        <Copy data-icon="inline-start" />
        Copy
      </Button>
      <Button size="sm" variant="ghost" onClick={() => void resendPackage()}>
        <Send data-icon="inline-start" />
        Resend
      </Button>
    </div>
  );
}
