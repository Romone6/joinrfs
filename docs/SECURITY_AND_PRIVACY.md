# Security And Privacy

JoinRFS stores personal contact details and recruitment interest. Treat lead data as private operational data.

## Current Implementation

The V1 foundation adds:

- RLS on all V1 tables.
- `admin_users` role table.
- `public.is_admin()` helper for RLS policies.
- Server-only Supabase service-role client factory in `src/server/supabaseAdmin.ts`.
- Admin assertion helper in `src/server/recruitment/adminAuth.ts`.
- No public read policies for lead data.
- No direct public insert policy for lead data.

The current Vite frontend still calls an existing deployed Supabase Edge Function from `src/pages/Index.tsx`. Future work should replace or update that function to use the new schema and repository utilities.

## Service-Role Keys

`SUPABASE_SERVICE_ROLE_KEY` must only be used server-side.

Never place it in:

- Browser code.
- `VITE_` environment variables.
- README examples with real values.
- Screenshots.
- Client logs.
- Google Sheets.

The browser client uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

## Admin Route Protection

Future admin routes and functions must call `assertAdminUser`.

Required checks:

- User is authenticated.
- User exists in `admin_users`.
- `is_active` is true.
- Role is allowed for the operation.

Suggested permissions:

- `owner`: manage admins, settings, exports, and all lead operations.
- `operator`: manage leads, notes, statuses, follow-up dates, and resend actions.
- `readonly`: view leads and analytics only.

## Privileged Operations

These operations must run server-side:

- Lead creation if using service-role insert.
- Resend Package.
- Google Sheets sync.
- Export leads.
- Admin status updates when using elevated permissions.
- Admin management.
- Health checks that inspect secret-backed services.

Browser code may call protected routes, but it must not hold privileged keys.

## Self-Service Settings

The Settings page at `/admin/settings` allows owners to edit safe business-level settings. These are stored in the `site_settings` table with a database CHECK constraint that restricts allowed keys. The server-side `updateSettings` handler validates values before persisting:

- **Package URL**: must start with `http://` or `https://`, max 2000 characters.
- **Popup delay**: must be a finite number between 0 and 3600 seconds.
- **Notification email**: must match a basic email shape if provided.
- **Popup enabled**: must be boolean true or false.

Settings that are NOT exposed:

- API keys (Supabase, Resend, Google, PostHog).
- Database credentials.
- DNS or deployment configuration.
- Raw code or HTML.
- Authentication configuration.

The frontend Settings page only displays the 12 pre-configured `site_settings` keys. No mechanism exists to create new settings from the UI.

## Admin Notifications

When `ADMIN_NOTIFICATION_EMAIL` env var or `notification_email` site setting is configured, the system sends best-effort admin notifications via Resend for:

- New lead submission (includes priority level).
- High-priority lead arrival.
- Package email send failure.
- Google Sheets sync failure (both per-lead and batch).

Notifications are fire-and-forget. A missing, invalid, or misconfigured notification email address is silently ignored; it never blocks lead capture or other operations.

## Supabase Source Of Truth

Supabase is canonical for:

- Leads.
- Survey responses.
- Notes.
- Status.
- Follow-up dates.
- Email logs.
- Activity history.
- Settings.
- Sheet sync logs.

Google Sheets is only a mirror/export layer in V1. Do not import operator edits from Sheets into Supabase unless a future milestone explicitly designs conflict handling, permissions, and audit logs.

## Sensitive Data Minimization

Only collect data needed for recruitment follow-up.

Avoid collecting:

- Government identity documents.
- Detailed medical information.
- Financial information.
- Unnecessary date of birth.
- Unnecessary emergency details.
- Sensitive free-text questions unless clearly needed.

## Consent

Public forms should clearly explain:

- What the person will receive.
- That their details will be stored for follow-up.
- Whether they consent to email.
- Whether they consent to SMS if SMS is available.

Do not send automated SMS until SMS consent and opt-out handling are implemented.

## Future SMS Opt-Out Requirements

Before automated SMS:

- Store SMS consent timestamp.
- Store opt-out status.
- Support STOP or equivalent provider opt-out.
- Stop all automated SMS after opt-out.
- Log opt-out activity.
- Show opt-out state in the lead detail view.

## Safe Exports

Exports should:

- Require admin access.
- Include only fields needed by the operator.
- Exclude provider secrets and internal tokens.
- Avoid unnecessary sensitive notes when sharing externally.
- Be treated as private files once downloaded.

Partner or funder reports should use aggregate data unless explicit consent and data-sharing rules allow otherwise.

## Logging

Do log:

- Route or function name.
- Success or failure.
- Redacted provider error.
- Lead id when needed for debugging.

Do not log:

- API keys.
- Service-role keys.
- Full email contents.
- Full private keys.
- Unredacted provider tokens.
