-- ReleaseGate schema: releases, append-only evaluations and audit events.

create table public.releases (
  id uuid primary key default gen_random_uuid(),
  model_name text not null check (char_length(model_name) between 1 and 100),
  version text not null check (char_length(version) between 1 and 50),
  owner text not null check (char_length(owner) between 1 and 100),
  use_case text not null check (char_length(use_case) between 1 and 500),
  risk_tier text not null check (risk_tier in ('low', 'medium', 'high')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  decided_by text,
  decision_note text,
  decided_at timestamptz,
  approved_evaluation_id uuid,
  created_at timestamptz not null default clock_timestamp(),
  unique (model_name, version),
  constraint releases_decision_recorded
    check (status = 'pending' or (decided_by is not null and decided_at is not null)),
  constraint releases_approval_has_evaluation
    check (status <> 'approved' or approved_evaluation_id is not null)
);

create table public.evaluations (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.releases (id),
  quality_pass_rate numeric not null check (quality_pass_rate between 0 and 100),
  critical_safety_failures integer not null check (critical_safety_failures >= 0),
  p95_latency_ms integer not null check (p95_latency_ms >= 0),
  avg_cost_usd numeric not null check (avg_cost_usd >= 0),
  submitted_by text not null,
  policy_version text not null,
  passed boolean not null,
  checks jsonb not null,
  created_at timestamptz not null default clock_timestamp()
);

create index evaluations_release_latest on public.evaluations (release_id, created_at desc);

alter table public.releases
  add constraint releases_approved_evaluation_fk
  foreign key (approved_evaluation_id) references public.evaluations (id);

create table public.audit_events (
  id bigint generated always as identity primary key,
  release_id uuid not null references public.releases (id),
  action text not null check (
    action in ('release_created', 'evaluation_submitted', 'release_approved', 'release_rejected')
  ),
  actor text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default clock_timestamp()
);

create index audit_events_release on public.audit_events (release_id, id);

-- Evaluations and audit events are append-only.
create function public.forbid_mutation() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% is append-only', tg_table_name;
end;
$$;

create trigger evaluations_append_only
  before update or delete on public.evaluations
  for each row execute function public.forbid_mutation();

create trigger audit_events_append_only
  before update or delete on public.audit_events
  for each row execute function public.forbid_mutation();

-- The app connects server-side as the database owner. RLS with no policies
-- keeps these tables closed to Supabase's public Data API (anon/authenticated).
alter table public.releases enable row level security;
alter table public.evaluations enable row level security;
alter table public.audit_events enable row level security;
