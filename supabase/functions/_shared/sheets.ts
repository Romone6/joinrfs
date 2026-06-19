import * as jose from "npm:jose@5";

type SheetConfig = {
  clientEmail: string;
  privateKey: string;
  spreadsheetId: string;
  sheetName: string;
  siteUrl: string;
};

type SheetResult =
  | { ok: true }
  | { ok: false; error: string };

export function getSheetConfig(
  env: Record<string, string | undefined>,
  siteSettings?: Record<string, unknown>,
): SheetConfig | null {
  const clientEmail = env.GOOGLE_SERVICE_ACCOUNT_EMAIL || env.GOOGLE_SHEETS_CLIENT_EMAIL || String(siteSettings?.google_service_account_email ?? "") || "";
  const rawKey = env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "";
  const spreadsheetId = env.GOOGLE_SHEETS_SPREADSHEET_ID || String(siteSettings?.google_sheets_spreadsheet_id ?? "") || "";
  const sheetName = env.GOOGLE_SHEETS_LEADS_SHEET_NAME || String(siteSettings?.google_sheets_leads_sheet_name ?? "") || "Leads";
  const siteUrl = env.SITE_URL || "";

  if (!clientEmail || !rawKey || !spreadsheetId) {
    return null;
  }

  const privateKey = rawKey.includes("\n") ? rawKey : rawKey.replace(/\\n/g, "\n");

  return { clientEmail, privateKey, spreadsheetId, sheetName, siteUrl };
}

async function getAccessToken(config: SheetConfig): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const privateKey = await jose.importPKCS8(config.privateKey, "RS256");

  const jwt = await new jose.SignJWT({
    iss: config.clientEmail,
    sub: config.clientEmail,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .sign(privateKey);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(
      `Google auth failed: ${data.error_description || data.error || "Unknown"}`,
    );
  }

  return data.access_token as string;
}

function sheetsJsonUrl(spreadsheetId: string, range: string): string {
  const encoded = range.split("!").map((part) => {
    return part.includes("/") ? part : encodeURIComponent(part);
  }).join("!");
  return `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encoded}`;
}

const SHEET_HEADERS = [
  "Created At",
  "Lead ID",
  "First Name",
  "Last Name",
  "Email",
  "Phone",
  "Suburb",
  "Postcode",
  "Age Range",
  "Interest Type",
  "Joining Timeline",
  "Preferred Contact",
  "Status",
  "Priority",
  "Package Sent At",
  "Package Clicked At",
  "Source",
  "UTM Source",
  "UTM Medium",
  "UTM Campaign",
  "Next Follow-Up",
  "Admin Link",
];

async function ensureSheetHeaders(
  config: SheetConfig,
  accessToken: string,
): Promise<void> {
  const baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}`;

  const metaResponse = await fetch(baseUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!metaResponse.ok) {
    const err = await metaResponse.json().catch(() => ({}));
    throw new Error(
      `Cannot access spreadsheet: ${err.error?.message || metaResponse.statusText}`,
    );
  }

  const meta = await metaResponse.json();
  const sheet = (meta.sheets ?? []).find(
    (s: { properties?: { title?: string } }) =>
      s.properties?.title === config.sheetName,
  );

  if (!sheet) {
    const addResponse = await fetch(`${baseUrl}:addSheet`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: { title: config.sheetName },
      }),
    });
    if (!addResponse.ok) {
      const err = await addResponse.json().catch(() => ({}));
      throw new Error(
        `Cannot create sheet tab: ${err.error?.message || addResponse.statusText}`,
      );
    }

    const headerRange = `${config.sheetName}!A1:V1`;
    await fetch(
      `${sheetsJsonUrl(config.spreadsheetId, headerRange)}?valueInputOption=RAW`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values: [SHEET_HEADERS] }),
      },
    );
  }
}

export async function appendLeadToSheet(
  lead: {
    id: string;
    created_at: string | null;
    first_name: string;
    last_name: string | null;
    email: string;
    phone: string | null;
    suburb: string | null;
    postcode: string | null;
    age_range: string | null;
    interest_type: string | null;
    joining_timeline: string | null;
    preferred_contact_method: string | null;
    status: string | null;
    priority: string | null;
    package_sent_at: string | null;
    package_clicked_at: string | null;
    source: string | null;
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
    next_follow_up_at: string | null;
  },
  env: Record<string, string | undefined>,
  siteSettings?: Record<string, unknown>,
): Promise<SheetResult> {
  const config = getSheetConfig(env, siteSettings);
  if (!config) {
    return { ok: false, error: "Google Sheets not configured." };
  }

  try {
    const accessToken = await getAccessToken(config);
    await ensureSheetHeaders(config, accessToken);

    const adminLink = config.siteUrl
      ? `${config.siteUrl.replace(/\/$/, "")}/admin/leads/${lead.id}`
      : "";

    const row = [
      lead.created_at || "",
      lead.id,
      lead.first_name,
      lead.last_name || "",
      lead.email,
      lead.phone || "",
      lead.suburb || "",
      lead.postcode || "",
      lead.age_range || "",
      lead.interest_type || "",
      lead.joining_timeline || "",
      lead.preferred_contact_method || "",
      lead.status || "",
      lead.priority || "",
      lead.package_sent_at || "",
      lead.package_clicked_at || "",
      lead.source || "",
      lead.utm_source || "",
      lead.utm_medium || "",
      lead.utm_campaign || "",
      lead.next_follow_up_at || "",
      adminLink,
    ];

    const range = `${config.sheetName}!A:V`;
    const appendUrl =
      `${sheetsJsonUrl(config.spreadsheetId, range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

    const response = await fetch(appendUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [row] }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return {
        ok: false,
        error: `Sheets API error: ${err.error?.message || response.statusText}`,
      };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown sheet sync error.",
    };
  }
}
