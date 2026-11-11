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
