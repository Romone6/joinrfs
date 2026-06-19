create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  id uuid primary key,
  created_at timestamptz not null default now(),
  email text not null unique,
  display_name text,
  role text not null default 'operator' check (role in ('owner', 'operator', 'readonly')),
  is_active boolean not null default true,
  last_login_at timestamptz
);

create or replace function public.is_admin(required_roles text[] default array['owner', 'operator', 'readonly'])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where id = auth.uid()
      and is_active = true
      and role = any(required_roles)
  );
$$;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  first_name text not null,
  last_name text,
  email text not null,
  phone text,
  suburb text,
  postcode text,
  age_range text,
  interest_type text,
  joining_timeline text,
  preferred_contact_method text,
  source text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  consent_email boolean not null default true,
  consent_sms boolean not null default false,
  package_sent_at timestamptz,
  package_clicked_at timestamptz,
  status text not null default 'New' check (
    status in (
      'New',
      'Package Sent',
      'Needs Follow-Up',
      'Contacted',
      'Warm Lead',
      'Referred to Official Process',
      'Applied',
      'Joined',
      'Not Interested',
      'Bad Lead'
    )
  ),
  priority text not null default 'Medium' check (priority in ('High', 'Medium', 'Low')),
  next_follow_up_at timestamptz,
  last_contacted_at timestamptz,
  notes text,
  sheet_synced_at timestamptz,
  sheet_sync_status text not null default 'not_synced' check (sheet_sync_status in ('not_synced', 'pending', 'success', 'failed'))
);

create table if not exists public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  created_at timestamptz not null default now(),
  question_key text not null,
  question_label text not null,
  answer text
);

create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete set null,
  created_at timestamptz not null default now(),
  email_type text not null,
  recipient text not null,
  subject text,
  status text not null check (status in ('queued', 'sent', 'failed', 'opened', 'clicked', 'bounced', 'complained')),
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz
);

create table if not exists public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  created_at timestamptz not null default now(),
  actor_user_id uuid references public.admin_users(id) on delete set null,
  activity_type text not null check (
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
      'sheet_sync_failed'
    )
  ),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.site_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (
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
      'notification_email'
    )
  ),
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.admin_users(id) on delete set null
);

