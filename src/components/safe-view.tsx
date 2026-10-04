import {
  SafeAreaView as SAV,
  type Edge,
} from 'react-native-safe-area-context';
import { styled } from 'nativewind';
import React from 'react';

const StyledSAV = styled(SAV);

// Tab screens sit above the tab bar, which already handles the bottom inset.
export const TAB_SCREEN_EDGES: Edge[] = ['top', 'left', 'right'];

type Props = {
  children: React.ReactNode;
  className?: string;
  edges?: Edge[];
};

export default function SafeView({ children, className, edges }: Props) {
  return (
    <StyledSAV
      className={className}
      edges={edges}>
      {children}
    </StyledSAV>
  );
}
