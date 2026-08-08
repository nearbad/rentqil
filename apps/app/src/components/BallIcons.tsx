import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

// hand drawn ball glyphs in the lucide stroke style: 24x24 viewbox,
// round caps, stroke driven. lucide itself has no proper sport balls

export interface BallIconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

function Frame({ size = 24, color = '#000', strokeWidth = 1.6, children }: BallIconProps & { children: React.ReactNode }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </Svg>
  );
}

export function FootballBall(props: BallIconProps) {
  return (
    <Frame {...props}>
      <Circle cx={12} cy={12} r={10} />
      {/* center pentagon */}
      <Path d="M12 8.6 15.1 11l-1.2 3.7h-3.8L8.9 11Z" />
      {/* spokes from the pentagon out to the rim */}
      <Path d="M12 8.6V4.8" />
      <Path d="m15.1 11 3.6-1.2" />
      <Path d="m13.9 14.7 2.2 3.1" />
      <Path d="m10.1 14.7-2.2 3.1" />
      <Path d="M8.9 11 5.3 9.8" />
    </Frame>
  );
}

export function BasketballBall(props: BallIconProps) {
  return (
    <Frame {...props}>
      <Circle cx={12} cy={12} r={10} />
      <Path d="M12 2v20" />
      <Path d="M2 12h20" />
      <Path d="M5.3 4.6c3.6 3.9 3.6 10.9 0 14.8" />
      <Path d="M18.7 4.6c-3.6 3.9-3.6 10.9 0 14.8" />
    </Frame>
  );
}

export function TennisBall(props: BallIconProps) {
  return (
    <Frame {...props}>
      <Circle cx={12} cy={12} r={10} />
      <Path d="M4.3 5.1c3.3 1.5 5.6 4.9 5.6 8.7 0 2.8-1.2 5.3-3.1 7" />
      <Path d="M19.7 5.1c-3.3 1.5-5.6 4.9-5.6 8.7 0 2.8 1.2 5.3 3.1 7" />
    </Frame>
  );
}
