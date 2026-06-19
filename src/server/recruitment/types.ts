import type { Json, Tables } from "@/integrations/supabase/types";

export const leadStatuses = [
  "New",
  "Package Sent",
  "Needs Follow-Up",
  "Contacted",
  "Warm Lead",
  "Referred to Official Process",
  "Applied",
  "Joined",
  "Not Interested",
  "Bad Lead",
] as const;

export type LeadStatus = (typeof leadStatuses)[number];

export const leadPriorities = ["High", "Medium", "Low"] as const;

export type LeadPriority = (typeof leadPriorities)[number];

export const leadActivityTypes = [
  "lead_created",
  "package_sent",
  "package_send_failed",
  "package_clicked",
  "email_followup_opened",
  "phone_call_clicked",
  "sms_clicked",
  "status_changed",
  "note_added",
  "followup_date_set",
  "package_resent",
  "sheet_sync_success",
  "sheet_sync_failed",
] as const;

export type LeadActivityType = (typeof leadActivityTypes)[number];

export type Lead = Tables<"leads">;
export type SurveyResponse = Tables<"survey_responses">;
export type EmailLog = Tables<"email_logs">;
export type LeadActivity = Tables<"lead_activities">;
export type AdminUser = Tables<"admin_users">;

export type SurveyResponseInput = {
  questionKey: string;
  questionLabel: string;
  answer?: string | null;
};

export type CreateLeadInput = {
  firstName: string;
  lastName?: string | null;
  email: string;
  phone?: string | null;
  suburb?: string | null;
  postcode?: string | null;
  ageRange?: string | null;
  interestType?: string | null;
  joiningTimeline?: string | null;
  preferredContactMethod?: string | null;
  source?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  consentEmail?: boolean;
  consentSms?: boolean;
  notes?: string | null;
  surveyResponses?: SurveyResponseInput[];
};

export type LeadFilters = {
  status?: LeadStatus;
  priority?: LeadPriority;
  source?: string;
  search?: string;
  limit?: number;
};

export type LeadDetail = Lead & {
  survey_responses: SurveyResponse[];
  email_logs: EmailLog[];
  lead_activities: LeadActivity[];
};

export type AnalyticsAggregates = {
  totalLeads: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  bySource: Record<string, number>;
  byCampaign: Record<string, number>;
  packageSent: number;
  packageClicked: number;
  needsFollowUp: number;
};

export type LogActivityInput = {
  leadId: string;
  actorUserId?: string | null;
  activityType: LeadActivityType;
  metadata?: Json;
};
