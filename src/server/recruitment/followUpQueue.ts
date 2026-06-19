import { priorityRank } from "./priority";
import type { Lead } from "./types";

const queueStatuses = new Set(["New", "Needs Follow-Up", "Warm Lead"]);

export function shouldIncludeInFollowUpQueue(
  lead: Pick<Lead, "id" | "status" | "next_follow_up_at" | "package_clicked_at" | "last_contacted_at">,
  failedEmailLeadIds: Set<string>,
  now = new Date(),
): boolean {
  if (queueStatuses.has(lead.status)) {
    return true;
  }

  if (lead.next_follow_up_at && new Date(lead.next_follow_up_at) <= now) {
    return true;
  }

  if (failedEmailLeadIds.has(lead.id)) {
    return true;
  }

  return Boolean(lead.package_clicked_at && !lead.last_contacted_at);
}

export function sortFollowUpQueue<T extends Pick<Lead, "created_at" | "package_clicked_at" | "priority">>(leads: T[]): T[] {
  return [...leads].sort((a, b) => {
    const priorityDelta = priorityRank(b.priority) - priorityRank(a.priority);
    if (priorityDelta !== 0) return priorityDelta;

    const clickedDelta = dateValue(b.package_clicked_at) - dateValue(a.package_clicked_at);
    if (clickedDelta !== 0) return clickedDelta;

    return dateValue(b.created_at) - dateValue(a.created_at);
  });
}

export function filterAndSortFollowUpQueue<T extends Lead>(
  leads: T[],
  failedEmailLeadIds: Set<string>,
  now = new Date(),
): T[] {
  return sortFollowUpQueue(leads.filter((lead) => shouldIncludeInFollowUpQueue(lead, failedEmailLeadIds, now)));
}

function dateValue(value: string | null): number {
  return value ? new Date(value).getTime() : 0;
}
