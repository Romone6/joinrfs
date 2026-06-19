# Development Backlog

This document lists every identified future feature. Items are ordered by the priority recommendation at the bottom. Do not build these into V1 — they are documented here so a future developer or AI agent can pick them up without rediscovery.

---

## 1. Automated SMS Package Confirmation

| Field | Detail |
|---|---|
| **Status** | Backlog |
| **Priority** | Medium |
| **Reason** | SMS reaches people who do not regularly check email. A text confirming "your package is ready" reduces drop-off. |
| **User value** | Lead receives package link via their preferred channel. Operator handles fewer "I didn't get the email" callbacks. |
| **Trigger** | After package email is sent successfully (or as a standalone send for leads who opted into SMS but not email). |
| **Dependencies** | SMS provider integration (Twilio recommended), consent field usage, opt-out list, `phone` field reliability. |
| **Risks** | Cost per SMS adds up. Opt-out handling is legally required in Australia (Spam Act). Phone number typos cause failed sends and carrier charges. SMS without email consent must still respect email consent rules. |
| **V1 exclusion reason** | V1 avoids ongoing provider costs beyond Resend. SMS consent, opt-out storage, and compliance review are not implemented. The `phone` field is optional, so many leads would have no valid target. |
| **Suggested implementation path** | 1. Add SMS provider SDK (Twilio Verify or Messaging API). 2. Make SMS consent required on the form if SMS automation is planned. 3. Add `sms_opt_out` boolean and `sms_opt_out_at` timestamp to the `leads` table. 4. Add STOP keyword handler (webhook in a new Edge Function). 5. Create `notifications/send-sms` shared helper. 6. Wire into `submit-lead` after email send, only when SMS consent is true. 7. Log send result in `email_logs` (or a new `sms_logs` table). 8. Show SMS status in lead detail view. |
| **Acceptance criteria** | Lead with SMS consent receives package SMS within 30 seconds of submission. SMS failure does not block lead creation or email. STOP reply opts the lead out permanently. Opt-out status is visible in the dashboard. Operator can resend SMS from lead detail. |

---

## 2. Automated SMS Reminder Sequence

| Field | Detail |
|---|---|
| **Status** | Backlog |
| **Priority** | Medium |
| **Reason** | Package click-through rates drop sharply after day 1. A gentle SMS reminder brings leads back. |
| **User value** | Lead gets a nudge if they forgot. Operator converts more leads without extra manual work. |
| **Trigger** | Day 2 after package sent if `package_clicked_at` is null. |
| **Dependencies** | SMS provider, opt-out list, cron/scheduled Edge Function (or Supabase DB Cron), SMS consent flag. |
| **Risks** | Over-messaging annoys leads and increases opt-out. Daily frequency caps must be respected. Leads who already opted out must never receive reminders. Operators need an admin override to pause sequences for specific leads. |
| **V1 exclusion reason** | V1 has no scheduled job infrastructure. No SMS provider integration. No opt-out storage. No admin override UI. |
| **Suggested implementation path** | 1. Build on SMS Package Confirmation (item 1). 2. Create a scheduled Edge Function (Supabase Cron) that queries leads matching trigger conditions. 3. Define message templates in `site_settings` or a new `message_templates` table. 4. Add `sequence_paused` boolean to `leads` for admin override. 5. Log each reminder in `lead_activities`. 6. Add admin UI to pause/resume sequences per lead. 7. Hard limit: max 2 SMS reminders per lead per 7 days. |
| **Acceptance criteria** | Lead receives reminder SMS on day 2 if package not clicked. Lead who clicked package but has `last_contacted_at` > 5 days ago receives a check-in SMS. Opted-out leads never receive reminders. Admin can pause the sequence per lead. Activity log shows each reminder sent. |

---

## 3. Automated Email Reminder Sequence

