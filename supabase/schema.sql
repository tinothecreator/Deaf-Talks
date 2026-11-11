-- SignStories schema (Supabase / Postgres)
-- Run in the Supabase SQL editor. Review policies before going beyond a demo.
-- Rerunnable for this schema; existing table definitions are not migrated.

begin;

create extension if not exists "pgcrypto";

-- ---------- Enums ----------
do $$ begin
  create type user_role as enum ('learner', 'storyteller', 'teacher');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type story_status as enum ('draft', 'published');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type usage_level as enum ('private', 'learning_only', 'share_with_credit');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type feedback_rating as enum ('keep_practising', 'good', 'excellent');
exception when duplicate_object then null;
end $$;

-- ---------- Tables ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'learner',
  display_name text not null,
  bio text,
  province text,
  sasl_variety text,            -- regional variety the person signs, optional
  created_at timestamptz not null default now()
);

create table if not exists stories (
  id uuid primary key default gen_random_uuid(),
  storyteller_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  video_path text not null,     -- path in 'stories' bucket
  thumbnail_path text,
  duration_seconds int check (duration_seconds is null or (duration_seconds > 0 and duration_seconds <= 60)),
  video_size_bytes bigint check (video_size_bytes is null or (video_size_bytes > 0 and video_size_bytes <= 52428800)),
  caption_en text,              -- written or approved by the storyteller
  sasl_variety text,
  status story_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists story_translations (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references stories(id) on delete cascade,
  language text not null,       -- 'zu', 'af', 'xh', 'st', 'tn', ...
  text text not null,
  ai_generated boolean not null default true,
  approved_by_storyteller boolean not null default false,
  created_at timestamptz not null default now(),
  unique (story_id, language)
);

create table if not exists signs (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references stories(id) on delete cascade,
  label text not null,          -- the word or phrase the sign means
  meaning text not null,        -- short plain-language explanation by the storyteller
  note text,                    -- context, regional variation
  start_seconds numeric check (start_seconds >= 0),
  end_seconds numeric check (end_seconds >= 0),
  created_at timestamptz not null default now()
);

create table if not exists ownership_settings (
  story_id uuid primary key references stories(id) on delete cascade,
  usage usage_level not null default 'learning_only',
  allow_download boolean not null default false,
  credit_line text not null,    -- shown on every story page
  consent_confirmed boolean not null default false,
  consent_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists consent_log (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references stories(id) on delete cascade,
  usage usage_level not null,
  allow_download boolean not null,
  consent_confirmed boolean not null,
  changed_by uuid references profiles(id),
  changed_at timestamptz not null default now()
);

create table if not exists practice_attempts (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references profiles(id) on delete cascade,
  story_id uuid not null references stories(id) on delete cascade,
  sign_id uuid references signs(id) on delete set null,
  video_path text not null,     -- path in 'practice' bucket
  note text,
  created_at timestamptz not null default now()
);

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references practice_attempts(id) on delete cascade,
  reviewer_id uuid not null references profiles(id) on delete cascade,
  comment text not null,
  rating feedback_rating not null,
  created_at timestamptz not null default now()
);

-- ---------- Indexes ----------
create index if not exists stories_storyteller_id_idx on stories (storyteller_id);
create index if not exists stories_status_idx on stories (status);
create index if not exists story_translations_story_id_idx on story_translations (story_id);
create index if not exists signs_story_id_idx on signs (story_id);
create index if not exists practice_attempts_learner_id_idx on practice_attempts (learner_id);
create index if not exists practice_attempts_story_id_idx on practice_attempts (story_id);
create index if not exists feedback_attempt_id_idx on feedback (attempt_id);
create index if not exists consent_log_story_id_idx on consent_log (story_id);

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

drop trigger if exists on_auth_user_created on auth.users;
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

drop trigger if exists ownership_change_log on public.ownership_settings;
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
drop policy if exists "profiles readable by signed-in users" on profiles;
create policy "profiles readable by signed-in users" on profiles
  for select to authenticated using (true);
drop policy if exists "users update own profile" on profiles;
create policy "users update own profile" on profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
-- Milestone 2: self-service updates may change display_name only.
-- Remove table AND column grants: a table grant overrides column restrictions.
-- RLS still limits the editable row to auth.uid(). SQL editor administration
-- (postgres) retains access for manual teacher assignment.
revoke update on table public.profiles from public, anon, authenticated;
revoke update (id, role, display_name, bio, province, sasl_variety, created_at)
  on table public.profiles from public, anon, authenticated;
grant update (display_name) on table public.profiles to authenticated;

-- stories
drop policy if exists "view visible stories" on stories;
create policy "view visible stories" on stories
  for select to authenticated using (public.is_story_visible(id));
drop policy if exists "storytellers create own stories" on stories;
create policy "storytellers create own stories" on stories
  for insert to authenticated with check (
    storyteller_id = auth.uid()
    and exists (select 1 from profiles where id = auth.uid() and role = 'storyteller')
  );
drop policy if exists "owners update own stories" on stories;
create policy "owners update own stories" on stories
  for update to authenticated using (storyteller_id = auth.uid());
drop policy if exists "owners delete own stories" on stories;
create policy "owners delete own stories" on stories
  for delete to authenticated using (storyteller_id = auth.uid());

-- translations: learners see approved ones; owners see and manage all
drop policy if exists "view approved translations" on story_translations;
create policy "view approved translations" on story_translations
  for select to authenticated using (
    public.is_story_owner(story_id)
    or (approved_by_storyteller and public.is_story_visible(story_id))
  );
drop policy if exists "owners manage translations" on story_translations;
create policy "owners manage translations" on story_translations
  for all to authenticated using (public.is_story_owner(story_id))
  with check (public.is_story_owner(story_id));

-- signs
drop policy if exists "view signs of visible stories" on signs;
create policy "view signs of visible stories" on signs
  for select to authenticated using (public.is_story_visible(story_id));
drop policy if exists "owners manage signs" on signs;
create policy "owners manage signs" on signs
  for all to authenticated using (public.is_story_owner(story_id))
  with check (public.is_story_owner(story_id));

-- ownership settings
drop policy if exists "view ownership of visible stories" on ownership_settings;
create policy "view ownership of visible stories" on ownership_settings
  for select to authenticated using (public.is_story_visible(story_id));
drop policy if exists "owners manage ownership" on ownership_settings;
create policy "owners manage ownership" on ownership_settings
  for all to authenticated using (public.is_story_owner(story_id))
  with check (public.is_story_owner(story_id));

-- consent log: owners can read their own history
drop policy if exists "owners read consent log" on consent_log;
create policy "owners read consent log" on consent_log
  for select to authenticated using (public.is_story_owner(story_id));

-- practice attempts
drop policy if exists "learners create own attempts" on practice_attempts;
create policy "learners create own attempts" on practice_attempts
  for insert to authenticated with check (
    learner_id = auth.uid() and public.is_story_visible(story_id)
  );
drop policy if exists "view own attempts or ones you can review" on practice_attempts;
create policy "view own attempts or ones you can review" on practice_attempts
  for select to authenticated using (
    learner_id = auth.uid() or public.can_review_attempt(id)
  );
drop policy if exists "learners delete own attempts" on practice_attempts;
create policy "learners delete own attempts" on practice_attempts
  for delete to authenticated using (learner_id = auth.uid());

-- feedback
drop policy if exists "reviewers create feedback" on feedback;
create policy "reviewers create feedback" on feedback
  for insert to authenticated with check (
    reviewer_id = auth.uid() and public.can_review_attempt(attempt_id)
  );
drop policy if exists "view feedback you wrote or received" on feedback;
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

-- Milestone 3 storage policies and idempotent constraints.
-- Existing columns cover everything except file size. Null metadata marks a
-- pending upload; the server fills these fields only after checking Storage.
alter table public.stories add column if not exists video_size_bytes bigint;
alter table public.stories drop constraint if exists stories_duration_seconds_check;
alter table public.stories add constraint stories_duration_seconds_check
  check (duration_seconds is null or (duration_seconds > 0 and duration_seconds <= 60));
alter table public.stories drop constraint if exists stories_video_size_bytes_check;
alter table public.stories add constraint stories_video_size_bytes_check
  check (video_size_bytes is null or (video_size_bytes > 0 and video_size_bytes <= 52428800));

-- 50 MB in the UI means 50 MiB = 52,428,800 bytes throughout this project.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('stories', 'stories', false, 52428800,
  array['video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Replace the schema's mixed-bucket policies, preserving practice behavior.
drop policy if exists "upload to own folder" on storage.objects;
drop policy if exists "read own files" on storage.objects;
drop policy if exists "delete own files" on storage.objects;
drop policy if exists "practice upload to own folder" on storage.objects;
create policy "practice upload to own folder" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'practice' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "practice read own files" on storage.objects;
create policy "practice read own files" on storage.objects
  for select to authenticated using (
    bucket_id = 'practice' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "practice delete own files" on storage.objects;
create policy "practice delete own files" on storage.objects
  for delete to authenticated using (
    bucket_id = 'practice' and (storage.foldername(name))[1] = auth.uid()::text);

-- Direct browser reads/listing/signing are limited to the owner's own folder.
-- These restrictive guards also prevent other permissive policies from opening
-- this bucket to anonymous users or another account. RLS remains enabled.
drop policy if exists "stories owner access guard" on storage.objects;
create policy "stories owner access guard" on storage.objects
  as restrictive for all to anon, authenticated
  using (bucket_id <> 'stories' or (
    (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'storyteller')
  ))
  with check (bucket_id <> 'stories' or (
    (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'storyteller')
  ));

drop policy if exists "stories insert pending guard" on storage.objects;
create policy "stories insert pending guard" on storage.objects
  as restrictive for insert to anon, authenticated
  with check (bucket_id <> 'stories' or exists (
    select 1 from public.stories s
    where s.storyteller_id = auth.uid() and s.video_path = name
      and s.status = 'draft' and s.duration_seconds is null
  ));

drop policy if exists "stories no overwrite guard" on storage.objects;
create policy "stories no overwrite guard" on storage.objects
  as restrictive for update to anon, authenticated
  using (bucket_id <> 'stories') with check (bucket_id <> 'stories');

drop policy if exists "stories upload own draft" on storage.objects;
create policy "stories upload own draft" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'stories' and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.stories s where s.storyteller_id = auth.uid()
      and s.video_path = name and s.status = 'draft' and s.duration_seconds is null)
  );
drop policy if exists "stories read own files" on storage.objects;
create policy "stories read own files" on storage.objects
  for select to authenticated using (
    bucket_id = 'stories' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "stories delete own files" on storage.objects;
create policy "stories delete own files" on storage.objects
  for delete to authenticated using (
    bucket_id = 'stories' and (storage.foldername(name))[1] = auth.uid()::text);

-- Milestone 4: same definitions as migrations/004_tags_ownership_publish.sql.
-- Milestone 4. Run after 003_story_upload.sql. No media or user data is added.

alter table public.consent_log add column if not exists credit_line text;
-- Historical credit was not captured. Leave old rows null rather than invent it.
create or replace function public.log_ownership_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'INSERT' or new.usage is distinct from old.usage
    or new.consent_confirmed is distinct from old.consent_confirmed
    or new.credit_line is distinct from old.credit_line
    or new.allow_download is distinct from old.allow_download then
    insert into consent_log (story_id, usage, allow_download, consent_confirmed, credit_line, changed_by)
    values (new.story_id, new.usage, new.allow_download, new.consent_confirmed, new.credit_line, auth.uid());
  end if;
  return new;
end $$;

-- Serialize child edits with publication. Prevent moving rows or deleting the
-- ownership record while its story exists; parent deletion may still cascade.
create or replace function public.lock_story_editor_row()
returns trigger language plpgsql security definer set search_path = public as $$
declare sid uuid;
begin
  if TG_OP = 'UPDATE' and new.story_id is distinct from old.story_id then
    raise exception 'A sign or ownership record cannot be moved to another story.';
  end if;
  if TG_OP = 'DELETE' then sid := old.story_id; else sid := new.story_id; end if;
  perform 1 from stories where id = sid for update;
  if TG_TABLE_NAME = 'ownership_settings' and TG_OP = 'DELETE'
    and exists (select 1 from stories where id = sid) then
    raise exception 'Ownership settings cannot be deleted. Withdraw the story instead.';
  end if;
  if TG_OP = 'DELETE' then return old; end if;
  if TG_TABLE_NAME = 'ownership_settings' then
    if new.allow_download then raise exception 'Downloads are not available.'; end if;
    if new.credit_line !~ '[^[:space:]]' then raise exception 'Enter a credit line.'; end if;
  else
    if new.label !~ '[^[:space:]]' or new.meaning !~ '[^[:space:]]' then
      raise exception 'Each sign needs a label and an English meaning.';
    end if;
    if new.start_seconds is null or not exists (
      select 1 from stories where id = sid and duration_seconds > 0
        and new.start_seconds >= 0 and new.start_seconds <= duration_seconds
        and (new.end_seconds is null or (new.end_seconds >= new.start_seconds and new.end_seconds <= duration_seconds))
    ) then raise exception 'Sign timestamps must be within the stored video duration.'; end if;
  end if;
  return new;
end $$;
drop trigger if exists signs_editor_lock on public.signs;
create trigger signs_editor_lock before insert or update or delete on public.signs
  for each row execute function public.lock_story_editor_row();
drop trigger if exists ownership_editor_lock on public.ownership_settings;
create trigger ownership_editor_lock before insert or update or delete on public.ownership_settings
  for each row execute function public.lock_story_editor_row();

create or replace function public.assert_story_publishable(sid uuid)
returns void language plpgsql security invoker set search_path = public as $$
declare s stories%rowtype; o ownership_settings%rowtype; n integer;
begin
  select * into s from stories where id = sid;
  if not found then raise exception 'Story is unavailable.'; end if;
  if coalesce(s.caption_en, '') !~ '[^[:space:]]' then raise exception 'Enter an English caption before publishing.'; end if;
  if s.duration_seconds is null or s.duration_seconds <= 0 or s.duration_seconds > 60 then
    raise exception 'Complete a video upload with a duration of 1 to 60 seconds.'; end if;
  select * into o from ownership_settings where story_id = sid;
  if not found or coalesce(o.credit_line, '') !~ '[^[:space:]]' then raise exception 'Enter a credit line before publishing.'; end if;
  if not o.consent_confirmed then raise exception 'Confirm consent before publishing.'; end if;
  if o.usage = 'private' then raise exception 'Choose a usage other than Private before publishing.'; end if;
  select count(*) into n from signs where story_id = sid;
  if n < 3 or n > 5 then raise exception 'Add 3 to 5 signs before publishing.'; end if;
  if exists (select 1 from signs where story_id = sid and (
    label !~ '[^[:space:]]' or meaning !~ '[^[:space:]]' or start_seconds is null
    or not (start_seconds >= 0 and start_seconds <= s.duration_seconds)
    or (end_seconds is not null and not (end_seconds >= start_seconds and end_seconds <= s.duration_seconds))
  )) then raise exception 'Each sign needs a label, meaning, and timestamp within the stored video duration.'; end if;
end $$;

-- Deferred checks validate the final transaction state, including direct REST
-- updates. All writers lock the parent row, so publication cannot race tags.
create or replace function public.check_story_publication()
returns trigger language plpgsql security definer set search_path = public as $$
declare sid uuid;
begin
  if TG_TABLE_NAME = 'stories' then sid := new.id;
  elsif TG_OP = 'DELETE' then sid := old.story_id;
  else sid := new.story_id; end if;
  if exists (select 1 from stories where id = sid and status = 'published') then
    perform public.assert_story_publishable(sid);
  end if;
  -- Duration changes must preserve timestamp integrity even in drafts.
  if exists (select 1 from signs t join stories s on s.id = t.story_id
    where s.id = sid and (s.duration_seconds is null or t.start_seconds is null
      or not (t.start_seconds >= 0 and t.start_seconds <= s.duration_seconds)
      or (t.end_seconds is not null and not (t.end_seconds >= t.start_seconds and t.end_seconds <= s.duration_seconds)))) then
    raise exception 'Sign timestamps must be within the stored video duration.';
  end if;
  return null;
end $$;
drop trigger if exists stories_publication_check on public.stories;
create constraint trigger stories_publication_check after insert or update on public.stories
  deferrable initially deferred for each row execute function public.check_story_publication();
drop trigger if exists signs_publication_check on public.signs;
create constraint trigger signs_publication_check after insert or update or delete on public.signs
  deferrable initially deferred for each row execute function public.check_story_publication();
drop trigger if exists ownership_publication_check on public.ownership_settings;
create constraint trigger ownership_publication_check after insert or update or delete on public.ownership_settings
  deferrable initially deferred for each row execute function public.check_story_publication();

create or replace function public.publish_story(p_story_id uuid)
returns void language plpgsql security invoker set search_path = public as $$
begin
  perform 1 from stories where id = p_story_id and storyteller_id = auth.uid() for update;
  if not found then raise exception 'Only the owning storyteller can publish this story.'; end if;
  perform public.assert_story_publishable(p_story_id);
  update stories set status = 'published', updated_at = now() where id = p_story_id;
end $$;

create or replace function public.withdraw_story(p_story_id uuid)
returns void language plpgsql security invoker set search_path = public as $$
begin
  perform 1 from stories where id = p_story_id and storyteller_id = auth.uid() for update;
  if not found then raise exception 'Only the owning storyteller can withdraw this story.'; end if;
  update stories set status = 'draft', updated_at = now() where id = p_story_id;
  update ownership_settings set usage = 'private', consent_confirmed = false, allow_download = false,
    consent_at = null, updated_at = now() where story_id = p_story_id;
end $$;

-- Save metadata, tags and ownership as one transaction, with one history entry.
create or replace function public.save_story_editor(p_story_id uuid, p_title text,
  p_caption text, p_credit text, p_usage public.usage_level, p_consent boolean, p_signs jsonb)
returns void language plpgsql security invoker set search_path = public as $$
declare tag jsonb; tag_id uuid;
begin
  perform 1 from stories where id = p_story_id and storyteller_id = auth.uid() for update;
  if not found then raise exception 'Only the owning storyteller can edit this story.'; end if;
  if coalesce(p_title, '') !~ '[^[:space:]]' or length(p_title) > 160 then raise exception 'Enter a title of up to 160 characters.'; end if;
  if p_caption is null or length(p_caption) > 10000 then raise exception 'Keep the English caption under 10,000 characters.'; end if;
  if coalesce(p_credit, '') !~ '[^[:space:]]' then raise exception 'Enter a credit line.'; end if;
  if p_usage is null or p_consent is null then raise exception 'Choose usage and consent settings.'; end if;
  if jsonb_typeof(p_signs) is distinct from 'array' or jsonb_array_length(p_signs) > 5 then
    raise exception 'Use no more than 5 signs.'; end if;
  update stories set title = btrim(p_title), caption_en = btrim(p_caption), status = 'draft', updated_at = now()
    where id = p_story_id;
  delete from signs where story_id = p_story_id and id not in (
    select (value->>'id')::uuid from jsonb_array_elements(p_signs)
    where nullif(value->>'id', '') is not null
  );
  -- Preserve sign IDs so later practice references remain attached.
  for tag in select value from jsonb_array_elements(p_signs) loop
    tag_id := nullif(tag->>'id', '')::uuid;
    if tag_id is null then
      insert into signs (story_id, label, meaning, start_seconds)
        values (p_story_id, btrim(tag->>'label'), btrim(tag->>'meaning'), (tag->>'start_seconds')::numeric);
    else
      update signs set label = btrim(tag->>'label'), meaning = btrim(tag->>'meaning'),
        start_seconds = (tag->>'start_seconds')::numeric where id = tag_id and story_id = p_story_id;
      if not found then raise exception 'A sign does not belong to this story. Reload and try again.'; end if;
    end if;
  end loop;
  update ownership_settings set credit_line = btrim(p_credit), usage = p_usage,
    consent_confirmed = p_consent, allow_download = false,
    consent_at = case when p_consent then coalesce(consent_at, now()) else null end, updated_at = now()
    where story_id = p_story_id;
  if not found then
    insert into ownership_settings (story_id, credit_line, usage, consent_confirmed, consent_at)
      values (p_story_id, btrim(p_credit), p_usage, p_consent, case when p_consent then now() end);
  end if;
end $$;

-- Bind any practice sign to the same story without adding practice features.
create unique index if not exists signs_id_story_unique on public.signs(id, story_id);
alter table public.practice_attempts drop constraint if exists practice_attempts_sign_story_fkey;
alter table public.practice_attempts add constraint practice_attempts_sign_story_fkey
  foreign key (sign_id, story_id) references public.signs(id, story_id) on delete set null (sign_id);

revoke all on function public.publish_story(uuid), public.withdraw_story(uuid),
  public.save_story_editor(uuid,text,text,text,public.usage_level,boolean,jsonb),
  public.assert_story_publishable(uuid) from public, anon;
grant execute on function public.publish_story(uuid), public.withdraw_story(uuid),
  public.save_story_editor(uuid,text,text,text,public.usage_level,boolean,jsonb),
  public.assert_story_publishable(uuid) to authenticated;
-- Existing SELECT policies already gate stories, signs and ownership via
-- is_story_visible: owner OR (published AND consent_confirmed AND nonprivate).
commit;

-- Milestone 6: same definitions as migrations/005_practice_submission.sql.
-- Milestone 6 only. Run after 004_tags_ownership_publish.sql.
begin;

alter table public.practice_attempts add column if not exists caption text;
-- Preserve existing notes when useful. Do not invent a description of old media.
update public.practice_attempts set caption = case
  when coalesce(note, '') ~ '[^[:space:]]' then left(regexp_replace(note, '^[[:space:]]+|[[:space:]]+$', '', 'g'), 2000)
  else '[Caption unavailable for an older attempt.]' end
where caption is null or caption !~ '[^[:space:]]';
alter table public.practice_attempts alter column caption set not null;
alter table public.practice_attempts drop constraint if exists practice_caption_check;
alter table public.practice_attempts add constraint practice_caption_check
  check (caption ~ '[^[:space:]]' and length(caption) <= 2000);

-- Old media has no verified metadata: retain rows as incomplete, never silently
-- promote them to submitted. Re-running this migration preserves new states.
alter table public.practice_attempts add column if not exists status text not null default 'failed';
alter table public.practice_attempts alter column status set default 'uploading';
alter table public.practice_attempts add column if not exists duration_seconds numeric;
alter table public.practice_attempts add column if not exists video_size_bytes bigint;
alter table public.practice_attempts add column if not exists expected_size_bytes bigint;
alter table public.practice_attempts add column if not exists expected_content_type text;
alter table public.practice_attempts drop constraint if exists practice_upload_check;
alter table public.practice_attempts add constraint practice_upload_check check (
  status in ('uploading', 'failed', 'submitted')
  and (duration_seconds is null or (duration_seconds > 0 and duration_seconds <= 60))
  and (video_size_bytes is null or (video_size_bytes > 0 and video_size_bytes <= 52428800))
  and (status = 'failed' or (
    expected_size_bytes is not null and expected_size_bytes > 0 and expected_size_bytes <= 52428800
    and expected_content_type is not null and expected_content_type in ('video/mp4', 'video/webm', 'video/quicktime')))
  and (status <> 'submitted' or (duration_seconds is not null and video_size_bytes is not null
    and video_size_bytes = expected_size_bytes))
);
-- M4 already added practice_attempts_sign_story_fkey and signs_id_story_unique.
-- Keep that composite foreign key; do not add another.

create or replace function public.guard_practice_upload()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    if new.status <> 'uploading' or new.sign_id is null or new.duration_seconds is not null
      or new.video_size_bytes is not null or new.video_path !~ (
        '^' || new.learner_id::text || '/[0-9a-f-]{36}\.(mp4|webm|mov)$') then
      raise exception 'Start an incomplete practice upload with a sign and an owned video path.';
    end if;
  else
    -- Existing sign FKs clear sign_id when an owner removes a tag. Keep the
    -- completed attempt and its media; only the referential action may do this.
    if pg_trigger_depth() > 1 and new.sign_id is null
      and (to_jsonb(new) - 'sign_id') = (to_jsonb(old) - 'sign_id') then
      return new;
    end if;
    if old.status <> 'uploading' or new.status not in ('failed', 'submitted')
      or new.learner_id is distinct from old.learner_id
      or new.story_id is distinct from old.story_id
      or new.sign_id is distinct from old.sign_id
      or new.video_path is distinct from old.video_path
      or new.caption is distinct from old.caption
      or new.expected_size_bytes is distinct from old.expected_size_bytes
      or new.expected_content_type is distinct from old.expected_content_type
      or new.created_at is distinct from old.created_at
      or new.id is distinct from old.id then
      raise exception 'Practice upload details cannot be changed.';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists practice_upload_guard on public.practice_attempts;
create trigger practice_upload_guard before insert or update on public.practice_attempts
  for each row execute function public.guard_practice_upload();

alter table public.practice_attempts enable row level security;
drop policy if exists "learners create own attempts" on public.practice_attempts;
create policy "learners create own attempts" on public.practice_attempts
  for insert to authenticated with check (
    learner_id = auth.uid() and public.is_story_visible(story_id)
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'learner')
    and exists (select 1 from public.signs where id = sign_id and signs.story_id = practice_attempts.story_id)
  );
-- Existing can_review_attempt permits only the owning storyteller or a teacher.
drop policy if exists "view own attempts or ones you can review" on public.practice_attempts;
create policy "view own attempts or ones you can review" on public.practice_attempts
  for select to authenticated using (learner_id = auth.uid() or public.can_review_attempt(id));
drop policy if exists "learners finish own uploads" on public.practice_attempts;
create policy "learners finish own uploads" on public.practice_attempts
  for update to authenticated using (
    learner_id = auth.uid() and status = 'uploading'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'learner')
  ) with check (learner_id = auth.uid() and status in ('failed', 'submitted'));
drop policy if exists "learners delete own attempts" on public.practice_attempts;
create policy "learners delete own attempts" on public.practice_attempts
  for delete to authenticated using (learner_id = auth.uid() and status <> 'submitted');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('practice', 'practice', false, 52428800, array['video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Restrictive guards also close access opened by other permissive policies.
-- Own-folder reads allow the session's info() confirmation and cleanup. Other
-- people (including reviewers) must use server-authorized playback signing.
drop policy if exists "practice owner access guard" on storage.objects;
create policy "practice owner access guard" on storage.objects
  as restrictive for all to anon, authenticated
  using (bucket_id <> 'practice' or (
    (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'learner')))
  with check (bucket_id <> 'practice' or (
    (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'learner')));
drop policy if exists "practice pending insert guard" on storage.objects;
create policy "practice pending insert guard" on storage.objects
  as restrictive for insert to anon, authenticated
  with check (bucket_id <> 'practice' or exists (
    select 1 from public.practice_attempts a where a.learner_id = auth.uid()
      and a.video_path = name and a.status = 'uploading'));
drop policy if exists "practice no overwrite guard" on storage.objects;
create policy "practice no overwrite guard" on storage.objects
  as restrictive for update to anon, authenticated
  using (bucket_id <> 'practice') with check (bucket_id <> 'practice');
-- The M3 own-folder INSERT/SELECT/DELETE policies remain; the guards above
-- narrow them to learners and pending uploads. No browser cross-user access.
commit;

-- Milestone 7: same definitions as migrations/006_feedback.sql.
-- Milestone 7 only. Run after 005_practice_submission.sql.
-- Existing author column is reviewer_id; do not add a second author column.
-- Existing SELECT policy (author or attempt learner) is intentionally unchanged.
begin;

alter table public.feedback enable row level security;
alter table public.feedback drop constraint if exists feedback_comment_check;
alter table public.feedback add constraint feedback_comment_check
  check (comment ~ '[^[:space:]]' and char_length(comment) <= 2000);

-- Replace the existing INSERT policy, retaining author and can_review_attempt
-- checks and adding explicit role and submitted-state requirements.
drop policy if exists "reviewers create feedback" on public.feedback;
create policy "reviewers create feedback" on public.feedback
  for insert to authenticated with check (
    reviewer_id = auth.uid()
    and exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('storyteller', 'teacher'))
    and public.can_review_attempt(attempt_id)
    and exists (select 1 from public.practice_attempts a
      where a.id = attempt_id and a.status = 'submitted')
  );

-- There already are no UPDATE or DELETE policies. Revoke privileges too so
-- browser writes remain immutable even if a permissive policy is added later.
revoke update, delete on table public.feedback from public, anon, authenticated;
revoke update (id, attempt_id, reviewer_id, comment, rating, created_at)
  on table public.feedback from public, anon, authenticated;
revoke insert on table public.feedback from public, anon;
grant select, insert on table public.feedback to authenticated;

commit;
-- Milestone 8 only. Run after migrations 003–006. Safe to rerun.
-- Existing rows are not silently deleted or rewritten: invalid legacy rows make
-- this transaction fail, so their owners can correct/export them first.
begin;

alter table public.story_translations drop constraint if exists translation_language_check;
alter table public.story_translations add constraint translation_language_check check (language in ('zu', 'af'));
alter table public.story_translations drop constraint if exists translation_text_check;
alter table public.story_translations add constraint translation_text_check
  check (text ~ '[^[:space:]]' and char_length(text) <= 12000);
comment on column public.story_translations.ai_generated is
  'True if this text began as an AI draft, including later human edits. False for entirely human-written text.';

-- Consult stories through its existing RLS, without repeating visibility rules.
drop policy if exists "view approved translations" on public.story_translations;
create policy "view approved translations" on public.story_translations
  for select to authenticated using (
    exists (select 1 from public.stories s where s.id = story_id
      and (s.storyteller_id = auth.uid() or approved_by_storyteller))
  );
drop policy if exists "owners manage translations" on public.story_translations;
drop policy if exists "storytellers insert translations" on public.story_translations;
create policy "storytellers insert translations" on public.story_translations
  for insert to authenticated with check (
    public.is_story_owner(story_id) and exists
      (select 1 from public.profiles where id = auth.uid() and role = 'storyteller')
  );
drop policy if exists "storytellers update translations" on public.story_translations;
create policy "storytellers update translations" on public.story_translations
  for update to authenticated using (
    public.is_story_owner(story_id) and exists
      (select 1 from public.profiles where id = auth.uid() and role = 'storyteller')
  ) with check (
    public.is_story_owner(story_id) and exists
      (select 1 from public.profiles where id = auth.uid() and role = 'storyteller')
  );
drop policy if exists "storytellers delete translations" on public.story_translations;
create policy "storytellers delete translations" on public.story_translations
  for delete to authenticated using (
    public.is_story_owner(story_id) and exists
      (select 1 from public.profiles where id = auth.uid() and role = 'storyteller')
  );
alter table public.story_translations enable row level security;

create or replace function public.guard_translation_draft()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Serialize approval/text writes against English-caption changes.
  perform 1 from public.stories where id = new.story_id for update;
  if tg_op = 'INSERT' then
    new.approved_by_storyteller := false;
  else
    if new.story_id is distinct from old.story_id or new.language is distinct from old.language
      or new.id is distinct from old.id then
      raise exception 'Translation identity cannot change.';
    end if;
    new.ai_generated := old.ai_generated or new.ai_generated;
    if new.text is distinct from old.text or new.ai_generated is distinct from old.ai_generated then
      new.approved_by_storyteller := false;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists translation_draft_guard on public.story_translations;
create trigger translation_draft_guard before insert or update on public.story_translations
  for each row execute function public.guard_translation_draft();

create or replace function public.invalidate_caption_translations()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.caption_en is distinct from old.caption_en then
    update public.story_translations set approved_by_storyteller = false where story_id = new.id;
    update public.translation_generations set source_updated_at = null where story_id = new.id;
  end if;
  return new;
end $$;
drop trigger if exists caption_translation_invalidation on public.stories;
create trigger caption_translation_invalidation after update of caption_en on public.stories
  for each row execute function public.invalidate_caption_translations();

-- Durable reservations survive multiple server instances and browser tabs.
-- Counts include failed attempts, never reset when a translation is removed.
create table if not exists public.translation_generations (
  story_id uuid not null references public.stories(id) on delete cascade,
  language text not null check (language in ('zu', 'af')),
  attempts integer not null default 0 check (attempts between 0 and 10),
  token uuid,
  started_at timestamptz,
  source_updated_at timestamptz,
  primary key (story_id, language)
);
alter table public.translation_generations enable row level security;
revoke all on public.translation_generations from public, anon, authenticated;
grant select on public.translation_generations to authenticated;
drop policy if exists "owners read generation usage" on public.translation_generations;
create policy "owners read generation usage" on public.translation_generations
  for select to authenticated using (public.is_story_owner(story_id));

create or replace function public.reserve_translation(p_story_id uuid, p_language text)
returns table (reservation uuid, caption text) language plpgsql security definer set search_path = public as $$
declare s public.stories; g public.translation_generations; t uuid := gen_random_uuid();
begin
  if p_language is null or p_language not in ('zu', 'af') then raise exception 'Invalid language.'; end if;
  select * into s from public.stories where id = p_story_id and storyteller_id = auth.uid() for update;
  if not found or not exists (select 1 from public.profiles where id = auth.uid() and role = 'storyteller') then
    raise exception 'Story unavailable.';
  end if;
  if s.caption_en is null or s.caption_en !~ '[^[:space:]]' or char_length(s.caption_en) > 10000 then
    raise exception 'Save an English caption first.';
  end if;
  select * into g from public.translation_generations where story_id = p_story_id and language = p_language;
  -- The SDK timeout is 20 seconds. A 60-second lease recovers from a crashed process.
  if g.token is not null and g.started_at > now() - interval '60 seconds' then
    raise exception 'Generation already in progress.';
  end if;
  if (select coalesce(sum(attempts), 0) from public.translation_generations where story_id = p_story_id) >= 10 then
    raise exception 'Generation limit reached.';
  end if;
  insert into public.translation_generations (story_id, language, attempts, token, started_at, source_updated_at)
    values (p_story_id, p_language, 1, t, now(), s.updated_at)
    on conflict (story_id, language) do update set attempts = translation_generations.attempts + 1,
      token = t, started_at = now(), source_updated_at = s.updated_at;
  -- Regeneration immediately withdraws any prior approval, even if output is identical.
  update public.story_translations set approved_by_storyteller = false
    where story_id = p_story_id and language = p_language;
  return query select t, s.caption_en;
end $$;

-- Null text releases a failed request; non-null text saves a fresh AI draft.
create or replace function public.finish_translation(p_story_id uuid, p_language text, p_token uuid, p_text text)
returns void language plpgsql security definer set search_path = public as $$
declare s public.stories; g public.translation_generations;
begin
  select * into s from public.stories where id = p_story_id and storyteller_id = auth.uid() for update;
  if not found or not exists (select 1 from public.profiles where id = auth.uid() and role = 'storyteller') then
    raise exception 'Story unavailable.';
  end if;
  select * into g from public.translation_generations where story_id = p_story_id and language = p_language for update;
  if not found or g.token is null or g.token is distinct from p_token then raise exception 'Request expired.'; end if;
  if p_text is not null then
    if g.source_updated_at is distinct from s.updated_at or g.started_at < now() - interval '60 seconds' then
      raise exception 'Story changed. Generate again from the saved caption.';
    end if;
    insert into public.story_translations (story_id, language, text, ai_generated, approved_by_storyteller)
      values (p_story_id, p_language, p_text, true, false)
      on conflict (story_id, language) do update set text = excluded.text,
        ai_generated = true, approved_by_storyteller = false;
  end if;
  update public.translation_generations set token = null, started_at = null, source_updated_at = null
    where story_id = p_story_id and language = p_language;
end $$;

revoke all on function public.guard_translation_draft() from public, anon, authenticated;
revoke all on function public.invalidate_caption_translations() from public, anon, authenticated;
revoke all on function public.reserve_translation(uuid, text) from public, anon;
revoke all on function public.finish_translation(uuid, text, uuid, text) from public, anon;
grant execute on function public.reserve_translation(uuid, text) to authenticated;
grant execute on function public.finish_translation(uuid, text, uuid, text) to authenticated;
commit;
