# Operator Manual

This guide is for the non-technical operator using the JoinRFS admin dashboard.

## What The Dashboard Is For

Use the dashboard to answer five questions:

- Who needs follow-up?
- What do I know about them?
- How do I contact them?
- What has happened so far?
- What campaign or source is working?

Supabase stores the real data. Google Sheets is only a readable copy or export.

## How To Log In

1. Open `/admin` on the website.
2. Enter the approved admin email address.
3. Open the secure login link sent to that email.
4. If login fails, ask the maintainer to confirm the email exists in Supabase Auth and has an active `admin_users` row.

Do not share admin login links or passwords. Ask the maintainer to add or remove admin access.

## How To View The Follow-Up Queue

The Follow-Up Queue is the first screen after login.

Use it to see:

- New leads today.
- Leads due today.
- Leads overdue for follow-up.
- New leads that have not been contacted.
- Leads who clicked the package but have not been contacted.
- Failed package email sends that need manual follow-up.

Start at the top of the queue. The top leads should be the most urgent.

## How To View A Lead

1. Click View on a lead card or row.
2. Review the lead detail page.
3. Check contact details.
4. Read survey answers.
5. Read previous notes.
6. Check the activity history.
7. Check whether the How to Join Package email was sent.
8. Check the campaign or source.

## How To Email A Lead

1. Open the lead or use the Follow-Ups card.
2. Click Email.
3. Your email app should open with the lead's email address.
4. Send the email from the approved account.
5. Return to the dashboard.
6. Mark the lead as contacted.
7. Add a short note.
8. Set the next follow-up date if needed.

Clicking Email logs that the follow-up email draft was opened. It does not prove the email was sent.

## How To Call A Lead

1. Open the lead.
2. Click Call.
3. Use the phone prompt or copy the number.
4. After the call, update the lead status.
5. Add a note with the result.
6. Set the next follow-up date if needed.

## How To SMS A Lead

1. Open the lead.
2. Click SMS.
3. Your phone or messaging app should open if supported by the device.
4. Send the message manually.
5. Return to the dashboard.
6. Add a note.
7. Update the status or follow-up date.

V1 does not send automated SMS messages. SMS is a one-click helper for manual contact only.

## How To Mark A Lead As Contacted

1. Click Mark Contacted on the lead card, table row, or detail page.
2. The dashboard sets status to Contacted and records the time.
3. Add a note describing what happened.
4. Choose the next follow-up date or clear the follow-up date if no further action is needed.

## How To Set Follow-Up Dates

Use follow-up dates whenever a lead needs action later.

Examples:

- Call again tomorrow.
- Check back next week.
- Follow up after an information session.
- Wait until the recruit has spoken to family or work.

Choose a date that creates a clear future action. The lead should return to the Follow-Up Queue when that date arrives.

## How To Resend The Package

1. Open the lead.
2. Check that the email address is correct.
3. Click Resend Package.
4. Wait for the dashboard to show success or failure.
5. Add a note if the resend was requested by the lead.

If resend fails, check the System Health page or ask the maintainer to review email settings.

## What Happens When Someone Requests The Guide

1. The visitor clicks Become a Firefighter or sees the survey popup.
2. They complete the short survey.
3. The system saves their lead in Supabase.
4. The system stores their survey answers.
5. The system tries to send the How to Join Package email.
6. If the email sends, the lead status becomes Package Sent.
7. If the email fails, the lead is still saved and should be followed up manually.

The site is a guide/support funnel. It does not replace the official NSW RFS application process.

## How To Export Leads To CSV

1. Open the Leads page.
2. Click the Download icon button (Export CSV).
3. The CSV file downloads automatically.
4. Open it in Excel, Google Sheets, or any spreadsheet app.

## How To Sync Missing Leads To Google Sheets

1. Open the Health page.
2. Find the Tools card.
3. Click Sync missing leads to Google Sheets.
4. Wait for confirmation.
5. Check the linked spreadsheet for new rows.

The system automatically syncs new leads when they submit the form. Use the manual sync only for leads that were created before Sheets was configured or leads whose prior sync failed.

The spreadsheet is a readable mirror. Do not edit it expecting changes to flow back into the dashboard.

## How To Use The Health Page

The Health page at `/admin/health` shows the status of each system component:

- **Website** — green dot if the frontend is working.
- **Database** — green if Supabase is reachable.
- **Email** — shows how many emails have been sent and failed, plus the last successful send time.
- **Google Sheets** — shows failed sync count and last successful sync. Use the Retry sync button if needed.
- **Analytics** — shows whether PostHog is configured.
- **Recent activity** — shows when the last lead was submitted.

Use the **Copy summary** button to copy a plain-text diagnostic summary you can send to the maintainer.

Use the **Troubleshooting guide** button to open the troubleshooting documentation.

The green/yellow/red dots make it easy to spot problems at a glance. Anything yellow or red means the component needs attention.

## How To Update Safe Settings

Safe settings are simple text or link fields you can edit without code. Only owner-level admins can save changes.

Available settings:

- **Hero headline** — the main heading on the public homepage.
- **Hero subheadline** — the text below the main heading.
- **CTA text** — the button that opens the survey.
- **Popup enabled** — whether the survey popup shows automatically.
- **Popup delay seconds** — how long before the popup appears.
- **Popup title** — heading of the survey popup.
- **Popup description** — body text of the survey popup.
- **Package URL** — link to your How to Join PDF or page (shared in the welcome email).
- **Email subject** — subject line of the welcome email.
- **Email body** — body of the welcome email (supports variables listed below).
- **Success message** — text shown after someone submits the form.
- **Notification email** — optional address for admin alerts about new leads or failures.

To update:

1. Open the Settings page.
2. Edit the fields you want to change.
3. Click Save settings.
4. Check for a success toast confirmation.

The page also shows available email variables:

- `{{first_name}}` — replaced with the lead's first name.
- `{{package_link}}` — replaced with the package URL as a clickable link.
- `{{site_url}}` — replaced with the website URL.

Do not paste private API keys into the Settings page. They are not saved to the settings table and would be visible to the operator.

## What Each Status Means

| Status | Meaning | Operator action |
| --- | --- | --- |
| New | Lead submitted the form and has not been reviewed. | Review and contact. |
| Package Sent | The How to Join Package email was sent. | Follow up if the lead is high intent or due. |
| Needs Follow-Up | The lead needs manual contact. | Contact and set the next date. |
| Contacted | The operator has emailed, called, or messaged the lead. | Add notes and set next follow-up. |
| Warm Lead | The lead looks interested and should be nurtured. | Prioritise follow-up. |
| Referred to Official Process | The lead has been pointed to official NSW RFS next steps. | Follow up only if useful. |
| Applied | The lead says they have applied. | Track outcome and support if asked. |
| Joined | The lead has joined or completed the intended next step. | No routine follow-up needed. |
| Not Interested | The lead has said they do not want to continue. | Do not contact unless they ask again. |
| Bad Lead | Contact details are unusable or the submission is not genuine. | Stop follow-up unless details are fixed. |

## What To Do If Something Looks Broken

Use the System Health page first.

Common issues:

- New leads are not appearing: ask the maintainer to check form submission and Supabase.
- Emails are not sending: ask the maintainer to check Resend and email logs.
- Google Sheets is stale: run sync again or ask the maintainer to check credentials.
- Login does not work: ask the maintainer to confirm admin access.
- Package link is broken: check Settings or ask the maintainer to update the package URL.

If in doubt, write down:

- What you clicked.
- What you expected.
- What happened instead.
- The lead name or email, if relevant.
- The time it happened.