| Field | Detail |
|---|---|
| **Status** | Backlog |
| **Priority** | High |
| **Reason** | A structured email sequence is the highest-impact automation for converting leads. Most leads who do not act need only a reminder. |
| **User value** | Lead receives timely, relevant emails. Operator does not need to manually check every unresponsive lead. |
| **Trigger** | Day 0: package email (already implemented in V1). Day 2: package not clicked. Day 5: package clicked but no follow-up recorded. Day 14: feedback request for all active leads. |
| **Dependencies** | Scheduled Edge Function or external cron (e.g., QStash, Inngest). Day-0 logic already exists in `submit-lead`. Template storage in `site_settings` or new table. Activity logging. |
| **Risks** | Existing V1 package email sends immediately on submit. Day 0 would need to be detached from the submit flow or kept as-is with the sequence starting from the submit timestamp. Unsubscribe handling for email is required (Resend supports suppression lists). Over-emailing leads who are already in active manual follow-up creates confusion. |
| **V1 exclusion reason** | V1 has no scheduled job infrastructure. The package email is sent synchronously in `submit-lead` — it already serves as Day 0. The sequence requires a cron-like system that V1 intentionally avoids. |
| **Suggested implementation path** | 1. Add a `last_sequence_email_at` timestamp and `sequence_paused` boolean to `leads`. 2. Create a scheduled Edge Function running daily (Supabase Cron or QStash). 3. Query leads where conditions match and `sequence_paused` is false. 4. Send email via Resend using settings from `site_settings`. 5. Log each send in `email_logs`. 6. Add exit conditions (see below). 7. Add admin UI toggle to pause/resume sequences per lead. |
| **Exit conditions** | Lead clicks package link. Lead is marked Contacted or later. Lead is marked Not Interested or Bad Lead. Lead unsubscribes (Resend suppression). Admin pauses sequence. Opt-out requested. |
| **Status changes** | Day 2 reminder sent → no status change. Day 5 check-in sent → no status change. Day 14 feedback sent → no status change. If lead responds with "stop contacting me" → status becomes Not Interested. |
| **Email templates** | Day 0: "Your How to Join Package" (already exists in `email_body` setting). Day 2: "Did you see this?" — short, friendly reminder. Day 5: "Ready to take the next step?" — ask if they have questions. Day 14: "We'd love your feedback" — link to short survey (see item 4). All templates should use `{{first_name}}` and `{{package_link}}` variables. |
| **Acceptance criteria** | Leads receive Day 2 reminder if package not clicked. Leads receive Day 5 follow-up if clicked but not contacted. Leads receive Day 14 feedback request. Sequence pauses on any contact, status change, or opt-out. Admin can pause per lead. All sends logged. |

---

## 4. Feedback Email: Why Did / Didn't They Continue?

| Field | Detail |
|---|---|
| **Status** | Backlog |
| **Priority** | High |
| **Reason** | Understanding why leads do not convert is essential for improving the funnel. Direct feedback is more reliable than inferred data. |
| **User value** | Operator learns what barriers exist. Future messaging can address common objections. Product and marketing teams get real user research. |
| **Trigger** | Day 14 after lead creation (part of email reminder sequence). Can also be triggered manually from the lead detail page. |
| **Dependencies** | Email sequence from item 3. A new `feedback_responses` table or extended `survey_responses`. A simple feedback form page (public, no auth required, keyed by lead ID). |
| **Risks** | Low response rates are normal. Feedback from unrepresentative samples can mislead decisions. Must not pressure leads who opted out. Responses containing personal data must be handled like any other lead data. |
| **V1 exclusion reason** | V1 has no scheduled email sequence. No feedback form page exists. No feedback data model exists. |
| **Suggested implementation path** | 1. Create `feedback_responses` table: `id`, `lead_id`, `submitted_at`, `reason` (text), `additional_comments` (text). 2. Create a public Edge Function `GET /functions/v1/feedback?lead_id=<id>` that returns a simple form. 3. In the feedback email, link to the form with the lead ID as a query parameter. 4. Store responses in `feedback_responses`. 5. Show feedback in the lead detail view under a "Feedback" section. 6. Add aggregate feedback analytics to the Analytics page. |
| **Suggested survey options** | Multiple choice (select one): "I've already applied through official channels", "I changed my mind about joining", "The timing isn't right but I'm still interested", "I didn't find the information I needed", "I decided the role isn't for me", "I'm pursuing a different emergency service role", "Other (please specify)". Follow-up: "Is there anything we could have done differently?" (free text). |
| **How responses update lead status** | "I've already applied" → mark as Applied. "I changed my mind" / "the role isn't for me" → mark as Not Interested. "Timing isn't right" → keep as Warm Lead, add note. "Didn't find the info" → keep as Needs Follow-Up, flag for operator review. |
| **How feedback appears in dashboard** | New "Feedback" tab or section on lead detail. Aggregate feedback counts on Analytics page (e.g., "12% said timing wasn't right"). |
| **How feedback informs product/marketing** | If "didn't find the information" is common → improve the How to Join Package. If "timing isn't right" is common → adjust messaging expectations. If "already applied" is common → the funnel is working as a top-of-funnel only. |
| **Acceptance criteria** | Feedback email sends on Day 14. Lead can submit feedback without logging in. Feedback appears in lead detail view. Aggregate feedback stats appear on Analytics page. Responses can trigger status changes. |

