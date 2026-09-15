-- Run this once in Supabase Dashboard > SQL Editor for the existing admin account.
insert into public.profiles (id, role)
select id, 'admin'
from auth.users
where email = 'admin@sits.co.in'
on conflict (id) do update set role = excluded.role;