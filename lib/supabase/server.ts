import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createServerSupabaseClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(values: { name: string; value: string; options: CookieOptions }[]) {
          try {
            values.forEach(({ name, value, options }: { name: string; value: string; options: CookieOptions }) => cookieStore.set(name, value, options));
          } catch {
            // Route handlers may read a session without needing to update its cookies.
          }
        },
      },
    }
  );
}
