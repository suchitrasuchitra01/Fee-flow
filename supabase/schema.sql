-- Run in Supabase SQL Editor. Create Auth users in Authentication > Users first.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'student')) default 'student',
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key references auth.users(id) on delete cascade,
  student_id text not null unique,
  name text not null,
  email text not null,
  total_fee numeric not null default 0 check (total_fee >= 0),
  paid_fee numeric not null default 0 check (paid_fee >= 0),
  due_fee numeric not null default 0 check (due_fee >= 0),
  fine_fee numeric not null default 0 check (fine_fee >= 0),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.students enable row level security;

create policy "Users can view their profile" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "Students can view their own fee record" on public.students for select to authenticated using (auth.uid() = id);
create policy "Admins can view all students" on public.students for select to authenticated using ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "Admins can add students" on public.students for insert to authenticated with check ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "Admins can update students" on public.students for update to authenticated using ((select role from public.profiles where id = auth.uid()) = 'admin');

-- After creating your admin Auth user, run this once with its UUID:
-- insert into public.profiles (id, role) values ('ADMIN_AUTH_USER_UUID', 'admin');
-- Add a profile row with role 'student' for every student Auth user.
