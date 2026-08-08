import React from 'react';
import {
  Bike,
  Dumbbell,
  Footprints,
  Medal,
  Swords,
  Table2,
  Volleyball,
  Waves,
  type LucideIcon,
} from 'lucide-react-native';
import { tokens, type SportIcon as SportIconCode } from '@rentqil/shared';
import { BasketballBall, FootballBall, TennisBall, type BallIconProps } from './BallIcons';

// icon codes come from SPORT_ICONS in shared, the admin picks one per sport.
// the ball sports use our own glyphs, lucide has no real balls
const ICONS: Record<SportIconCode, LucideIcon | React.FC<BallIconProps>> = {
  football: FootballBall,
  tennis: TennisBall,
  basketball: BasketballBall,
  volleyball: Volleyball,
  gym: Dumbbell,
  swim: Waves,
  run: Footprints,
  fight: Swords,
  table_tennis: Table2,
  bike: Bike,
  generic: Medal,
};

interface Props {
  icon: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function SportIcon({ icon, size = 16, color = tokens.colors.gray700, strokeWidth = 1.6 }: Props) {
  const Cmp = ICONS[icon as SportIconCode] ?? Medal;
  return <Cmp size={size} color={color} strokeWidth={strokeWidth} />;
}
