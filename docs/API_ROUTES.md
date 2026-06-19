# API Routes And Server Actions

The current public funnel uses Supabase Edge Functions because this repository is a Vite/React frontend rather than a server-rendered app with local API routes.

Implemented functions:

- `GET /functions/v1/public-settings`
- `POST /functions/v1/submit-lead`
- `GET /functions/v1/admin?action=...`
- `POST /functions/v1/admin?action=...`

Function source lives under:

- `supabase/functions/public-settings/index.ts`
- `supabase/functions/submit-lead/index.ts`
- `supabase/functions/admin/index.ts`
- `supabase/functions/_shared/cors.ts`
- `supabase/functions/_shared/validation.ts`
- `supabase/functions/_shared/sheets.ts`

Public functions are configured with `verify_jwt = false` in `supabase/config.toml` so public visitors can use the funnel. The admin function also has `verify_jwt = false` because it manually verifies the Supabase Auth bearer token and checks `admin_users` before doing anything. None of these functions expose privileged keys to browser code. Server-side privileged work uses `SUPABASE_SERVICE_ROLE_KEY` inside the Edge Function runtime.

## Public Settings

`GET /functions/v1/public-settings`

Purpose: load safe public settings for the homepage and popup behavior.

Reads these `site_settings` keys server-side:

- `hero_headline`
- `hero_subheadline`
- `cta_text`
- `popup_enabled`
- `popup_delay_seconds`
- `popup_title`
- `popup_description`
- `success_message`

If the function is unavailable, the frontend falls back to safe default settings in `src/lib/recruitmentFunnel.ts`.

## Submit Lead

`POST /functions/v1/submit-lead`

Purpose: receive the public survey, validate it server-side, save lead data to Supabase, send the How to Join Package email, and log results.

Required request fields:

- `first_name`
- `email`
- `suburb`
- `postcode`
- `age_range`
- `interest_type`
- `joining_timeline`
- `preferred_contact_method`
- `consent_email`

Optional request fields:

- `last_name`
- `phone`
- `consent_sms`
- `source`
- `utm_source`
- `utm_medium`
- `utm_campaign`

Server behavior:

1. Validate request body and email shape.
2. Insert `leads` row with status `New`.
3. Calculate initial priority using simple non-AI logic.
4. Insert `survey_responses`.
5. Insert `lead_activities` row with `lead_created`.
6. Send package email through Resend if email consent and email settings are valid.
7. Insert `email_logs`.
8. On email success, update lead to `Package Sent` and set `package_sent_at`.
9. Log `package_sent` or `package_send_failed`.
10. Return a clear success or partial-success response.

Email failure does not discard the lead. The lead remains visible for follow-up and health checks.

## Frontend Client Utilities

The browser calls the functions through:

- `src/lib/funnelApi.ts`

Form validation, popup settings normalization, source/UTM mapping, and session repeat-prevention helpers live in:

- `src/lib/recruitmentFunnel.ts`

Analytics event hooks live in:

- `src/lib/analytics.ts`

The analytics wrapper is a no-op unless `window.posthog` is available.

Tracked event names:

- `popup_auto_opened`
- `popup_closed`
- `become_firefighter_clicked`
- `survey_started`
- `survey_submitted`
- `survey_submit_error`
- `package_email_sent`
- `package_email_failed`

## Admin Operations

`/admin`, `/admin/follow-ups`, `/admin/leads`, `/admin/leads/:id`, `/admin/analytics`, `/admin/settings`, and `/admin/health` are React routes. They call the protected admin Edge Function through `src/lib/adminApi.ts`.

`GET /functions/v1/admin?action=follow-ups`

Returns summary cards and the Follow-Up Queue. Queue logic includes new leads, needs follow-up, warm leads, due follow-up dates, failed email sends, and package clicks with no contact.

`GET /functions/v1/admin?action=leads`

Returns filtered leads. Supported query params:

- `search`
- `status`
- `priority`
- `interest_type`
- `package_clicked`

`GET /functions/v1/admin?action=lead-detail&id=<lead_id>`

Returns one lead with survey answers, email logs, notes, and activity timeline.

`GET /functions/v1/admin?action=analytics`

Returns database-backed metrics: total leads, leads today/week, package sends/clicks, status counts, source counts, and recent lead trend.

`GET /functions/v1/admin?action=settings`

Returns safe editable site settings and the current admin role. Owner role is required to save settings.

`GET /functions/v1/admin?action=health`

Returns plain-English checks for admin session, Supabase access, Resend key, sender email, package link, and Google Sheets configuration.

`POST /functions/v1/admin?action=log-action`

Logs manual contact actions such as `email_followup_opened`, `phone_call_clicked`, and `sms_clicked`.

`POST /functions/v1/admin?action=mark-contacted`

Sets the lead status to `Contacted`, updates `last_contacted_at`, and logs activity.

`POST /functions/v1/admin?action=update-status`

Changes lead status and logs activity.

`POST /functions/v1/admin?action=set-follow-up`

Updates `next_follow_up_at` and logs activity.

`POST /functions/v1/admin?action=add-note`

Appends a timestamped plain-text note to the lead and logs activity.

`POST /functions/v1/admin?action=resend-package`

Re-sends the How to Join Package email server-side through Resend, inserts an `email_logs` row, and logs `package_resent` or `package_send_failed`.

`POST /functions/v1/admin?action=update-settings`

Owner-only. Updates safe `site_settings` values. It must never accept API keys, database credentials, DNS settings, or deployment settings.

`POST /functions/v1/admin?action=sync-sheets`

Syncs leads with missing or failed sheet sync to Google Sheets. Re-syncs all leads where `sheet_synced_at` is null or `sheet_sync_status` is `failed`. Returns counts of synced, failed, and total leads processed.

`GET /functions/v1/admin?action=csv-export`

Returns all leads as a CSV file download with `Content-Disposition: attachment`. Includes all lead fields plus sheet sync status. Respects admin auth.

`POST /functions/v1/admin?action=sync-sheets`

Syncs all unsynced and previously-failed leads to Google Sheets. Operator or owner only. Returns `{ synced, failed, failures, total }`.

`GET /functions/v1/admin?action=csv-export`

Returns all leads as a downloadable CSV file. Includes all database columns including sheet sync status. Respects admin auth; no query filters.
