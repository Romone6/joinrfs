import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { adminGet, adminPost } from "@/lib/adminApi";
import type { AdminSiteSetting } from "@/lib/adminTypes";
import type { Json } from "@/integrations/supabase/types";
import { Info } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const safeSettingLabels: Record<string, string> = {
  hero_headline: "Hero headline",
  hero_subheadline: "Hero subheadline",
  cta_text: "CTA text",
  popup_enabled: "Popup enabled",
  popup_delay_seconds: "Popup delay seconds",
  popup_title: "Popup title",
  popup_description: "Popup description",
  package_url: "Package URL",
  email_subject: "Email subject",
  email_body: "Email body",
  success_message: "Success message",
  notification_email: "Notification email",
  google_sheets_spreadsheet_id: "Spreadsheet ID",
  google_service_account_email: "Service account email",
  google_sheets_leads_sheet_name: "Sheet name",
};

const safeSettingHelpers: Record<string, string> = {
  hero_headline: "The main heading on the public homepage. Example: 'Join the NSW RFS'",
  hero_subheadline: "The subheading below the main headline. Appears on the homepage hero section.",
  cta_text: "The call-to-action button text. Example: 'Become a Firefighter'",
  popup_enabled: "Show the survey popup automatically after a delay.",
  popup_delay_seconds: "Seconds before the popup appears. 0 shows it immediately.",
  popup_title: "The popup heading. Keep it short and action-oriented.",
  popup_description: "The popup body text explaining what happens next.",
  package_url: "The link to your How to Join PDF, video, or page. Shared in the welcome email.",
  email_subject: "Subject line of the welcome email sent to new leads.",
  email_body: "Body of the welcome email. Supports variables: {{first_name}}, {{package_link}}, {{site_url}}",
  success_message: "Thank-you message shown after form submission.",
  notification_email: "Optional email address for admin alerts about new leads or failures. Leave blank if not needed.",
  google_sheets_spreadsheet_id: "The ID from your Google Sheet URL (e.g., '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74Qv'}).",
  google_service_account_email: "The email of the Google service account with editor access to the sheet.",
  google_sheets_leads_sheet_name: "The name of the tab inside the spreadsheet (default 'Leads').",
};

const SHEETS_KEYS = ["google_sheets_spreadsheet_id", "google_service_account_email", "google_sheets_leads_sheet_name"];

const EMAIL_VARIABLES = [
  { variable: "{{first_name}}", description: "Lead's first name" },
  { variable: "{{package_link}}", description: "Link to the How to Join Package" },
  { variable: "{{site_url}}", description: "The website URL" },
];

