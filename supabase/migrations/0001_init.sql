-- AI-Mind initial schema
-- Apply with: supabase db push
-- Region: EU (eu-central-1) — set in Supabase dashboard before applying

create extension if not exists "uuid-ossp";
create extension if not exists vector;

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles: 1:1 with auth.users, holds non-PII preferences
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    display_name text,
    locale text default 'it' not null,
    onboarding_completed_at timestamptz,
    phq9_lite_score smallint,
    crisis_flag boolean default false not null,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

alter table profiles enable row level security;

create policy "profile_self_select" on profiles for select using (auth.uid() = id);
create policy "profile_self_update" on profiles for update using (auth.uid() = id);
create policy "profile_self_insert" on profiles for insert with check (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────────────────────
-- sessions: one row per hypnosis session
-- ─────────────────────────────────────────────────────────────────────────────
create type session_status as enum ('active', 'completed', 'aborted', 'crisis_handoff');
create type session_goal as enum ('sleep', 'focus_recovery', 'layoff_resilience');

create table if not exists sessions (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references profiles(id) on delete cascade,
    goal session_goal not null,
    language text not null default 'it',
    duration_target_min smallint not null default 30,
    status session_status not null default 'active',
    started_at timestamptz default now() not null,
    ended_at timestamptz,
    trance_completion_rate real,  -- computed post-session
    metadata jsonb
);

create index sessions_user_id_started_at_idx on sessions (user_id, started_at desc);

alter table sessions enable row level security;
create policy "session_self_select" on sessions for select using (auth.uid() = user_id);
create policy "session_self_insert" on sessions for insert with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- session_phases: phase transition log
-- ─────────────────────────────────────────────────────────────────────────────
create type hypnotic_phase as enum (
    'induction', 'deepening', 'suggestion', 'integration', 'awakening'
);

create table if not exists session_phases (
    id bigserial primary key,
    session_id uuid not null references sessions(id) on delete cascade,
    from_phase hypnotic_phase,
    to_phase hypnotic_phase not null,
    transitioned_at timestamptz default now() not null,
    bpm_at_transition smallint
);

create index session_phases_session_id_idx on session_phases (session_id);

alter table session_phases enable row level security;
create policy "phase_self_select" on session_phases for select
    using (exists (select 1 from sessions s where s.id = session_phases.session_id and s.user_id = auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- utterances: text-only transcript + embeddings (NEVER raw audio)
-- ─────────────────────────────────────────────────────────────────────────────
create type utterance_role as enum ('user', 'assistant');

create table if not exists utterances (
    id bigserial primary key,
    session_id uuid not null references sessions(id) on delete cascade,
    user_id uuid not null references profiles(id) on delete cascade,
    role utterance_role not null,
    phase hypnotic_phase not null,
    text text not null,
    embedding vector(3072),
    created_at timestamptz default now() not null
);

create index utterances_session_id_idx on utterances (session_id);
create index utterances_user_id_idx on utterances (user_id);
-- HNSW index for KB semantic search; cosine distance for sentence-level similarity
create index utterances_embedding_hnsw on utterances using hnsw (embedding vector_cosine_ops);

alter table utterances enable row level security;
create policy "utterance_self_select" on utterances for select using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- biometric_samples: BPM + HRV proxy series
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists biometric_samples (
    id bigserial primary key,
    session_id uuid not null references sessions(id) on delete cascade,
    user_id uuid not null references profiles(id) on delete cascade,
    bpm smallint not null,
    hrv_proxy real,
    ts_ms bigint not null,
    created_at timestamptz default now() not null
);

create index biometric_samples_session_idx on biometric_samples (session_id, ts_ms);

alter table biometric_samples enable row level security;
create policy "biometric_self_select" on biometric_samples for select using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- knowledge_insights: post-session, per-user derived insights (Phase 3)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists knowledge_insights (
    id bigserial primary key,
    user_id uuid not null references profiles(id) on delete cascade,
    insight_type text not null,
    payload jsonb not null,
    generated_at timestamptz default now() not null
);

create index knowledge_insights_user_idx on knowledge_insights (user_id, generated_at desc);

alter table knowledge_insights enable row level security;
create policy "insight_self_select" on knowledge_insights for select using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- data_subject_requests: GDPR compliance audit log
-- ─────────────────────────────────────────────────────────────────────────────
create type dsr_kind as enum ('access', 'rectification', 'deletion', 'portability', 'objection');
create type dsr_status as enum ('received', 'processing', 'fulfilled', 'rejected');

create table if not exists data_subject_requests (
    id bigserial primary key,
    user_id uuid not null references profiles(id) on delete cascade,
    kind dsr_kind not null,
    status dsr_status not null default 'received',
    created_at timestamptz default now() not null,
    fulfilled_at timestamptz,
    notes text
);

create index dsr_user_idx on data_subject_requests (user_id, created_at desc);

alter table data_subject_requests enable row level security;
create policy "dsr_self_select" on data_subject_requests for select using (auth.uid() = user_id);
create policy "dsr_self_insert" on data_subject_requests for insert with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- updated_at trigger
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function set_updated_at() returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on profiles
    for each row execute function set_updated_at();
