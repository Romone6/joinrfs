import type { AdminLead } from "./adminTypes";

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function leadName(lead: Pick<AdminLead, "first_name" | "last_name" | "email">): string {
  const name = [lead.first_name, lead.last_name].filter(Boolean).join(" ").trim();
  return name || lead.email;
}

export function leadLocation(lead: Pick<AdminLead, "suburb" | "postcode">): string {
  return [lead.suburb, lead.postcode].filter(Boolean).join(" ") || "Location not supplied";
}

export function buildFollowUpEmail(lead: Pick<AdminLead, "first_name">): { subject: string; body: string } {
  return {
    subject: "Following up on your RFS joining guide",
    body: `Hey ${lead.first_name},

Just following up after you requested the RFS joining guide.

Did you get a chance to read through the package? If you're still interested, I can point you toward the next step and help you understand what the process usually looks like.

Cheers,`,
  };
}

export function buildSmsMessage(lead: Pick<AdminLead, "first_name">): string {
  return `Hey ${lead.first_name}, just following up after you requested the RFS joining guide. Did you get a chance to read it?`;
}

export function mailtoHref(lead: Pick<AdminLead, "email" | "first_name">): string {
  const { subject, body } = buildFollowUpEmail(lead);
  return `mailto:${encodeURIComponent(lead.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function smsHref(lead: Pick<AdminLead, "phone" | "first_name">): string {
  if (!lead.phone) return "#";
  return `sms:${encodeURIComponent(lead.phone)}?&body=${encodeURIComponent(buildSmsMessage(lead))}`;
}

export function telHref(lead: Pick<AdminLead, "phone">): string {
  return lead.phone ? `tel:${lead.phone}` : "#";
}

export function contactText(lead: AdminLead): string {
  return [
    `Name: ${leadName(lead)}`,
    `Email: ${lead.email}`,
    `Phone: ${lead.phone || "Not supplied"}`,
    `Location: ${leadLocation(lead)}`,
    `Interest: ${lead.interest_type || "Not supplied"}`,
    `Timeline: ${lead.joining_timeline || "Not supplied"}`,
  ].join("\n");
}

export function priorityBadgeClass(priority: string): string {
  if (priority === "High") return "border-rfs-yellow text-rfs-yellow";
  if (priority === "Medium") return "border-rfs-orange text-rfs-orange";
  return "border-border text-muted-foreground";
}