---

## 5. High-Priority Lead Admin Alerts

| Field | Detail |
|---|---|
| **Status** | Backlog (partially covered by V1 admin notifications) |
| **Priority** | High |
| **Reason** | High-intent leads (package clicked + phone provided + joining timeline soon) need faster follow-up. V1 admin notifications are basic. |
| **User value** | Operator is alerted immediately when a hot lead arrives. Faster response improves conversion. |
| **Trigger** | Lead submission where all three conditions are true: `package_clicked_at` is not null (or clicked within session), `phone` is not null, `joining_timeline` is "Immediately" or "Within 1 month". |
| **Dependencies** | Admin notification email (already partially implemented in V1 via `ADMIN_NOTIFICATION_EMAIL`). Potential SMS/push notification for future. Dashboard alert banner. Priority scoring logic. |
| **Risks** | Over-notifying desensitises the operator. False positives from accidentally clicked package links. Privacy: notification emails contain lead name but should not contain full contact details. |
| **V1 exclusion reason** | V1 admin notifications exist but are fire-and-forget. Dashboard alert infrastructure does not exist. Priority logic is simple (phone + timeline) and has not been validated against real data. |
| **Suggested implementation path** | 1. Enhance the existing `sendAdminNotification` in `_shared/notifications.ts` to include a priority level parameter. 2. Add a `high_priority_alert_sent` boolean to `leads` to prevent duplicate alerts. 3. In `submit-lead`, after lead creation, evaluate priority and call notification with urgent subject line. 4. Future: add a persistent dashboard alert bar (visible on all admin pages) that shows count of unconverted high-priority leads. 5. Future: add optional SMS alert via Twilio for owner-level admins. |
| **Acceptance criteria** | Owner receives email within 60 seconds of a high-priority lead submission. Email subject includes priority tag. Alert is not sent for routine leads. Dashboard shows high-priority lead count (future). Operator can configure which alert channels to use (future). |

---

## 6. Referral / Official Next-Step Workflow

| Field | Detail |
|---|---|
| **Status** | Backlog |
| **Priority** | Medium |
| **Reason** | Warm leads need clear guidance on how to proceed with the official NSW RFS application. This workflow formalises the hand-off from the recruitment funnel to the official process. |
| **User value** | Lead receives clear, official next steps. Operator has a structured workflow rather than a manual email copy-paste. Clear audit trail of who was referred and when. |
| **Trigger** | Operator marks lead as "Warm Lead" or clicks a "Refer to official process" button on the lead detail page. |
| **Dependencies** | A referral email template in `site_settings`. A new "Referred to Official Process" status (already exists in V1 status list but has no automated workflow). Activity logging. |
| **Risks** | Must not imply that JoinRFS is the official NSW RFS application portal. Wording must be carefully reviewed by NSW RFS stakeholders. Premature referral (before lead is actually warm) wastes the opportunity. |
| **V1 exclusion reason** | V1 lets the operator manually change status to "Referred to Official Process" and send a manual email. Automated referral requires a defined workflow, reviewed copy, and explicit stakeholder approval. |
| **Suggested implementation path** | 1. Create a `referral_email_body` setting in `site_settings`. 2. Add a "Refer to official process" button on the lead detail page (visible for owner/operator only when status is Warm Lead or later). 3. Button click: send referral email via Resend, update status to "Referred to Official Process", set `referred_at` timestamp, log activity. 4. Add `referred_at` and `referred_by` columns to `leads`. 5. Add a "Referred" filter to the Leads page. |
| **Important wording** | "Based on your interest, here are the official next steps to apply to the NSW RFS. JoinRFS is a community recruitment support tool, not the official RFS application portal. For the official application, visit the NSW RFS website directly." |
| **Activity logs** | `referral_sent` — when the referral email is sent. `referral_opened` — when the lead clicks the referral link (if tracked). |
| **Future metrics** | Referral-to-application conversion rate. Average time from lead capture to referral. Referral volume by source/campaign. |
| **Acceptance criteria** | Referral button appears only for warm leads. Referral email sends with approved wording. Status updates to "Referred to Official Process". Activity is logged. Referral is visible in lead timeline. |

