-- Retain superseded unfinished attempts while allowing one current open attempt.
-- Existing rows remain untouched; old attempts are classified from their saved content.
drop index if exists public.one_open_attempt_per_assignment;
create unique index one_open_attempt_per_assignment
  on public.training_sessions(trainee_id, assignment_id)
  where not (data ? 'result') and not (data ? 'supersededAt');
