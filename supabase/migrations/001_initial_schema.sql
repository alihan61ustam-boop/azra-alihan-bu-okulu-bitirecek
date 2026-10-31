-- ============================================================================
-- Azra&Alihan Bu Okulu Bitirecek — Supabase PostgreSQL + pgvector Schema
-- Automated Migration Script (001_initial_schema.sql)
-- ============================================================================

-- 1. Enable pgvector & UUID extensions
create extension if not exists "uuid-ossp";
create extension if not exists "vector";

-- 2. Courses Table (Isolated Physics & Academic Workspaces)
create table if not exists public.courses (
  id text primary key,
  code text not null,
  title text not null,
  professor text not null default '',
  semester text not null default 'Güz Dönemi',
  description text not null default '',
  syllabus text not null default '',
  icon_name text not null default 'Atom',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Multimodal Processed Lectures Table
create table if not exists public.lectures (
  id text primary key,
  course_id text not null references public.courses(id) on delete cascade,
  title text not null,
  recorded_date text not null default '',
  source_type text not null default 'video', -- 'video' | 'audio' | 'url' | 'sample'
  media_url text,
  media_mime_type text,
  duration_label text not null default '45:00',
  executive_summary text not null default '',
  timeline jsonb not null default '[]'::jsonb,
  whiteboard_extractions jsonb not null default '[]'::jsonb,
  exam_alerts jsonb not null default '[]'::jsonb,
  concept_map jsonb not null default '[]'::jsonb,
  practice_questions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_lectures_course_id on public.lectures(course_id);

-- 4. Vector Embeddings for Course-Isolated Semantic RAG (Gemini text-embedding-004: 768 dims)
create table if not exists public.course_notes_embeddings (
  id uuid primary key default uuid_generate_v4(),
  course_id text not null references public.courses(id) on delete cascade,
  lecture_id text references public.lectures(id) on delete cascade,
  chunk_text text not null,
  embedding vector(768),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_embeddings_course_id on public.course_notes_embeddings(course_id);

-- Semantic vector search RPC restricted strictly to a single course_id
create or replace function public.match_course_notes(
  query_embedding vector(768),
  target_course_id text,
  match_threshold float default 0.65,
  match_count int default 6
)
returns table (
  id uuid,
  lecture_id text,
  chunk_text text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    e.id,
    e.lecture_id,
    e.chunk_text,
    e.metadata,
    1 - (e.embedding <=> query_embedding) as similarity
  from public.course_notes_embeddings e
  where e.course_id = target_course_id
    and 1 - (e.embedding <=> query_embedding) > match_threshold
  order by e.embedding <=> query_embedding
  limit match_count;
$$;

-- 5. Online Ingested Academic Resources & Uploaded Course Files
create table if not exists public.course_resources (
  id text primary key,
  course_id text not null references public.courses(id) on delete cascade,
  title text not null,
  source text not null default 'Akademik Kaynak',
  url text,
  summary text not null default '',
  content_markdown text not null default '',
  resource_type text not null default 'paper', -- 'paper' | 'notes' | 'problem_set' | 'file'
  created_at timestamptz not null default now()
);

create index if not exists idx_resources_course_id on public.course_resources(course_id);

-- 6. Isolated Course AI Tutor Chat Messages
create table if not exists public.chat_messages (
  id text primary key,
  course_id text not null references public.courses(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  attachment_name text,
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_course_id on public.chat_messages(course_id, created_at);

-- 7. Unified API & External Tool Registry Metadata
create table if not exists public.api_settings (
  id text primary key,
  adapter_id text not null unique,
  display_name text not null,
  endpoint_url text not null default '',
  is_enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 8. Row Level Security (Open workspace policy for single-tenant / shared couple workspace)
alter table public.courses enable row level security;
alter table public.lectures enable row level security;
alter table public.course_notes_embeddings enable row level security;
alter table public.course_resources enable row level security;
alter table public.chat_messages enable row level security;
alter table public.api_settings enable row level security;

drop policy if exists "Allow workspace access courses" on public.courses;
create policy "Allow workspace access courses" on public.courses for all using (true) with check (true);

drop policy if exists "Allow workspace access lectures" on public.lectures;
create policy "Allow workspace access lectures" on public.lectures for all using (true) with check (true);

drop policy if exists "Allow workspace access embeddings" on public.course_notes_embeddings;
create policy "Allow workspace access embeddings" on public.course_notes_embeddings for all using (true) with check (true);

drop policy if exists "Allow workspace access resources" on public.course_resources;
create policy "Allow workspace access resources" on public.course_resources for all using (true) with check (true);

drop policy if exists "Allow workspace access chat" on public.chat_messages;
create policy "Allow workspace access chat" on public.chat_messages for all using (true) with check (true);

drop policy if exists "Allow workspace access api_settings" on public.api_settings;
create policy "Allow workspace access api_settings" on public.api_settings for all using (true) with check (true);

-- 9. Supabase Storage Bucket for Lecture Videos, Audio & PDFs
insert into storage.buckets (id, name, public)
values ('course-assets', 'course-assets', true)
on conflict (id) do nothing;

drop policy if exists "Public read course-assets" on storage.objects;
create policy "Public read course-assets" on storage.objects
  for select using (bucket_id = 'course-assets');

drop policy if exists "Public upload course-assets" on storage.objects;
create policy "Public upload course-assets" on storage.objects
  for insert with check (bucket_id = 'course-assets');
