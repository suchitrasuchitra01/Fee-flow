-- Run once in Supabase Dashboard > SQL Editor.
-- This changes student record ownership from Auth UUID to the signed-in user's email.
-- It preserves every existing student record.

do $$
declare
  foreign_key_name text;
begin
  select conname into foreign_key_name
  from pg_constraint
  where conrelid = 'public.students'::regclass
    and contype = 'f'
    and confrelid = 'auth.users'::regclass
  limit 1;

  if foreign_key_name is not null then
    execute format('alter table public.students drop constraint %I', foreign_key_name);
  end if;
end;
$$;

alter table public.students alter column id set default gen_random_uuid();

drop policy if exists "Students can view their own fee record" on public.students;
create policy "Students can view their own fee record"
  on public.students for select to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email'));
