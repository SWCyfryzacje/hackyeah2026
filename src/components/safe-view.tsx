import { SafeAreaView as SAV, Edge } from 'react-native-safe-area-context';
import { styled } from 'nativewind';
import React from 'react';

const StyledSAV = styled(SAV);

type Props = {
  children: React.ReactNode;
  className?: string;
  edges?: readonly Edge[] | Edge[];
};

export default function SafeView({ children, className, edges }: Props) {
  return (
    <StyledSAV className={className} edges={edges}>
      {children}
    </StyledSAV>
  );
}
