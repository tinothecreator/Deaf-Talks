-- SignStories schema (Supabase / Postgres)
-- Run in the Supabase SQL editor. Review policies before going beyond a demo.

create extension if not exists "pgcrypto";

-- ---------- Enums ----------
create type user_role as enum ('learner', 'storyteller', 'teacher');
create type story_status as enum ('draft', 'published');
create type usage_level as enum ('private', 'learning_only', 'share_with_credit');
create type feedback_rating as enum ('keep_practising', 'good', 'excellent');

-- ---------- Tables ----------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'learner',
  display_name text not null,
  bio text,
  province text,
  sasl_variety text,            -- regional variety the person signs, optional
  created_at timestamptz not null default now()
);

create table stories (
  id uuid primary key default gen_random_uuid(),
  storyteller_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  video_path text not null,     -- path in 'stories' bucket
  thumbnail_path text,
  duration_seconds int check (duration_seconds is null or duration_seconds <= 60),
  caption_en text,              -- written or approved by the storyteller
  sasl_variety text,
  status story_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table story_translations (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references stories(id) on delete cascade,
  language text not null,       -- 'zu', 'af', 'xh', 'st', 'tn', ...
  text text not null,
  ai_generated boolean not null default true,
  approved_by_storyteller boolean not null default false,
  created_at timestamptz not null default now(),
  unique (story_id, language)
);

create table signs (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references stories(id) on delete cascade,
  label text not null,          -- the word or phrase the sign means
  meaning text not null,        -- short plain-language explanation by the storyteller
  note text,                    -- context, regional variation
  start_seconds numeric check (start_seconds >= 0),
  end_seconds numeric check (end_seconds >= 0),
  created_at timestamptz not null default now()
);

create table ownership_settings (
  story_id uuid primary key references stories(id) on delete cascade,
  usage usage_level not null default 'learning_only',
  allow_download boolean not null default false,
  credit_line text not null,    -- shown on every story page
  consent_confirmed boolean not null default false,
  consent_at timestamptz,
  updated_at timestamptz not null default now()
);

create table consent_log (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references stories(id) on delete cascade,
  usage usage_level not null,
  allow_download boolean not null,
  consent_confirmed boolean not null,
  changed_by uuid references profiles(id),
  changed_at timestamptz not null default now()
);

create table practice_attempts (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references profiles(id) on delete cascade,
  story_id uuid not null references stories(id) on delete cascade,
  sign_id uuid references signs(id) on delete set null,
  video_path text not null,     -- path in 'practice' bucket
  note text,
  created_at timestamptz not null default now()
);

create table feedback (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references practice_attempts(id) on delete cascade,
  reviewer_id uuid not null references profiles(id) on delete cascade,
  comment text not null,
  rating feedback_rating not null,
  created_at timestamptz not null default now()
);

-- ---------- Indexes ----------
create index on stories (storyteller_id);
create index on stories (status);
create index on story_translations (story_id);
create index on signs (story_id);
create index on practice_attempts (learner_id);
create index on practice_attempts (story_id);
create index on feedback (attempt_id);
create index on consent_log (story_id);

-- ---------- Helper functions ----------
create or replace function public.is_story_owner(sid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from stories where id = sid and storyteller_id = auth.uid());
$$;

create or replace function public.is_teacher()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'teacher');
$$;

-- A story is visible to others only if published, consented, and not private.
create or replace function public.is_story_visible(sid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from stories s
    join ownership_settings o on o.story_id = s.id
    where s.id = sid
      and s.status = 'published'
      and o.consent_confirmed
      and o.usage <> 'private'
  ) or exists (
    select 1 from stories s where s.id = sid and s.storyteller_id = auth.uid()
  );
$$;

create or replace function public.can_review_attempt(aid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from practice_attempts a
    join stories s on s.id = a.story_id
    where a.id = aid and (s.storyteller_id = auth.uid() or public.is_teacher())
  );
$$;

-- ---------- Triggers ----------
-- Create a profile on sign-up. Only 'learner' or 'storyteller' can be self-selected.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    case when new.raw_user_meta_data->>'role' = 'storyteller'
         then 'storyteller'::user_role else 'learner'::user_role end
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Log every change to ownership and consent settings.
create or replace function public.log_ownership_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into consent_log (story_id, usage, allow_download, consent_confirmed, changed_by)
  values (new.story_id, new.usage, new.allow_download, new.consent_confirmed, auth.uid());
  return new;
