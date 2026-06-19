import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { calculatePriority, validateLeadSubmission, type ValidLeadSubmission } from "../_shared/validation.ts";
import { appendLeadToSheet } from "../_shared/sheets.ts";
import { buildNotificationHtml, buildSubject, sendAdminNotification } from "../_shared/notifications.ts";

type SiteSettings = Record<string, unknown>;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Lead capture is not configured." }, 500);
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid request body." }, 400);
  }

  const validation = validateLeadSubmission(payload as Record<string, unknown>);
  if (!validation.data) {
    return jsonResponse({ error: validation.error ?? "Invalid lead submission." }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const settings = await getSiteSettings(supabase);
  const lead = validation.data;

  const { data: insertedLead, error: leadError } = await supabase
    .from("leads")
    .insert({
      ...lead,
      status: "New",
      priority: calculatePriority(lead),
      sheet_sync_status: "not_synced",
    })
    .select("*")
    .single();

  if (leadError) {
    return jsonResponse({ error: "Could not save lead." }, 500);
  }

  await supabase.from("survey_responses").insert(buildSurveyResponses(insertedLead.id, lead));
  await supabase.from("lead_activities").insert({
    lead_id: insertedLead.id,
    activity_type: "lead_created",
    metadata: {
      source: lead.source,
      utm_source: lead.utm_source,
      utm_medium: lead.utm_medium,
      utm_campaign: lead.utm_campaign,
    },
  });

  const initialPriority = calculatePriority(lead);
  const isHighPriority = initialPriority === "High";

  sendAdminNotification({
    subject: buildSubject(`New lead: ${lead.first_name}`, isHighPriority ? "High" : undefined),
    html: buildNotificationHtml(
      `${lead.first_name} ${lead.last_name ?? ""} submitted the form. Priority: ${initialPriority}.${isHighPriority ? "\n\nPhone: " + (lead.phone ?? "not provided") : ""}`,
      isHighPriority ? "High" : undefined,
    ),
  });

  if (isHighPriority) {
    await supabase
      .from("leads")
      .update({ high_priority_alert_sent: true, high_priority_alerted_at: new Date().toISOString() })
      .eq("id", insertedLead.id);
    await supabase.from("lead_activities").insert({
      lead_id: insertedLead.id,
      activity_type: "high_priority_alert_sent",
      metadata: { priority: "High", phone: lead.phone },
    });
  }

  const emailResult = await sendPackageEmail(lead, settings);
  const emailLog = {
    lead_id: insertedLead.id,
    email_type: "how_to_join_package",
    recipient: lead.email,
    subject: emailResult.subject,
    status: emailResult.ok ? "sent" : "failed",
    provider_message_id: emailResult.providerMessageId,
    error_message: emailResult.errorMessage,
    sent_at: emailResult.ok ? new Date().toISOString() : null,
  };

  await supabase.from("email_logs").insert(emailLog);

  if (emailResult.ok) {
    await supabase
      .from("leads")
      .update({
        status: "Package Sent",
        package_sent_at: emailLog.sent_at,
        priority: "Medium",
      })
      .eq("id", insertedLead.id);

    await supabase.from("lead_activities").insert({
      lead_id: insertedLead.id,
      activity_type: "package_sent",
      metadata: {
        recipient: lead.email,
        provider_message_id: emailResult.providerMessageId,
      },
    });
  } else {
    await supabase.from("lead_activities").insert({
      lead_id: insertedLead.id,
      activity_type: "package_send_failed",
      metadata: {
        recipient: lead.email,
        error_message: emailResult.errorMessage,
      },
    });
    sendAdminNotification({
      subject: `Package email failed for ${lead.first_name}`,
      html: buildNotificationHtml(
        `Package email failed to send to ${lead.first_name} (${lead.email}). Error: ${emailResult.errorMessage ?? "Unknown"}.`,
      ),
    });
  }

  const env = Deno.env.toObject();
  const sheetResult = await appendLeadToSheet(insertedLead, env, settings);

  if (sheetResult.ok) {
    await supabase.from("leads").update({
      sheet_sync_status: "success",
      sheet_synced_at: new Date().toISOString(),
    }).eq("id", insertedLead.id);
    await supabase.from("lead_activities").insert({
      lead_id: insertedLead.id,
      activity_type: "sheet_sync_success",
      metadata: {},
    });
  } else {
    await supabase.from("leads").update({
      sheet_sync_status: "failed",
    }).eq("id", insertedLead.id);
    await supabase.from("lead_activities").insert({
      lead_id: insertedLead.id,
      activity_type: "sheet_sync_failed",
      metadata: { error: sheetResult.error },
    });
    sendAdminNotification({
      subject: `Sheet sync failed for ${lead.first_name}`,
      html: buildNotificationHtml(
        `Google Sheets sync failed for ${lead.first_name} (${lead.email}). Error: ${sheetResult.error}.`,
      ),
    });
  }

  const message = emailResult.ok
    ? (stringSetting(settings.success_message) ?? "Thank you. Check your email for your How to Join Package.")
    : "Your details were saved, but the package email could not be sent automatically. We will follow up manually.";

  return jsonResponse(
    {
      ok: true,
      lead_id: insertedLead.id,
      package_email_sent: emailResult.ok,
      message,
    },
    emailResult.ok ? 200 : 202,
  );
});

