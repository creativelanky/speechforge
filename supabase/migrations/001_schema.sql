-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Profiles table
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  goal text not null default 'all' check (goal in ('interviews', 'speaking', 'conversations', 'all')),
  level text not null default 'beginner' check (level in ('beginner', 'intermediate', 'advanced')),
  voice_output boolean not null default true,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Scenarios table
create table if not exists scenarios (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('interview', 'speaking', 'conversation')),
  title text not null,
  context text not null,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  duration_minutes integer not null default 10,
  system_prompt text not null,
  created_at timestamptz not null default now()
);

-- Sessions table
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  scenario_id uuid references scenarios(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer,
  messages jsonb not null default '[]',
  overall_score integer,
  clarity_score integer,
  confidence_score integer,
  structure_score integer,
  engagement_score integer,
  strengths jsonb,
  improvements jsonb,
  summary text,
  created_at timestamptz not null default now()
);

-- RLS Policies

-- Profiles
alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- Scenarios (public read)
alter table scenarios enable row level security;

create policy "Anyone can read scenarios"
  on scenarios for select
  using (true);

-- Sessions
alter table sessions enable row level security;

create policy "Users can view own sessions"
  on sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert own sessions"
  on sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own sessions"
  on sessions for update
  using (auth.uid() = user_id);

-- Auto-update updated_at on profiles
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

-- Auto-create profile on user signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
