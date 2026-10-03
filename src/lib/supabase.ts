import 'react-native-url-polyfill/auto';
import { useSession } from '@clerk/expo';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useMemo } from 'react';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Add them to .env and restart the dev server.'
  );
}

// Auth is handled by Clerk (Supabase third-party auth), so Supabase never
// stores its own session — each request carries the current Clerk token.
function createSupabaseClient(
  getToken: () => Promise<string | null>
): SupabaseClient {
  return createClient(supabaseUrl, supabaseKey, {
    accessToken: getToken,
  });
}

export function useSupabase() {
  const { session } = useSession();

  return useMemo(
    () => createSupabaseClient(async () => (await session?.getToken()) ?? null),
    [session]
  );
}
