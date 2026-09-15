# FeeFlow

Student fee portal built with Next.js, Supabase, Vercel, Gemini, and UPI QR payments.

## Run locally

1. Copy `.env.example` to `.env.local` and add the Supabase project URL/key, Gemini key, and your institution UPI ID.
2. In the Supabase SQL Editor, run `supabase/schema.sql`.
3. In **Authentication → Users**, create admin/student users and set their `profiles` roles as the comments in the SQL show.
4. Run `npm install`, then `npm run dev`.

## Deploy

Push this project to GitHub, import it into Vercel, and add the same environment variables in **Settings → Environment Variables**. Keep `GEMINI_API_KEY` server-only; do not prefix it with `NEXT_PUBLIC_`.

## How fee records are linked

`students.id` is the Supabase Auth user UUID. This is what ensures a signed-in student can only see their own record. The admin screen calculates Due Fee as `Total Fee − Paid Fee`; Fine Fee is added to the final payable QR amount.
