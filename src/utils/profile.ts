import type { SupabaseClient } from '@supabase/supabase-js';
import type { useUser } from '@clerk/expo';
import { ACTIVITY_LEVELS } from '@/constants/settings';

type ClerkUser = NonNullable<ReturnType<typeof useUser>['user']>;

const ACTIVITY_IDS: readonly string[] = ACTIVITY_LEVELS.map((a) => a.id);

/** public.profiles row for a Clerk user; Settings keeps its extras in unsafeMetadata. */
function toProfileRow(user: ClerkUser) {
  const meta = (user.unsafeMetadata ?? {}) as Record<string, unknown>;
  const goal = Number(meta.weeklyGoal);

  return {
    user_id: user.id,
    display_name: user.fullName || user.username || null,
    first_name: user.firstName || null,
    last_name: user.lastName || null,
    username: user.username || null,
    email: user.primaryEmailAddress?.emailAddress ?? null,
    avatar_url: user.imageUrl || null,
    bio: typeof meta.bio === 'string' && meta.bio ? meta.bio : null,
    activity_level:
      typeof meta.activityLevel === 'string' &&
      ACTIVITY_IDS.includes(meta.activityLevel)
        ? meta.activityLevel
        : null,
    weekly_goal: Number.isFinite(goal) && goal >= 0 ? goal : null,
    distance_unit: meta.distanceUnit === 'mi' ? 'mi' : 'km',
  };
}

/** Creates or updates the signed-in user's profile from their Clerk data. */
export async function upsertProfile(
  supabase: SupabaseClient,
  user: ClerkUser
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .upsert(toProfileRow(user), { onConflict: 'user_id' });
  if (error) throw new Error(error.message);
}