end $$;

create trigger ownership_change_log
  after insert or update on ownership_settings
  for each row execute function public.log_ownership_change();

-- ---------- Row Level Security ----------
alter table profiles enable row level security;
alter table stories enable row level security;
alter table story_translations enable row level security;
alter table signs enable row level security;
alter table ownership_settings enable row level security;
alter table consent_log enable row level security;
alter table practice_attempts enable row level security;
alter table feedback enable row level security;

-- profiles
create policy "profiles readable by signed-in users" on profiles
  for select to authenticated using (true);
create policy "users update own profile" on profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
-- note: role changes (e.g. promoting a teacher) are done by an admin with the service role

-- stories
create policy "view visible stories" on stories
  for select to authenticated using (public.is_story_visible(id));
create policy "storytellers create own stories" on stories
  for insert to authenticated with check (
    storyteller_id = auth.uid()
    and exists (select 1 from profiles where id = auth.uid() and role = 'storyteller')
  );
create policy "owners update own stories" on stories
  for update to authenticated using (storyteller_id = auth.uid());
create policy "owners delete own stories" on stories
  for delete to authenticated using (storyteller_id = auth.uid());

-- translations: learners see approved ones; owners see and manage all
create policy "view approved translations" on story_translations
  for select to authenticated using (
    public.is_story_owner(story_id)
    or (approved_by_storyteller and public.is_story_visible(story_id))
  );
create policy "owners manage translations" on story_translations
  for all to authenticated using (public.is_story_owner(story_id))
  with check (public.is_story_owner(story_id));

-- signs
create policy "view signs of visible stories" on signs
  for select to authenticated using (public.is_story_visible(story_id));
create policy "owners manage signs" on signs
  for all to authenticated using (public.is_story_owner(story_id))
  with check (public.is_story_owner(story_id));

-- ownership settings
create policy "view ownership of visible stories" on ownership_settings
  for select to authenticated using (public.is_story_visible(story_id));
create policy "owners manage ownership" on ownership_settings
  for all to authenticated using (public.is_story_owner(story_id))
  with check (public.is_story_owner(story_id));

-- consent log: owners can read their own history
create policy "owners read consent log" on consent_log
  for select to authenticated using (public.is_story_owner(story_id));

-- practice attempts
create policy "learners create own attempts" on practice_attempts
  for insert to authenticated with check (
    learner_id = auth.uid() and public.is_story_visible(story_id)
  );
create policy "view own attempts or ones you can review" on practice_attempts
  for select to authenticated using (
    learner_id = auth.uid() or public.can_review_attempt(id)
  );
create policy "learners delete own attempts" on practice_attempts
  for delete to authenticated using (learner_id = auth.uid());

-- feedback
create policy "reviewers create feedback" on feedback
  for insert to authenticated with check (
    reviewer_id = auth.uid() and public.can_review_attempt(attempt_id)
  );
create policy "view feedback you wrote or received" on feedback
  for select to authenticated using (
    reviewer_id = auth.uid()
    or exists (select 1 from practice_attempts a where a.id = attempt_id and a.learner_id = auth.uid())
  );

-- ---------- Storage ----------
-- Private buckets; serve files through server-generated signed URLs.
-- 50 MB limit matches the free-tier cap; adjust if your plan allows more.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('stories', 'stories', false, 52428800, array['video/mp4', 'video/webm', 'video/quicktime']),
  ('practice', 'practice', false, 52428800, array['video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do nothing;

-- Users can upload and manage files only inside their own folder: {user_id}/...
create policy "upload to own folder" on storage.objects
  for insert to authenticated with check (
    bucket_id in ('stories', 'practice')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "read own files" on storage.objects
  for select to authenticated using (
    bucket_id in ('stories', 'practice')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "delete own files" on storage.objects
  for delete to authenticated using (
    bucket_id in ('stories', 'practice')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
-- Viewing other people's videos (stories, practice recordings) happens through
-- server code that checks visibility, then creates a short-lived signed URL
-- using the service role key.