async function getSiteSettings(supabase: ReturnType<typeof createClient>): Promise<SiteSettings> {
  const { data } = await supabase
    .from("site_settings")
    .select("key,value")
    .in("key", [
      "package_url", "email_subject", "email_body", "success_message", "notification_email",
      "google_sheets_spreadsheet_id", "google_service_account_email", "google_sheets_leads_sheet_name",
    ]);

  return Object.fromEntries((data ?? []).map((row) => [row.key, row.value]));
}

function buildSurveyResponses(leadId: string, lead: ValidLeadSubmission) {
  return [
    ["age_range", "Age range", lead.age_range],
    ["interest_type", "Interest type", lead.interest_type],
    ["joining_timeline", "Joining timeline", lead.joining_timeline],
    ["preferred_contact_method", "Preferred contact method", lead.preferred_contact_method],
    ["consent_email", "Email consent", lead.consent_email ? "yes" : "no"],
    ["consent_sms", "SMS consent", lead.consent_sms ? "yes" : "no"],
  ].map(([question_key, question_label, answer]) => ({
    lead_id: leadId,
    question_key,
    question_label,
    answer,
  }));
}

async function sendPackageEmail(lead: ValidLeadSubmission, settings: SiteSettings) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("FROM_EMAIL");
  const replyTo = Deno.env.get("REPLY_TO_EMAIL") ?? Deno.env.get("ADMIN_NOTIFICATION_EMAIL");
  const packageUrl = stringSetting(settings.package_url) ?? Deno.env.get("PACKAGE_URL");
  const subject = stringSetting(settings.email_subject) ?? "Your How to Join Package";

  if (!lead.consent_email) {
    return {
      ok: false,
      subject,
      providerMessageId: null,
      errorMessage: "Lead did not consent to email.",
    };
  }

  if (!resendApiKey || !fromEmail || !packageUrl) {
    return {
      ok: false,
      subject,
      providerMessageId: null,
      errorMessage: "Email provider, sender, or package URL is not configured.",
    };
  }

  const configuredBody =
    stringSetting(settings.email_body) ??
    "Thanks for your interest. Your How to Join Package is available here: {{package_url}}";
  const html = buildEmailHtml(lead.first_name, configuredBody, packageUrl);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [lead.email],
        reply_to: replyTo || undefined,
        subject,
        html,
      }),
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        ok: false,
        subject,
        providerMessageId: null,
        errorMessage: typeof body.message === "string" ? body.message.slice(0, 500) : "Resend email failed.",
      };
    }

    return {
      ok: true,
      subject,
      providerMessageId: typeof body.id === "string" ? body.id : null,
      errorMessage: null,
    };
  } catch {
    return {
      ok: false,
      subject,
      providerMessageId: null,
      errorMessage: "Resend request failed.",
    };
  }
}

function buildEmailHtml(firstName: string, configuredBody: string, packageUrl: string): string {
  const body = escapeHtml(configuredBody)
    .replaceAll("{{first_name}}", escapeHtml(firstName))
    .replaceAll("{{package_url}}", `<a href="${escapeHtml(packageUrl)}">Open the How to Join Package</a>`);

  return `
    <div style="font-family: Arial, sans-serif; color: #162033; line-height: 1.6;">
      <p>Hi ${escapeHtml(firstName)},</p>
      <p>${body}</p>
      <p>This guide is here to help you understand the joining process. Official joining steps are completed through NSW RFS channels.</p>
      <p><a href="${escapeHtml(packageUrl)}" style="display:inline-block;background:#f5c400;color:#162033;padding:12px 18px;text-decoration:none;font-weight:700;border-radius:6px;">Get the How to Join Package</a></p>
    </div>
  `;
}

function stringSetting(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
