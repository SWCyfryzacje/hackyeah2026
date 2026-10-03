import { useEffect } from 'react';
import { useUser } from '@clerk/expo';
import { useSupabase } from '@/lib/supabase';
import { upsertProfile } from '@/utils/profile';

/**
 * Keeps public.profiles in sync with the signed-in Clerk user: creates the row
 * after sign-in and updates it whenever the Clerk user changes (e.g. after
 * saving Settings, which bumps user.updatedAt).
 */
export default function useProfileSync() {
  const { user } = useUser();
  const supabase = useSupabase();
  const updatedAt = user?.updatedAt?.getTime();

  useEffect(() => {
    if (!user) return;
    upsertProfile(supabase, user).catch((e: unknown) =>
      console.warn('Profile sync error:', e instanceof Error ? e.message : e)
    );
    // Re-sync only when the user or their data changes, not on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, updatedAt, supabase]);
}
