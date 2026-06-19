import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { appendLeadToSheet, getSheetConfig } from "../_shared/sheets.ts";
import { buildNotificationHtml, sendAdminNotification } from "../_shared/notifications.ts";

const adminRoles = ["owner", "operator", "readonly"] as const;
const writeRoles = ["owner", "operator"] as const;
const ownerRoles = ["owner"] as const;

type AdminRole = (typeof adminRoles)[number];
type AdminContext = {
  supabase: ReturnType<typeof createClient>;
  userId: string;
  role: AdminRole;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Admin API is not configured." }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const auth = await requireAdmin(req, supabase);
  if ("error" in auth) {
    return jsonResponse({ error: auth.error }, auth.status);
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const ctx = { supabase, userId: auth.userId, role: auth.role };

  try {
    if (req.method === "GET") {
      if (action === "follow-ups") return jsonResponse(await getFollowUps(ctx));
      if (action === "leads") return jsonResponse(await getLeads(ctx, url.searchParams));
      if (action === "lead-detail") return jsonResponse(await getLeadDetail(ctx, requiredParam(url, "id")));
      if (action === "analytics") return jsonResponse(await getAnalytics(ctx));
      if (action === "settings") return jsonResponse(await getSettings(ctx));
      if (action === "health") return jsonResponse(await getHealth(ctx));
      if (action === "csv-export") return await csvExport(ctx);
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (action === "sync-sheets") return jsonResponse(await syncSheets(ctx));

      if (action === "log-action") return jsonResponse(await logLeadAction(ctx, body));
      if (action === "mark-contacted") return jsonResponse(await markContacted(ctx, body));
      if (action === "update-status") return jsonResponse(await updateStatus(ctx, body));
      if (action === "set-follow-up") return jsonResponse(await setFollowUp(ctx, body));
      if (action === "add-note") return jsonResponse(await addNote(ctx, body));
      if (action === "resend-package") return jsonResponse(await resendPackage(ctx, body));
      if (action === "update-settings") return jsonResponse(await updateSettings(ctx, body));
      if (action === "send-referral") return jsonResponse(await sendReferral(ctx, body));
    }

    return jsonResponse({ error: "Unknown admin action." }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Admin action failed.";
    return jsonResponse({ error: message }, 400);
  }
});

async function requireAdmin(req: Request, supabase: ReturnType<typeof createClient>) {
  const header = req.headers.get("Authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return { error: "Not signed in.", status: 401 } as const;
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    return { error: "Invalid admin session.", status: 401 } as const;
  }

  const { data: adminUser, error: adminError } = await supabase
    .from("admin_users")
    .select("id,role,is_active")
    .eq("id", userData.user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (adminError || !adminUser || !adminRoles.includes(adminUser.role)) {
    return { error: "Admin access denied.", status: 403 } as const;
  }

  return { userId: userData.user.id, role: adminUser.role as AdminRole } as const;
}

async function getFollowUps(ctx: AdminContext) {
  const { data: leads, error } = await ctx.supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(300);
  if (error) throw error;

  const { data: failedEmails, error: emailError } = await ctx.supabase
    .from("email_logs")
    .select("lead_id")
    .eq("status", "failed")
    .not("lead_id", "is", null);
  if (emailError) throw emailError;

  const failedIds = new Set((failedEmails ?? []).map((row) => row.lead_id).filter(Boolean));
  const now = Date.now();
  const queue = (leads ?? [])
    .filter((lead) => {
      const due = lead.next_follow_up_at ? new Date(lead.next_follow_up_at).getTime() <= now : false;
      return (
        ["New", "Needs Follow-Up", "Warm Lead"].includes(lead.status) ||
        due ||
        failedIds.has(lead.id) ||
        Boolean(lead.package_clicked_at && !lead.last_contacted_at)
      );
    })
    .sort(compareHotLeads);

  return {
    leads: queue,
    summary: buildSummary(leads ?? []),
  };
}

async function getLeads(ctx: AdminContext, params: URLSearchParams) {
  let query = ctx.supabase.from("leads").select("*");
  const status = params.get("status");
  const priority = params.get("priority");
  const interestType = params.get("interest_type");
  const packageClicked = params.get("package_clicked");
  const search = params.get("search");

  if (status && status !== "all") query = query.eq("status", status);
  if (priority && priority !== "all") query = query.eq("priority", priority);
  if (interestType && interestType !== "all") query = query.eq("interest_type", interestType);
  if (packageClicked === "yes") query = query.not("package_clicked_at", "is", null);
  if (packageClicked === "no") query = query.is("package_clicked_at", null);
  if (search) {
    const clean = cleanSearchTerm(search);
    if (clean) {
      query = query.or(
        `first_name.ilike.%${clean}%,last_name.ilike.%${clean}%,email.ilike.%${clean}%,phone.ilike.%${clean}%,suburb.ilike.%${clean}%,postcode.ilike.%${clean}%`,
      );
    }
  }

  const { data, error } = await query.order("created_at", { ascending: false }).limit(500);
  if (error) throw error;
  return { leads: data ?? [] };
}

async function getLeadDetail(ctx: AdminContext, id: string) {
  const { data, error } = await ctx.supabase
    .from("leads")
    .select("*,survey_responses(*),email_logs(*),lead_activities(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Lead not found.");

  data.survey_responses = [...(data.survey_responses ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
  data.email_logs = [...(data.email_logs ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at));
  data.lead_activities = [...(data.lead_activities ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at));
  return { lead: data };
}

async function getAnalytics(ctx: AdminContext) {
  const { data: leads, error } = await ctx.supabase
    .from("leads")
    .select("created_at,status,priority,source,utm_source,utm_campaign,package_sent_at,package_clicked_at");
  if (error) throw error;

  return { analytics: buildAnalytics(leads ?? []) };
}

async function getSettings(ctx: AdminContext) {
  const { data, error } = await ctx.supabase.from("site_settings").select("*").order("key");
  if (error) throw error;
  return { settings: data ?? [], role: ctx.role };
}

async function getHealth(ctx: AdminContext) {
  const env = Deno.env.toObject();
  const settings = await getSettingsMap(ctx);

  const [latestLead, latestEmail, emailStats, latestActivity, sheetActivity] = await Promise.all([
    ctx.supabase.from("leads").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ctx.supabase.from("email_logs").select("sent_at,status").eq("status", "sent").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ctx.supabase.from("email_logs").select("status").in("status", ["sent", "failed"]).limit(1000),
    ctx.supabase.from("lead_activities").select("created_at,activity_type").in("activity_type", ["sheet_sync_success", "sheet_sync_failed"]).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ctx.supabase.from("lead_activities").select("activity_type").in("activity_type", ["sheet_sync_failed"]).limit(1000),
  ]);

  const emailRows = emailStats.data ?? [];
  const failedEmailCount = emailRows.filter((e) => e.status === "failed").length;
  const sentEmailCount = emailRows.filter((e) => e.status === "sent").length;

  const sheetActivities = sheetActivity.data?.filter((a) => a.activity_type === "sheet_sync_failed") ?? [];
  const lastSheetSync = latestActivity.data?.activity_type === "sheet_sync_success" ? latestActivity.data.created_at : null;

  const analyticsConfigured = Boolean(env.VITE_POSTHOG_KEY);

  return {
    website: { status: "healthy" as const },
    database: { status: "healthy" as const },
    email: {
      status: (Deno.env.get("RESEND_API_KEY") && Deno.env.get("FROM_EMAIL")) ? ("healthy" as const) : ("needs_attention" as const),
      lastSuccessfulSend: latestEmail.data?.sent_at ?? null,
      failedCount: failedEmailCount,
      sentCount: sentEmailCount,
    },
    googleSheets: {
      status: getSheetConfig(env, settings) ? ("healthy" as const) : ("needs_attention" as const),
      lastSync: lastSheetSync,
      failedSyncCount: sheetActivities.length,
    },
    analytics: {
      status: analyticsConfigured ? ("healthy" as const) : ("not_configured" as const),
    },
    lastLeadSubmitted: latestLead.data?.created_at ?? null,
    checks: [
      { name: "Admin session", ok: true, message: "Signed in as an approved admin." },
      { name: "Supabase database", ok: true, message: "Admin API can query Supabase." },
      { name: "Resend API key", ok: Boolean(Deno.env.get("RESEND_API_KEY")), message: envMessage("RESEND_API_KEY") },
      { name: "Sender email", ok: Boolean(Deno.env.get("FROM_EMAIL")), message: envMessage("FROM_EMAIL") },
      { name: "Package link", ok: Boolean(Deno.env.get("PACKAGE_URL")), message: envMessage("PACKAGE_URL", "Can also be supplied by site_settings.package_url.") },
      { name: "Google Sheets mirror", ok: Boolean(getSheetConfig(env, settings)), message: getSheetConfig(env, settings) ? "Configured." : "Not configured. Leads will not be mirrored to Google Sheets." },
    ],
  };
}

async function logLeadAction(ctx: AdminContext, body: Record<string, unknown>) {
  assertRole(ctx, writeRoles);
  const leadId = stringBody(body, "lead_id");
  const activityType = stringBody(body, "activity_type");
  const metadata = typeof body.metadata === "object" && body.metadata ? body.metadata : {};
  await insertActivity(ctx, leadId, activityType, metadata);
  return { ok: true };
}

async function markContacted(ctx: AdminContext, body: Record<string, unknown>) {
  assertRole(ctx, writeRoles);
  const leadId = stringBody(body, "lead_id");
  const { data, error } = await ctx.supabase
    .from("leads")
    .update({ status: "Contacted", last_contacted_at: new Date().toISOString() })
    .eq("id", leadId)
    .select("*")
    .single();
  if (error) throw error;
  await insertActivity(ctx, leadId, "status_changed", { to: "Contacted", reason: "Marked contacted from dashboard." });
  return { lead: data };
}

async function updateStatus(ctx: AdminContext, body: Record<string, unknown>) {
  assertRole(ctx, writeRoles);
  const leadId = stringBody(body, "lead_id");
  const status = stringBody(body, "status");
  const update: Record<string, string> = { status };
  if (status === "Contacted") update.last_contacted_at = new Date().toISOString();
  const { data, error } = await ctx.supabase.from("leads").update(update).eq("id", leadId).select("*").single();
  if (error) throw error;
  await insertActivity(ctx, leadId, "status_changed", { to: status });
  return { lead: data };
}

async function setFollowUp(ctx: AdminContext, body: Record<string, unknown>) {
  assertRole(ctx, writeRoles);
  const leadId = stringBody(body, "lead_id");
  const nextFollowUpAt = nullableString(body.next_follow_up_at);
  const { data, error } = await ctx.supabase
    .from("leads")
    .update({ next_follow_up_at: nextFollowUpAt })
    .eq("id", leadId)
    .select("*")
    .single();
  if (error) throw error;
  await insertActivity(ctx, leadId, "followup_date_set", { next_follow_up_at: nextFollowUpAt });
  return { lead: data };
}

async function addNote(ctx: AdminContext, body: Record<string, unknown>) {
  assertRole(ctx, writeRoles);
  const leadId = stringBody(body, "lead_id");
  const note = stringBody(body, "note").trim();
  if (!note) throw new Error("Note cannot be empty.");

  const { data: existing, error: readError } = await ctx.supabase.from("leads").select("notes").eq("id", leadId).single();
  if (readError) throw readError;

  const timestamped = `[${new Date().toISOString()}] ${note}`;
  const notes = existing.notes ? `${existing.notes}\n\n${timestamped}` : timestamped;
  const { data, error } = await ctx.supabase.from("leads").update({ notes }).eq("id", leadId).select("*").single();
  if (error) throw error;
  await insertActivity(ctx, leadId, "note_added", { note });
  return { lead: data };
}

async function resendPackage(ctx: AdminContext, body: Record<string, unknown>) {
  assertRole(ctx, writeRoles);
  const leadId = stringBody(body, "lead_id");
  const { data: lead, error: leadError } = await ctx.supabase.from("leads").select("*").eq("id", leadId).single();
  if (leadError) throw leadError;

  const settings = await getSettingsMap(ctx);
  const emailResult = await sendPackageEmail(lead, settings);
  const sentAt = emailResult.ok ? new Date().toISOString() : null;

  await ctx.supabase.from("email_logs").insert({
    lead_id: leadId,
    email_type: "how_to_join_package",
    recipient: lead.email,
    subject: emailResult.subject,
    status: emailResult.ok ? "sent" : "failed",
    provider_message_id: emailResult.providerMessageId,
    error_message: emailResult.errorMessage,
    sent_at: sentAt,
  });

  if (emailResult.ok) {
    await ctx.supabase.from("leads").update({ status: "Package Sent", package_sent_at: sentAt }).eq("id", leadId);
    await insertActivity(ctx, leadId, "package_resent", { provider_message_id: emailResult.providerMessageId });
    return { ok: true, message: "Package email resent." };
  }

  await insertActivity(ctx, leadId, "package_send_failed", { error_message: emailResult.errorMessage });
  return { ok: false, message: emailResult.errorMessage ?? "Package email failed." };
}

async function updateSettings(ctx: AdminContext, body: Record<string, unknown>) {
  assertRole(ctx, ownerRoles);
  const updates = Array.isArray(body.settings) ? body.settings : [];
  const errors: Array<{ key: string; error: string }> = [];

  for (const item of updates) {
    if (!item || typeof item !== "object") continue;
    const key = stringBody(item as Record<string, unknown>, "key");
    const value = (item as Record<string, unknown>).value;

    const validationError = validateSettingValue(key, value);
    if (validationError) {
      errors.push({ key, error: validationError });
      continue;
    }

    await ctx.supabase.from("site_settings").update({ value, updated_by: ctx.userId, updated_at: new Date().toISOString() }).eq("key", key);
  }

  if (errors.length > 0) {
    throw new Error(`Settings validation failed: ${errors.map((e) => `${e.key}: ${e.error}`).join("; ")}`);
  }

  return await getSettings(ctx);
}

function validateSettingValue(key: string, value: unknown): string | null {
  if (key === "popup_delay_seconds") {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 3600) {
      return "Must be a number between 0 and 3600.";
    }
  }
  if (key === "package_url") {
    const str = String(value ?? "");
    if (str && !str.startsWith("http://") && !str.startsWith("https://")) {
      return "Must start with http:// or https://";
    }
    if (str && str.length > 2000) {
      return "URL is too long.";
    }
  }
  if (key === "notification_email") {
    const str = String(value ?? "");
    if (str && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) {
      return "Must be a valid email address.";
    }
  }
  if (key === "popup_enabled") {
    if (typeof value !== "boolean") {
      return "Must be true or false.";
    }
  }
  return null;
}

async function syncSheets(ctx: AdminContext) {
  assertRole(ctx, writeRoles);
  const { data: leads, error } = await ctx.supabase
    .from("leads")
    .select("*")
    .or("sheet_synced_at.is.null,sheet_sync_status.eq.failed");

  if (error) throw error;

  const env = Deno.env.toObject();
  const settings = await getSettingsMap(ctx);
  let synced = 0;
  let failed = 0;
  const failures: Array<{ id: string; name: string; error: string }> = [];

  for (const lead of leads ?? []) {
    const result = await appendLeadToSheet(lead, env, settings);
    if (result.ok) {
      await ctx.supabase
        .from("leads")
        .update({ sheet_sync_status: "success", sheet_synced_at: new Date().toISOString() })
        .eq("id", lead.id);
      await insertActivity(ctx, lead.id, "sheet_sync_success", {});
      synced++;
    } else {
      await ctx.supabase
        .from("leads")
        .update({ sheet_sync_status: "failed" })
        .eq("id", lead.id);
      await insertActivity(ctx, lead.id, "sheet_sync_failed", { error: result.error });
      failures.push({ id: lead.id, name: lead.first_name, error: result.error });
      failed++;
    }
  }

  if (failed > 0) {
    sendAdminNotification({
      subject: `Sheet sync: ${failed} of ${(leads ?? []).length} leads failed`,
      html: buildNotificationHtml(
        `Batch sheet sync completed. ${synced} synced, ${failed} failed. First failure: ${failures[0]?.error ?? "Unknown"}`,
      ),
    });
  }

  return { synced, failed, failures, total: (leads ?? []).length };
}

async function csvExport(ctx: AdminContext) {
  const { data: leads, error } = await ctx.supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const headers = [
    "Created At", "Lead ID", "First Name", "Last Name", "Email", "Phone",
    "Suburb", "Postcode", "Age Range", "Interest Type", "Joining Timeline",
    "Preferred Contact", "Status", "Priority", "Consent Email", "Consent SMS",
    "Package Sent At", "Package Clicked At",
    "Source", "UTM Source", "UTM Medium", "UTM Campaign",
    "Next Follow-Up", "Last Contacted", "Notes",
    "Sheet Synced At", "Sheet Sync Status",
  ];

  const rows = (leads ?? []).map((lead) => [
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
    lead.consent_email ? "Yes" : "No",
    lead.consent_sms ? "Yes" : "No",
    lead.package_sent_at || "",
    lead.package_clicked_at || "",
    lead.source || "",
    lead.utm_source || "",
    lead.utm_medium || "",
    lead.utm_campaign || "",
    lead.next_follow_up_at || "",
    lead.last_contacted_at || "",
    (lead.notes || "").replace(/\n/g, " ").replace(/"/g, '""'),
    lead.sheet_synced_at || "",
    lead.sheet_sync_status || "not_synced",
  ]);

  const csv = [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => row.map(csvEscape).join(",")),
  ].join("\n");

  const filename = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

async function insertActivity(ctx: AdminContext, leadId: string, activityType: string, metadata: unknown) {
  const { error } = await ctx.supabase.from("lead_activities").insert({
    lead_id: leadId,
    actor_user_id: ctx.userId,
    activity_type: activityType,
    metadata,
  });
  if (error) throw error;
}

async function getSettingsMap(ctx: AdminContext) {
  const { data } = await ctx.supabase.from("site_settings").select("key,value");
  return Object.fromEntries((data ?? []).map((row) => [row.key, row.value]));
}

async function sendPackageEmail(lead: Record<string, string | null | boolean>, settings: Record<string, unknown>) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("FROM_EMAIL");
  const replyTo = Deno.env.get("REPLY_TO_EMAIL") ?? Deno.env.get("ADMIN_NOTIFICATION_EMAIL");
  const packageUrl = stringSetting(settings.package_url) ?? Deno.env.get("PACKAGE_URL");
  const subject = stringSetting(settings.email_subject) ?? "Your How to Join Package";

  if (!resendApiKey || !fromEmail || !packageUrl) {
    return {
      ok: false,
      subject,
      providerMessageId: null,
      errorMessage: "Email provider, sender, or package URL is not configured.",
    };
  }

  const firstName = String(lead.first_name ?? "there");
  const configuredBody =
    stringSetting(settings.email_body) ??
    "Thanks for your interest. Your How to Join Package is available here: {{package_url}}";
  const html = buildEmailHtml(firstName, configuredBody, packageUrl);

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
    return { ok: true, subject, providerMessageId: typeof body.id === "string" ? body.id : null, errorMessage: null };
  } catch {
    return { ok: false, subject, providerMessageId: null, errorMessage: "Resend request failed." };
  }
}

async function sendReferral(ctx: AdminContext, body: Record<string, unknown>) {
  assertRole(ctx, writeRoles);
  const leadId = stringBody(body, "lead_id");
  const { data: lead, error: leadError } = await ctx.supabase.from("leads").select("*").eq("id", leadId).single();
  if (leadError) throw leadError;

  await ctx.supabase
    .from("leads")
    .update({ status: "Referred to Official Process", referred_at: new Date().toISOString(), referred_by: ctx.userId })
    .eq("id", leadId);

  await insertActivity(ctx, leadId, "referral_sent", { referred_by: ctx.userId });

  const settings = await getSettingsMap(ctx);
  const configuredBody = stringSetting(settings.referral_email_body);
  if (configuredBody) {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("FROM_EMAIL");
    if (resendApiKey && fromEmail) {
      const firstName = String(lead.first_name ?? "there");
      const html = configuredBody
        .replaceAll("{{first_name}}", escapeHtml(firstName))
        .replaceAll("{{site_url}}", escapeHtml(Deno.env.get("SITE_URL") ?? ""));
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: fromEmail,
            to: [lead.email],
            subject: "Your referral to the official NSW RFS process",
            html: `<div style="font-family: Arial, sans-serif; color: #162033; line-height: 1.6;"><p>Hi ${escapeHtml(firstName)},</p><p>${html}</p></div>`,
          }),
        });
      } catch {
        // best-effort referral email
      }
    }
  }

  return { ok: true, message: "Lead referred to official process." };
}

