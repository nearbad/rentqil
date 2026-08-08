import React, { useRef, useState } from 'react';
import { PanResponder, View, type LayoutChangeEvent } from 'react-native';
import { tokens } from '@rentqil/shared';

interface Props {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}

const KNOB = 18;

// one knob, one job: drag to cap the price
export function PriceSlider({ min, max, step, value, onChange }: Props) {
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);
  const valueRef = useRef(value);
  valueRef.current = value;
  const grabRef = useRef(value);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  // the responder is created once, refs keep its math current
  const boundsRef = useRef({ min, max, step });
  boundsRef.current = { min, max, step };

  const span = Math.max(max - min, 1);
  const toX = (v: number) => ((v - min) / span) * width;

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        grabRef.current = valueRef.current;
      },
      onPanResponderMove: (_evt, gesture) => {
        const w = widthRef.current;
        if (w <= 0) return;
        const b = boundsRef.current;
        const raw = grabRef.current + (gesture.dx / w) * Math.max(b.max - b.min, 1);
        const snapped = Math.round((raw - b.min) / b.step) * b.step + b.min;
        const next = Math.min(Math.max(snapped, b.min), b.max);
        if (next !== valueRef.current) onChangeRef.current(next);
      },
    })
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    const inner = Math.max(e.nativeEvent.layout.width - KNOB, 0);
    setWidth(inner);
    widthRef.current = inner;
  };

  return (
    <View onLayout={onLayout} style={{ height: KNOB + 6, justifyContent: 'center' }}>
      <View style={{ height: 4, marginHorizontal: KNOB / 2, backgroundColor: tokens.colors.gray150 }} />
      {width > 0 ? (
        <>
          <View
            style={{
              position: 'absolute',
              left: KNOB / 2,
              width: toX(value),
              height: 4,
              backgroundColor: tokens.colors.text,
            }}
          />
          <View
            {...responder.panHandlers}
            style={{
              position: 'absolute',
              left: toX(value),
              width: KNOB,
              height: KNOB,
              backgroundColor: tokens.colors.text,
              borderWidth: 2,
              borderColor: tokens.colors.white,
              ...(typeof document !== 'undefined' ? { cursor: 'pointer' as never } : {}),
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          />
        </>
      ) : null}
    </View>
  );
}
