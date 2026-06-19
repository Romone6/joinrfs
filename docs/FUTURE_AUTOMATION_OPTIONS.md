# Future Automation Options

This document describes automation opportunities that sit outside the core backlog. These are broader architectural decisions, tooling choices, and operational patterns that a future developer should consider before implementing backlog items.

This is not a plan. It is a reference for informed decision-making.

---

## Scheduled Job Infrastructure

Many backlog items (email sequences, SMS reminders, cleanup tasks) require scheduled execution. V1 has no cron or scheduled job system.

### Options

| Approach | Pros | Cons | Best for |
|---|---|---|---|
| **Supabase Database Cron** (`pg_cron` extension) | No new service. Runs inside Postgres. Simple for periodic SQL queries. | Limited to SQL. Cannot call external APIs directly. Debugging is harder. | Simple data cleanup, status recalculations. |
| **Supabase Edge Function + pg_cron** | Edge Function triggered by cron. Full HTTP/API access. Deno runtime. | Requires manual cron setup per environment. No built-in retry or observability. | Email sequences, SMS sends, sheet sync. |
| **QStash (Upstash)** | Built-in retry, scheduling, observability. HTTP-first. Simple API. Free tier available. | Another service dependency. Separate dashboard to monitor. | Production-grade email/SMS sequences with retry. |
| **Inngest** | Full workflow engine. Steps, retries, idempotency. Serverless-native. | Steep initial setup. Separate SDK and configuration. | Complex multi-step workflows (e.g., referral pipeline). |
| **Temporal** | Industry-grade durable execution. Handles years-long workflows. | Heavy operational overhead. Overkill for most backlog items. | Long-running workflows with human-in-the-loop. |

### Recommendation

Start with **Supabase Edge Function + pg_cron** for the email reminder sequence (item 3). The infra is already in place (Edge Functions exist). If retry complexity grows, migrate to **QStash** or **Inngest** without changing the business logic.

---

## SMS Provider Comparison

| Provider | Australian compliance | Cost per SMS | API quality | Opt-out handling | Verdict |
|---|---|---|---|---|---|
| **Twilio** | Yes. Full compliance tools. | ~$0.08–0.12 AUD | Excellent. Well-documented SDKs. | Built-in STOP keyword. | Best all-round choice. |
| **AWS SNS** | Yes. Requires manual compliance. | ~$0.02–0.08 AUD | Good. Simple API. | Must build opt-out handling. | Cheaper but more work. |
| **MessageBird (Bird)** | Yes. Good for AU. | ~$0.06–0.10 AUD | Good. Unified API for SMS/email. | Built-in opt-out. | Strong alternative to Twilio. |
| **Sinch** | Yes. AU coverage. | ~$0.05–0.09 AUD | Adequate. | Built-in opt-out. | Less developer-friendly. |

### Recommendation

**Twilio** for any SMS feature. It has the best developer experience, built-in Australian compliance tools, and the most reliable opt-out handling. The slight cost premium is worth avoiding compliance risk.

---

## Email Infrastructure Evolution

V1 uses **Resend** for transactional email. This is sufficient for V1 and V2.

### Future considerations

- **Resend suppression list** is already available — use it for unsubscribe handling before building a custom solution.
- **Resend broadcast/audience** feature could power email sequences without a custom cron system. Evaluate before building a custom scheduler.
- **Template management**: V1 stores email body in `site_settings`. For multi-email sequences, consider a dedicated `email_templates` table with subject, body, delay_days, trigger_condition, and exit_conditions.
- **Email analytics**: Track open rates and click rates via Resend's built-in tracking. Store `email_logs.provider_message_id` to link back to Resend events via webhook. Build a Resend webhook receiver Edge Function.

---

## Human-in-the-Loop Patterns

Several backlog items require operator confirmation before automation acts. These patterns are critical for safe automation.

### Confirmation patterns