function buildSummary(leads: Array<Record<string, string | null>>) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  return {
    newToday: leads.filter((lead) => lead.created_at?.startsWith(today)).length,
    needFollowUp: leads.filter((lead) => ["New", "Needs Follow-Up", "Warm Lead"].includes(String(lead.status))).length,
    overdueFollowUps: leads.filter((lead) => lead.next_follow_up_at && new Date(lead.next_follow_up_at) < now).length,
    packageEmailsSent: leads.filter((lead) => lead.package_sent_at).length,
    packageClicks: leads.filter((lead) => lead.package_clicked_at).length,
    conversionRate: leads.length ? Math.round((leads.filter((lead) => lead.status === "Joined").length / leads.length) * 100) : 0,
  };
}

function buildAnalytics(leads: Array<Record<string, string | null>>) {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  const today = now.toISOString().slice(0, 10);
  return {
    totalLeads: leads.length,
    leadsToday: leads.filter((lead) => lead.created_at?.startsWith(today)).length,
    leadsThisWeek: leads.filter((lead) => lead.created_at && new Date(lead.created_at) >= weekAgo).length,
    packageSentCount: leads.filter((lead) => lead.package_sent_at).length,
    packageClickCount: leads.filter((lead) => lead.package_clicked_at).length,
    statusCounts: countBy(leads, "status"),
    sourceCounts: countBy(leads, "source"),
    recentLeadTrend: trendByDay(leads),
  };
}

