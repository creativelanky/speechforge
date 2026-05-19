-- Allow users to create custom scenarios for their own sessions
alter table scenarios add column if not exists user_id uuid references profiles(id) on delete cascade;

create policy "Users can insert custom scenarios"
  on scenarios for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own custom scenarios"
  on scenarios for delete
  using (auth.uid() = user_id);
