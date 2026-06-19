# Environment Variables

Use `.env` for local development and hosting-provider environment settings for production. Do not commit real secret values.

The current browser Supabase client reads:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

The new server-side utilities read:

- `SUPABASE_URL` or `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Required For Supabase

| Variable | Scope | Secret | Purpose |
| --- | --- | --- | --- |
| `VITE_SUPABASE_URL` | Browser | no | Supabase project URL used by the current client. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser | no | Supabase anon/publishable key used by the current client. |
| `SUPABASE_URL` | Server | no | Supabase project URL for server utilities. Falls back to `VITE_SUPABASE_URL` if omitted. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | yes | Privileged Supabase operations. Never expose to browser code. |

Do not prefix service-role keys with `VITE_`.

## Required For Email

| Variable | Scope | Secret | Purpose |
| --- | --- | --- | --- |
| `RESEND_API_KEY` | Server only | yes | Sends the How to Join Package email when email integration is implemented. |
| `PACKAGE_URL` | Server or `site_settings` | no, unless private | Link to the How to Join Package. |
| `ADMIN_NOTIFICATION_EMAIL` | Server or `site_settings` | no | Where admin notifications go if V1 sends them. |
| `FROM_EMAIL` | Server | no | Verified sender address for package emails. |
| `REPLY_TO_EMAIL` | Server | no | Optional reply-to address for package emails. Falls back to `ADMIN_NOTIFICATION_EMAIL`. |

## Required For Site Configuration

| Variable | Scope | Secret | Purpose |
| --- | --- | --- | --- |
| `SITE_URL` | Server and browser | no | Canonical site URL for links and redirects. |
| `ADMIN_BASE_URL` | Server | no | Admin dashboard base URL if different from public site. |

## Optional For Analytics

| Variable | Scope | Secret | Purpose |
| --- | --- | --- | --- |
| `VITE_POSTHOG_KEY` | Browser | no | PostHog project key if PostHog is used. |
| `VITE_POSTHOG_HOST` | Browser | no | PostHog host. |

Do not send sensitive lead notes or full personal details to analytics.

The frontend analytics wrapper is a no-op unless `window.posthog` is available. If PostHog is later installed, it can capture the existing funnel event names without rewriting the form.

## Optional For Google Sheets

| Variable | Scope | Secret | Purpose |
| --- | --- | --- | --- |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Server only | no | Spreadsheet used as readable mirror. |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Server only | no | Service account email with spreadsheet access. |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Server only | yes | Service account private key. |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | Server only | yes | Alternative full JSON credentials value. |
| `GOOGLE_SHEETS_LEADS_SHEET_NAME` | Server only | no | Sheet tab name within the spreadsheet (default `Leads`). |

Use one Google credential strategy unless implementation explicitly supports both.

## Example File

`.env.example` lists names only and must not contain real secrets.

## Security Rules

- Never expose `SUPABASE_SERVICE_ROLE_KEY` to browser code.
- Never expose `RESEND_API_KEY` to browser code.
- Never expose Google private keys to browser code.
- Redact tokens from logs.
- Use least privilege for service accounts.
