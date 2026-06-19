export type LeadSubmissionPayload = {
  first_name?: unknown;
  last_name?: unknown;
  email?: unknown;
  phone?: unknown;
  suburb?: unknown;
  postcode?: unknown;
  age_range?: unknown;
  interest_type?: unknown;
  joining_timeline?: unknown;
  preferred_contact_method?: unknown;
  consent_email?: unknown;
  consent_sms?: unknown;
  source?: unknown;
  utm_source?: unknown;
  utm_medium?: unknown;
  utm_campaign?: unknown;
};

export type ValidLeadSubmission = {
  first_name: string;
  last_name: string | null;
  email: string;
  phone: string | null;
  suburb: string;
  postcode: string;
  age_range: string;
  interest_type: string;
  joining_timeline: string;
  preferred_contact_method: string;
  consent_email: boolean;
  consent_sms: boolean;
  source: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLeadSubmission(payload: LeadSubmissionPayload): {
  data?: ValidLeadSubmission;
  error?: string;
} {
  const firstName = cleanRequiredString(payload.first_name);
  const email = cleanRequiredString(payload.email).toLowerCase();
  const suburb = cleanRequiredString(payload.suburb);
  const postcode = cleanRequiredString(payload.postcode);
  const ageRange = cleanRequiredString(payload.age_range);
  const interestType = cleanRequiredString(payload.interest_type);
  const joiningTimeline = cleanRequiredString(payload.joining_timeline);
  const preferredContactMethod = cleanRequiredString(payload.preferred_contact_method);

  if (!firstName) return { error: "First name is required." };
  if (!email || !emailPattern.test(email)) return { error: "A valid email is required." };
  if (!suburb) return { error: "Suburb is required." };
  if (!postcode) return { error: "Postcode is required." };
  if (!ageRange) return { error: "Age range is required." };
  if (!interestType) return { error: "Interest type is required." };
  if (!joiningTimeline) return { error: "Joining timeline is required." };
  if (!preferredContactMethod) return { error: "Preferred contact method is required." };

  return {
    data: {
      first_name: firstName,
      last_name: cleanOptionalString(payload.last_name),
      email,
      phone: cleanOptionalString(payload.phone),
      suburb,
      postcode,
      age_range: ageRange,
      interest_type: interestType,
      joining_timeline: joiningTimeline,
      preferred_contact_method: preferredContactMethod,
      consent_email: payload.consent_email !== false,
      consent_sms: payload.consent_sms === true,
      source: cleanOptionalString(payload.source),
      utm_source: cleanOptionalString(payload.utm_source),
      utm_medium: cleanOptionalString(payload.utm_medium),
      utm_campaign: cleanOptionalString(payload.utm_campaign),
    },
  };
}

export function calculatePriority(input: Pick<ValidLeadSubmission, "phone" | "joining_timeline">): "High" | "Medium" | "Low" {
  const timeline = input.joining_timeline.toLowerCase();
  const highIntent = ["now", "soon", "asap", "immediate", "this month", "ready"].some((term) => timeline.includes(term));
  if (input.phone && highIntent) return "High";
  return "Medium";
}

function cleanRequiredString(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 255) : "";
}

function cleanOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim().slice(0, 1000);
  return clean || null;
}
