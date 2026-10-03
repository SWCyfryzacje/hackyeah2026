import { SafeAreaView as SAV } from 'react-native-safe-area-context';
import { styled } from 'nativewind';
import React from 'react';

const StyledSAV = styled(SAV);

type Props = {
  children: React.ReactNode;
  className?: string;
};

export default function SafeView({ children, className }: Props) {
  return <StyledSAV className={className}>{children}</StyledSAV>;
}