---

## 7. Upgrade/Referral Automation Pipeline

| Field | Detail |
|---|---|
| **Status** | Backlog |
| **Priority** | Medium |
| **Reason** | "Upgrade/referral" in this context means moving a warm lead from general interest into the next official action pathway. This is the pipeline between JoinRFS and the NSW RFS application process. |
| **User value** | Operator has a clear pipeline definition with stages, triggers, and manual approval gates. The lead experience is consistent and professional. |
| **Pipeline stages** | 1. **Lead Captured** (V1) → 2. **Package Sent** (V1) → 3. **Package Clicked** (V1) → 4. **Contacted by Operator** (V1) → 5. **Warm Lead** (V1) → 6. **Manual Review Gate** (NEW — operator confirms readiness) → 7. **Referral Sent** (item 6) → 8. **Official Process Started** (lead reports they applied) → 9. **Joined** (V1) → 10. **Dropped Out** (V1 "Not Interested" / "Bad Lead"). |
| **Manual approval** | Before stage 7 (Referral Sent), the operator must explicitly confirm the lead is ready. Automation should never auto-refer. The approval is a single click with a confirmation dialog. |
| **Risks** | Auto-referral of unready leads creates a poor experience and wastes NSW RFS resources. Over-reliance on pipeline automation reduces human judgment. Pipeline stages must be clearly communicated to the operator — they should understand each stage's meaning and required action. |
| **V1 exclusion reason** | V1 has manual status management and no pipeline automation. The stages exist as statuses but have no automated transitions, gates, or triggers. Pipeline automation requires careful design with stakeholder input. |
| **Suggested implementation path** | 1. Document the pipeline stages in code as a configuration constant (similar to `adminStatuses`). 2. Add a `pipeline_stage` column to `leads` that mirrors `status` but is automation-aware. 3. Build the manual approval gate UI (confirmation modal on lead detail page). 4. Add automation rules for safe transitions (e.g., "Package Sent" → "Package Clicked" can be automated based on click tracking). 5. Never auto-advance past "Warm Lead" without operator action. |
| **Safety guards** | No automated transition past "Warm Lead". Operator confirmation required for "Referred to Official Process". Pipeline cannot skip stages. Rollback allowed (operator can move a lead back one stage with a reason). All transitions logged. |
| **Acceptance criteria** | Pipeline stages are documented and visible in the dashboard. Operator can advance leads through stages with single-click actions. Auto-advancement works only for safe transitions (package sent → clicked). Manual gate blocks auto-referral. All transitions are audited in activity logs. |

---

## 8. AI Lead Summaries

