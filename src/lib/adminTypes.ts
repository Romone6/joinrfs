import type { Tables } from "@/integrations/supabase/types";

export type AdminLead = Tables<"leads">;
export type AdminSurveyResponse = Tables<"survey_responses">;
export type AdminEmailLog = Tables<"email_logs">;
export type AdminLeadActivity = Tables<"lead_activities">;
export type AdminSiteSetting = Tables<"site_settings">;

export type AdminLeadDetail = AdminLead & {
  survey_responses?: AdminSurveyResponse[];
  email_logs?: AdminEmailLog[];
  lead_activities?: AdminLeadActivity[];
};

export type FollowUpSummary = {
  newToday: number;
  needFollowUp: number;
  overdueFollowUps: number;
  packageEmailsSent: number;
  packageClicks: number;
  conversionRate: number;
};

export type AdminAnalytics = {
  totalLeads: number;
  leadsToday: number;
  leadsThisWeek: number;
  packageSentCount: number;
  packageClickCount: number;
  statusCounts: Record<string, number>;
  sourceCounts: Record<string, number>;
  recentLeadTrend: Array<{ date: string; count: number }>;
};

export type HealthCheck = {
  name: string;
  ok: boolean;
  message: string;
};

export type HealthStatus = "healthy" | "needs_attention" | "broken" | "not_configured";

export type HealthResponse = {
  website: { status: HealthStatus };
  database: { status: HealthStatus };
  email: {
    status: HealthStatus;
    lastSuccessfulSend: string | null;
    failedCount: number;
    sentCount: number;
  };
  googleSheets: {
    status: HealthStatus;
    lastSync: string | null;
    failedSyncCount: number;
  };
  analytics: { status: HealthStatus };
  lastLeadSubmitted: string | null;
  checks: HealthCheck[];
};

export const adminStatuses = [
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

export const adminPriorities = ["High", "Medium", "Low"] as const;
