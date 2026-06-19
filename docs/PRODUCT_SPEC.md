# JoinRFS Product Spec

## What The Product Is

JoinRFS is a custom recruitment funnel and operator dashboard for joinrfs.com.au.

The public website helps a prospective Rural Fire Service recruit understand the opportunity, click a clear "Become a Firefighter" call to action, complete a short survey, and receive a How to Join Package by email.

The admin dashboard helps a non-technical operator follow up with leads without needing to understand Supabase, email providers, analytics tools, or Google Sheets. The dashboard should turn the lead database into obvious daily actions.

Supabase is the source of truth. Google Sheets is only a readable mirror or export layer for the operator.

## Target Operator Profile

The primary operator is strong at:

- Marketing
- Partnerships
- Fundraising
- Community relationships
- Phone and email follow-up
- Campaign judgment

The operator is not expected to:

- Edit code
- Query databases
- Configure API keys
- Debug deployments
- Build reports manually
- Understand authentication internals

Every admin screen should hide technical complexity and answer practical questions:

- Who needs follow-up?
- What do I know about them?
- How do I contact them?
- What has happened so far?
- What campaign or source is working?

## Public User Flow

1. Visitor lands on joinrfs.com.au.
2. Visitor sees a clear Become a Firefighter CTA.
3. Visitor opens a popup survey.
4. Visitor answers a short 3-step survey.
5. Visitor submits contact details, interest details, preferred contact method, and consent.
6. `submit-lead` validates the request server-side.
7. System stores the lead and survey responses in Supabase.
8. System logs `lead_created`.
9. System sends the How to Join Package email through Resend when configured.
10. System records success or failure in `email_logs`.
11. System logs `package_sent` or `package_send_failed`.
12. Visitor sees a clear success or partial-success message.
13. Visitor uses the guide to understand official NSW RFS joining steps.

## Admin User Flow

1. Operator logs in to the admin dashboard.
2. Dashboard opens to the Follow-Up Queue by default.
3. Operator sees leads ordered by urgency and follow-up date.
4. Operator opens a lead detail page or drawer.
5. Operator reviews contact details, survey answers, notes, activity history, campaign source, and package email status.
6. Operator contacts the lead using one-click Email, Call, or SMS links.
7. Operator updates status manually.
8. Operator adds a note.
9. Operator sets the next follow-up date.
10. Operator can resend the How to Join Package if needed.
11. Operator reviews simple analytics to understand which campaigns and sources are working.
12. Operator exports or syncs a Google Sheets mirror for readable offline review.

## V1 Scope

V1 includes:

- Public website with Become a Firefighter CTA.
- Popup survey.
- Popup auto-open controlled by `site_settings.popup_enabled` and `site_settings.popup_delay_seconds`.
- Manual CTA popup opening.
- Lead capture into Supabase.
- Automated How to Join Package email.
- Email and activity logging.
- Custom admin dashboard.
- Follow-Up Queue as the default admin screen.
- Lead detail page or drawer.
- One-click Email, Call, and SMS links.
- Resend Package action.
- Manual status updates.
- Notes.
- Follow-up dates.
- Simple analytics.
- Google Sheets mirror or export.
- Settings page for safe content edits.
- System health page.
- Clean handover documentation.

## V1 Non-Goals

Do not build these in V1:

- Automated SMS follow-up.
- Two-way SMS.
- Email reminder sequences.
- Feedback emails asking why people did or did not continue.
- Referral or upgrade workflow.
- AI lead summaries.
- Advanced lead scoring.
- Partner or funder reporting.
- Application progress tracking.
- Advanced attribution.
- Partner portal.
- Full CRM pipeline.

## Backlog And Future Opportunities

The backlog is documented in [BACKLOG.md](./BACKLOG.md). Future automation paths are documented in [FUTURE_AUTOMATION_OPTIONS.md](./FUTURE_AUTOMATION_OPTIONS.md).

Future work should only start when V1 is working locally, deployed, documented, and useful to the operator. Backlog items should have a clear trigger, dependency check, and risk review before implementation.

## Design Philosophy

The dashboard should be direct, calm, and action-first.

Use plain labels:

- Follow up today
- Waiting
- Package sent
- Contacted
- Not interested
- Joined

Avoid technical labels:

- RPC
- Edge function
- Cron
- Service role
- Webhook
- RLS

For public visitors, the site must be clear that JoinRFS is a guide and support funnel, not the official application portal. Official joining steps are completed through NSW RFS channels.

For the operator, every screen should make the next action obvious. If a lead needs attention, the dashboard should say what to do next. If a system is broken, the dashboard should show a human-readable health message and the maintainer docs should explain the technical fix.

## Architecture Principle

Supabase owns the canonical data:

- Leads
- Survey responses
- Status
- Notes
- Activities
- Email logs
- Follow-up dates
- Settings
- Sync logs

Google Sheets must never become the writable source of truth in V1. Sheets exists so the operator can read, sort, share, and export data safely without affecting the application database.

## Implementation Boundary

This document defines the intended product. It does not claim these capabilities are already implemented. Future implementation work must update this document when scope changes.
