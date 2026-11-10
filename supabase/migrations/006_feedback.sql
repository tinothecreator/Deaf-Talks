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
