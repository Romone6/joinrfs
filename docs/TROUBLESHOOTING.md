# Troubleshooting

Use this guide when something looks broken. Start with the System Health page when available, then check the relevant service.

## Form Submissions Failing

Symptoms:

- Visitor submits the survey and sees an error.
- No new lead appears in the dashboard.
- No new row appears in Supabase.

Checks:

1. Confirm required environment variables for Supabase are present.
2. Check browser console for validation or network errors.
3. Check Supabase Edge Function logs for `submit-lead`.
4. Confirm Supabase insert permissions or server-side service role usage.
5. Confirm required fields match the schema.
6. Confirm rate limiting is not blocking legitimate submissions.

Operator message:

"The form is not saving leads right now. Record the person's details manually and ask the maintainer to check submissions."

## Emails Not Sending

Symptoms:

- Lead is captured but package email is not received.
- `email_logs` shows failed status.
- Resend dashboard shows delivery failure.

Checks:

1. Confirm `RESEND_API_KEY` is configured server-side.
2. Confirm `FROM_EMAIL` is verified in Resend.
3. Confirm `PACKAGE_URL` or `site_settings.package_url` is set and reachable.
4. Check `email_logs.error_message` for a redacted failure reason.
5. Check Resend provider logs.
6. Try Resend Package from the lead detail page.

Operator message:

"The lead was saved, but the package email may not have sent. Use Resend Package after the maintainer confirms email is healthy."

## Health Page Shows Red Or Yellow

Symptoms:

- A component shows a red or yellow dot.
- Email shows "Needs attention" or a high failure count.
- Sheets shows "Needs attention" or failed syncs.

Checks:

1. Green dot = working normally.
2. Yellow dot = needs attention. Check the component's detailed section below.
3. Red dot = broken. Likely a configuration or credential issue.
4. Use the **Copy summary** button on the Health page to get a plain-text diagnostic.
5. Click the **Troubleshooting guide** button to open this document.

Operator message:

"Copy the diagnostic summary from the Health page and send it to the maintainer."

## Settings Save Fails

Symptoms:

- Save button does nothing.
- Error toast appears.
- Red validation message shows under a field.

Checks:

1. Read the field-level validation message — it explains what is wrong.
2. Package URL must start with `http://` or `https://`.
3. Popup delay must be a number between 0 and 3600.
4. Notification email must be a valid email address if provided.
5. Only owner-level admins can save settings.

Operator message:

"Write down the field name and the error message, then send it to the maintainer."

## Admin Notifications Not Arriving

Symptoms:

- No notification email after a new lead submits the form.
- No alert when an email or sheet sync fails.

Checks:

1. Confirm an email is set in the Notification email field on the Settings page.
2. Notifications are best-effort. If email or Sheets are not configured, notifications may not arrive.
3. Check Resend delivery logs if email is configured.

Operator message:

"Admin notifications are best-effort. Check the Notification email setting on the Settings page."

## Google Sheets Sync Failing

Symptoms:

- Google Sheet is stale.
- Sync action fails.
- `sheet_sync_logs` shows failed status.
- Lead detail shows "Failed" for sheet sync.

Checks:

1. Confirm Google Sheets env vars are configured (see Health page).
2. Confirm the spreadsheet is shared with the service account email.
3. Check provider errors for permission or quota failures.
4. Try the manual sync button on the Health page.
5. For a specific lead, use the Re-sync button on the lead detail page.

## CSV Export Failing

Symptoms:

- Clicking Export CSV does not download a file.
- Browser shows a network error.

Checks:

1. Confirm the admin session is still active.
2. Check browser console for errors.
3. Try refreshing the page and exporting again.

Operator message:

"The dashboard data is still the source of truth. The spreadsheet copy is stale until sync is fixed."

## Analytics Not Appearing

Symptoms:

- Analytics dashboard is blank.
- Campaign/source counts do not update.
- Events are missing from PostHog or the selected analytics tool.

Checks:

1. Confirm analytics provider was selected for V1.
2. Confirm `VITE_POSTHOG_KEY` and `VITE_POSTHOG_HOST` are configured if PostHog is used.
3. Confirm browser ad blockers are not blocking local testing.
4. Confirm lead source and campaign fields are being captured.
5. Confirm analytics does not depend on Google Sheets.

Operator message:

"Lead data is still safe in the dashboard. Analytics may be delayed or misconfigured."

## Admin Login Issues

Symptoms:

- Admin cannot log in.
- Admin logs in but sees an access denied page.
- Admin session expires repeatedly.
- `/admin` shows "Admin access blocked".

Checks:

1. Confirm the email exists in Supabase Auth.
2. Confirm the user id has an active `admin_users` row.
3. Confirm the role is correct.
4. Confirm browser cookies/local storage are not blocked.
5. Confirm deployed site URL is configured in Supabase Auth redirects if required.
6. Confirm the `admin` Edge Function is deployed.
7. Confirm non-admin users are still blocked.

Operator message:

"Ask the maintainer to confirm your admin account is active."

## Admin Actions Failing

Symptoms:

- Mark Contacted fails.
- Resend Package fails.
- Notes or follow-up dates do not save.
- The dashboard says "Admin request failed."

Checks:

1. Confirm the admin is still signed in.
2. Confirm the admin role is `owner` or `operator` for write actions.
3. Check Supabase Edge Function logs for `admin`.
4. Confirm `SUPABASE_SERVICE_ROLE_KEY` is configured server-side.
5. Confirm RLS policies and the `admin_users` row still exist.
6. For Resend Package, also check `RESEND_API_KEY`, `FROM_EMAIL`, and `PACKAGE_URL`.

Operator message:

"The lead is still saved. Write down the action you tried and ask the maintainer to check the admin function logs."

## Package Link Broken

Symptoms:

- Lead receives email but package link does not open.
- Resend Package succeeds but the link is wrong.

Checks:

1. Confirm `PACKAGE_URL` or `site_settings.package_url` is correct.
2. Open the link in a private browser window.
3. Confirm the file or page permissions allow public access if intended.
4. Send a test package email.

Operator message:

"Do not keep resending until the package link is fixed. Ask the maintainer to update the package URL."

## Popup Not Appearing

Symptoms:

- Survey popup does not auto-open.
- CTA still opens the popup manually.

Checks:

1. Confirm `site_settings.popup_enabled` is true.
2. Confirm `site_settings.popup_delay_seconds` is not too high.
3. Remember the popup will not auto-open repeatedly in the same browser session after it has been seen or dismissed.
4. Check `public-settings` Edge Function logs.
5. Confirm the CTA still opens the survey manually.

Operator message:

"The popup may have already been dismissed in this browser session. Use the Become a Firefighter button to open it manually."

## Environment Variable Missing

Symptoms:

- App works locally but not in production.
- Health check reports missing configuration.
- Backend route returns configuration error.

Checks:

1. Compare production variables against [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md).
2. Confirm server-only secrets are not prefixed with `VITE_`.
3. Restart the dev server after local changes.
4. Redeploy after production changes.
5. Never print secret values in logs.

Operator message:

"The system is missing configuration. The maintainer needs to update environment variables and redeploy."

## Deployment Failure

Symptoms:

- Build fails.
- Site does not update after deploy.
- Admin route returns errors only in production.

Checks:

1. Run `npm run lint`.
2. Run `npm run build`.
3. Check hosting provider build logs.
4. Confirm environment variables exist in the production project.
5. Confirm Node version is supported by the host.
6. Confirm Supabase and Resend settings point to the intended production services.

Operator message:

"The previous deployed version may still be live. The maintainer needs to review deployment logs."
