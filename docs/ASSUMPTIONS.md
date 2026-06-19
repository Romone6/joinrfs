# Assumptions

These assumptions fill gaps until implementation confirms exact services and routes.

1. The current app remains a Vite/React frontend unless a later milestone chooses a backend-capable framework or separate API service.
2. Supabase is the canonical database and authentication service.
3. Resend is the transactional email provider for the How to Join Package.
4. Google Sheets is a readable mirror/export only, not a writable input.
5. PostHog is optional and should only be used if simple analytics are needed in V1.
6. Admin authentication will be backed by Supabase Auth with an `admin_users` or `profiles` table for roles.
7. All privileged operations will run server-side through API routes, server actions, edge functions, or equivalent backend code chosen in implementation.
8. V1 will prioritize the Follow-Up Queue over a broad CRM pipeline.
9. Automated SMS, two-way SMS, reminder sequences, AI summaries, and advanced reporting are backlog items, not V1.
10. The deployment provider is not finalized in these docs. Deployment instructions must be updated once selected.
11. The current public form still posts to a deployed Supabase Edge Function in `src/pages/Index.tsx`; this pass preserves that behavior and adds the new local schema/utilities for future replacement.
12. `supabase/config.toml` and the hard-coded Edge Function URL currently refer to different Supabase project identifiers. Confirm the production project before applying migrations.
