alter table public.site_settings
drop constraint if exists site_settings_key_check;

alter table public.site_settings
add constraint site_settings_key_check
check (
  key in (
    'hero_headline',
    'hero_subheadline',
    'cta_text',
    'popup_enabled',
    'popup_delay_seconds',
    'popup_title',
    'popup_description',
    'package_url',
    'email_subject',
    'email_body',
    'success_message',
    'notification_email',
    'referral_email_body',
    'google_sheets_spreadsheet_id',
    'google_service_account_email',
    'google_sheets_leads_sheet_name'
  )
);

insert into public.site_settings (key, value)
values
  ('google_sheets_spreadsheet_id', '""'::jsonb),
  ('google_service_account_email', '""'::jsonb),
  ('google_sheets_leads_sheet_name', '"Leads"'::jsonb)
on conflict (key) do nothing;
