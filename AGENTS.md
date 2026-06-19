## Goal
- Safe self-service settings, expanded system health page, admin notifications, automation planning reference, and backlog Items 5–6 (high-priority alerts + referral workflow) for the JoinRFS admin dashboard.

## Constraints & Preferences
- Settings page must expose only safe business-level settings (13 keys locked by DB CHECK constraint), never API keys, credentials, or technical config.
- Health page must show green/yellow/red status indicators, last lead/email/sync timestamps, failure counts, and manual retry/export actions.
- Admin notifications are best-effort and must never block lead capture or other operations.
- Supabase remains the source of truth; Google Sheets is only a readable mirror.
- No secrets, stack traces, or internal errors exposed to non-technical admins.
- High-priority alert flag must prevent duplicate alerts; alert sent to admin notification address with `[HIGH]` subject tag and red banner.
- Referral step must always be manually triggered by an admin — never auto-referred.
- Automation reference document must be practical for a small nonprofit with limited technical resources — not tied to any single backlog item.

## Progress
### Done
- Full codebase review completed: all source files, Edge Functions, Supabase schema, docs, and env config inventoried.
- `supabase/functions/_shared/sheets.ts` — Google Sheets utility with JWT auth (via `npm:jose`), `appendLeadToSheet()`, and `ensureSheetHeaders()`.
- `supabase/functions/submit-lead/index.ts` — sheet sync after lead+email; updates `sheet_sync_status` + logs activities; never fails user-facing response.
- `supabase/functions/admin/index.ts` — `sync-sheets` (POST batch sync), `csv-export` (GET CSV download), `getHealth`, `updateSettings`, `send-referral` (POST).
- `supabase/functions/_shared/notifications.ts` — `sendAdminNotification()` best-effort Resend email; never throws; `buildSubject()` and `buildNotificationHtml()` with optional `priority: "High"` banner.
- `submit-lead/index.ts` — admin notifications for new lead, high-priority lead, package email failure, sheet sync failure; sets `high_priority_alert_sent` flag + logs activity.
- `admin/index.ts` — admin notification for batch sheet sync with failures.
- `src/lib/adminApi.ts` — `getAdminToken()`, `downloadCsv()`, `adminFunctionUrl()`.
- `src/lib/adminTypes.ts` — `HealthResponse`, `HealthStatus`, `AdminLead`, `AdminLeadDetail`, `adminStatuses`, `adminPriorities` types/exports.
- `src/pages/admin/Leads.tsx` — CSV export button with loading + toast.
- `src/pages/admin/Health.tsx` — green/yellow/red status cards, email/sheet failure counts, copy summary, troubleshooting guide button, manual sync tool.
- `src/pages/admin/LeadDetail.tsx` — sheet sync status + retry, "Refer to official process" button (shown for "Warm Lead" status).
- `src/pages/admin/Settings.tsx` — field helper text, client/server validation matching, email variable reference card, type="number"/"email" inputs.
- `docs/BACKLOG.md` — 12 future features with priority recommendations and V1 scope protection rules.
- `docs/FUTURE_AUTOMATION_OPTIONS.md` — scheduled jobs infrastructure comparison, SMS provider comparison (Twilio recommended), email evolution path, human-in-the-loop patterns, compliance (Australian Spam Act, Privacy Act), cost estimates for 100/1000 leads, operational runbook template, integration maturity model (Level 1–5), disclaimer.
- Docs updated: `.env.example`, `ENVIRONMENT_VARIABLES.md`, `API_ROUTES.md`, `OPERATOR_MANUAL.md`, `HANDOVER.md`, `TROUBLESHOOTING.md`, `SECURITY_AND_PRIVACY.md`.
- **Item 5 (High-Priority Lead Admin Alerts) implemented:**
  - `supabase/functions/_shared/notifications.ts`: `buildNotificationHtml()` accepts optional `priority: "High"` red banner; new `buildSubject()` prefixes `[HIGH]`.
  - `submit-lead/index.ts`: evaluates initial priority, uses `buildSubject`/`buildNotificationHtml` with priority tier, sets `high_priority_alert_sent` + `high_priority_alerted_at`, logs `high_priority_alert_sent` activity.
  - Migration `202606170001_high_priority_alerts.sql`: adds `high_priority_alert_sent` (boolean default false) + `high_priority_alerted_at` (timestamptz) to `leads`; adds `high_priority_alert_sent` to `lead_activities` activity_type CHECK.
- **Item 6 (Referral Workflow) implemented:**
  - Migration `202606170002_referral_workflow.sql`: adds `referred_at` (timestamptz) + `referred_by` (uuid FK admin_users) to `leads`; adds `referral_email_body` to `site_settings` CHECK constraint (now 13 keys); adds `referral_sent` to `lead_activities` activity_type CHECK.
  - `admin/index.ts`: `sendReferral()` function — sets status to "Referred to Official Process", sets `referred_at`/`referred_by`, logs `referral_sent` activity, sends best-effort referral email via Resend using `referral_email_body` template.
  - `LeadDetail.tsx`: "Refer to official process" button (uses `Send` icon from lucide-react), conditionally shown for "Warm Lead" status, calls `adminPost("send-referral", ...)`.
