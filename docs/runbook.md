# Runbook

This file contains runnable PowerShell commands for the current documentation foundation milestone and future implementation checks.

## Documentation Foundation Check

From the repository root:

```powershell
$requiredDocs = @(
  "docs/PRODUCT_SPEC.md",
  "docs/OPERATOR_MANUAL.md",
  "docs/HANDOVER.md",
  "docs/DATA_MODEL.md",
  "docs/API_ROUTES.md",
  "docs/ENVIRONMENT_VARIABLES.md",
  "docs/BACKLOG.md",
  "docs/FUTURE_AUTOMATION_OPTIONS.md",
  "docs/TROUBLESHOOTING.md",
  "docs/SECURITY_AND_PRIVACY.md"
)

$missing = $requiredDocs | Where-Object { -not (Test-Path $_) }
if ($missing.Count -gt 0) {
  Write-Error "Missing docs: $($missing -join ', ')"
  exit 1
}

Write-Host "All required documentation files exist."
```

## Local App Checks

```powershell
npm test
npm run lint
npx tsc -b --noEmit
npm run build
```

## Admin Dashboard Smoke Check

Start the local app:

```powershell
npm run dev -- --host 127.0.0.1 --port 8080
```

Open the protected admin route:

```powershell
Start-Process "http://127.0.0.1:8080/admin"
```

Expected unauthenticated result: the Admin Login screen appears with an email field and "Send login link" button.

## Supabase Migration Check

After confirming the correct Supabase project, apply migrations using the Supabase CLI workflow chosen for the project. Do not run this against production until environment variables and project ids are verified.

```powershell
supabase db push
```

## Future Full Lead E2E Proof

After Supabase functions are deployed or locally served with real test credentials, add a full proof that submits a lead, confirms Supabase persistence, confirms package email logging, and confirms the admin dashboard shows the lead.

Example shape:

```powershell
npm run test:e2e
```
