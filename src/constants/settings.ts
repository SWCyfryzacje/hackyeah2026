export const ACTIVITY_LEVELS = [
  { id: 'Walking', label: 'Walking', icon: 'walk-outline' },
  { id: 'Jogging', label: 'Jogging', icon: 'fitness-outline' },
  { id: 'Running', label: 'Running', icon: 'speedometer-outline' },
  { id: 'Cycling', label: 'Cycling', icon: 'bicycle-outline' },
] as const;

export type ActivityLevelId = (typeof ACTIVITY_LEVELS)[number]['id'];

export const GOAL_PRESETS = ['5', '10', '20', '35', '50'] as const;
