-- Per-person erasure (UK GDPR Art. 17). Deleting a person's login now keeps their training rows for the
-- practice but unlinks them (trainee_id becomes null), instead of cascading the history away.
alter table public.training_sessions alter column trainee_id drop not null;
alter table public.training_sessions drop constraint training_sessions_trainee_id_fkey;
alter table public.training_sessions
  add constraint training_sessions_trainee_id_fkey
  foreign key (trainee_id) references public.profiles(id) on delete set null;
