# Maintainer Handover

## System Overview

JoinRFS is intended to be a recruitment funnel and admin dashboard for joinrfs.com.au.

The V1 product captures public lead submissions, stores them in Supabase, sends a How to Join Package email, and gives a non-technical operator a dashboard for follow-up work.

Current repository shape:

- Vite
- React
- TypeScript
- Tailwind CSS
- shadcn-ui components
- Supabase client integration
- Supabase Edge Functions for public submission and admin operations

This handover describes the V1 architecture now in the repo. Google Sheets sync is implemented and documented in the remaining sections.

## Services Used

Expected V1 services:

- Supabase: source of truth for leads, survey responses, notes, activities, settings, and admin access.
- Resend: transactional email delivery for the How to Join Package.
- Google Sheets API: readable mirror or export for the operator.
- PostHog or equivalent analytics: simple website and funnel analytics, if selected.
- Hosting provider: likely Lovable/Vercel/static hosting depending on final deployment path.

Implemented server boundary:

- `supabase/functions/submit-lead`: public lead submission.
- `supabase/functions/public-settings`: safe homepage settings.
- `supabase/functions/admin`: protected admin dashboard operations.

## Where Data Lives

Canonical data lives in Supabase.

Use Supabase tables for:

- `leads`
- `survey_responses`
- `email_logs`
- `lead_activities`
- `admin_users` or `profiles`
- `site_settings`
- `sheet_sync_logs`

Google Sheets is not canonical. Do not build workflows where editing a spreadsheet updates production lead data in V1.

## Where Emails Are Sent From

V1 package emails should be sent server-side through Resend.

Expected behavior:

1. Lead submits the survey.
2. Backend validates input.
3. Backend inserts lead and survey response into Supabase.
4. Backend sends the How to Join Package email through Resend.
5. Backend records success or failure in `email_logs`.

Do not send package emails directly from client-side browser code. Resend API keys must stay server-only.

## Where Analytics Live

Simple analytics should answer:

- Number of leads submitted.
- Leads by campaign or source.
- Leads by status.
- Package send success rate.
- Follow-up workload.
- Conversion from submitted to contacted to joined, if tracked.

If PostHog is used, client-side keys may be public but write-only. Sensitive lead notes and full personal details should not be sent to analytics tools.

## How To Add Admins

Preferred V1 approach:

1. Add the admin user through Supabase Auth.
2. Add a matching row in `admin_users` or `profiles`.
3. Assign the least privilege role needed, usually `operator`.
4. Confirm the admin can log in at `/admin`.
5. Confirm non-admin users cannot access admin routes.

Admin roles should be simple:

- `owner`: can manage admins and settings.
- `operator`: can view and update leads.
- `readonly`: can view leads and analytics but cannot change lead state.

## How To Update Environment Variables

1. Read [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md).
2. Update local `.env` for development.
3. Update hosting provider environment variables for deployment.
4. Restart the dev server or redeploy.
5. Check the System Health page.

Never commit real secret values. Use `.env.example` for names only.

## How To Deploy

The exact deployment target must be confirmed during implementation.

Expected deployment checklist:

1. Install dependencies with `npm install`.
2. Run `npm run lint`.
3. Run `npm run build`.
4. Configure environment variables in the hosting provider.
5. Deploy Supabase migrations.
6. Deploy Supabase Edge Functions: `public-settings`, `submit-lead`, and `admin`.
7. Deploy the frontend.
8. Submit a test lead in production.
9. Confirm Supabase insert.
10. Confirm package email is sent.
11. Confirm `/admin` opens the Follow-Up Queue after login.
12. Confirm Google Sheets export or sync if enabled later.

## How To Debug Common Failures

Use [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for operator-facing and maintainer-facing checks.

General order:

1. Reproduce locally.
2. Check browser console.
3. Check Supabase Edge Function logs.
4. Check Supabase table rows and RLS policies.
5. Check Resend delivery logs.
6. Check Google Sheets credentials and spreadsheet permissions.
7. Check environment variables.
8. Check deployment logs.

## Handoff Checklist

Before handing the project to another maintainer:

- Public form submission works locally.
- Public form submission works in production.
- Supabase schema is committed or documented.
- RLS policies are documented and tested.
- Package email sends through Resend.
- Email success and failure are logged.
- Admin login works.
- Non-admin access is blocked.
- `/admin` opens the Follow-Up Queue, not raw analytics.
- Follow-Up Queue shows due and overdue leads.
- Lead detail view shows contact, survey, notes, and activity.
- Status updates work.
- Notes work.
- Follow-up dates work.
- Resend Package works.
- Simple analytics work.
- Google Sheets export or sync works (auto on submit, manual sync from Health page).
- Settings page only exposes safe fields (12 keys locked by DB CHECK constraint, validated server-side).
- System Health page shows green/yellow/red status for Website, Database, Email, Google Sheets, and Analytics.
- Copy diagnostic summary from Health page.
- Admin notifications fire for new leads, failed email sends, and failed sheet syncs.
- `.env.example` exists and contains no secrets.
- `docs/runbook.md` contains runnable PowerShell commands.
- README links to the documentation.