- Verification: `npx tsc --noEmit` pass (0 errors), `npm run lint` pass (0 errors, 7 pre-existing shadcn/ui warnings), `npm run build` pass.

### In Progress
- (none)

### Blocked
- (none)

## Key Decisions
- Use `npm:jose@5` in Deno Edge Functions for JWT signing (lightweight, pure JS, works in Deno) rather than heavier `google-auth-library`.
- Sheet append uses `USER_ENTERED` value input option (native date/number handling in Sheets).
- CSV export runs server-side in admin Edge Function, returns `Content-Type: text/csv`.
- Frontend CSV download uses `fetch` + `Blob` + `URL.createObjectURL` to pass Supabase auth session.
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` as primary env var names; private key handles both literal `\n` and escaped `\\n`.
- `getHealth` DB queries parallel (`Promise.all`); structured sections plus backward-compatible `checks` array.
- Admin notifications are fire-and-forget, no retry; silent no-op if `ADMIN_NOTIFICATION_EMAIL` unset.
- Settings validated both client-side and server-side; server rejects invalid values before persist.
- Automation: start with Edge Function + pg_cron; migrate to QStash/Inngest if retry complexity grows.
- SMS: Twilio recommended (best DX, Australian compliance tools, reliable opt-out).
- Never fully automate referral step — human must always confirm before official referral process.
- High-priority alerts use a duplicate-prevention flag so the same lead never triggers a second alert.
- Referral email (`referral_email_body`) is sent best-effort via Resend; never blocks the referral status update.
- V1 operates at Integration Maturity Level 1–2 (manual/assisted); backlog targets Level 3–4.

## Next Steps
1. Redeploy Edge Functions via `supabase functions deploy` after code changes.
2. Run new migrations on Supabase project.
3. Production test: verify sync-sheets, csv-export, high-priority alerts, and referral workflow on live Supabase project.
4. Monitor admin notification delivery via Resend logs.
5. When implementing backlog email/SMS features, refer to `FUTURE_AUTOMATION_OPTIONS.md` for provider/infra recommendations.
6. Complete compliance actions before any automation rollout: review consent checkboxes, add unsubscribe links, implement STOP keyword, add data retention policy, document data flows.

## Critical Context
- **Sheets env vars**: `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, `GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_SHEETS_LEADS_SHEET_NAME` (default "Leads"), `SITE_URL`.
- **Notification env vars**: `ADMIN_NOTIFICATION_EMAIL`, `RESEND_API_KEY`, `FROM_EMAIL`.
- `leads` table columns: `sheet_sync_status` (default 'not_synced'), `sheet_synced_at`, `high_priority_alert_sent` (boolean), `high_priority_alerted_at` (timestamptz), `referred_at` (timestamptz), `referred_by` (uuid FK admin_users).
- `lead_activities` activity types: `lead_created`, `package_sent`, `package_send_failed`, `package_clicked`, `sheet_sync_success`, `sheet_sync_failed`, `high_priority_alert_sent`, `referral_sent`, plus standard dashboard action types.
- `site_settings` CHECK constraint locks exactly 13 keys (12 original + `referral_email_body`).
- Admin Edge Function: `GET?action=...` and `POST?action=...` routing with manual auth enforcement.
- `getHealth` queries: last lead `created_at`, last email `sent_at`, email stats (last 1000), sheet sync activities.
- `syncSheets` queries leads where `sheet_synced_at IS NULL` OR `sheet_sync_status = 'failed'`.
- 49 shadcn/ui components, Vitest tests, `dist/` with pre-built static version.
- `FUTURE_AUTOMATION_OPTIONS.md` is a reference not a plan — use for informed decision-making when implementing backlog items.

## Relevant Files
- `supabase/functions/_shared/sheets.ts` — Google Sheets JWT auth utility
- `supabase/functions/_shared/notifications.ts` — Admin notification helper with `buildSubject`/`buildNotificationHtml` priority support
- `supabase/functions/_shared/validation.ts` — Shared validation + `calculatePriority`
- `supabase/functions/_shared/cors.ts` — CORS + jsonResponse
- `supabase/functions/submit-lead/index.ts` — Public lead submission with sheet sync + notifications + high-priority alert
- `supabase/functions/admin/index.ts` — Admin Edge Function (sync-sheets, csv-export, getHealth, updateSettings, send-referral)
- `supabase/migrations/202606120001_v1_recruitment_foundation.sql` — Full V1 schema
- `supabase/migrations/202606170001_high_priority_alerts.sql` — High-priority alert columns + activity type
- `supabase/migrations/202606170002_referral_workflow.sql` — Referral columns, site_settings key, activity type
- `src/lib/adminApi.ts` — Admin API client
- `src/lib/adminTypes.ts` — HealthResponse, HealthStatus, AdminLead, adminStatuses, adminPriorities types
- `src/pages/admin/Settings.tsx` — Self-service settings with validation
- `src/pages/admin/Health.tsx` — Health page with status cards + sync tool
- `src/pages/admin/Leads.tsx` — Leads table with CSV export
- `src/pages/admin/LeadDetail.tsx` — Lead detail with sync status, retry, referral button
- `docs/BACKLOG.md` — 12 backlog items with priorities and V1 rules
- `docs/FUTURE_AUTOMATION_OPTIONS.md` — Automation reference (scheduling, SMS, email, compliance, costs, maturity)