| Field | Detail |
|---|---|
| **Status** | Backlog |
| **Priority** | Low |
| **Reason** | Survey answers, notes, email logs, and activity history contain rich signal. An AI summary saves the operator reading time and can flag readiness or blockers. |
| **User value** | Operator sees a 2–3 sentence summary instead of scrolling through activity history. AI can detect readiness signals the operator might miss. |
| **Trigger** | On demand from the lead detail page (button: "Generate summary"). Could also auto-generate on lead creation (async background job). |
| **Dependencies** | LLM API access (OpenAI, Anthropic, or self-hosted). API key management. Prompt template in a shared config. Background job infrastructure for async generation. Token cost tracking. |
| **Risks** | LLM hallucinations about the lead's intent. Cost per summary (especially if auto-generated for every lead). Privacy: sending lead PII to a third-party LLM API requires data processing review. Inaccurate summaries could mislead the operator's decisions. |
| **V1 exclusion reason** | V1 intentionally avoids AI dependencies. LLM costs, latency, privacy review, and prompt maintenance add ongoing operational burden. The operator can read the survey answers and notes directly — AI summaries are a nice-to-have, not a necessity. |
| **Where summary appears in lead detail** | A new card at the top of the lead detail page, below the name/status bar and above "What We Know". Contains the summary text, a timestamp of when it was generated, and a "Regenerate" button. If not yet generated, show a "Generate summary" button instead. |
| **Suggested implementation path** | 1. Add an `ai_summary` text column and `ai_summary_generated_at` timestamp to `leads`. 2. Create an Edge Function `POST /functions/v1/ai/summarize-lead` that takes a lead ID, queries full lead data, calls LLM, stores result, returns summary. 3. Add "Generate summary" button to the lead detail page that calls the function. 4. Design the prompt to: extract key facts, flag readiness signals, flag blockers (e.g., no phone number, expressed hesitation), recommend next action. 5. Add token usage tracking. 6. Consider caching to avoid regenerating on page refresh. |
| **Data privacy** | Lead PII (name, email, phone, suburb) sent to the LLM API. This requires: data processing agreement with the LLM provider, clear privacy notice on the form ("your data may be processed by AI for summary purposes"), operator training that summaries may be inaccurate, ability for leads to request deletion of AI-generated content. |
| **Acceptance criteria** | Summary generates on demand within 5 seconds. Summary surfaces key facts, readiness signals, and blockers. Operator can regenerate. Summary is clearly marked as AI-generated. Token usage is tracked. Data processing agreement is in place with the LLM provider. |

---

## 9. Partner / Funder Reporting

| Field | Detail |
|---|---|
| **Status** | Backlog |
| **Priority** | Medium |
| **Reason** | Partners and funders need aggregate metrics to understand the funnel's impact. Manual report creation is error-prone and time-consuming. |
| **User value** | Operator generates professional reports in one click. Partners receive consistent data. Funders see clear ROI. |
| **Trigger** | Manual (operator clicks "Generate report"). Could be scheduled monthly (future). |
| **Dependencies** | PDF generation library (on server or client). Aggregation queries (most already exist in `getAnalytics`). Report template. Access control for partner-facing reports. |
| **Risks** | Reports must not contain personal contact details (names, email, phone, exact suburb). Aggregate counts under 5 should be suppressed to prevent re-identification. Partner access to reports must be controlled. Reports could be misinterpreted as official NSW RFS data if not clearly disclaimed. |
| **V1 exclusion reason** | V1 has no PDF generation, no report templates, and no partner access layer. The analytics page provides the raw data that would feed reports — that is sufficient for V1. |
| **Suggested implementation path** | 1. Define the report schema: date range, total leads, leads by source, package click rate, conversion rate, status distribution, suburb/council area counts (aggregate only). 2. Build a report-generation Edge Function that queries analytics and returns structured data. 3. Add a client-side PDF export using a library like jsPDF or a server-side HTML-to-PDF approach. 4. Design a report template with branding and a clear disclaimer: "JoinRFS is not the official NSW RFS application portal." 5. Add access control if reports are partner-facing. |
| **Metrics to include** | Total leads in period. Leads by source/campaign. Package email send rate. Package click rate. Status distribution (% in each status). Conversion rate (lead → joined). Average time from lead capture to referral. Council area / postcode breakdown (aggregate). Month-over-month trend. |
| **Explicit exclusions** | No names. No email addresses. No phone numbers. No exact addresses. No free-text notes. No individual-level data. |
| **Acceptance criteria** | Report generates in under 10 seconds. Report contains all required metrics. Report contains no personal data. Counts under 5 are suppressed. Report includes the required disclaimer. Report is downloadable as PDF. |

---

## 10. Application Progress Tracking

