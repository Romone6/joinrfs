alter table public.leads
add column if not exists high_priority_alert_sent boolean not null default false,
add column if not exists high_priority_alerted_at timestamptz;

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
    'high_priority_alert_sent'
  )
);