function validateSetting(key: string, value: unknown): string | null {
  if (key === "popup_delay_seconds") {
    const num = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(num) || num < 0 || num > 3600) return "Must be between 0 and 3600.";
  }
  if (key === "package_url") {
    const str = String(value ?? "");
    if (str && !str.startsWith("http://") && !str.startsWith("https://")) return "Must start with http:// or https://";
    if (str.length > 2000) return "URL is too long.";
  }
  if (key === "notification_email") {
    const str = String(value ?? "");
    if (str && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) return "Must be a valid email address.";
  }
  return null;
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<AdminSiteSetting[]>([]);
  const [role, setRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminGet<{ settings: AdminSiteSetting[]; role: string }>("settings");
      setSettings(data.settings);
      setRole(data.role);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function save() {
    setSaving(true);
    try {
      for (const s of settings) {
        const v = validateSetting(s.key, s.value);
        if (v) {
          toast({ title: "Validation error", description: `${safeSettingLabels[s.key] ?? s.key}: ${v}`, variant: "destructive" });
          setSaving(false);
          return;
        }
      }
      const data = await adminPost<{ settings: AdminSiteSetting[]; role: string }>("update-settings", { settings });
      setSettings(data.settings);
      setRole(data.role);
      toast({ title: "Settings saved" });
    } catch (e) {
      toast({ title: "Save failed", description: e instanceof Error ? e.message : "Could not save settings.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function updateSetting(id: string, value: Json) {
    setSettings((current) => current.map((item) => (item.id === id ? { ...item, value } : item)));
  }

  if (loading) return <Skeleton className="h-[600px] w-full" />;

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Settings unavailable</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const contentSettings = settings.filter((s) => !SHEETS_KEYS.includes(s.key));
  const sheetsSettings = settings.filter((s) => SHEETS_KEYS.includes(s.key));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-3xl tracking-wide">Settings</h2>
        <p className="text-muted-foreground">Safe content edits only. No API keys or technical settings appear here.</p>
      </div>

      {role !== "owner" && (
        <Alert>
          <AlertTitle>Read-only settings</AlertTitle>
          <AlertDescription>Only owner admins can save settings changes.</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl tracking-wide">Public funnel content</CardTitle>
          <CardDescription>These values control visible public copy and package email text.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          {contentSettings.map((setting) => (
            <SettingField
              key={setting.id}
              setting={setting}
              onChange={(value) => updateSetting(setting.id, value)}
            />
          ))}
          <Button disabled={role !== "owner" || saving} onClick={() => void save()}>
            {saving ? "Saving..." : "Save settings"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl tracking-wide">Google Sheets sync</CardTitle>
          <CardDescription>
            Connect a Google Sheet to mirror leads automatically. The private key must be set as a Supabase secret
            (<code className="text-xs">GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY</code>) via the Supabase dashboard or CLI &mdash;
            it is not stored here for security reasons.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          {sheetsSettings.map((setting) => (
            <SettingField
              key={setting.id}
              setting={setting}
              onChange={(value) => updateSetting(setting.id, value)}
            />
          ))}
          <Button disabled={role !== "owner" || saving} onClick={() => void save()}>
            {saving ? "Saving..." : "Save sheets config"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl tracking-wide">Email variables</CardTitle>
          <CardDescription>Use these placeholders in the email subject and body.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {EMAIL_VARIABLES.map(({ variable, description }) => (
            <div key={variable} className="rounded-md border bg-background/40 p-3">
              <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">{variable}</code>
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function SettingField({ setting, onChange }: { setting: AdminSiteSetting; onChange: (value: Json) => void }) {
  const label = safeSettingLabels[setting.key] ?? setting.key;
  const helper = safeSettingHelpers[setting.key];
  const validationError = validateSetting(setting.key, setting.value);

  if (typeof setting.value === "boolean") {
    return (
      <div className="flex items-center justify-between rounded-md border p-3">
        <div>
          <Label>{label}</Label>
          {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
        </div>
        <Switch checked={setting.value} onCheckedChange={onChange} />
      </div>
    );
  }

  if (setting.key === "email_body" || setting.key === "popup_description" || setting.key === "hero_subheadline") {
    return (
      <div className="flex flex-col gap-2">
        <Label htmlFor={setting.key}>{label}</Label>
        {helper && <p className="flex items-center gap-1 text-xs text-muted-foreground"><Info className="h-3 w-3" />{helper}</p>}
        <Textarea id={setting.key} value={String(setting.value ?? "")} onChange={(event) => onChange(event.target.value)} />
        {validationError && <p className="text-xs text-destructive">{validationError}</p>}
      </div>
    );
  }

  if (setting.key === "popup_delay_seconds") {
    return (
      <div className="flex flex-col gap-2">
        <Label htmlFor={setting.key}>{label}</Label>
        {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
        <Input
          id={setting.key}
          type="number"
          min={0}
          max={3600}
          value={String(setting.value ?? "0")}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        {validationError && <p className="text-xs text-destructive">{validationError}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={setting.key}>{label}</Label>
      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
      <Input
        id={setting.key}
        type={setting.key === "notification_email" ? "email" : "text"}
        value={String(setting.value ?? "")}
        onChange={(event) => onChange(event.target.value)}
      />
      {validationError && <p className="text-xs text-destructive">{validationError}</p>}
    </div>
  );
}
