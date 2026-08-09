import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';
import { tokens } from '@rentqil/shared';
import { logoFont } from '@/ui/typography';

// same breathing wordmark as the web, driven by Animated instead of css.
// nested Text cannot hold its own transform on native, so the bang is a
// sibling on the same baseline rather than a child.

const HALF_CYCLE = 1300;

export function LogoMark() {
  const beat = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      if (alive) setReduceMotion(on);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const step = (toValue: number) =>
      Animated.timing(beat, {
        toValue,
        duration: HALF_CYCLE,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      });
    const loop = Animated.loop(Animated.sequence([step(1), step(0)]));
    loop.start();
    return () => loop.stop();
  }, [beat, reduceMotion]);

  const word = beat.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });
  const bang = beat.interpolate({ inputRange: [0, 1], outputRange: [1, 1.24] });

  const base = {
    fontSize: tokens.fontSize.h3,
    letterSpacing: 1,
    ...logoFont(),
  };

  return (
    <Animated.View
      style={{ flexDirection: 'row', alignItems: 'baseline', transform: [{ scale: word }] }}
    >
      <Animated.Text style={{ ...base, color: tokens.colors.white }}>rentqil</Animated.Text>
      <Animated.Text
        style={{ ...base, color: tokens.colors.accent, transform: [{ scale: bang }] }}
      >
        !
      </Animated.Text>
    </Animated.View>
  );
}