| Field | Detail |
|---|---|
| **Status** | Backlog |
| **Priority** | Medium |
| **Reason** | Knowing where each lead is in the full journey (from capture to joining) helps the operator prioritise and the organisation measure funnel health. |
| **User value** | Operator sees a clear progress bar or stage indicator per lead. Management sees pipeline velocity. Bottlenecks become visible. |
| **Stages** | 1. Lead Captured → 2. Package Sent → 3. Package Clicked → 4. Contacted → 5. Warm → 6. Referred → 7. Official Process Started → 8. Applied → 9. Joined → 10. Dropped Out. |
| **Manual vs automated updates** | Stages 1→2 automated (package email sent). Stage 2→3 automated (package link clicked, tracked). Stage 3→4 manual (operator marks contacted). Stage 4→5 manual (operator marks warm). Stage 5→6 manual with confirmation gate (item 7). Stage 6→7 manual (lead reports they started the official process, or automated via referral email tracking). Stage 7→8 manual (lead reports they applied). Stage 8→9 manual (operator confirms joining). Stage 9→10 manual or triggered by feedback response (item 4). |
| **V1 exclusion reason** | V1 has the status field but no progress tracking UI, no stage visualization, and no automated transition logic beyond package sent. Pipeline automation (item 7) is a prerequisite for meaningful progress tracking. |
| **Dashboard charts** | Funnel bar chart: number of leads at each stage. Stacked area chart: stage distribution over time. Average days in each stage. Drop-off rate between stages. All aggregate, no personal data. |
| **Suggested implementation path** | 1. Define the stage list as a shared constant (similar to `adminStatuses`). 2. Add a `pipeline_stage` column to `leads` that is kept in sync with `status` initially. 3. Build the progress bar component (horizontal, shows all stages, current stage highlighted, completed stages dimmed). 4. Add to lead detail page between the header and the card grid. 5. Build pipeline analytics queries (count by stage, time in stage, drop-off). 6. Add pipeline analytics tab or section. |
| **Acceptance criteria** | Each lead has a visible progress bar. Stages update automatically where possible. Manual transitions are one click. Pipeline analytics show counts by stage. Drop-off rates are calculated. All transitions logged. |

---

## 11. Advanced Analytics

| Field | Detail |
|---|---|
| **Status** | Backlog |
| **Priority** | Low |
| **Reason** | V1 analytics are basic (totals, counts by status/source, recent trend). Advanced analytics support campaign optimisation, geographic targeting, and funnel debugging. |
| **User value** | Marketing team understands which channels deliver quality leads (not just volume). Operator sees where leads drop off. Geographic trends inform recruitment event planning. |
| **Dependencies** | UTM parameter capture (already implemented in V1). QR code generation. Geographic mapping library. Funnel analysis queries. |
| **Risks** | Suburb/postcode data is personal information — heatmaps must use aggregate counts only. Over-analysis with small sample sizes leads to false conclusions. Attribution complexity (last-click vs multi-touch) needs careful design. |
| **V1 exclusion reason** | V1 captures UTM parameters and source fields. The analytics page shows basic counts. Advanced analytics (attribution, heatmaps, funnel analysis) require significant UI and query investment that V1 intentionally defers. |
| **Detailed attribution** | Distinguish between: direct visit, organic search, social media campaign, QR code scan, paid ad, referral link, email campaign. Each lead should have a single "primary source" (first touch) and a "last touch" source. Report: source quality score = conversion rate × lead volume × average priority. |
| **QR campaign tracking** | Generate unique QR codes per campaign/event. Each QR links to joinrfs.com.au?source=qr_campaign_name. Track campaign name in the `source` field. Report: scans per campaign, conversion rate per campaign, cost per lead if campaign has known cost. |
| **UTM links** | V1 already captures `utm_source`, `utm_medium`, `utm_campaign`. Future: validate UTM parameters on submission. Report: leads by UTM source/medium/campaign combination. Conversion rate by UTM group. |
| **Suburb/postcode heatmap** | Aggregate leads by postcode. Display on a map of the NSW RFS area. Colour-code by lead density. Must not display individual addresses. Useful for: identifying under-served areas, planning recruitment events, allocating recruitment resources. |
| **Funnel drop-off analysis** | Query: count of leads at each stage, filtered by date range. Compute: percentage lost between each stage. Display: funnel chart (symmetric bar chart). Allow filtering by source/campaign. Report: which stage has the highest drop-off. |
| **Source quality scoring** | Not just "Source X sent 100 leads" but "Source X sent 100 leads, 30 clicked the package, 15 were contacted, 5 joined." Quality score = (joined / total) × click rate × average priority. Display: source ranking by quality score. |
| **Acceptance criteria** | UTM parameters are validated and consistently formatted. Source quality report exists. Funnel drop-off chart is interactive (filterable by date/source). Postcode heatmap shows aggregate data only. QR campaign tracking is documented for marketing team use. No personal data appears in any analytics view. |

