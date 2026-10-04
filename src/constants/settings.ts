export const ACTIVITY_LEVELS = [
  { id: 'Walking', label: 'Spacer', icon: 'walk-outline' },
  { id: 'Jogging', label: 'Jogging', icon: 'fitness-outline' },
  { id: 'Running', label: 'Bieganie', icon: 'speedometer-outline' },
  { id: 'Cycling', label: 'Kolarstwo', icon: 'bicycle-outline' },
] as const;

export type ActivityLevelId = (typeof ACTIVITY_LEVELS)[number]['id'];

export const GOAL_PRESETS = ['5', '10', '20', '35', '50'] as const;
