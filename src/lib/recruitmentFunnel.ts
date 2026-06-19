import { z } from "zod";

export const defaultPublicSettings = {
  hero_headline: "BE THE DIFFERENCE",
  hero_subheadline: "Join 70,000+ volunteers on the front line. Free training. Real impact. No experience needed.",
  cta_text: "Become a Firefighter",
  popup_enabled: true,
  popup_delay_seconds: 1.5,
  popup_title: "Get the How to Join Package",
  popup_description: "Answer a few quick questions and we will send the guide to your inbox.",
  success_message: "Thank you. Check your email for your How to Join Package.",
};

export type PublicSettings = typeof defaultPublicSettings;

export type LeadSurveyForm = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  suburb: string;
  postcode: string;
  age_range: string;
  interest_type: string;
  joining_timeline: string;
  preferred_contact_method: string;
  consent_email: boolean;
  consent_sms: boolean;
};

export const emptyLeadSurveyForm: LeadSurveyForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  suburb: "",
  postcode: "",
  age_range: "",
  interest_type: "",
  joining_timeline: "",
  preferred_contact_method: "",
  consent_email: true,
  consent_sms: false,
};

export const leadSurveySchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(100),
  last_name: z.string().trim().max(100).optional(),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().max(30).optional(),
  suburb: z.string().trim().min(1, "Suburb is required").max(100),
  postcode: z.string().trim().min(3, "Postcode is required").max(10),
  age_range: z.string().min(1, "Choose an age range"),
  interest_type: z.string().min(1, "Choose what you are interested in"),
  joining_timeline: z.string().min(1, "Choose a joining timeline"),
  preferred_contact_method: z.string().min(1, "Choose a preferred contact method"),
  consent_email: z.literal(true, {
    errorMap: () => ({ message: "Email consent is required so we can send the guide" }),
  }),
  consent_sms: z.boolean(),
});

export type LeadSurveyPayload = z.infer<typeof leadSurveySchema> & {
  source?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
};

export function buildLeadSubmissionPayload(form: LeadSurveyForm, searchParams: URLSearchParams): LeadSurveyPayload {
  const parsed = leadSurveySchema.parse({
    ...form,
    last_name: form.last_name || undefined,
    phone: form.phone || undefined,
  });

  return {
    ...parsed,
    source: searchParams.get("source") ?? searchParams.get("utm_source") ?? "website",
    utm_source: searchParams.get("utm_source"),
    utm_medium: searchParams.get("utm_medium"),
    utm_campaign: searchParams.get("utm_campaign"),
  };
}

export function shouldAutoOpenPopup(settings: Pick<PublicSettings, "popup_enabled">, storage: Storage): boolean {
  return settings.popup_enabled && storage.getItem("joinrfs_popup_seen") !== "true";
}

export function normalizePublicSettings(value: unknown): PublicSettings {
  if (!value || typeof value !== "object") {
    return defaultPublicSettings;
  }

  const raw = value as Partial<Record<keyof PublicSettings, unknown>>;

  return {
    hero_headline: readString(raw.hero_headline, defaultPublicSettings.hero_headline),
    hero_subheadline: readString(raw.hero_subheadline, defaultPublicSettings.hero_subheadline),
    cta_text: readString(raw.cta_text, defaultPublicSettings.cta_text),
    popup_enabled: typeof raw.popup_enabled === "boolean" ? raw.popup_enabled : defaultPublicSettings.popup_enabled,
    popup_delay_seconds:
      typeof raw.popup_delay_seconds === "number" ? raw.popup_delay_seconds : defaultPublicSettings.popup_delay_seconds,
    popup_title: readString(raw.popup_title, defaultPublicSettings.popup_title),
    popup_description: readString(raw.popup_description, defaultPublicSettings.popup_description),
    success_message: readString(raw.success_message, defaultPublicSettings.success_message),
  };
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}
