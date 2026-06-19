import { describe, expect, it } from "vitest";
import { filterAndSortFollowUpQueue, shouldIncludeInFollowUpQueue } from "./followUpQueue";
import type { Lead } from "./types";

const baseLead: Lead = {
  id: "lead-1",
  created_at: "2026-06-12T00:00:00.000Z",
  updated_at: "2026-06-12T00:00:00.000Z",
  first_name: "A",
  last_name: null,
  email: "a@example.com",
  phone: null,
  suburb: null,
  postcode: null,
  age_range: null,
  interest_type: null,
  joining_timeline: null,
  preferred_contact_method: null,
  source: null,
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  consent_email: true,
  consent_sms: false,
  package_sent_at: null,
  package_clicked_at: null,
  status: "Contacted",
  priority: "Low",
  next_follow_up_at: null,
  last_contacted_at: null,
  notes: null,
  sheet_synced_at: null,
  sheet_sync_status: "not_synced",
};

describe("shouldIncludeInFollowUpQueue", () => {
  it("includes new, needs follow-up, and warm leads", () => {
    expect(shouldIncludeInFollowUpQueue({ ...baseLead, status: "New" }, new Set())).toBe(true);
    expect(shouldIncludeInFollowUpQueue({ ...baseLead, status: "Needs Follow-Up" }, new Set())).toBe(true);
    expect(shouldIncludeInFollowUpQueue({ ...baseLead, status: "Warm Lead" }, new Set())).toBe(true);
  });

  it("includes due follow-up dates", () => {
    expect(
      shouldIncludeInFollowUpQueue(
        { ...baseLead, next_follow_up_at: "2026-06-11T00:00:00.000Z" },
        new Set(),
        new Date("2026-06-12T00:00:00.000Z"),
      ),
    ).toBe(true);
  });

  it("includes failed email leads and uncontacted package clickers", () => {
    expect(shouldIncludeInFollowUpQueue(baseLead, new Set(["lead-1"]))).toBe(true);
    expect(
      shouldIncludeInFollowUpQueue(
        { ...baseLead, package_clicked_at: "2026-06-12T00:00:00.000Z", last_contacted_at: null },
        new Set(),
      ),
    ).toBe(true);
  });
});

describe("filterAndSortFollowUpQueue", () => {
  it("sorts hottest leads first by priority, package click, then creation date", () => {
    const rows: Lead[] = [
      { ...baseLead, id: "low", status: "New", priority: "Low", created_at: "2026-06-12T01:00:00.000Z" },
      {
        ...baseLead,
        id: "high-old-click",
        status: "New",
        priority: "High",
        package_clicked_at: "2026-06-12T01:00:00.000Z",
      },
      {
        ...baseLead,
        id: "high-new-click",
        status: "New",
        priority: "High",
        package_clicked_at: "2026-06-12T02:00:00.000Z",
      },
      { ...baseLead, id: "medium", status: "New", priority: "Medium" },
    ];

    expect(filterAndSortFollowUpQueue(rows, new Set()).map((lead) => lead.id)).toEqual([
      "high-new-click",
      "high-old-click",
      "medium",
      "low",
    ]);
  });
});
