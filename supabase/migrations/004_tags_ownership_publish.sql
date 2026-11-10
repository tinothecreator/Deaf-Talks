-- Milestone 4. Run after 003_story_upload.sql. No media or user data is added.
begin;

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