function trendByDay(leads: Array<Record<string, string | null>>) {
  const counts = new Map<string, number>();
  for (const lead of leads) {
    if (!lead.created_at) continue;
    const key = lead.created_at.slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, count]) => ({ date, count }));
}

function countBy(rows: Array<Record<string, string | null>>, field: string) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const key = row[field] || "Unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function cleanSearchTerm(value: string) {
  return value.replace(/[%,()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

function compareHotLeads(a: Record<string, string | null>, b: Record<string, string | null>) {
  const priority = priorityRank(b.priority) - priorityRank(a.priority);
  if (priority !== 0) return priority;
  const clicked = dateValue(b.package_clicked_at) - dateValue(a.package_clicked_at);
  if (clicked !== 0) return clicked;
  return dateValue(b.created_at) - dateValue(a.created_at);
}

function priorityRank(priority: string | null) {
  if (priority === "High") return 3;
  if (priority === "Medium") return 2;
  return 1;
}

function dateValue(value: string | null) {
  return value ? new Date(value).getTime() : 0;
}

function assertRole(ctx: AdminContext, allowed: readonly string[]) {
  if (!allowed.includes(ctx.role)) throw new Error("You do not have permission to do that.");
}

function requiredParam(url: URL, key: string) {
  const value = url.searchParams.get(key);
  if (!value) throw new Error(`Missing ${key}.`);
  return value;
}

function stringBody(body: Record<string, unknown>, key: string) {
  const value = body[key];
  if (typeof value !== "string" || !value.trim()) throw new Error(`Missing ${key}.`);
  return value.trim();
}

function nullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function envMessage(key: string, extra = "") {
  return Deno.env.get(key) ? "Configured." : `Missing ${key}. ${extra}`.trim();
}

function stringSetting(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function buildEmailHtml(firstName: string, configuredBody: string, packageUrl: string): string {
  const body = escapeHtml(configuredBody)
    .replaceAll("{{first_name}}", escapeHtml(firstName))
    .replaceAll("{{package_url}}", `<a href="${escapeHtml(packageUrl)}">Open the How to Join Package</a>`);
  return `
    <div style="font-family: Arial, sans-serif; color: #162033; line-height: 1.6;">
      <p>Hi ${escapeHtml(firstName)},</p>
      <p>${body}</p>
      <p>This guide helps you understand the joining process. Official joining steps are completed through NSW RFS channels.</p>
      <p><a href="${escapeHtml(packageUrl)}" style="display:inline-block;background:#f5c400;color:#162033;padding:12px 18px;text-decoration:none;font-weight:700;border-radius:6px;">Get the How to Join Package</a></p>
    </div>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
