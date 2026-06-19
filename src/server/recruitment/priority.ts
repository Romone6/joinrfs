import type { Lead, LeadPriority } from "./types";

const highIntentTimelineTerms = ["now", "soon", "asap", "immediate", "this week", "this month", "ready"];

type PriorityLeadInput = Pick<
  Partial<Lead>,
  "created_at" | "joining_timeline" | "package_clicked_at" | "package_sent_at" | "phone" | "status" | "interest_type"
>;

export function calculateBasicPriority(lead: PriorityLeadInput, now = new Date()): LeadPriority {
  const joiningTimeline = lead.joining_timeline?.toLowerCase() ?? "";
  const hasHighIntentTimeline = highIntentTimelineTerms.some((term) => joiningTimeline.includes(term));
  const hasPhone = Boolean(lead.phone?.trim());

  if (lead.package_clicked_at && hasPhone && hasHighIntentTimeline) {
    return "High";
  }

  if (lead.status === "New" || lead.status === "Package Sent" || lead.package_sent_at) {
    return "Medium";
  }

  if (lead.created_at) {
    const createdAt = new Date(lead.created_at);
    const ageDays = (now.getTime() - createdAt.getTime()) / 86_400_000;
    if (ageDays <= 7) {
      return "Medium";
    }
  }

  return "Low";
}

export function priorityRank(priority: LeadPriority | string | null | undefined): number {
  if (priority === "High") return 3;
  if (priority === "Medium") return 2;
  return 1;
}
