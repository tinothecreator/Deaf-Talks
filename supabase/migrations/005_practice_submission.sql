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
