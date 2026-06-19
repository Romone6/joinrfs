import type { AdminSupabaseClient } from "@/server/supabaseAdmin";
import { calculateBasicPriority } from "./priority";
import { filterAndSortFollowUpQueue } from "./followUpQueue";
import type {
  AnalyticsAggregates,
  CreateLeadInput,
  Lead,
  LeadDetail,
  LeadFilters,
  LeadStatus,
  LogActivityInput,
  SurveyResponseInput,
} from "./types";

export async function createLead(supabase: AdminSupabaseClient, input: CreateLeadInput): Promise<Lead> {
  const leadInsert = {
    first_name: input.firstName.trim(),
    last_name: input.lastName?.trim() || null,
    email: input.email.trim().toLowerCase(),
    phone: input.phone?.trim() || null,
    suburb: input.suburb?.trim() || null,
    postcode: input.postcode?.trim() || null,
    age_range: input.ageRange?.trim() || null,
    interest_type: input.interestType?.trim() || null,
    joining_timeline: input.joiningTimeline?.trim() || null,
    preferred_contact_method: input.preferredContactMethod?.trim() || null,
    source: input.source?.trim() || null,
    utm_source: input.utmSource?.trim() || null,
    utm_medium: input.utmMedium?.trim() || null,
    utm_campaign: input.utmCampaign?.trim() || null,
    consent_email: input.consentEmail ?? true,
    consent_sms: input.consentSms ?? false,
    notes: input.notes?.trim() || null,
    status: "New" as const,
    priority: calculateBasicPriority({
      status: "New",
      phone: input.phone,
      joining_timeline: input.joiningTimeline,
    }),
  };

  const { data, error } = await supabase.from("leads").insert(leadInsert).select("*").single();

  if (error) {
    throw error;
  }

  if (input.surveyResponses?.length) {
    await saveSurveyResponses(supabase, data.id, input.surveyResponses);
  }

  await logActivity(supabase, {
    leadId: data.id,
    activityType: "lead_created",
    metadata: {
      source: data.source,
      utm_source: data.utm_source,
      utm_medium: data.utm_medium,
      utm_campaign: data.utm_campaign,
    },
  });

  return data;
}

export async function saveSurveyResponses(
  supabase: AdminSupabaseClient,
  leadId: string,
  responses: SurveyResponseInput[],
): Promise<void> {
  if (responses.length === 0) {
    return;
  }

  const rows = responses.map((response) => ({
    lead_id: leadId,
    question_key: response.questionKey,
    question_label: response.questionLabel,
    answer: response.answer ?? null,
  }));

  const { error } = await supabase.from("survey_responses").insert(rows);

  if (error) {
    throw error;
  }
}

export async function logActivity(supabase: AdminSupabaseClient, input: LogActivityInput): Promise<void> {
  const { error } = await supabase.from("lead_activities").insert({
    lead_id: input.leadId,
    actor_user_id: input.actorUserId ?? null,
    activity_type: input.activityType,
    metadata: input.metadata ?? {},
  });

  if (error) {
    throw error;
  }
}

export async function updateLeadStatus(
  supabase: AdminSupabaseClient,
  leadId: string,
  status: LeadStatus,
  actorUserId?: string | null,
): Promise<Lead> {
  const { data: existing, error: existingError } = await supabase
    .from("leads")
    .select("status, package_clicked_at, package_sent_at, phone, joining_timeline")
    .eq("id", leadId)
    .single();

  if (existingError) {
    throw existingError;
  }

  const update = {
    status,
    last_contacted_at: status === "Contacted" ? new Date().toISOString() : undefined,
    priority: calculateBasicPriority({ ...existing, status }),
  };

  const { data, error } = await supabase.from("leads").update(update).eq("id", leadId).select("*").single();

  if (error) {
    throw error;
  }

  await logActivity(supabase, {
    leadId,
    actorUserId,
    activityType: "status_changed",
    metadata: {
      from: existing.status,
      to: status,
    },
  });

  return data;
}

export async function addNote(
  supabase: AdminSupabaseClient,
  leadId: string,
  note: string,
  actorUserId?: string | null,
): Promise<Lead> {
  const cleanNote = note.trim();
  if (!cleanNote) {
    throw new Error("Note cannot be empty.");
  }

  const { data: existing, error: existingError } = await supabase.from("leads").select("notes").eq("id", leadId).single();

  if (existingError) {
    throw existingError;
  }

  const timestampedNote = `[${new Date().toISOString()}] ${cleanNote}`;
  const notes = existing.notes ? `${existing.notes}\n\n${timestampedNote}` : timestampedNote;

  const { data, error } = await supabase.from("leads").update({ notes }).eq("id", leadId).select("*").single();

  if (error) {
    throw error;
  }

  await logActivity(supabase, {
    leadId,
    actorUserId,
    activityType: "note_added",
    metadata: { note: cleanNote },
  });

  return data;
}