---

## 12. Future Partner Portal

| Field | Detail |
|---|---|
| **Status** | Backlog |
| **Priority** | Low |
| **Reason** | Partners (e.g., NSW RFS regions, community organisations, recruitment partners) want to see funnel health without accessing the full admin dashboard or seeing personal data. |
| **User value** | Partners get self-service access to aggregate stats. Operator does not need to manually prepare partner reports. Lead privacy is maintained. |
| **Dependencies** | Authentication system for partner accounts. Role-based access (partner role cannot view personal data). Partner reporting engine (item 9). Separate UI or subdomain. |
| **Risks** | Partner data access, even if aggregate, could be re-identified if partner sees "5 leads from postcode 2750" and knows individuals in that area. Partner accounts add authentication surface area. Partners may request access to personal data — the system must enforce the no-PII rule. |
| **V1 exclusion reason** | V1 serves a single operator. Partner access adds authentication, permissions, UI, and compliance complexity that is not needed for the core funnel. The operator can export aggregate reports and share them manually. |
| **Suggested implementation path** | 1. Add a `partner` role to `admin_users` (or a separate `partner_users` table). 2. Partner role can only access: aggregate analytics, partner reports, public settings. 3. Partner role cannot access: leads, lead detail, email logs, activity logs, notes, settings, health checks. 4. Build a minimal partner dashboard showing key metrics. 5. Add auto-generated monthly report delivery (email with PDF attachment). 6. Add a data-sharing agreement acknowledgement step on first login. |
| **Acceptance criteria** | Partner logs in and sees only aggregate data. Partner cannot access any lead's personal details. Partner can generate and download reports. Partner role is clearly documented. Data-sharing agreement is acknowledged before first access. |

---

## Backlog Priority Recommendation

### Near-term (next development cycle)

| Item | Why now |
|---|---|
| **3. Email reminder sequence** | Highest impact per development hour. Builds on existing email infrastructure. Directly increases lead conversion. |
| **4. Feedback email** | Provides qualitative data to improve the funnel. Low complexity if email sequence exists. |
| **5. High-priority alerts** | Partially built in V1 notifications. Small extension for dashboard visibility. |
| **6. Referral workflow** | Formalises the existing manual process. Low risk, high operator value. |

### Mid-term (next 6 months)

| Item | Why then |
|---|---|
| **1. SMS package confirmation** | Requires SMS provider contract and compliance review. Worth doing after email sequence is proven. |
| **2. SMS reminder sequence** | Depends on SMS confirmation (item 1). Adds retention value. |
| **7. Upgrade/referral automation** | Depends on referral workflow (item 6). Adds pipeline visibility. |
| **9. Partner reporting** | Useful once there are active partners asking for data. Operator can manage manually until then. |
| **10. Application progress tracking** | Depends on pipeline automation (item 7). Adds operator efficiency and management visibility. |

### Later (12+ months)

| Item | Why later |
|---|---|
| **8. AI summaries** | Requires LLM API costs, privacy review, and prompt maintenance. Operator can read survey answers directly. |
| **11. Advanced analytics** | Valuable but not critical for V2. Requires significant UI investment. Basic analytics already in V1. |
| **12. Partner portal** | Only needed when partner demand justifies the development cost. Manual reporting is sufficient for early partnerships. |

---

## V1 Scope Protection Rules

When implementing any backlog item, these rules must not be violated:

1. **Supabase remains the source of truth.** No external system can mutate lead data without going through Supabase.
2. **Failed automation must never block lead capture.** If SMS fails, the lead is still saved. If email sequence fails, the lead is still visible.
3. **Opt-out must always be respected.** Every automated communication channel must have an opt-out mechanism. Opt-out must be stored and checked before every send.
4. **No PII in analytics or partner views.** Aggregate data only. Counts under 5 must be suppressed.
5. **Operator override always wins.** Automated sequences can be paused per lead. Manual actions take precedence.
6. **Every automated action is logged.** All sends, transitions, and failures go to `lead_activities` or equivalent.
7. **No AI dependency in critical paths.** AI features are additive. The dashboard must work fully without AI.
8. **Disclaimers on referral/application language.** Never imply JoinRFS is the official NSW RFS application portal.
