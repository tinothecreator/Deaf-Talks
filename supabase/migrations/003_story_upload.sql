-- Milestone 3 only. Run AFTER the existing schema and Milestone 2 role lock.
-- No SQL is executed by the app. Safe to rerun; leaves existing data intact.
begin;

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

commit;
