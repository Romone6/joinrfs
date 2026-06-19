alter table public.leads
add column if not exists referred_at timestamptz,
add column if not exists referred_by uuid references public.admin_users(id) on delete set null;

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
    'referral_email_body'
  )
);

alter table public.lead_activities
drop constraint if exists lead_activities_activity_type_check;

alter table public.lead_activities
add constraint lead_activities_activity_type_check
check (
  activity_type in (
    'lead_created',
    'package_sent',
    'package_send_failed',
    'package_clicked',
    'email_followup_opened',
    'phone_call_clicked',
    'sms_clicked',
    'status_changed',
    'note_added',
    'followup_date_set',
    'package_resent',
    'sheet_sync_success',
    'sheet_sync_failed',
    'high_priority_alert_sent',
    'referral_sent'
  )
);
