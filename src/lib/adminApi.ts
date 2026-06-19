import { supabase } from "@/integrations/supabase/client";

type QueryValue = string | number | boolean | null | undefined;

export async function adminGet<T>(action: string, params: Record<string, QueryValue> = {}): Promise<T> {
  const { token } = await getAdminToken();
  const url = adminFunctionUrl(action, params);
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
  });

  return parseResponse<T>(response);
}

export async function adminPost<T>(action: string, body: Record<string, unknown>): Promise<T> {
  const { token } = await getAdminToken();
  const response = await fetch(adminFunctionUrl(action), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return parseResponse<T>(response);
}

export async function logLeadAction(leadId: string, activityType: string, metadata: Record<string, unknown> = {}): Promise<void> {
  await adminPost("log-action", {
    lead_id: leadId,
    activity_type: activityType,
    metadata,
  });
}

export async function getAdminToken(): Promise<{ token: string }> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error("You are not signed in.");
  }

  return { token };
}

export function adminFunctionUrl(action: string, params: Record<string, QueryValue> = {}): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const url = new URL(`${supabaseUrl.replace(/\/$/, "")}/functions/v1/admin`);
  url.searchParams.set("action", action);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof body.error === "string" ? body.error : "Admin request failed.");
  }
  return body as T;
}

export async function downloadCsv(): Promise<void> {
  const { token } = await getAdminToken();
  const url = adminFunctionUrl("csv-export");
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(typeof body.error === "string" ? body.error : "CSV export failed.");
  }

  const blob = await response.blob();
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
}
