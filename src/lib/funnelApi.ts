import { defaultPublicSettings, normalizePublicSettings, type LeadSurveyPayload, type PublicSettings } from "./recruitmentFunnel";

type SubmitLeadResponse = {
  ok: boolean;
  lead_id?: string;
  package_email_sent?: boolean;
  message?: string;
  error?: string;
};

export async function getPublicSettings(): Promise<PublicSettings> {
  const functionUrl = getFunctionUrl("public-settings");
  if (!functionUrl) {
    return defaultPublicSettings;
  }

  try {
    const response = await fetch(functionUrl, {
      headers: getPublicFunctionHeaders(),
    });

    if (!response.ok) {
      return defaultPublicSettings;
    }

    const body = await response.json();
    return normalizePublicSettings(body.settings);
  } catch {
    return defaultPublicSettings;
  }
}

export async function submitLead(payload: LeadSurveyPayload): Promise<SubmitLeadResponse> {
  const functionUrl = getFunctionUrl("submit-lead");
  if (!functionUrl) {
    return {
      ok: false,
      error: "Lead capture is not configured.",
    };
  }

  try {
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        ...getPublicFunctionHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const body = (await response.json().catch(() => ({}))) as SubmitLeadResponse;

    if (!response.ok && !body.ok) {
      return {
        ok: false,
        error: body.error ?? "Lead submission failed.",
      };
    }

    return body;
  } catch {
    return {
      ok: false,
      error: "Lead capture is temporarily unavailable. Please try again shortly.",
    };
  }
}

export function getFunctionUrl(functionName: string): string | null {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    return null;
  }

  return `${supabaseUrl.replace(/\/$/, "")}/functions/v1/${functionName}`;
}

function getPublicFunctionHeaders(): HeadersInit {
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    return {};
  }

  return {
    apikey: publishableKey,
    Authorization: `Bearer ${publishableKey}`,
  };
}
