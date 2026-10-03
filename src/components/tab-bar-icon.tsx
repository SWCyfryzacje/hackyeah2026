import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { ColorValue } from 'react-native';

export type TabBarIconProps = {
  name: ComponentProps<typeof Ionicons>['name'];
  color: ColorValue;
  focused?: boolean;
  size?: number;
};

export default function TabBarIcon({
  name,
  color,
  size = 24,
}: TabBarIconProps) {
  return (
    <Ionicons
      name={name}
      size={size}
      color={color.toString()}
      style={{ marginBottom: -3 }}
    />
  );
}