create table if not exists public.sheet_sync_logs (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete set null,
  created_at timestamptz not null default now(),
  status text not null check (status in ('success', 'failed')),
  error_message text,
  metadata jsonb not null default '{}'::jsonb
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_leads_updated_at on public.leads;
create trigger set_leads_updated_at
before update on public.leads
for each row execute function public.set_updated_at();

create index if not exists leads_status_idx on public.leads(status);
create index if not exists leads_priority_idx on public.leads(priority);
create index if not exists leads_next_follow_up_at_idx on public.leads(next_follow_up_at);
create index if not exists leads_package_clicked_at_idx on public.leads(package_clicked_at);
create index if not exists leads_created_at_idx on public.leads(created_at desc);
create index if not exists leads_email_idx on public.leads(lower(email));
create index if not exists survey_responses_lead_id_idx on public.survey_responses(lead_id);
create index if not exists email_logs_lead_id_status_idx on public.email_logs(lead_id, status);
create index if not exists lead_activities_lead_id_created_at_idx on public.lead_activities(lead_id, created_at desc);
create index if not exists sheet_sync_logs_lead_id_created_at_idx on public.sheet_sync_logs(lead_id, created_at desc);

insert into public.site_settings (key, value)
values
  ('hero_headline', '"BE THE DIFFERENCE"'::jsonb),
  ('hero_subheadline', '"Join 70,000+ volunteers on the front line. Free training. Real impact. No experience needed."'::jsonb),
  ('cta_text', '"Become a Firefighter"'::jsonb),
  ('popup_enabled', 'true'::jsonb),
  ('popup_delay_seconds', '0'::jsonb),
  ('popup_title', '"Begin Your Journey"'::jsonb),
  ('popup_description', '"A few details, and we will guide you to the next step."'::jsonb),
  ('package_url', '""'::jsonb),
  ('email_subject', '"Your How to Join Package"'::jsonb),
  ('email_body', '"Thanks for your interest. Your How to Join Package is available here: {{package_url}}"'::jsonb),
  ('success_message', '"Thank you. Check your email for your next steps."'::jsonb),
  ('notification_email', '""'::jsonb)
on conflict (key) do nothing;

alter table public.admin_users enable row level security;
alter table public.leads enable row level security;
alter table public.survey_responses enable row level security;
alter table public.email_logs enable row level security;
alter table public.lead_activities enable row level security;
alter table public.site_settings enable row level security;
alter table public.sheet_sync_logs enable row level security;

drop policy if exists "admins_read_admin_users" on public.admin_users;
create policy "admins_read_admin_users"
on public.admin_users for select
to authenticated
using (id = auth.uid() or public.is_admin(array['owner']));

drop policy if exists "owners_manage_admin_users" on public.admin_users;
create policy "owners_manage_admin_users"
on public.admin_users for all
to authenticated
using (public.is_admin(array['owner']))
with check (public.is_admin(array['owner']));

drop policy if exists "admins_read_leads" on public.leads;
create policy "admins_read_leads"
on public.leads for select
to authenticated
using (public.is_admin(array['owner', 'operator', 'readonly']));

drop policy if exists "operators_insert_leads" on public.leads;
create policy "operators_insert_leads"
on public.leads for insert
to authenticated
with check (public.is_admin(array['owner', 'operator']));

drop policy if exists "operators_update_leads" on public.leads;
create policy "operators_update_leads"
on public.leads for update
to authenticated
using (public.is_admin(array['owner', 'operator']))
with check (public.is_admin(array['owner', 'operator']));

drop policy if exists "admins_read_survey_responses" on public.survey_responses;
create policy "admins_read_survey_responses"
on public.survey_responses for select
to authenticated
using (public.is_admin(array['owner', 'operator', 'readonly']));

drop policy if exists "operators_insert_survey_responses" on public.survey_responses;
create policy "operators_insert_survey_responses"
on public.survey_responses for insert
to authenticated
with check (public.is_admin(array['owner', 'operator']));

drop policy if exists "admins_read_email_logs" on public.email_logs;
create policy "admins_read_email_logs"
on public.email_logs for select
to authenticated
using (public.is_admin(array['owner', 'operator', 'readonly']));

drop policy if exists "operators_insert_email_logs" on public.email_logs;
create policy "operators_insert_email_logs"
on public.email_logs for insert
to authenticated
with check (public.is_admin(array['owner', 'operator']));

drop policy if exists "admins_read_lead_activities" on public.lead_activities;
create policy "admins_read_lead_activities"
on public.lead_activities for select
to authenticated
using (public.is_admin(array['owner', 'operator', 'readonly']));

drop policy if exists "operators_insert_lead_activities" on public.lead_activities;
create policy "operators_insert_lead_activities"
on public.lead_activities for insert
to authenticated
with check (public.is_admin(array['owner', 'operator']));

drop policy if exists "admins_read_site_settings" on public.site_settings;
create policy "admins_read_site_settings"
on public.site_settings for select
to authenticated
using (public.is_admin(array['owner', 'operator', 'readonly']));

drop policy if exists "owners_update_site_settings" on public.site_settings;
create policy "owners_update_site_settings"
on public.site_settings for update
to authenticated
using (public.is_admin(array['owner']))
with check (public.is_admin(array['owner']));

drop policy if exists "admins_read_sheet_sync_logs" on public.sheet_sync_logs;
create policy "admins_read_sheet_sync_logs"
on public.sheet_sync_logs for select
to authenticated
using (public.is_admin(array['owner', 'operator', 'readonly']));

drop policy if exists "operators_insert_sheet_sync_logs" on public.sheet_sync_logs;
create policy "operators_insert_sheet_sync_logs"
on public.sheet_sync_logs for insert
to authenticated
with check (public.is_admin(array['owner', 'operator']));