| Pattern | Example | Implementation |
|---|---|---|
| **One-click confirm** | "Refer to official process" button | Button on lead detail page. Confirmation dialog. Server validates current status. |
| **Two-step with review** | Approve auto-generated AI summary | Operators sees summary, edits if needed, then confirms. Store both raw and edited versions. |
| **Batch confirm** | Approve 10 referrals at once | Multi-select on leads page. "Approve selected" action. Confirmation dialog with count. |
| **Silent auto with undo** | Auto-advance stage on package click | Advance happens immediately. Activity log includes undo link/button (limited window). |

### Rules for human-in-the-loop

1. **Never fully automate the referral step.** A human must always confirm before a lead is referred to the official process.
2. **Operator can always override automation.** Per-lead pause switches must exist before any sequence is enabled.
3. **All automated actions are reversible or logged.** Status changes can be reverted. Sends cannot be unsent but are logged.
4. **Operator is notified of automated actions.** A notification banner or email digest summarises what automation did today.

---

## Compliance and Legal Considerations

### Australian Spam Act 2003

- **Commercial electronic messages** (email and SMS) require consent.
- V1 collects `consent_email` and `consent_sms` — these satisfy the consent requirement only if the consent notice was clear.
- Every automated message must include an **unsubscribe mechanism**.
- **Sender identity** must be clearly identifiable.
- **Opt-out must be actioned within 5 working days** — ideally instantly.

### Privacy Act 1988 (Australian Privacy Principles)

- Personal information collected must be for a **lawful purpose** directly related to the function of the organisation.
- Individuals must be told **why their data is collected** and **who it will be shared with**.
- Data must be **secure** and **not kept longer than necessary**.
- **Anonymised reporting** is the safest approach for partner/funder reports.
- If using an AI LLM service for summaries, a **data processing agreement** with the provider and a **privacy impact assessment** are recommended.

### Key actions before any automation rollout

1. Review consent checkboxes on the public form — ensure they clearly describe future automation use.
2. Add an unsubscribe link to every automated email.
3. Implement STOP keyword handling before any SMS automation.
4. Add a data retention policy (e.g., delete leads after 12 months of inactivity).
5. Document data flows for any third-party service (Resend, Twilio, LLM provider).

---

## Cost Estimation Reference

| Feature | Estimated monthly cost (100 leads/month) | Estimated monthly cost (1000 leads/month) |
|---|---|---|
| Resend (transactional) | Free tier (100/day) | ~$20 USD |
| SMS (Twilio AU) | ~$10 AUD | ~$100 AUD |
| QStash scheduling | Free tier | ~$5 USD |
| LLM summaries (GPT-4o mini) | ~$1 USD | ~$10 USD |
| PostHog analytics | Free tier | Free tier (self-host) or ~$50 USD (cloud) |

These estimates are rough. Actual costs depend on message volume, SMS destination networks, and LLM token usage.

---

## Operational Runbook for Future Features

When a backlog feature is implemented, the following should be documented:

1. **What triggers it** (scheduled, event, operator action).
2. **What data it reads and writes** (tables, columns, external APIs).
3. **What can go wrong** (rate limits, auth expiry, provider outage, bad data).
4. **How to detect failure** (health check, error log, operator report).
5. **How to recover** (retry button, manual override, rollback query).
6. **How to disable** (feature flag, environment variable, per-lead pause).
7. **Who to notify** if it breaks.

Each feature should have a corresponding section in `docs/TROUBLESHOOTING.md` at implementation time.

---

## Integration Maturity Model

Track each integration's maturity level:

| Level | Description | Example |
|---|---|---|
| **1. Manual** | Operator does everything by hand. | V1 lead follow-up. |
| **2. Assisted** | System provides tools but operator initiates. | "Send referral email" button. |
| **3. Semi-automated** | System suggests, operator confirms. | AI summary with edit-before-save. |
| **4. Automated with oversight** | System acts, operator can undo. | Auto-stage-advance with undo button. |
| **5. Fully automated** | System acts independently. | Scheduled email sequence (with opt-out). |

V1 is at Level 1–2. Most backlog items target Level 3–4. Level 5 should be reserved for well-tested, low-risk sequences only.