export async function setFollowUpDate(
  supabase: AdminSupabaseClient,
  leadId: string,
  nextFollowUpAt: string | null,
  actorUserId?: string | null,
): Promise<Lead> {
  const { data, error } = await supabase
    .from("leads")
    .update({ next_follow_up_at: nextFollowUpAt })
    .eq("id", leadId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  await logActivity(supabase, {
    leadId,
    actorUserId,
    activityType: "followup_date_set",
    metadata: { next_follow_up_at: nextFollowUpAt },
  });

  return data;
}

export async function getFollowUpQueue(
  supabase: AdminSupabaseClient,
  options: { now?: Date; limit?: number } = {},
): Promise<Lead[]> {
  const now = options.now ?? new Date();

  const { data: failedEmailRows, error: failedEmailError } = await supabase
    .from("email_logs")
    .select("lead_id")
    .eq("status", "failed")
    .not("lead_id", "is", null);

  if (failedEmailError) {
    throw failedEmailError;
  }

  const failedEmailLeadIds = new Set((failedEmailRows ?? []).map((row) => row.lead_id).filter(Boolean) as string[]);
  const failedIdFilter = failedEmailLeadIds.size > 0 ? `,id.in.(${Array.from(failedEmailLeadIds).join(",")})` : "";

  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .or(
      `status.in.("New","Needs Follow-Up","Warm Lead"),next_follow_up_at.lte.${now.toISOString()},and(package_clicked_at.not.is.null,last_contacted_at.is.null)${failedIdFilter}`,
    )
    .limit(options.limit ?? 100);

  if (error) {
    throw error;
  }

  return filterAndSortFollowUpQueue(data ?? [], failedEmailLeadIds, now);
}

export async function getAllLeadsWithFilters(
  supabase: AdminSupabaseClient,
  filters: LeadFilters = {},
): Promise<Lead[]> {
  let query = supabase.from("leads").select("*");

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.priority) {
    query = query.eq("priority", filters.priority);
  }

  if (filters.source) {
    query = query.eq("source", filters.source);
  }

  if (filters.search) {
    const search = `%${filters.search}%`;
    query = query.or(`first_name.ilike.${search},last_name.ilike.${search},email.ilike.${search},phone.ilike.${search}`);
  }

  const { data, error } = await query.order("created_at", { ascending: false }).limit(filters.limit ?? 100);

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getLeadDetail(supabase: AdminSupabaseClient, leadId: string): Promise<LeadDetail | null> {
  const { data, error } = await supabase
    .from("leads")
    .select("*, survey_responses(*), email_logs(*), lead_activities(*)")
    .eq("id", leadId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as LeadDetail | null;
}

export async function getBasicAnalyticsAggregates(supabase: AdminSupabaseClient): Promise<AnalyticsAggregates> {
  const { data, error } = await supabase
    .from("leads")
    .select("status, priority, source, utm_campaign, package_sent_at, package_clicked_at, next_follow_up_at");

  if (error) {
    throw error;
  }

  const leads = data ?? [];
  const now = new Date();

  return leads.reduce<AnalyticsAggregates>(
    (acc, lead) => {
      acc.totalLeads += 1;
      increment(acc.byStatus, lead.status ?? "Unknown");
      increment(acc.byPriority, lead.priority ?? "Unknown");
      increment(acc.bySource, lead.source ?? "Unknown");
      increment(acc.byCampaign, lead.utm_campaign ?? "Unknown");

      if (lead.package_sent_at) acc.packageSent += 1;
      if (lead.package_clicked_at) acc.packageClicked += 1;
      if (lead.next_follow_up_at && new Date(lead.next_follow_up_at) <= now) acc.needsFollowUp += 1;

      return acc;
    },
    {
      totalLeads: 0,
      byStatus: {},
      byPriority: {},
      bySource: {},
      byCampaign: {},
      packageSent: 0,
      packageClicked: 0,
      needsFollowUp: 0,
    },
  );
}

function increment(record: Record<string, number>, key: string): void {
  record[key] = (record[key] ?? 0) + 1;
}
